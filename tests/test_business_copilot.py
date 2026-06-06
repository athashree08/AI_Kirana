import pytest
import os
import json
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app import models
from app.services import business_tools

# Configure testing database URL
TEST_DB_URL = "sqlite:///./test_business_copilot.db"

@pytest.fixture(scope="module")
def db_session():
    # Setup test database
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    
    # 1. Seed merchant
    merchant = models.Merchant(
        id="merchant_001",
        name="Ramesh Kirana Store",
        language="Hinglish",
        business_type="Grocery",
        city="Mumbai"
    )
    db.add(merchant)
    
    # 2. Seed transactions
    # Seed a few transactions for today and this month
    db.add(models.Transaction(
        amount=1500.0,
        timestamp=datetime.now(),
        merchant_id="merchant_001",
        category="Grocery",
        payment_mode="UPI",
        customer_name="Amit Sharma"
    ))
    db.add(models.Transaction(
        amount=500.0,
        timestamp=datetime.now() - timedelta(days=1),
        merchant_id="merchant_001",
        category="Dairy",
        payment_mode="CASH",
        customer_name="Walk-in"
    ))
    db.add(models.Transaction(
        amount=2500.0,
        timestamp=datetime.now() - timedelta(days=5),
        merchant_id="merchant_001",
        category="Snacks",
        payment_mode="UPI",
        customer_name="Priya Singh"
    ))
    
    # 3. Seed udhar
    db.add(models.Udhar(
        customer_name="Mohan",
        amount=1000.0,
        date_added=date.today() - timedelta(days=10),
        merchant_id="merchant_001"
    ))
    db.add(models.Udhar(
        customer_name="Ravi",
        amount=1500.0,
        date_added=date.today() - timedelta(days=40),
        merchant_id="merchant_001"
    ))
    
    # 4. Seed customers
    db.add(models.Customer(
        customer_name="Amit Sharma",
        merchant_id="merchant_001",
        relationship_type="VIP",
        late_repayments=0,
        total_repayments=5,
        visit_count=10,
        total_spent=15000.0,
        average_transaction=1500.0
    ))
    db.add(models.Customer(
        customer_name="Mohan",
        merchant_id="merchant_001",
        relationship_type="normal",
        late_repayments=1,
        total_repayments=2,
        visit_count=3,
        total_spent=3000.0,
        average_transaction=1000.0
    ))
    db.add(models.Customer(
        customer_name="Ravi",
        merchant_id="merchant_001",
        relationship_type="normal",
        late_repayments=3,
        total_repayments=1,
        visit_count=2,
        total_spent=2000.0,
        average_transaction=1000.0
    ))
    
    # 5. Seed KeyValueStore entries for suppliers, bills, and expenses
    db.add(models.KeyValueStore(key="suppliers", value=json.dumps([
        {
            "id": 1,
            "name": "Rice Supplier",
            "phone": "+917894568956",
            "pending_amount": 80000.0,
            "last_purchase_date": "2026-06-04",
            "risk_level": "medium",
            "reliability_score": 78,
            "next_due_date": "2026-06-15",
            "avg_payment_delay": 12,
            "monthly_purchases": 120000.0,
            "category": "Rice & Grains",
            "reorder_qty": "150 kg"
        },
        {
            "id": 3,
            "name": "Masale Vendor",
            "phone": "+919988776655",
            "pending_amount": 12000.0,
            "last_purchase_date": "2026-05-15",
            "risk_level": "high",
            "reliability_score": 64,
            "next_due_date": "2026-06-08",
            "avg_payment_delay": 18,
            "monthly_purchases": 30000.0,
            "category": "Spices"
        }
    ])))
    db.add(models.KeyValueStore(key="supplier_entries", value=json.dumps([
        { "id": 1, "supplier_id": 1, "amount": 80000.0, "date_added": "2026-06-04", "description": "Opening Balance" },
        { "id": 3, "supplier_id": 3, "amount": 12000.0, "date_added": "2026-05-15", "description": "Spices import" }
    ])))
    db.add(models.KeyValueStore(key="bills", value=json.dumps([
        {
            "id": "bill_1",
            "type": "Electricity",
            "amount": 4800.0,
            "due_date": "2026-06-20",
            "status": "Pending",
            "description": "Electricity Bill (May)"
        },
        {
            "id": "bill_2",
            "type": "Water",
            "amount": 850.0,
            "due_date": "2026-06-18",
            "status": "Pending",
            "description": "Water utility charge"
        }
    ])))
    db.add(models.KeyValueStore(key="expenses", value=json.dumps([
        {"id": "exp_1", "name": "Store Rent (June)", "category": "Rent & Utility", "amount": 25000.0, "date": date.today().isoformat(), "type": "expense", "paymentMethod": "Card"},
        {"id": "exp_2", "name": "Electricity Bill (May)", "category": "Rent & Utility", "amount": 4800.0, "date": date.today().isoformat(), "type": "expense", "paymentMethod": "UPI"}
    ])))
    db.add(models.KeyValueStore(key="cashbook", value=json.dumps([])))
    
    db.commit()
    
    yield db
    
    db.close()
    engine.dispose()
    try:
        if os.path.exists("./test_business_copilot.db"):
            os.remove("./test_business_copilot.db")
    except Exception:
        pass

def test_revenue_tools(db_session):
    res = business_tools.get_today_revenue(db_session, "merchant_001")
    assert "today_revenue" in res
    assert res["today_revenue"] == 1500.0
    
    res_period = business_tools.get_revenue(db_session, "this_week", "merchant_001")
    assert res_period["revenue"] == 4500.0
    
    res_breakdown = business_tools.get_sales_breakdown(db_session, "merchant_001")
    assert "Grocery" in res_breakdown["category_wise"]
    assert "UPI" in res_breakdown["payment_mode_wise"]

def test_customer_tools(db_session):
    res = business_tools.get_customer_profile(db_session, "Amit Sharma", "merchant_001")
    assert res["customer_name"] == "Amit Sharma"
    assert res["relationship_type"] == "VIP"
    
    res_top = business_tools.get_top_customer(db_session, "merchant_001")
    assert res_top["customer_name"] == "Amit Sharma"
    
    res_count = business_tools.get_customer_count(db_session, "merchant_001")
    assert res_count["total_customers"] == 3

def test_udhar_tools(db_session):
    res = business_tools.get_customer_udhar(db_session, "Mohan", "merchant_001")
    assert res["pending_amount"] == 1000.0
    assert res["days_pending"] == 10
    
    res_total = business_tools.get_total_udhar(db_session, "merchant_001")
    assert res_total["total_outstanding_udhar"] == 2500.0
    
    # Test add credit
    add_res = business_tools.add_udhar(db_session, "Amit Sharma", 500.0, "merchant_001")
    assert add_res["success"] is True
    
    # Test repay credit
    repay_res = business_tools.repay_udhar(db_session, "Mohan", 300.0, "merchant_001")
    assert repay_res["success"] is True
    assert repay_res["remaining_udhar"] == 700.0

def test_supplier_and_bills_tools(db_session):
    res = business_tools.get_supplier_due(db_session, "Rice Supplier")
    assert res["pending_amount"] == 80000.0
    
    res_all = business_tools.get_all_supplier_dues(db_session)
    assert res_all["total_due_to_suppliers"] == 92000.0
    
    res_bills = business_tools.get_pending_bills(db_session)
    assert res_bills["pending_count"] == 2

def test_gst_and_loan_tools(db_session):
    res_gst = business_tools.get_gst_threshold_progress(db_session, "merchant_001")
    assert "progress_percent" in res_gst
    
    res_elig = business_tools.get_loan_eligibility(db_session, "merchant_001")
    assert "eligible" in res_elig
    
    res_sim = business_tools.simulate_loan_score(db_session, "merchant_001", simulated_repayments=1000.0)
    assert "simulated_loan_score" in res_sim

def test_business_health_tools(db_session):
    res_health = business_tools.get_business_health(db_session, "merchant_001")
    assert "health_rating" in res_health
    
    res_prob = business_tools.get_biggest_business_problem(db_session, "merchant_001")
    assert "biggest_problem" in res_prob
