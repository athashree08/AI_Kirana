import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from app.database import Base
from app import models, schemas
from app.crud import create_udhar, get_udhar_summary_by_customer, get_udhar_entries_paginated

DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
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

def test_add_udhar_entry(db_session):
    """
    Test creating a single credit entry.
    """
    udhar_in = schemas.UdharCreate(
        customer_name="Mohan",
        amount=500.0,
        date_added=date.today(),
        merchant_id="test_merchant"
    )
    db_udhar = create_udhar(db_session, udhar_in)
    assert db_udhar.id is not None
    assert db_udhar.customer_name == "Mohan"
    assert db_udhar.amount == 500.0

def test_udhar_aggregation(db_session):
    """
    Test multiple credit entries aggregation for Mohan:
    - Entry 1: 500.0, date_added = 15 days ago
    - Entry 2: 700.0, date_added = 10 days ago
    
    Expect:
    - Total amount = 1200.0
    - Days pending = 15
    """
    today = date.today()
    entry1 = models.Udhar(
        customer_name="Mohan",
        amount=500.0,
        date_added=today - timedelta(days=15),
        merchant_id="test_merchant"
    )
    entry2 = models.Udhar(
        customer_name="Mohan",
        amount=700.0,
        date_added=today - timedelta(days=10),
        merchant_id="test_merchant"
    )
    db_session.add(entry1)
    db_session.add(entry2)
    db_session.commit()
    
    summary = get_udhar_summary_by_customer(db_session, "test_merchant", "Mohan")
    assert summary is not None
    assert summary["customer"] == "Mohan"
    assert summary["amount"] == 1200.0
    assert summary["days_pending"] == 15
    assert summary["entries_count"] == 2

def test_udhar_empty_search(db_session):
    """
    Querying a customer with no records should return None.
    """
    summary = get_udhar_summary_by_customer(db_session, "test_merchant", "NonExistent")
    assert summary is None

def test_udhar_pagination_and_sorting(db_session):
    """
    Test that listing endpoints return sorted and paginated records.
    """
    today = date.today()
    
    # Create 3 records with different amounts and dates
    entry_a = models.Udhar(
        customer_name="Alice",
        amount=100.0,
        date_added=today - timedelta(days=5),
        merchant_id="test_merchant"
    )
    entry_b = models.Udhar(
        customer_name="Bob",
        amount=200.0,
        date_added=today - timedelta(days=1),
        merchant_id="test_merchant"
    )
    entry_c = models.Udhar(
        customer_name="Charlie",
        amount=300.0,
        date_added=today - timedelta(days=10),
        merchant_id="test_merchant"
    )
    db_session.add_all([entry_a, entry_b, entry_c])
    db_session.commit()
    
    # 1. Sort by date_added desc (Bob (1 day ago) -> Alice (5 days) -> Charlie (10 days))
    items, total = get_udhar_entries_paginated(db_session, "test_merchant", skip=0, limit=2, sort_by="date_added", sort_order="desc")
    assert total == 3
    assert len(items) == 2
    assert items[0].customer_name == "Bob"
    assert items[1].customer_name == "Alice"
    
    # 2. Sort by amount asc (Alice (100) -> Bob (200) -> Charlie (300))
    items, total = get_udhar_entries_paginated(db_session, "test_merchant", skip=0, limit=3, sort_by="amount", sort_order="asc")
    assert items[0].amount == 100.0
    assert items[1].amount == 200.0
    assert items[2].amount == 300.0
