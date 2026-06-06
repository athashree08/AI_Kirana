import os
os.environ["TESTING"] = "true"
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


def test_twilio_mock_service(monkeypatch):
    """
    Test Twilio helper function in mock mode.
    """
    monkeypatch.setattr("app.services.twilio_service.load_dotenv", lambda *args, **kwargs: None)
    monkeypatch.setenv("MOCK_TWILIO", "true")
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


def test_multilingual_voice_cfo_intents(db_session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.main import get_db
    
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    # Seed some dummy intelligence data to prevent empty records
    from app.models import Customer
    from datetime import date
    c1 = Customer(
        customer_name="Deepa Nair",
        merchant_id="merchant_001",
        relationship_type="VIP",
        visit_count=10,
        total_spent=12000.0,
        average_transaction=1200.0,
        first_transaction_date=date.today(),
        last_transaction_date=date.today()
    )
    db_session.add(c1)
    db_session.commit()

    # 1. बड़ा ग्राहक कौन है -> customer_top
    response = client.post("/api/voice", data={"mock_text": "बड़ा ग्राहक कौन है"})
    assert response.status_code == 200
    assert response.json()["intent"] == "customer_top"

    # 2. दीपा नायर का कितना उधर बाकी है -> udhar
    response = client.post("/api/voice", data={"mock_text": "दीपा नायर का कितना उधर बाकी है"})
    assert response.status_code == 200
    assert response.json()["intent"] == "udhar"

    # 3. मेरा सबसे अच्छा कस्टमर कौन है -> customer_top
    response = client.post("/api/voice", data={"mock_text": "मेरा सबसे अच्छा कस्टमर कौन है"})
    assert response.status_code == 200
    assert response.json()["intent"] == "customer_top"

    # 4. एकॉन ग्राहक किती आहेत -> customer_base
    response = client.post("/api/voice", data={"mock_text": "एकॉन ग्राहक किती आहेत"})
    assert response.status_code == 200
    assert response.json()["intent"] == "customer_base"

    # 5. ज्यादा बार कौन आया -> customer_frequent
    response = client.post("/api/voice", data={"mock_text": "ज्यादा बार कौन आया"})
    assert response.status_code == 200
    assert response.json()["intent"] == "customer_frequent"

    app.dependency_overrides.clear()


def test_llm_agent_tool_calling(db_session, monkeypatch):
    """
    Test the multi-turn agent reasoning and database tool calling logic using mock LLM responses.
    """
    # 1. Seed customer data
    from app.models import Customer
    from datetime import date
    c1 = Customer(
        customer_name="Deepa Nair",
        merchant_id="merchant_001",
        relationship_type="VIP"
    )
    db_session.add(c1)
    db_session.commit()

    # 2. Mock environment keys and requests.post
    monkeypatch.setenv("GEMINI_API_KEY", "mock_key")
    monkeypatch.delenv("PAYTM_INFERENCE_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("ALLOW_LLM_TEST", "true")
    
    call_count = 0
    def mock_post(url, headers=None, json=None, timeout=None):
        nonlocal call_count
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data
            def json(self):
                return self.json_data
            @property
            def text(self):
                return ""

        # Turn 0: LLM wants to run get_customer_count
        if call_count == 0:
            call_count += 1
            return MockResponse(200, {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "functionCall": {
                                "name": "get_customer_count",
                                "args": {}
                            }
                        }]
                    }
                }]
            })
        # Turn 1: LLM returns the final response
        else:
            return MockResponse(200, {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": "Aapke paas total 1 active customer hai."
                        }]
                    }
                }]
            })

    def mock_post_wrapper(url, *args, **kwargs):
        return mock_post(url, **kwargs)

    monkeypatch.setattr("requests.post", mock_post_wrapper)

    from app.services.llm_agent import process_voice_llm
    result = process_voice_llm("kitne active customers hain", db_session, "merchant_001")
    
    assert result is not None
    assert "1 active customer" in result["response_text"]


def test_expanded_voice_cfo_intents(db_session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.main import get_db
    from app.models import Transaction, Customer, Udhar
    from datetime import datetime, timedelta, date

    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    # Seed transactions
    t1 = Transaction(
        amount=1000.0,
        timestamp=datetime.now(),
        merchant_id="merchant_001",
        category="grocery",
        payment_mode="UPI",
        customer_name="Deepa Nair"
    )
    t2 = Transaction(
        amount=2500.0,
        timestamp=datetime.now() - timedelta(days=2),
        merchant_id="merchant_001",
        category="dairy",
        payment_mode="Cash",
        customer_name="Mohan"
    )
    t3 = Transaction(
        amount=5000.0,
        timestamp=datetime.now() - timedelta(days=35),
        merchant_id="merchant_001",
        category="snacks",
        payment_mode="UPI",
        customer_name="Sita"
    )
    db_session.add_all([t1, t2, t3])
    db_session.commit()

    # 1. Today's sales (Hindi, Marathi, Hinglish)
    r = client.post("/api/voice", data={"mock_text": "Aaj kitna kamaaya?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "1,000" in r.json()["response_text"] or "1000" in r.json()["response_text"]

    r = client.post("/api/voice", data={"mock_text": "आज का हिसाब बताओ"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "1,000" in r.json()["response_text"] or "1000" in r.json()["response_text"]

    r = client.post("/api/voice", data={"mock_text": "आज किती कमाई झाली?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "1,000" in r.json()["response_text"] or "1000" in r.json()["response_text"]

    # 2. Overall business summary
    r = client.post("/api/voice", data={"mock_text": "Mera business summary kya hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "8,500" in r.json()["response_text"] or "8500" in r.json()["response_text"]

    # 3. Weekly / Monthly sales
    r = client.post("/api/voice", data={"mock_text": "Is hafte kitna business hua?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "3,500" in r.json()["response_text"] or "3500" in r.json()["response_text"]

    r = client.post("/api/voice", data={"mock_text": "Pichle mahine kitna sale hua?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "summary"
    assert "5,000" in r.json()["response_text"] or "5000" in r.json()["response_text"]

    # 4. GST Deadlines & Composition scheme
    r = client.post("/api/voice", data={"mock_text": "GST kab bharna hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "gst"
    assert "11th" in r.json()["response_text"] or "११" in r.json()["response_text"]

    r = client.post("/api/voice", data={"mock_text": "composition scheme kya hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "gst"
    assert "1%" in r.json()["response_text"] or "१%" in r.json()["response_text"]

    # 5. Loan eligibility & how to improve
    r = client.post("/api/voice", data={"mock_text": "Mera loan score kaise sudhare?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "loan"
    assert "UPI" in r.json()["response_text"] or "डिजिटल" in r.json()["response_text"] or "digital" in r.json()["response_text"]

    # 6. App Help FAQ
    r = client.post("/api/voice", data={"mock_text": "whatsapp reminder bhejne ka charge kya hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "app_help"
    assert "0.50" in r.json()["response_text"] or "०.५०" in r.json()["response_text"]

    # 7. General Knowledge (Diwali, margin)
    r = client.post("/api/voice", data={"mock_text": "diwali kab hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "general"
    assert "2026" in r.json()["response_text"]

    r = client.post("/api/voice", data={"mock_text": "kirana store ka typical margin kitna hota hai?"})
    assert r.status_code == 200
    assert r.json()["intent"] == "general"
    assert "10-20%" in r.json()["response_text"] or "१०-२०%" in r.json()["response_text"]

    app.dependency_overrides.clear()


def test_llm_agent_fallback_from_gemini_to_groq(db_session, monkeypatch):
    """
    Verify that if Gemini fallback fails, the agent falls back to Groq fallback.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "gemini_mock_key")
    monkeypatch.setenv("GROQ_API_KEY", "groq_mock_key")
    monkeypatch.delenv("PAYTM_INFERENCE_API_KEY", raising=False)
    monkeypatch.setenv("ALLOW_LLM_TEST", "true")
    
    gemini_called = False
    groq_called = False
    
    def mock_post(url, headers=None, json=None, timeout=None):
        nonlocal gemini_called, groq_called
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data
            def json(self):
                return self.json_data
            @property
            def text(self):
                return "Mock error or response text"
                
        if "generativelanguage.googleapis.com" in url:
            gemini_called = True
            # Simulate Gemini failure (Quota Exceeded, etc)
            return MockResponse(429, {"error": {"message": "Quota exceeded"}})
        elif "api.groq.com" in url:
            groq_called = True
            return MockResponse(200, {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "Groq response text"
                    }
                }]
            })
        return MockResponse(404, {})
        
    def mock_post_wrapper(url, *args, **kwargs):
        return mock_post(url, **kwargs)
        
    monkeypatch.setattr("requests.post", mock_post_wrapper)
    
    from app.services.llm_agent import process_voice_llm
    result = process_voice_llm("test query", db_session, "merchant_001")
    
    assert gemini_called is True
    assert groq_called is True
    assert result is not None
    assert result["response_text"] == "Groq response text"

