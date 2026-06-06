from fastapi import FastAPI, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

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

# ============================================================
# LEDGER OCR & BILLING IMPORT ENDPOINTS
# ============================================================

@app.post("/api/import/ledger-ocr")
async def import_ledger_ocr(
    file: UploadFile = File(...),
    merchant_id: str = Form("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Accepts a mobile photo or scanned image of a paper ledger page.
    Runs OCR -> LLM structuring -> fuzzy name matching -> auto-saves to Udhar.
    Supported: JPG, JPEG, PNG
    """
    from app.services.ocr import extract_ocr_text, parse_ledger_with_llm, clean_and_validate_entries

    filename = file.filename or "ledger.jpg"
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ("jpg", "jpeg", "png"):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload JPG, JPEG, or PNG.")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # 1. OCR extraction
    try:
        ocr_text = extract_ocr_text(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

    # 2. Get existing customer names for fuzzy matching
    existing_customers = []
    try:
        all_customers = crud.get_customers_with_details(db, merchant_id)
        existing_customers = [c["customer_name"] for c in all_customers]
    except Exception:
        pass

    # 3. LLM structuring
    try:
        parsed_entries = parse_ledger_with_llm(ocr_text, existing_customers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM structuring failed: {str(e)}")

    # 4. Validate & fuzzy name fix
    validated = clean_and_validate_entries(parsed_entries, existing_customers)

    return {
        "status": "preview",
        "ocr_text": ocr_text,
        "total_extracted": len(validated),
        "entries": validated
    }


@app.post("/api/import/ledger-ocr/confirm")
def confirm_ledger_import(
    entries: list = None,
    merchant_id: str = "merchant_001",
    db: Session = Depends(get_db)
):
    """
    Confirms and saves reviewed ledger OCR entries to the database.
    Expects a JSON body: { "merchant_id": "...", "entries": [...] }
    """
    from fastapi import Request
    raise HTTPException(status_code=405, detail="Use the JSON body version below.")


from pydantic import BaseModel as PydanticBaseModel
from typing import List as TypingList

class LedgerConfirmEntry(PydanticBaseModel):
    name: str
    amount: float
    type: str = "udhar"
    date: Optional[str] = None
    notes: str = ""

class LedgerConfirmRequest(PydanticBaseModel):
    merchant_id: str = "merchant_001"
    entries: TypingList[LedgerConfirmEntry]

@app.post("/api/import/ledger-confirm")
def confirm_ledger_import_json(req: LedgerConfirmRequest, db: Session = Depends(get_db)):
    """
    User-approved: saves reviewed OCR entries into Udhar + Customer tables.
    """
    from datetime import date as date_type
    saved_count = 0
    errors = []

    db_merchant = crud.get_merchant(db, merchant_id=req.merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail=f"Merchant '{req.merchant_id}' not found.")

    for entry in req.entries:
        try:
            try:
                date_added = datetime.strptime(entry.date, "%Y-%m-%d").date() if entry.date else date_type.today()
            except Exception:
                date_added = date_type.today()

            new_udhar = models.Udhar(
                customer_name=entry.name,
                amount=entry.amount,
                date_added=date_added,
                merchant_id=req.merchant_id
            )
            db.add(new_udhar)
            crud.get_or_create_customer(db, req.merchant_id, entry.name)
            saved_count += 1
        except Exception as e:
            errors.append(f"Save failed for {entry.name}: {str(e)}")

    db.commit()

    return {
        "status": "success",
        "saved_to_udhar": saved_count,
        "errors": errors
    }


class BillingConfirmEntry(PydanticBaseModel):
    name: str
    amount: float
    type: str = "sale"
    date: Optional[str] = None
    notes: str = ""

class BillingConfirmRequest(PydanticBaseModel):
    merchant_id: str = "merchant_001"
    entries: TypingList[BillingConfirmEntry]

@app.post("/api/import/billing")
async def import_billing_file(
    file: UploadFile = File(...),
    merchant_id: str = Form("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Accepts a billing software export (CSV, XLSX, XLS).
    Auto-maps columns, extracts entries, returns preview for user review.
    Supported: CSV, XLSX, XLS
    """
    from app.services.billing_import import parse_billing_file, get_mock_billing_result

    filename = file.filename or "billing.csv"
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Unsupported format. Please upload CSV, XLSX, or XLS.")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    try:
        result = parse_billing_file(file_bytes, filename)
    except Exception as e:
        print(f"[BillingImport] Parse error, using mock: {e}")
        result = get_mock_billing_result()

    if not result["entries"]:
        result = get_mock_billing_result()

    return {
        "status": "preview",
        "file_type": result["file_type"],
        "total_entries": result["total_entries"],
        "total_amount": result["total_amount"],
        "breakdown_by_type": result["breakdown_by_type"],
        "entries": result["entries"]
    }


@app.post("/api/import/billing-confirm")
def confirm_billing_import(req: BillingConfirmRequest, db: Session = Depends(get_db)):
    """
    User-approved: saves reviewed billing entries to Transaction + Udhar tables.
    Automatically builds Customer Intelligence, Revenue Analytics, and Business Health.
    """
    from datetime import date as date_type
    saved_udhar = 0
    saved_sales = 0
    errors = []

    db_merchant = crud.get_merchant(db, merchant_id=req.merchant_id)
    if not db_merchant:
        raise HTTPException(status_code=404, detail=f"Merchant '{req.merchant_id}' not found.")

    for entry in req.entries:
        try:
            try:
                date_added = datetime.strptime(entry.date, "%Y-%m-%d").date() if entry.date else date_type.today()
            except Exception:
                date_added = date_type.today()

            entry_type = entry.type.lower()

            if entry_type in ("udhar", "credit"):
                new_udhar = models.Udhar(
                    customer_name=entry.name,
                    amount=entry.amount,
                    date_added=date_added,
                    merchant_id=req.merchant_id
                )
                db.add(new_udhar)
                crud.get_or_create_customer(db, req.merchant_id, entry.name)
                saved_udhar += 1
            else:
                # sale, payment, expense -> Transaction
                new_tx = models.Transaction(
                    customer_name=entry.name,
                    amount=entry.amount,
                    timestamp=datetime.combine(date_added, datetime.min.time()),
                    payment_mode="Import",
                    category="Import",
                    merchant_id=req.merchant_id
                )
                db.add(new_tx)
                # Auto-update customer intelligence
                try:
                    crud.upsert_customer_from_transaction(
                        db=db,
                        merchant_id=req.merchant_id,
                        customer_name=entry.name,
                        transaction_amount=entry.amount,
                        transaction_date=date_added
                    )
                except Exception:
                    crud.get_or_create_customer(db, req.merchant_id, entry.name)
                saved_sales += 1
        except Exception as e:
            errors.append(f"Save failed for {entry.name}: {str(e)}")

    db.commit()

    return {
        "status": "success",
        "saved_udhar_entries": saved_udhar,
        "saved_sale_entries": saved_sales,
        "total_saved": saved_udhar + saved_sales,
        "errors": errors
    }


@app.get("/api/import/history")
def get_import_history(
    merchant_id: str = Query("merchant_001"),
    db: Session = Depends(get_db)
):
    """
    Returns a summary of recent Udhar entries added in the last 30 days.
    """
    from datetime import date as date_type, timedelta
    cutoff = date_type.today() - timedelta(days=30)
    recent = db.query(models.Udhar).filter(
        models.Udhar.merchant_id == merchant_id,
        models.Udhar.date_added >= cutoff
    ).order_by(models.Udhar.date_added.desc()).limit(50).all()

    return {
        "count": len(recent),
        "entries": [
            {
                "customer_name": u.customer_name,
                "amount": u.amount,
                "date": str(u.date_added)
            } for u in recent
        ]
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
        
    # 3. Detect intent (LLM with rule-based fallback)
    if not transcript:
        intent = "unknown"
        response_text = "Maaf kijiye, main aapka sawaal samajh nahi paaya."
    else:
        from app.services.llm_agent import process_voice_llm
        llm_res = None
        try:
            llm_res = process_voice_llm(transcript, db, "merchant_001")
        except Exception as e:
            print(f"[LLM Agent Error] falling back to rule-based: {e}")
            
        if llm_res is not None:
            intent = llm_res.get("intent", "general")
            response_text = llm_res.get("response_text", "")
        else:
            from app.services.fallback_agent import process_fallback_voice
            fb_res = process_fallback_voice(transcript, db)
            intent = fb_res.get("intent", "unknown")
            response_text = fb_res.get("response_text", "")
            
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
    Also stores the customer's phone number if provided.
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

    # Save/update phone number on customer profile
    crud.get_or_create_customer(
        db, udhar.merchant_id, udhar.customer_name,
        phone_number=udhar.phone_number
    )

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


# --- DEFAULT DATA STATES ---
import json

DEFAULT_EXPENSES = [
    {"id": "exp_1", "name": "Store Rent (June)", "category": "Rent & Utility", "amount": 25000.0, "date": "2026-06-01", "type": "expense", "paymentMethod": "Card"},
    {"id": "exp_2", "name": "Electricity Bill (May)", "category": "Rent & Utility", "amount": 4800.0, "date": "2026-06-03", "type": "expense", "paymentMethod": "UPI"},
    {"id": "exp_3", "name": "Staff Salary (Raju)", "category": "Staff & Salary", "amount": 12000.0, "date": "2026-05-31", "type": "expense", "paymentMethod": "UPI"},
    {"id": "exp_4", "name": "Packaging Bags (Bulk)", "category": "Packaging & Transport", "amount": 2500.0, "date": "2026-06-02", "type": "expense", "paymentMethod": "Cash"},
    {"id": "exp_5", "name": "Transport to Mandi", "category": "Packaging & Transport", "amount": 1800.0, "date": "2026-06-04", "type": "expense", "paymentMethod": "Cash"},
    {"id": "exp_6", "name": "Tea & Snacks for staff", "category": "Miscellaneous", "amount": 650.0, "date": "2026-06-05", "type": "expense", "paymentMethod": "Cash"},
    {"id": "exp_7", "name": "Internet Broadband", "category": "Rent & Utility", "amount": 999.0, "date": "2026-05-28", "type": "expense", "paymentMethod": "UPI"},
    {"id": "exp_8", "name": "Flyer Printing", "category": "Marketing", "amount": 1500.0, "date": "2026-05-26", "type": "expense", "paymentMethod": "Wallet"}
]

DEFAULT_CASHBOOK = [
    {"id": "cash_1", "description": "Customer cash sale - counter retail", "flowType": "in", "category": "Cash Sale", "amount": 1450.0, "date": "2026-06-05", "notes": "Counter grocery checkout"},
    {"id": "cash_2", "description": "Sandeep Gupta debt repayment", "flowType": "in", "category": "Customer Repayment", "amount": 650.0, "date": "2026-06-05", "notes": "Cleared partial udhar dues"},
    {"id": "cash_3", "description": "Raju salary advance payment", "flowType": "out", "category": "Business Expense", "amount": 1000.0, "date": "2026-06-05", "notes": "Requested cash advance"},
    {"id": "cash_4", "description": "Withdrawal for home groceries (Gullak)", "flowType": "out", "category": "Personal Withdrawal (Gullak)", "amount": 800.0, "date": "2026-06-05", "notes": "Taken from register drawer"},
    {"id": "cash_5", "description": "Customer cash sales - afternoon", "flowType": "in", "category": "Cash Sale", "amount": 2100.0, "date": "2026-06-04"},
    {"id": "cash_6", "description": "Paid local tea vendor cash", "flowType": "out", "category": "Business Expense", "amount": 350.0, "date": "2026-06-04", "notes": "Staff tea and snacks"},
    {"id": "cash_7", "description": "Supplier payment - Refined Oil distributor", "flowType": "out", "category": "Supplier Repayment", "amount": 5000.0, "date": "2026-06-04", "notes": "Distributor cash payment"},
    {"id": "cash_8", "description": "Amit Sharma partial repayment", "flowType": "in", "category": "Customer Repayment", "amount": 1200.0, "date": "2026-06-03"},
    {"id": "cash_9", "description": "Withdrawal for personal medicines (Gullak)", "flowType": "out", "category": "Personal Withdrawal (Gullak)", "amount": 1500.0, "date": "2026-06-03"},
    {"id": "cash_10", "description": "Customer cash sale - night rush", "flowType": "in", "category": "Cash Sale", "amount": 3400.0, "date": "2026-06-03"},
    {"id": "cash_11", "description": "Wages paid to helper Raju", "flowType": "out", "category": "Business Expense", "amount": 3000.0, "date": "2026-06-02"},
    {"id": "cash_12", "description": "Customer cash sale - morning sales", "flowType": "in", "category": "Cash Sale", "amount": 1800.0, "date": "2026-06-02"},
    {"id": "cash_13", "description": "Opening cash drawer balance", "flowType": "in", "category": "Cash Sale", "amount": 10000.0, "date": "2026-06-01", "notes": "Drawer seed float"},
    {"id": "cash_14", "description": "Withdrawal for child school fees (Gullak)", "flowType": "out", "category": "Personal Withdrawal (Gullak)", "amount": 2000.0, "date": "2026-06-01"},
    {"id": "cash_15", "description": "Customer cash sale - evening", "flowType": "in", "category": "Cash Sale", "amount": 2200.0, "date": "2026-06-01"}
]

DEFAULT_STAFF = [
    {
        "id": "staff_1",
        "name": "Raman",
        "phone": "+91 98765 43210",
        "role": "Store Manager",
        "status": "Online",
        "lastActive": "2 mins ago",
        "joinDate": "2026-02-12",
        "productivityScore": 94,
        "permissions": ["customers", "suppliers", "expenses", "cashbook", "reports"],
        "activities": [
            {"time": "10:45 AM", "action": "Recorded Rice Purchase transaction (₹15,000)"},
            {"time": "09:30 AM", "action": "Created customer profile for Vikram Malhotra"},
            {"time": "Yesterday", "action": "Synchronized Tally supplier ledger records"}
        ]
    },
    {
        "id": "staff_2",
        "name": "Aarti Sharma",
        "phone": "+91 87654 32109",
        "role": "Billing Operator",
        "status": "Online",
        "lastActive": "15 mins ago",
        "joinDate": "2026-03-01",
        "productivityScore": 88,
        "permissions": ["customers", "expenses"],
        "activities": [
            {"time": "10:15 AM", "action": "Logged counter cash sale (₹1,450)"},
            {"time": "09:10 AM", "action": "Collected Sandeep Gupta payment (₹650)"},
            {"time": "Yesterday", "action": "Added new credit customer Kiran Rao"}
        ]
    },
    {
        "id": "staff_3",
        "name": "Raju helper",
        "phone": "+91 76543 21098",
        "role": "Delivery Boy & Stock Helper",
        "status": "Offline",
        "lastActive": "2 hours ago",
        "joinDate": "2026-04-10",
        "productivityScore": 76,
        "permissions": ["customers"],
        "activities": [
            {"time": "Yesterday", "action": "Delivered counter orders to Suresh Patel"},
            {"time": "2 days ago", "action": "Logged minor cash payout for Staff Tea (₹350)"}
        ]
    },
    {
        "id": "staff_4",
        "name": "Karan Johar",
        "phone": "+91 99887 76655",
        "role": "Accountant",
        "status": "Pending Approval",
        "lastActive": "Never",
        "joinDate": "2026-06-04",
        "productivityScore": 0,
        "permissions": ["expenses", "reports"],
        "activities": []
    }
]

DEFAULT_SUPPLIERS = [
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
        "reorder_qty": "150 kg",
        "insights": [
            "You usually purchase rice every 12 days.",
            "Current inventory may last only 5 more days.",
            "Recommended reorder quantity: 150 kg"
        ],
        "purchase_trend": [40000, 60000, 50000, 70000, 85000, 80000],
        "spending_trend": [45000, 58000, 52000, 68000, 80000, 80000]
    },
    {
        "id": 2,
        "name": "Tel-Ghee Distributor",
        "phone": "+919876543210",
        "pending_amount": 35000.0,
        "last_purchase_date": "2026-05-28",
        "risk_level": "low",
        "reliability_score": 92,
        "next_due_date": "2026-06-10",
        "avg_payment_delay": 6,
        "monthly_purchases": 95000.0,
        "category": "Oil & Dairy",
        "reorder_qty": "80 Liters",
        "insights": [
            "You purchase oil every 15 days.",
            "Next batch recommended on 10th June.",
            "Recommended reorder quantity: 80 Liters"
        ],
        "purchase_trend": [30000, 45000, 38000, 42000, 50000, 35000],
        "spending_trend": [30000, 40000, 39000, 41000, 48000, 35000]
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
        "category": "Spices",
        "reorder_qty": "25 kg",
        "insights": [
            "Delays in payment to Masale wale have reached 18 days.",
            "Interest penalties may apply if not cleared by 8th June.",
            "Recommended reorder quantity: 25 kg"
        ],
        "purchase_trend": [10000, 15000, 12000, 18000, 22000, 12000],
        "spending_trend": [8000, 14000, 11000, 19000, 21000, 12000]
    }
]

DEFAULT_SUPPLIER_ENTRIES = [
    { "id": 1, "supplier_id": 1, "amount": 80000.0, "date_added": "2026-06-04", "description": "Opening Balance" },
    { "id": 2, "supplier_id": 2, "amount": 35000.0, "date_added": "2026-05-28", "description": "Batch purchase" },
    { "id": 3, "supplier_id": 3, "amount": 12000.0, "date_added": "2026-05-15", "description": "Spices import" }
]

DEFAULT_BILLS = [
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
    },
    {
        "id": "bill_3",
        "type": "Internet",
        "amount": 999.0,
        "due_date": "2026-06-10",
        "status": "Pending",
        "description": "Broadband internet renewal"
    },
    {
        "id": "bill_4",
        "type": "Vendor",
        "amount": 12000.0,
        "due_date": "2026-06-08",
        "status": "Pending",
        "description": "Outstanding spices procurement from Masale Vendor"
    }
]

# --- DEMO CONTROL ENDPOINTS ---

@app.on_event("startup")
def startup_populate_missing_keys():
    db = next(get_db())
    try:
        for key, default_val in [
            ("expenses", DEFAULT_EXPENSES),
            ("cashbook", DEFAULT_CASHBOOK),
            ("staff", DEFAULT_STAFF),
            ("suppliers", DEFAULT_SUPPLIERS),
            ("supplier_entries", DEFAULT_SUPPLIER_ENTRIES),
            ("bills", DEFAULT_BILLS)
        ]:
            db_item = db.query(models.KeyValueStore).filter(models.KeyValueStore.key == key).first()
            if not db_item:
                db.add(models.KeyValueStore(key=key, value=json.dumps(default_val)))
        db.commit()
    except Exception as e:
        print(f"Error seeding missing keys on startup: {e}")

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
    
    # 4.5 Seed default dynamic state (Expenses, Cashbook, Staff, Suppliers, Supplier Entries, Bills)
    db.add(models.KeyValueStore(key="expenses", value=json.dumps(DEFAULT_EXPENSES)))
    db.add(models.KeyValueStore(key="cashbook", value=json.dumps(DEFAULT_CASHBOOK)))
    db.add(models.KeyValueStore(key="staff", value=json.dumps(DEFAULT_STAFF)))
    db.add(models.KeyValueStore(key="suppliers", value=json.dumps(DEFAULT_SUPPLIERS)))
    db.add(models.KeyValueStore(key="supplier_entries", value=json.dumps(DEFAULT_SUPPLIER_ENTRIES)))
    db.add(models.KeyValueStore(key="bills", value=json.dumps(DEFAULT_BILLS)))
    db.commit()

    # 5. Build customer intelligence profiles from seeded transactions
    customer_count = 0
    try:
        all_txs = db.query(models.Transaction).filter(
            models.Transaction.merchant_id == merchant.id
        ).all()
        seen_names = set()
        from datetime import date as date_type
        for tx in all_txs:
            if tx.customer_name and not tx.customer_name.startswith("Walk-in"):
                if tx.customer_name not in seen_names:
                    seen_names.add(tx.customer_name)
                    tx_date = tx.timestamp.date() if hasattr(tx.timestamp, 'date') else date_type.today()
                    crud.upsert_customer_from_transaction(
                        db=db,
                        merchant_id=merchant.id,
                        customer_name=tx.customer_name,
                        transaction_amount=tx.amount,
                        transaction_date=tx_date
                    )
                    customer_count += 1
    except Exception as e:
        print(f"[CustomerIntelligence] Seeding profiles failed: {e}")

    return {
        "status": "success",
        "message": f"Demo database reset and seeded successfully for {merchant.name}.",
        "details": {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "transactions_seeded": tx_count,
            "udhar_accounts_seeded": udhar_count,
            "customer_profiles_built": customer_count,
            "simulated_days": 180
        }
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
    db_tx = crud.create_transaction(db=db, transaction=transaction)

    # --- CUSTOMER INTELLIGENCE HOOK ---
    # After every successful payment, auto-update the customer profile
    try:
        from datetime import date as date_type
        tx_date = transaction.timestamp.date() if hasattr(transaction.timestamp, 'date') else date_type.today()
        crud.upsert_customer_from_transaction(
            db=db,
            merchant_id=transaction.merchant_id,
            customer_name=transaction.customer_name,
            transaction_amount=transaction.amount,
            transaction_date=tx_date
        )
    except Exception as e:
        # Non-fatal: log but don't fail the transaction
        print(f"[CustomerIntelligence] Profile update failed for {transaction.customer_name}: {e}")

    return db_tx


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

    # 5. Build customer intelligence profiles from seeded transactions
    customer_count = 0
    try:
        all_txs = db.query(models.Transaction).filter(
            models.Transaction.merchant_id == merchant.id
        ).all()
        seen_names = set()
        from datetime import date as date_type
        for tx in all_txs:
            if tx.customer_name and not tx.customer_name.startswith("Walk-in"):
                if tx.customer_name not in seen_names:
                    seen_names.add(tx.customer_name)
                    tx_date = tx.timestamp.date() if hasattr(tx.timestamp, 'date') else date_type.today()
                    crud.upsert_customer_from_transaction(
                        db=db,
                        merchant_id=merchant.id,
                        customer_name=tx.customer_name,
                        transaction_amount=tx.amount,
                        transaction_date=tx_date
                    )
                    customer_count += 1
    except Exception as e:
        print(f"[CustomerIntelligence] Seeding profiles failed: {e}")

    return {
        "status": "success",
        "message": f"Demo database reset and seeded successfully for {merchant.name}.",
        "details": {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "transactions_seeded": tx_count,
            "udhar_accounts_seeded": udhar_count,
            "customer_profiles_built": customer_count,
            "simulated_days": 180
        }
    }


# --- UDHAR INTELLIGENCE & REMINDER ENDPOINTS ---

from app.services.twilio_service import send_whatsapp_reminder

@app.post("/api/reminder/generate", response_model=schemas.ReminderGenerateResponse)
def generate_reminder_api(req: schemas.ReminderGenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a personalized payment reminder message for a customer based on relationship type.
    """
    customer_name = req.customer_name
    if req.customer_id:
        cust = db.query(models.Customer).filter(models.Customer.id == req.customer_id).first()
        if cust:
            customer_name = cust.customer_name
            
    if not customer_name:
        raise HTTPException(status_code=400, detail="Either customer_id or customer_name must be provided")
        
    summary = crud.get_udhar_summary_by_customer(db, "merchant_001", customer_name)
    if not summary:
        raise HTTPException(status_code=404, detail=f"No outstanding credit found for customer '{customer_name}'")
        
    cust_profile = crud.get_or_create_customer(db, "merchant_001", summary["customer"])
    
    # Update relationship type dynamically
    rel_type = crud.update_customer_relationship(
        db, cust_profile, summary["amount"], summary["days_pending"]
    )
    
    amount = summary["amount"]
    customer_display_name = summary["customer"]
    
    if rel_type == "loyal":
        message = f"Namaste {customer_display_name} ji,\nAapka ₹{int(amount)} baki hai.\nJab samay mile bhej dijiyega."
    elif rel_type == "risky":
        message = f"Namaste {customer_display_name} ji,\nAapka ₹{int(amount)} abhi bhi pending hai.\nKripya jaldi payment karein."
    else: # normal
        message = f"Namaste {customer_display_name} ji,\nAapka ₹{int(amount)} udhar baki hai.\nKripya jama kar dein."
        
    return {
        "customer": customer_display_name,
        "pending_amount": amount,
        "relationship": rel_type,
        "message": message
    }


@app.post("/api/reminder/send", response_model=schemas.ReminderSendResponse)
def send_reminder_api(req: schemas.ReminderSendRequest, db: Session = Depends(get_db)):
    """
    Generates and sends a payment reminder via WhatsApp using Twilio.
    Stores delivery status and updates last reminder sent timestamp.
    """
    # 1. Generate reminder
    try:
        gen_req = schemas.ReminderGenerateRequest(customer_id=req.customer_id, customer_name=req.customer_name)
        reminder = generate_reminder_api(gen_req, db)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate reminder: {str(e)}")
        
    # 2. Look up stored phone number if not explicitly provided in request
    to_number = req.to_number
    if not to_number:
        cust_profile_lookup = crud.get_or_create_customer(db, "merchant_001", reminder["customer"])
        to_number = cust_profile_lookup.phone_number  # may still be None → Twilio mock handles it

    # 3. Send WhatsApp
    send_res = send_whatsapp_reminder(
        customer_name=reminder["customer"],
        message=reminder["message"],
        to_number=to_number
    )
    
    if send_res.get("success"):
        # 3. Store delivery status (Update last reminder sent)
        cust_profile = crud.get_or_create_customer(db, "merchant_001", reminder["customer"])
        cust_profile.last_reminder_sent = datetime.now()
        db.add(cust_profile)
        db.commit()
        
        return {
            "success": True,
            "message_sid": send_res.get("message_sid"),
            "customer": reminder["customer"],
            "message": reminder["message"]
        }
    else:
        return {
            "success": False,
            "error": send_res.get("error", "Unknown sending failure"),
            "customer": reminder["customer"],
            "message": reminder["message"]
        }


def generate_udhar_insights(db: Session, merchant_id: str, total_udhar: float, customers: list) -> list:
    """
    Generates strategic business insights from Udhar credit ledger.
    """
    insights = []
    insights.append(f"Aapka total udhar ₹{int(total_udhar):,} hai.")
    
    # Find top debtor
    active_customers = [c for c in customers if c["pending_amount"] > 0]
    if active_customers:
        top_debtor = max(active_customers, key=lambda c: c["pending_amount"])
        insights.append(f"Sabse zyada ₹{int(top_debtor['pending_amount']):,} {top_debtor['customer_name']} par pending hai.")
    else:
        insights.append("Abhi kisi bhi customer par udhar pending nahi hai.")
        
    # Count late customers (>30 days pending)
    late_count = sum(1 for c in active_customers if c["days_pending"] > 30)
    insights.append(f"{late_count} customers 30 din se zyada late hain.")
    
    # Calculate recovery cash flow improvement
    try:
        from app.services.finance import get_cfo_insights
        cfo_data = get_cfo_insights(db, merchant_id)
        avg_monthly = cfo_data.revenue.average_monthly_revenue
    except Exception:
        avg_monthly = 115000.0 # fallback
        
    improvement_pct = int(round((total_udhar / avg_monthly) * 100)) if avg_monthly > 0 else 18
    improvement_pct = max(1, min(100, improvement_pct))
    
    insights.append(f"Recovery hone par cash flow mein {improvement_pct}% sudhar aa sakta hai.")
    return insights


@app.get("/api/udhar/health", response_model=schemas.UdharHealthResponse)
def get_udhar_health_api(merchant_id: str = Query("merchant_001"), db: Session = Depends(get_db)):
    """
    Aggregates Udhar balances into Healthy, Warning, and Risky categories based on Risk Score.
    Generates natural language business insights.
    """
    customers = crud.get_customers_with_details(db, merchant_id)
    
    total_udhar = 0.0
    healthy_amount = 0.0
    warning_amount = 0.0
    risky_amount = 0.0
    
    for c in customers:
        amt = c["pending_amount"]
        total_udhar += amt
        if c["risk_level"] == "low":
            healthy_amount += amt
        elif c["risk_level"] == "medium":
            warning_amount += amt
        elif c["risk_level"] == "high":
            risky_amount += amt
            
    insights = generate_udhar_insights(db, merchant_id, total_udhar, customers)
    
    return {
        "total_udhar": total_udhar,
        "healthy_amount": healthy_amount,
        "warning_amount": warning_amount,
        "risky_amount": risky_amount,
        "insights": insights
    }


@app.get("/api/customers", response_model=List[schemas.CustomerResponse])
def get_customers_api(merchant_id: str = Query("merchant_001"), db: Session = Depends(get_db)):
    """
    Returns list of all customers with aggregated udhar records and credit scores.
    """
    return crud.get_customers_with_details(db, merchant_id)


class PhoneUpdateRequest(schemas.BaseModel):
    phone_number: str


@app.patch("/api/customers/{customer_id}/phone")
def update_customer_phone(customer_id: int, req: PhoneUpdateRequest, db: Session = Depends(get_db)):
    """
    Assigns or updates the WhatsApp phone number for a customer.
    Works for customers created via voice assistant or manual form.
    """
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    phone = req.phone_number.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone number must start with country code, e.g. +919876543210")

    customer.phone_number = phone
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"success": True, "customer_id": customer_id, "phone_number": customer.phone_number}


# ============================================================
# CUSTOMER INTELLIGENCE API ENDPOINTS
# ============================================================

@app.get("/api/customer-insights", response_model=schemas.CustomerInsightsResponse)
def get_customer_insights_api(merchant_id: str = Query("merchant_001"), db: Session = Depends(get_db)):
    """
    Returns the full Customer Intelligence dashboard data:
    - KPI counts (total, VIP, Regular, New)
    - Average spend per customer
    - Top 5 by spending
    - Top 5 by visit frequency
    - Newest 5 customers
    - AI-generated insights in Hindi/Hinglish
    """
    from app.services.customer_insights import generate_customer_insights

    customers = crud.get_customer_intelligence_data(db, merchant_id)

    vip_count = sum(1 for c in customers if c["relationship_type"] == "VIP")
    regular_count = sum(1 for c in customers if c["relationship_type"] == "Regular")
    new_count = sum(1 for c in customers if c["relationship_type"] == "New")
    total = len(customers)
    avg_spend = sum(c["total_spent"] for c in customers) / total if total > 0 else 0.0

    top_by_spend = sorted(customers, key=lambda c: c["total_spent"], reverse=True)[:5]
    top_by_freq = sorted(customers, key=lambda c: c["visit_count"], reverse=True)[:5]
    newest = sorted(
        [c for c in customers if c.get("first_transaction_date")],
        key=lambda c: c["first_transaction_date"],
        reverse=True
    )[:5]

    ai_insights = generate_customer_insights(customers)

    def to_item(c):
        return {
            "customer_name": c["customer_name"],
            "total_spent": c["total_spent"],
            "visit_count": c["visit_count"],
            "relationship_type": c["relationship_type"],
            "last_transaction_date": c.get("last_transaction_date")
        }

    return {
        "total_customers": total,
        "vip_customers": vip_count,
        "regular_customers": regular_count,
        "new_customers": new_count,
        "avg_customer_spend": round(avg_spend, 2),
        "top_by_spend": [to_item(c) for c in top_by_spend],
        "top_by_frequency": [to_item(c) for c in top_by_freq],
        "newest_customers": [to_item(c) for c in newest],
        "ai_insights": ai_insights
    }


@app.get("/api/customer/{customer_id}")
def get_single_customer_api(customer_id: int, merchant_id: str = Query("merchant_001"), db: Session = Depends(get_db)):
    """
    Returns the full profile for a single customer combining:
    - Sales intelligence (visit_count, total_spent, relationship_type)
    - Udhar / credit data (pending_amount, risk_score)
    """
    from app.services.scoring import calculate_risk_score

    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.merchant_id == merchant_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Get udhar data
    udhar_summary = crud.get_udhar_summary_by_customer(db, merchant_id, customer.customer_name)
    pending_amount = udhar_summary["amount"] if udhar_summary else 0.0
    days_pending = udhar_summary["days_pending"] if udhar_summary else 0

    risk_res = calculate_risk_score(
        customer=customer.customer_name,
        amount_pending=pending_amount,
        days_pending=days_pending,
        previous_late_repayments=customer.late_repayments
    )

    return {
        "id": customer.id,
        "customer_name": customer.customer_name,
        "merchant_id": customer.merchant_id,
        "phone_number": customer.phone_number,
        "relationship_type": customer.relationship_type,
        "visit_count": customer.visit_count or 0,
        "total_spent": customer.total_spent or 0.0,
        "average_transaction": customer.average_transaction or 0.0,
        "first_transaction_date": customer.first_transaction_date,
        "last_transaction_date": customer.last_transaction_date,
        "pending_udhar": pending_amount,
        "days_pending": days_pending,
        "risk_score": risk_res["risk_score"],
        "risk_level": risk_res["risk_level"],
        "late_repayments": customer.late_repayments,
        "total_repayments": customer.total_repayments,
        "last_reminder_sent": customer.last_reminder_sent
    }


@app.get("/api/payment-insight")
def get_payment_insight_api(
    customer_name: str = Query(...),
    merchant_id: str = Query("merchant_001"),
    payment_amount: float = Query(0.0),
    db: Session = Depends(get_db)
):
    """
    Returns an AI insight card for the payment success screen.
    Called immediately after a successful payment to show the merchant
    contextual intelligence about this customer.
    """
    from app.services.customer_insights import generate_payment_insight

    customer = db.query(models.Customer).filter(
        models.Customer.customer_name == customer_name,
        models.Customer.merchant_id == merchant_id
    ).first()

    if not customer:
        return {
            "customer_name": customer_name,
            "visit_count": 1,
            "total_spent": payment_amount,
            "relationship_type": "New",
            "insight_message": f"Welcome! Yeh {customer_name} ki pehli purchase hai.",
            "is_milestone": True
        }

    return generate_payment_insight(
        customer_name=customer.customer_name,
        visit_count=customer.visit_count or 1,
        total_spent=customer.total_spent or payment_amount,
        relationship_type=customer.relationship_type or "New",
        payment_amount=payment_amount
    )


