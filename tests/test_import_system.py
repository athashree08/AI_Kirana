import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date
from fastapi.testclient import TestClient
from app.database import Base
from app import models, schemas
from app.main import app, get_db
from app.services.ocr import fuzzy_match_name, clean_and_validate_entries
from app.services.billing_import import auto_map_columns, parse_billing_file

DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    # Use StaticPool to share the same in-memory SQLite database across all connections/threads
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test merchant
        merchant = models.Merchant(
            id="test_merchant",
            name="Test Kirana Store",
            language="Hindi",
            business_type="Kirana",
            city="Jaipur"
        )
        db.add(merchant)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_ocr_fuzzy_matching():
    """
    Test fuzzy matching for handwriting typos.
    """
    existing = ["Mohan", "Ravi", "Sita", "Karan Johar"]
    
    # Typos corrected
    assert fuzzy_match_name("Mhn", existing) == "Mohan"
    assert fuzzy_match_name("Rvi", existing) == "Ravi"
    assert fuzzy_match_name("Sita", existing) == "Sita"
    
    # Unmatched/New names kept as is
    assert fuzzy_match_name("Amit", existing) == "Amit"
    assert fuzzy_match_name("Vijay", existing) == "Vijay"
    
    # Let's verify clean_and_validate_entries corrects correctly
    raw_entries = [
        {"name": "Mhn", "amount": 500, "type": "udhar"},
        {"name": "Rvi", "amount": 1200, "type": "udhar"},
        {"name": "Vijay", "amount": 300, "type": "udhar"}
    ]
    validated = clean_and_validate_entries(raw_entries, existing)
    assert validated[0]["name"] == "Mohan"
    assert validated[1]["name"] == "Ravi"
    assert validated[2]["name"] == "Vijay"


def test_billing_column_mapping():
    """
    Test column mapping variations for billing imports.
    """
    headers1 = ["Buyer", "Total Amount", "Bill Date", "Mode", "Details"]
    mapping1 = auto_map_columns(headers1)
    assert mapping1["name"] == "Buyer"
    assert mapping1["amount"] == "Total Amount"
    assert mapping1["date"] == "Bill Date"
    assert mapping1["type"] == "Mode"
    assert mapping1["notes"] == "Details"

    headers2 = ["Client Name", "Pending", "Transaction Date", "Payment Mode"]
    mapping2 = auto_map_columns(headers2)
    assert mapping2["name"] == "Client Name"
    assert mapping2["amount"] == "Pending"
    assert mapping2["date"] == "Transaction Date"
    assert mapping2["type"] == "Payment Mode"


def test_billing_file_parsing():
    """
    Test file parsing for CSV billing transactions.
    """
    csv_data = (
        "Buyer,Amount,Date,Mode,Details\n"
        "Mohan,500,2026-06-06,udhar,Biscuits packet\n"
        "Ravi,1200,2026-06-06,sale,Grocery items\n"
        "Sita,300,2026-06-06,payment,Repaid half udhar\n"
    ).encode("utf-8")

    result = parse_billing_file(csv_data, "shop_bills.csv")
    assert result["total_entries"] == 3
    assert result["total_amount"] == 2000.0
    assert result["breakdown_by_type"]["udhar"] == 1
    assert result["breakdown_by_type"]["sale"] == 1
    assert result["breakdown_by_type"]["payment"] == 1
    
    entries = result["entries"]
    assert entries[0]["name"] == "Mohan"
    assert entries[0]["amount"] == 500.0
    assert entries[0]["type"] == "udhar"
    assert entries[0]["notes"] == "Biscuits packet"


def test_api_endpoints_ledger_import(db_session):
    """
    Test API endpoints `/api/import/ledger-ocr` and `/api/import/ledger-confirm`.
    """
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    # 1. Post simulated raw image upload
    file_content = b"fake image bytes"
    response = client.post(
        "/api/import/ledger-ocr",
        files={"file": ("handwritten.png", file_content, "image/png")},
        data={"merchant_id": "test_merchant"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "preview"
    assert len(data["entries"]) > 0

    # 2. Confirm ledger import
    confirm_payload = {
        "merchant_id": "test_merchant",
        "entries": [
            {"name": "Mohan Lal", "amount": 500.0, "type": "udhar", "date": "2026-06-06", "notes": "Grocery udhar"},
            {"name": "Sita Devi", "amount": 1200.0, "type": "udhar", "date": "2026-06-06", "notes": "Milk dues"}
        ]
    }
    confirm_resp = client.post("/api/import/ledger-confirm", json=confirm_payload)
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["saved_to_udhar"] == 2

    # Verify database state
    customers = db_session.query(models.Customer).filter(models.Customer.merchant_id == "test_merchant").all()
    assert len(customers) == 2
    cust_names = [c.customer_name for c in customers]
    assert "Mohan Lal" in cust_names
    assert "Sita Devi" in cust_names

    udhar_entries = db_session.query(models.Udhar).filter(models.Udhar.merchant_id == "test_merchant").all()
    assert len(udhar_entries) == 2
    assert udhar_entries[0].amount == 500.0
    assert udhar_entries[1].amount == 1200.0


def test_api_endpoints_billing_import(db_session):
    """
    Test API endpoints `/api/import/billing` and `/api/import/billing-confirm`.
    """
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    # 1. Post billing import file
    csv_data = (
        "Buyer,Amount,Date,Mode,Details\n"
        "Karan,1500,2026-06-06,sale,Flour bag\n"
        "Rajesh,750,2026-06-06,udhar,Rice bag\n"
    ).encode("utf-8")

    response = client.post(
        "/api/import/billing",
        files={"file": ("billing_export.csv", csv_data, "text/csv")},
        data={"merchant_id": "test_merchant"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "preview"
    assert data["total_entries"] == 2
    assert data["total_amount"] == 2250.0

    # 2. Confirm billing import
    confirm_payload = {
        "merchant_id": "test_merchant",
        "entries": [
            {"name": "Karan", "amount": 1500.0, "type": "sale", "date": "2026-06-06", "notes": "Flour bag"},
            {"name": "Rajesh", "amount": 750.0, "type": "udhar", "date": "2026-06-06", "notes": "Rice bag"}
        ]
    }
    confirm_resp = client.post("/api/import/billing-confirm", json=confirm_payload)
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["saved_sale_entries"] == 1
    assert confirm_data["saved_udhar_entries"] == 1

    # Verify database state
    customers = db_session.query(models.Customer).filter(models.Customer.merchant_id == "test_merchant").all()
    # Rajesh and Karan should be created
    names = [c.customer_name for c in customers]
    assert "Karan" in names
    assert "Rajesh" in names

    # Verify transaction added
    txs = db_session.query(models.Transaction).filter(models.Transaction.merchant_id == "test_merchant").all()
    assert len(txs) == 1
    assert txs[0].customer_name == "Karan"
    assert txs[0].amount == 1500.0

    # Verify Udhar added
    udhars = db_session.query(models.Udhar).filter(models.Udhar.merchant_id == "test_merchant").all()
    assert len(udhars) == 1
    assert udhars[0].customer_name == "Rajesh"
    assert udhars[0].amount == 750.0
