from fastapi import FastAPI, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models, schemas, crud
from app.database import engine, get_db, Base
from app.services import generator, finance, scoring
from app.config import settings

# Create database tables
# This is fine for a hackathon/demo database setup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hindi Voice CFO backend - Paytm Hackathon Project (AI Munshi)"
)

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI Munshi API - Hindi Voice CFO Backend",
        "docs_url": "/docs",
        "status": "Running"
    }



# --- NEW HACKATHON CORE API ENDPOINTS ---

@app.post("/api/voice", response_model=schemas.VoiceResponse)
async def process_voice(
    file: Optional[UploadFile] = File(None),
    mock_text: Optional[str] = Form(None),
    local_transcript: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    transcript = ""
    from app.services.sarvam import speech_to_text, text_to_speech, get_sarvam_config

    api_key, mock_sarvam = get_sarvam_config()

    if mock_text:
        transcript = mock_text
    elif mock_sarvam and local_transcript:
        transcript = local_transcript
    elif file:
        # If we have local_transcript and we are in mock mode, use it directly
        if mock_sarvam and local_transcript:
            transcript = local_transcript
        else:
            # 1. Read bytes from uploaded file
            try:
                file_bytes = await file.read()
                filename = file.filename or "recording.webm"
                content_type = file.content_type or "audio/webm"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")
                
            # 2. Call Sarvam speech_to_text service
            try:
                transcript = speech_to_text(file_bytes, filename, content_type)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Sarvam STT failed: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Either audio file, local_transcript, or mock_text must be provided")
        
    # 3. Detect intent (keyword matching)
    if not transcript:
        intent = "unknown"
        response_text = "Maaf kijiye, main aapka sawaal samajh nahi paaya."
    else:
        transcript_lower = transcript.lower()
        
        summary_keywords = ["hisaab", "aaj", "revenue", "income", "business", "हिसाब", "आज", "रेवेन्यू", "इनकम", "बिजनेस", "व्यापार", "धंधा", "कमाई"]
        loan_keywords = ["loan", "eligibility", "score", "finance", "लोन", "एलिजिबिलिटी", "स्कोर", "फाइनेंस", "ऋण"]
        gst_keywords = ["gst", "registration", "tax", "जीएसटी", "रजिस्ट्रेशन", "टैक्स", "कर"]
        udhar_keywords = ["udhar", "baaki", "pending", "credit", "उधार", "बाकी", "बकाया", "पेंडिंग", "क्रेडिट"]
        
        if any(kw in transcript_lower for kw in summary_keywords):
            intent = "summary"
            from app.services.finance import get_daily_summary, generate_summary_response
            summary_data = get_daily_summary(db, merchant_id="merchant_001")
            response_text = generate_summary_response(summary_data)
        elif any(kw in transcript_lower for kw in loan_keywords):
            intent = "loan"
            response_text = "Aapka loan readiness score 72 hai aur aap lagbhag 50000 rupaye ke loan ke liye eligible ho sakte hain."
        elif any(kw in transcript_lower for kw in gst_keywords):
            intent = "gst"
            from app.services.finance import get_gst_status, generate_gst_response
            gst_data = get_gst_status(db, merchant_id="merchant_001")
            response_text = generate_gst_response(gst_data)
        elif any(kw in transcript_lower for kw in udhar_keywords):
            intent = "udhar"
            
            matched_name = None
            
            # 1. Try checking if any database customer name is mentioned in Latin script
            try:
                from app.models import Udhar
                all_db_names = db.query(Udhar.customer_name).filter(Udhar.merchant_id == "merchant_001").distinct().all()
                for (db_name,) in all_db_names:
                    if db_name.lower() in transcript_lower:
                        matched_name = db_name
                        break
            except Exception as e:
                print(f"Error querying distinct udhar names: {e}")

            # 2. Try Devanagari translation mapping
            if not matched_name:
                name_map = {
                    "mohan": "Mohan", "रमेश": "Ramesh", "ramesh": "Ramesh",
                    "प्रथमेष": "Prathmesh", "prathmesh": "Prathmesh", "प्रथमेस": "Prathmesh", "प्रथमेश": "Prathmesh",
                    "जौन": "chandrasen", "जॉन": "chandrasen", "चंद्रसेन": "chandrasen", "चन्द्रसेन": "chandrasen", "chandrasen": "chandrasen",
                    "अमित": "Amit", "amit": "Amit", "संदीप": "Sandeep", "sandeep": "Sandeep",
                    "राजेश": "Rajesh", "rajesh": "Rajesh", "संजय": "Sanjay", "sanjay": "Sanjay",
                    "सुरेश": "Suresh", "suresh": "Suresh", "विजय": "Vijay", "vijay": "Vijay",
                    "अनिल": "Anil", "anil": "Anil", "सुनील": "Sunil", "sunil": "Sunil",
                    "राकेश": "Rakesh", "rakesh": "Rakesh", "प्रिया": "Priya", "priya": "Priya",
                    "नेहा": "Neha", "neha": "Neha", "सुनीता": "Sunita", "sunita": "Sunita",
                    "किरण": "Kiran", "kiran": "Kiran", "मीना": "Meena", "meena": "Meena",
                    "पूजा": "Pooja", "pooja": "Pooja", "आशा": "Asha", "asha": "Asha",
                    "रेखा": "Rekha", "rekha": "Rekha", "ज्योति": "Jyoti", "jyoti": "Jyoti",
                    "दीपा": "Deepa", "deepa": "Deepa", "विक्रम": "Vikram", "vikram": "Vikram",
                    "अर्जुन": "Arjun", "arjun": "Arjun", "करन": "Karan", "karan": "Karan",
                    "राहुल": "Rahul", "rahul": "Rahul", "आदित्य": "Aditya", "aditya": "Aditya",
                    "मनीष": "Manish", "manish": "Manish", "गौरव": "Gaurav", "gaurav": "Gaurav",
                    "आलोक": "Alok", "alok": "Alok", "विवेक": "Vivek", "vivek": "Vivek",
                    "दिनेश": "Dinesh", "dinesh": "Dinesh"
                }
                for key_name, db_name in name_map.items():
                    if key_name in transcript_lower:
                        matched_name = db_name
                        break
                        
            if matched_name:
                from app.crud import get_udhar_summary_by_customer
                summary = get_udhar_summary_by_customer(db, merchant_id="merchant_001", customer_name=matched_name)
                if summary:
                    response_text = f"{summary['customer']} ka {int(summary['amount'])} rupaye udhar baaki hai."
                else:
                    response_text = f"{matched_name} ka koi udhar baaki nahi hai."
            else:
                response_text = "Mohan ka 1200 rupaye udhar baaki hai."
        else:
            intent = "unknown"
            response_text = "Maaf kijiye, main aapka sawaal samajh nahi paaya."
            
    # 4. Call Sarvam text_to_speech service
    try:
        audio_url = text_to_speech(response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sarvam TTS failed: {str(e)}")
        
    # 5. Return result
    return {
        "transcript": transcript,
        "intent": intent,
        "response_text": response_text,
        "audio_url": audio_url
    }


@app.get("/api/summary", response_model=schemas.SummaryResponse)
def get_summary_api(
    merchant_id: str = Query("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Returns the daily business summary (today's totals, yesterday's comparison,
    and the chronological last 7 days revenue details).
    """
    try:
        from app.services.finance import get_daily_summary
        return get_daily_summary(db, merchant_id=merchant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gst-status", response_model=schemas.GSTStatusResponse)
def get_gst_status_api(
    merchant_id: str = Query("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Returns YTD revenue turnover compared against the 20 Lakh GST registration threshold,
    with alert levels.
    """
    try:
        from app.services.finance import get_gst_status
        return get_gst_status(db, merchant_id=merchant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/loan-score", response_model=schemas.LoanScoreResponse)
def get_loan_score_api(
    merchant_id: str = Query("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Returns the credit score assessment, loan eligibility estimate,
    and natural-language explainable reason for the score.
    """
    try:
        return scoring.calculate_loan_score(db, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/udhar", response_model=schemas.UdharResponse, status_code=status.HTTP_201_CREATED)
def create_udhar_direct(udhar: schemas.UdharCreateRequest, db: Session = Depends(get_db)):
    """
    Adds a new credit transaction entry for a customer.
    """
    db_merchant = crud.get_merchant(db, merchant_id=udhar.merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
        
    from datetime import date
    date_added = udhar.date_added if udhar.date_added else date.today()
    
    db_udhar = models.Udhar(
        customer_name=udhar.customer_name,
        amount=udhar.amount,
        date_added=date_added,
        merchant_id=udhar.merchant_id
    )
    db.add(db_udhar)
    db.commit()
    db.refresh(db_udhar)
    return db_udhar

@app.get("/api/udhar")
def read_customer_udhar_direct(
    name: str = Query(None, description="Name of customer to aggregate credit for"),
    merchant_id: str = Query("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Aggregates active debt records for a single customer name and calculates oldest days pending.
    """
    if name:
        summary = crud.get_udhar_summary_by_customer(db, merchant_id, name)
        if not summary:
            raise HTTPException(status_code=404, detail=f"No outstanding credit found for customer '{name}'")
        return summary
    else:
        raise HTTPException(status_code=400, detail="Missing required query parameter: 'name'")

@app.get("/api/udhar/all")
def read_all_udhar_paginated(
    merchant_id: str = Query("merchant_001"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    sort_by: str = Query("date_added"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    Lists all raw customer credit records with sorting and pagination support.
    """
    if sort_by not in ("customer_name", "amount", "date_added"):
        raise HTTPException(status_code=400, detail=f"Invalid sort field '{sort_by}'")
    if sort_order.lower() not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="sort_order must be 'asc' or 'desc'")
        
    items, total = crud.get_udhar_entries_paginated(
        db, merchant_id, skip=skip, limit=limit, sort_by=sort_by, sort_order=sort_order
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


# --- MERCHANT ENDPOINTS ---

@app.post(f"{settings.API_V1_STR}/merchants/", response_model=schemas.MerchantResponse, status_code=status.HTTP_201_CREATED)
def create_merchant(merchant: schemas.MerchantCreate, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db, merchant_id=merchant.id)
    if db_merchant:
        raise HTTPException(status_code=400, detail="Merchant already registered")
    return crud.create_merchant(db=db, merchant=merchant)

@app.get(f"{settings.API_V1_STR}/merchants/", response_model=List[schemas.MerchantResponse])
def read_merchants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_merchants(db, skip=skip, limit=limit)

@app.get(f"{settings.API_V1_STR}/merchants/{{merchant_id}}", response_model=schemas.MerchantResponse)
def read_merchant(merchant_id: str, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db, merchant_id=merchant_id)
    if db_merchant is None:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return db_merchant


# --- TRANSACTION ENDPOINTS ---

@app.post(f"{settings.API_V1_STR}/transactions/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    # Validate merchant exists
    db_merchant = crud.get_merchant(db, merchant_id=transaction.merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return crud.create_transaction(db=db, transaction=transaction)

@app.get(f"{settings.API_V1_STR}/transactions/{{merchant_id}}", response_model=List[schemas.TransactionResponse])
def read_transactions(merchant_id: str, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db, merchant_id=merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return crud.get_transactions_by_merchant(db, merchant_id=merchant_id, skip=skip, limit=limit)


# --- UDHAR ENDPOINTS (V1 ALIASES) ---

@app.post(f"{settings.API_V1_STR}/udhar/", response_model=schemas.UdharResponse, status_code=status.HTTP_201_CREATED)
def create_udhar(udhar: schemas.UdharCreate, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db, merchant_id=udhar.merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return crud.create_udhar(db=db, udhar=udhar)

@app.get(f"{settings.API_V1_STR}/udhar/{{merchant_id}}", response_model=List[schemas.UdharResponse])
def read_udhar(merchant_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    db_merchant = crud.get_merchant(db, merchant_id=merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return crud.get_udhar_by_merchant(db, merchant_id=merchant_id, skip=skip, limit=limit)


# --- CFO AND ANALYTICS ENDPOINTS ---

@app.get(f"{settings.API_V1_STR}/analytics/cfo-insights/{{merchant_id}}", response_model=schemas.CFOInsightsResponse)
def read_cfo_insights(merchant_id: str, db: Session = Depends(get_db)):
    try:
        return finance.get_cfo_insights(db, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- DEMO CONTROL ENDPOINTS ---

@app.post(f"{settings.API_V1_STR}/analytics/reset-demo", status_code=status.HTTP_200_OK)
def reset_and_seed_demo_data(db: Session = Depends(get_db)):
    """
    Clears all tables, recreates tables, seeds 'merchant_001' (Ramesh Kirana Store),
    and generates 180 days of highly realistic transaction & udhar data.
    """
    # 1. Reset tables (Clear and recreate)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed merchant
    merchant = generator.generate_merchant_data(db)
    
    # 3. Seed transactions
    tx_count = generator.generate_mock_transactions(db, merchant_id=merchant.id, days=180)
    
    # 4. Seed udhar
    udhar_count = generator.generate_mock_udhar(db, merchant_id=merchant.id)
    
    return {
        "status": "success",
        "message": f"Demo database reset and seeded successfully for {merchant.name}.",
        "details": {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "transactions_seeded": tx_count,
            "udhar_accounts_seeded": udhar_count,
            "simulated_days": 180
        }
    }
