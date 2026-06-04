import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, date
from app.database import Base
from app import models, schemas
from app.services import scoring

# Setup in-memory database for testing
DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
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

def test_scoring_empty_history(db_session):
    """
    Test scoring with no transactions.
    Should return 0 score and poor rating.
    """
    response = scoring.calculate_loan_score(db_session, "test_merchant")
    assert response.score == 0
    assert response.label == "Poor"
    assert response.estimated_amount == 0.0
    assert response.breakdown.revenue_score == 0
    assert response.breakdown.consistency_score == 0
    assert response.breakdown.growth_score == 0

def test_scoring_stable_merchant(db_session):
    """
    Test scoring with a very stable merchant who has transactions every day.
    """
    today = datetime.now()
    tx_list = []
    
    # Generate 60 days of stable transactions: Rs 3000 every day
    for i in range(60):
        tx_date = today - timedelta(days=i)
        tx = models.Transaction(
            amount=3000.0,
            timestamp=tx_date,
            merchant_id="test_merchant",
            category="Grocery",
            payment_mode="UPI",
            customer_name="Stable Customer"
        )
        tx_list.append(tx)
        
    db_session.add_all(tx_list)
    db_session.commit()
    
    response = scoring.calculate_loan_score(db_session, "test_merchant")
    
    # 60 days of Rs 3000 = Rs 90,000 monthly revenue.
    # Revenue score should be min(40, (90000 / 150000) * 40) = 24.
    # Consistency score should be maximum (30) because daily variance is 0 (constant Rs 3000/day).
    # Growth score should be 15 because growth is flat (Rs 90k last 30 days vs Rs 90k previous 30 days).
    # Total score should be 24 + 30 + 15 = 69.
    assert response.breakdown.revenue_score == 24
    assert response.breakdown.consistency_score == 30
    assert response.breakdown.growth_score == 15
    assert response.score == 69
    assert response.label == "Good"
    assert response.estimated_amount > 0.0

def test_scoring_growing_merchant(db_session):
    """
    Test scoring with a merchant showing 50% revenue growth in the last month.
    """
    today = datetime.now()
    tx_list = []
    
    # Previous 30 days: Rs 2000 per day (Total Rs 60,000)
    for i in range(30, 60):
        tx_date = today - timedelta(days=i)
        tx = models.Transaction(
            amount=2000.0,
            timestamp=tx_date,
            merchant_id="test_merchant",
            category="Grocery",
            payment_mode="UPI",
            customer_name="Customer A"
        )
        tx_list.append(tx)
        
    # Last 30 days: Rs 3000 per day (Total Rs 90,000 -> +50% growth)
    for i in range(30):
        tx_date = today - timedelta(days=i)
        tx = models.Transaction(
            amount=3000.0,
            timestamp=tx_date,
            merchant_id="test_merchant",
            category="Grocery",
            payment_mode="UPI",
            customer_name="Customer B"
        )
        tx_list.append(tx)
        
    db_session.add_all(tx_list)
    db_session.commit()
    
    response = scoring.calculate_loan_score(db_session, "test_merchant")
    
    # Growth is +50% which is >= 20% growth. Growth score should be 30.
    assert response.breakdown.growth_score == 30
    assert response.score > 70
