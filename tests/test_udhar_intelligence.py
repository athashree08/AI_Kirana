import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from app.database import Base
from app import models, schemas
from app.services import scoring, relationship, twilio_service
from app import crud

DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    from sqlalchemy.pool import StaticPool
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        # Seed merchant
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


def test_calculate_risk_score():
    """
    Test calculating risk score for low, medium, and high categories.
    """
    # 1. Low risk: small amount, low days, no late repayments
    res1 = scoring.calculate_risk_score("Mohan", 300.0, 5, 0)
    assert res1["risk_level"] == "low"
    assert res1["risk_score"] < 40
    
    # 2. Medium risk: moderate values
    res2 = scoring.calculate_risk_score("Mohan", 1500.0, 20, 1)
    assert res2["risk_level"] == "medium"
    assert 40 <= res2["risk_score"] <= 69
    
    # 3. High risk: large amount, long pending days, late repayments
    res3 = scoring.calculate_risk_score("Mohan", 2600.0, 50, 2)
    assert res3["risk_level"] == "high"
    assert res3["risk_score"] >= 70
    
    # 4. Zero pending amount: risk score should be 0
    res4 = scoring.calculate_risk_score("Mohan", 0.0, 30, 5)
    assert res4["risk_score"] == 0
    assert res4["risk_level"] == "low"


def test_determine_relationship_type():
    """
    Test relationship classification rules.
    """
    # 1. Loyal: total >= 3, late == 0, pending < 1500, days < 15
    rel_loyal = relationship.determine_relationship_type(
        total_repayments=4,
        late_repayments=0,
        pending_amount=1000.0,
        days_pending=10
    )
    assert rel_loyal == "loyal"

    # 2. Risky: pending_amount >= 2000 OR late_repayments >= 2 OR days_pending >= 30
    rel_risky_amt = relationship.determine_relationship_type(
        total_repayments=1,
        late_repayments=0,
        pending_amount=2200.0,
        days_pending=5
    )
    assert rel_risky_amt == "risky"

    rel_risky_late = relationship.determine_relationship_type(
        total_repayments=3,
        late_repayments=2,
        pending_amount=500.0,
        days_pending=5
    )
    assert rel_risky_late == "risky"

    rel_risky_days = relationship.determine_relationship_type(
        total_repayments=1,
        late_repayments=0,
        pending_amount=500.0,
        days_pending=35
    )
    assert rel_risky_days == "risky"

    # 3. Normal: average behavior
    rel_normal = relationship.determine_relationship_type(
        total_repayments=2,
        late_repayments=0,
        pending_amount=1000.0,
        days_pending=20
    )
    assert rel_normal == "normal"


def test_fifo_repayment_tracking(db_session):
    """
    Test FIFO repayment deduction and late registration.
    """
    today = date.today()
    
    # Mohan has two outstanding credits:
    # 1. 500 Rs added 40 days ago (late repayment candidate)
    # 2. 700 Rs added 10 days ago (healthy repayment candidate)
    entry1 = models.Udhar(
        customer_name="Mohan",
        amount=500.0,
        date_added=today - timedelta(days=40),
        merchant_id="test_merchant"
    )
    entry2 = models.Udhar(
        customer_name="Mohan",
        amount=700.0,
        date_added=today - timedelta(days=10),
        merchant_id="test_merchant"
    )
    db_session.add_all([entry1, entry2])
    db_session.commit()

    # Step 1: Repay 300 Rs. Oldest (500) becomes 200. Total pending = 900.
    remaining = crud.process_udhar_repayment(db_session, "test_merchant", "Mohan", 300.0)
    assert remaining == 900.0
    
    cust = crud.get_or_create_customer(db_session, "test_merchant", "Mohan")
    assert cust.total_repayments == 1
    assert cust.late_repayments == 0 # Entry 1 is not fully paid yet

    # Step 2: Repay 300 Rs. Oldest (200) gets paid off completely (it was late).
    # Second entry (700) gets reduced by 100 to 600. Total pending = 600.
    remaining2 = crud.process_udhar_repayment(db_session, "test_merchant", "Mohan", 300.0)
    assert remaining2 == 600.0
    
    db_session.refresh(cust)
    assert cust.total_repayments == 2
    assert cust.late_repayments == 1 # Paid off entry1 which was > 30 days pending


def test_twilio_mock_service():
    """
    Test Twilio helper function in mock mode.
    """
    res = twilio_service.send_whatsapp_reminder("Mohan", "Namaste Mohan ji", "+919999999999")
    assert res["success"] is True
    assert res["message_sid"].startswith("SM")
    assert res["customer"] == "Mohan"
    assert res["status"] == "delivered"


def test_hindi_voice_intent_matching(db_session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.main import get_db
    
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    
    # 1. Test "Shilpa ko 500 udhar diya" (Devanagari text)
    response = client.post("/api/voice", data={"mock_text": "शिल्पा को शिल्पा को 500 उधार दिया"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_add"
    assert "Shilpa" in data["response_text"]
    assert "500" in data["response_text"]
    
    # 1.5 Test Hinglish "shilpa ko 500 rs udhar diye"
    response = client.post("/api/voice", data={"mock_text": "shilpa ko 500 rs udhar diye"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_add"
    assert "Shilpa" in data["response_text"]
    assert "500" in data["response_text"]
    
    # Verify Shilpa was added to database
    cust = db_session.query(models.Customer).filter(models.Customer.customer_name == "Shilpa").first()
    assert cust is not None
    assert cust.relationship_type == "normal"
    
    # 2. Test Devanagari Repayment: "Shilpa ne 200 wapas diye" (Devanagari text)
    response = client.post("/api/voice", data={"mock_text": "शिल्पा ने 200 वापस दिए"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_repayment"
    assert "Shilpa" in data["response_text"]
    assert "800" in data["response_text"]
    
    # 3. Test Devanagari Reminder: "Shilpa ko yaad dila" (Devanagari text)
    response = client.post("/api/voice", data={"mock_text": "शिल्पा को याद दिला"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_reminder"
    
    # 4. Test Devanagari Status: "Mera udhar kaisa chal raha hai" (Devanagari text)
    response = client.post("/api/voice", data={"mock_text": "मेरा उधार कैसा है"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_status"
    
    # 5. Test dynamic extraction of a new name "Kavita" (Hinglish)
    response = client.post("/api/voice", data={"mock_text": "Kavita ko 700 udhar diya"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "udhar_add"
    assert "Kavita" in data["response_text"]
    assert "700" in data["response_text"]
    
    # Verify Kavita was added to database
    cust_kavita = db_session.query(models.Customer).filter(models.Customer.customer_name == "Kavita").first()
    assert cust_kavita is not None

    app.dependency_overrides.clear()

