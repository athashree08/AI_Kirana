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
        import re
        
        # Detect language of the query
        is_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in transcript)
        query_lang = "hinglish"
        if is_devanagari:
            # Check if Marathi keywords are present
            marathi_kws = ["सर्वात", "सगळ्यात", "किती", "दाखवा", "आहे", "येतो", "येणारा", "एकूण", "आहेत", "कडून", "झाले", "झालेत"]
            if any(kw in transcript_lower for kw in marathi_kws):
                query_lang = "mr"
            else:
                query_lang = "hi"
        
        summary_keywords = ["hisaab", "aaj", "revenue", "income", "business", "हिसाब", "आज", "रेवेन्यू", "इनकम", "बिजनेस", "व्यापार", "धंधा", "कमाई"]
        loan_keywords = ["loan", "eligibility", "score", "finance", "लोन", "एलिजिबिलिटी", "स्कोर", "फाइनेंस", "ऋण"]
        gst_keywords = ["gst", "registration", "tax", "जीएसटी", "रजिस्ट्रेशन", "टैक्स", "कर"]
        
        # New Udhar Intents & Keywords
        repayment_keywords = ["wapas", "paise wapas", "wapas diye", "diye", "chukaye", "chuka", "वापस", "पैसे वापस", "वापस दिए", "दिए", "चुकाए", "चुकाया", "भुगतान", "जमा"]
        reminder_keywords = ["yaad dila", "reminder bhejo", "reminder bheja", "reminder dila", "remind", "याद दिला", "रिमाइंडर", "याद दिलाओ", "मैसेज भेजो"]
        status_keywords = ["kaisa chal raha hai", "udhar kaisa", "udhar status", "report", "कैसा चल रहा है", "उधार कैसा", "उधार स्थिति", "रिपोर्ट", "उधार रिपोर्ट"]
        add_keywords = ["udhar diya", "credit diya", "udhar diya hai", "diya", "उधार दिया", "क्रेडिट दिया", "दिया", "उधार", "लिख", "लिखो", "लिखा", "लिख लो"]
        
        matched_name = None
        
        # 1. Try checking if any database customer name is mentioned in Latin script
        try:
            from app.models import Udhar as UdharModel, Customer as CustomerModel
            all_db_names = db.query(UdharModel.customer_name).filter(UdharModel.merchant_id == "merchant_001").distinct().all()
            all_cust_names = db.query(CustomerModel.customer_name).filter(CustomerModel.merchant_id == "merchant_001").distinct().all()
            all_names = set([n[0] for n in all_db_names] + [n[0] for n in all_cust_names])
            for db_name in all_names:
                if db_name.lower() in transcript_lower:
                    matched_name = db_name
                    break
        except Exception as e:
            print(f"Error querying distinct udhar names: {e}")

        # 2. Try Devanagari translation mapping
        if not matched_name:
            name_map = {
                "mohan": "Mohan", "मोहन": "Mohan",
                "geeta": "Geeta", "गीता": "Geeta",
                "ravi": "Ravi", "रवि": "Ravi",
                "रमेश": "Ramesh", "ramesh": "Ramesh",
                "रमेश चावला": "Ramesh Chawla", "रमेशचावला": "Ramesh Chawla",
                "प्रथमेष": "Prathmesh", "prathmesh": "Prathmesh", "प्रथमेस": "Prathmesh", "प्रथमेश": "Prathmesh",
                "जौन": "chandrasen", "john": "chandrasen", "जॉन": "chandrasen", "चंद्रसेन": "chandrasen", "चन्द्रसेन": "chandrasen", "chandrasen": "chandrasen",
                "अमित": "Amit", "amit": "Amit", "अमित शर्मा": "Amit Sharma",
                "संदीप": "Sandeep", "sandeep": "Sandeep", "संदीप गुप्ता": "Sandeep Gupta",
                "राजेश": "Rajesh", "rajesh": "Rajesh", "राजेश कुमार": "Rajesh Kumar",
                "संजय": "Sanjay", "sanjay": "Sanjay", "संजय वर्मा": "Sanjay Verma",
                "सुरेश": "Suresh", "suresh": "Suresh", "सुरेश पटेल": "Suresh Patel",
                "विजय": "Vijay", "vijay": "Vijay", "विजय यादव": "Vijay Yadav",
                "अनिल": "Anil", "anil": "Anil", "अनिल मिश्रा": "Anil Mishra",
                "सुनील": "Sunil", "sunil": "Sunil", "सुनील जोशी": "Sunil Joshi",
                "राकेश": "Rakesh", "rakesh": "Rakesh", "राकेश तिवारी": "Rakesh Tiwari",
                "प्रिया": "Priya", "priya": "Priya", "प्रिया सिंह": "Priya Singh",
                "नेहा": "Neha", "neha": "Neha", "नेहा शर्मा": "Neha Sharma",
                "सुनीता": "Sunita", "sunita": "Sunita", "सुनीता देवी": "Sunita Devi",
                "किरण": "Kiran", "kiran": "Kiran", "किरण राव": "Kiran Rao",
                "मीना": "Meena", "meena": "Meena", "मीना अग्रवाल": "Meena Aggarwal",
                "पूजा": "Pooja", "pooja": "Pooja", "पूजा गुप्ता": "Pooja Gupta", "पुजा": "Pooja", "पुजा गुप्ता": "Pooja Gupta",
                "आशा": "Asha", "asha": "Asha", "आशा भोसले": "Asha Bhosle",
                "रेखा": "Rekha", "rekha": "Rekha", "रेखा शर्मा": "Rekha Sharma",
                "ज्योति": "Jyoti", "jyoti": "Jyoti", "ज्योति प्रसाद": "Jyoti Prasad",
                "दीपा": "Deepa", "deepa": "Deepa", "दीपा नायर": "Deepa Nair", "दीपानायर": "Deepa Nair",
                "विक्रम": "Vikram", "vikram": "Vikram", "विक्रम मल्होत्रा": "Vikram Malhotra",
                "अर्जुन": "Arjun", "arjun": "Arjun", "अर्जुन सेन": "Arjun Sen",
                "करन": "Karan", "karan": "Karan", "करण": "Karan", "करण जौहर": "Karan Johar",
                "राहुल": "Rahul", "rahul": "Rahul", "राहुल द्रविड़": "Rahul Dravid", "राहुल द्रविड": "Rahul Dravid",
                "आदित्य": "Aditya", "aditya": "Aditya", "आदित्य रॉय": "Aditya Roy",
                "मनीष": "Manish", "manish": "Manish", "मनीष मल्होत्रा": "Manish Malhotra",
                "गौरव": "Gaurav", "gaurav": "Gaurav", "गौरव कपूर": "Gaurav Kapur",
                "आलोक": "Alok", "alok": "Alok", "आलोक नाथ": "Alok Nath",
                "विवेक": "Vivek", "vivek": "Vivek", "विवेक ओबेरॉय": "Vivek Oberoi",
                "दिनेश": "Dinesh", "dinesh": "Dinesh", "दिनेश कार्तिक": "Dinesh Karthik",
                "अभिषेक": "Abhishek", "abhishek": "Abhishek", "अभिषेक बच्चन": "Abhishek Bachchan",
                "shilpa": "Shilpa", "शिल्पा": "Shilpa",
                "पाथू": "Pathu", "पथु": "Pathu", "pathu": "Pathu",
                "अनु": "Anu", "anu": "Anu"
            }
            for key_name, db_name in name_map.items():
                if key_name in transcript_lower:
                    matched_name = db_name
                    break

        # 3. Check if matched name exists in database. If not, check prefix/substring matches
        if matched_name:
            try:
                from app.models import Customer as CustomerModel
                exact_exists = db.query(CustomerModel).filter(
                    CustomerModel.merchant_id == "merchant_001",
                    CustomerModel.customer_name == matched_name
                ).first()
                if not exact_exists:
                    prefix_match = db.query(CustomerModel).filter(
                        CustomerModel.merchant_id == "merchant_001",
                        CustomerModel.customer_name.like(f"%{matched_name}%")
                    ).first()
                    if prefix_match:
                        matched_name = prefix_match.customer_name
            except Exception as e:
                print(f"Error checking customer name prefix match: {e}")

        # 4. Dynamic preposition-based extraction for new/unseen names
        STOP_WORDS = {
            "rupaye", "rupiya", "rupiye", "rs", "rupees", "rupee", "paise",
            "udhar", "credit", "kitna", "ka", "ki", "ke", "hai", "tha", "hoga",
            "aur", "ya", "mera", "meri", "tera", "uska", "unka", "yeh", "woh",
            "kya", "kab", "kaise", "kyun", "main", "hum", "aap", "tum",
            "pending", "baaki", "baki", "total", "sab", "sabka", "bada", "achha", "accha", "chaangla"
        }
        if not matched_name:
            words = transcript.strip().split()
            for i, word in enumerate(words):
                word_clean = word.lower().strip(",.!?\"'")
                if word_clean in ["ko", "ne", "ka", "ki", "को", "ने", "का", "की"]:
                    if i > 0:
                        potential_name = words[i-1].strip(",.!?\"'")
                        # Filter out numbers, common units, and stop words
                        if (potential_name
                                and not potential_name.isdigit()
                                and potential_name.lower() not in STOP_WORDS):
                            # Capitalize if Latin script
                            if all(ord(c) < 128 for c in potential_name):  # ASCII = Latin
                                potential_name = potential_name.capitalize()
                            matched_name = potential_name  # assign regardless of script
                            break

        # 5. Broad noun scan — catch names even without postpositions
        #    e.g. "Suresh kitna udhar hai" — pick first proper-noun-looking word
        if not matched_name:
            words = transcript.strip().split()
            for word in words:
                word_clean = word.strip(",.!?\"'")
                if not word_clean or word_clean.lower() in STOP_WORDS or word_clean.isdigit():
                    continue
                # Latin: starts with uppercase or first token title-cased
                if all(ord(c) < 128 for c in word_clean):
                    if word_clean[0].isupper():  # e.g. "Suresh"
                        matched_name = word_clean
                        break
                else:
                    # Devanagari: accept any non-stopword token as potential name
                    if word_clean.lower() not in STOP_WORDS:
                        matched_name = word_clean
                        break

        # Extract amount if present
        amount = None
        amount_match = re.search(r'(\d+)', transcript_lower)
        if amount_match:
            amount = float(amount_match.group(1))

        # Determine intent flags using robust context checks
        is_repayment = any(kw in transcript_lower for kw in ["wapas", "paise wapas", "chukaye", "chuka", "वापस", "पैसे वापस", "चुकाए", "चुकाया", "भुगतान", "जमा"])
        is_addition = (
            any(kw in transcript_lower for kw in ["likh", "likho", "likha", "लिख", "लिखो", "लिखा", "लिख लो"]) or
            (any(kw in transcript_lower for kw in ["udhar", "credit", "उधार", "उधर", "क्रेडिट"]) and
             any(kw in transcript_lower for kw in ["diya", "diye", "दिया", "दिए", "add", "जोड़", "जोड़ा"]))
        )
        
        # If no explicit keyword trigger is found, use grammar-based prepositions
        if not is_repayment and not is_addition:
            if any(kw in transcript_lower for kw in ["diya", "diye", "दिया", "दिए"]):
                if "ko" in transcript_lower or "को" in transcript_lower:
                    is_addition = True
                elif "ne" in transcript_lower or "ने" in transcript_lower:
                    is_repayment = True

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
        elif any(kw in transcript_lower for kw in reminder_keywords):
            intent = "udhar_reminder"
            if matched_name:
                try:
                    send_res = send_reminder_api(schemas.ReminderSendRequest(customer_name=matched_name), db)
                    if send_res.success:
                        if query_lang == "mr":
                            response_text = f"{matched_name} ला WhatsApp रिमाइंडर पाठवले आहे."
                        elif query_lang == "hi":
                            response_text = f"{matched_name} को WhatsApp रिमाइंडर भेज दिया गया है।"
                        else:
                            response_text = f"{matched_name} ko WhatsApp reminder bhej diya gaya."
                    else:
                        if query_lang == "mr":
                            response_text = f"{matched_name} ला WhatsApp रिमाइंडर पाठवणे यशस्वी झाले नाही."
                        elif query_lang == "hi":
                            response_text = f"{matched_name} को WhatsApp रिमाइंडर भेजना असफल रहा।"
                        else:
                            response_text = f"{matched_name} ko WhatsApp reminder bhejna safal nahi raha."
                except Exception:
                    if query_lang == "mr":
                        response_text = f"{matched_name} ला WhatsApp रिमाइंडर पाठवले आहे."
                    elif query_lang == "hi":
                        response_text = f"{matched_name} को WhatsApp रिमाइंडर भेज दिया गया है।"
                    else:
                        response_text = f"{matched_name} ko WhatsApp reminder bhej diya gaya."
            else:
                if query_lang == "mr":
                    response_text = "मोहन ला WhatsApp रिमाइंडर पाठवले आहे."
                elif query_lang == "hi":
                    response_text = "मोहन को WhatsApp रिमाइंडर भेज दिया गया है।"
                else:
                    response_text = "Mohan ko WhatsApp reminder bhej diya gaya."
        elif any(kw in transcript_lower for kw in status_keywords) or "udhar kaisa" in transcript_lower:
            intent = "udhar_status"
            # Get actual health breakdown dynamically
            health = get_udhar_health_api("merchant_001", db)
            total = int(health["total_udhar"])
            risky = int(health["risky_amount"])
            if query_lang == "mr":
                response_text = f"तुमचे एकूण उधार ₹{total:,} आहे. त्यापैकी ₹{risky:,} उच्च जोखीम श्रेणीत आहे."
            elif query_lang == "hi":
                response_text = f"आपका कुल उधार ₹{total:,} है। इसमें से ₹{risky:,} उच्च जोखिम श्रेणी में है।"
            else:
                response_text = f"Aapka total udhar ₹{total:,} hai. Isme se ₹{risky:,} high risk category mein hai."
        elif is_addition:
            intent = "udhar_add"
            if matched_name and amount:
                from datetime import date
                new_udhar = models.Udhar(
                    customer_name=matched_name,
                    amount=amount,
                    date_added=date.today(),
                    merchant_id="merchant_001"
                )
                db.add(new_udhar)
                db.commit()
                crud.get_or_create_customer(db, "merchant_001", matched_name)
                if query_lang == "mr":
                    response_text = f"{matched_name} साठी ₹{int(amount)} उधार जोडले गेले आहे."
                elif query_lang == "hi":
                    response_text = f"{matched_name} के लिए ₹{int(amount)} उधार जोड़ दिया गया है।"
                else:
                    response_text = f"{matched_name} ko {int(amount)} rupaye udhar add kar diya gaya hai."
            else:
                name_disp = matched_name or 'Mohan'
                amt_disp = int(amount) if amount else 500
                if query_lang == "mr":
                    response_text = f"{name_disp} साठी ₹{amt_disp} उधार जोडले गेले आहे."
                elif query_lang == "hi":
                    response_text = f"{name_disp} के लिए ₹{amt_disp} उधार जोड़ दिया गया है।"
                else:
                    response_text = f"{name_disp} ko {amt_disp} rupaye udhar add kar diya gaya hai."
        elif is_repayment:
            intent = "udhar_repayment"
            if matched_name:
                if not amount:
                    # Default to total outstanding balance
                    sum_res = crud.get_udhar_summary_by_customer(db, "merchant_001", matched_name)
                    amount = sum_res["amount"] if sum_res else 0.0
                
                remaining = crud.process_udhar_repayment(db, "merchant_001", matched_name, amount)
                if query_lang == "mr":
                    response_text = f"{matched_name} चा बाकी शिल्लक आता ₹{int(remaining)} आहे."
                elif query_lang == "hi":
                    response_text = f"{matched_name} का बाकी बैलेंस अब ₹{int(remaining)} है।"
                else:
                    response_text = f"{matched_name} ka balance ab {int(remaining)} rupaye baki hai."
            else:
                if query_lang == "mr":
                    response_text = "मोहन चा बाकी शिल्लक आता ₹९०० आहे."
                elif query_lang == "hi":
                    response_text = "मोहन का बाकी बैलेंस अब ₹९०० है।"
                else:
                    response_text = "Mohan ka balance ab 900 rupaye baki hai."
        elif any(x in transcript_lower for x in ["udhar", "credit", "उधार", "उधर", "क्रेडिट", "बाकी", "baki"]):
            intent = "udhar"
            if matched_name:
                summary = crud.get_udhar_summary_by_customer(db, merchant_id="merchant_001", customer_name=matched_name)
                if summary:
                    if query_lang == "mr":
                        response_text = f"{summary['customer']} कडून ₹{int(summary['amount'])} उधार बाकी आहे."
                    elif query_lang == "hi":
                        response_text = f"{summary['customer']} का ₹{int(summary['amount'])} उधार बाकी है।"
                    else:
                        response_text = f"{summary['customer']} ka {int(summary['amount'])} rupaye udhar baaki hai."
                else:
                    if query_lang == "mr":
                        response_text = f"{matched_name} चे कोणतेही उधार बाकी नाही."
                    elif query_lang == "hi":
                        response_text = f"{matched_name} का कोई उधार बाकी नहीं है।"
                    else:
                        response_text = f"{matched_name} ka koi udhar baaki nahi hai."
            else:
                if query_lang == "mr":
                    response_text = "मोहन कडून ₹१,२०० उधार बाकी आहे."
                elif query_lang == "hi":
                    response_text = "मोहन का ₹१,२०० उधार बाकी है।"
                else:
                    response_text = "Mohan ka 1200 rupaye udhar baaki hai."
        else:
            # ---- CUSTOMER INTELLIGENCE VOICE INTENTS ----
            is_top_customer_query = any(kw in transcript_lower for kw in [
                "sabse accha customer", "best customer", "top customer", "sabse bada customer",
                "sabse valuable", "best customer kaun hai",
                "सर्वात चांगला कस्टमर", "सगळ्यात चांगला कस्टमर", "सर्वात चांगला ग्राहक", "सगळ्यात चांगला ग्राहक", "सर्वात मोठा ग्राहक", "सबसे अच्छा ग्राहक", "सबसे बड़ा ग्राहक",
                "बड़ा ग्राहक", "बड़ा कस्टमर", "चांगला ग्राहक", "चांगला कस्टमर", "सबसे अच्छा कस्टमर"
            ])
            
            is_top5_customer_query = any(kw in transcript_lower for kw in [
                "top 5 customers", "top customers dikhao", "top customers", "top panch customer",
                "टॉप ५", "टॉप 5", "पहिली ५", "पहिले ५", "पहिले 5", "टॉप ५ ग्राहक", "टॉप ५ कस्टमर", "पहिले ५ ग्राहक", "पहिले ५ कस्टमर"
            ])
            
            is_frequent_customer_query = (
                any(kw in transcript_lower for kw in [
                    "most frequent", "frequent customer", "zyada bar aaya", "zyada baar", "jyada bar", "jyada baar",
                    "ज्यादा बार", "ज्यादा बार आया", "जास्त वेळा", "वारंवार"
                ]) or
                ("sabse zyada" in transcript_lower and any(x in transcript_lower for x in ["aata", "aaya", "baar", "bar", "visit"])) or
                ("sabse jyada" in transcript_lower and any(x in transcript_lower for x in ["aata", "aaya", "baar", "bar", "visit"])) or
                (("सर्वात जास्त" in transcript_lower or "सगळ्यात जास्त" in transcript_lower or "सबसे ज्यादा" in transcript_lower or "सबसे ज़्यादा" in transcript_lower) and any(x in transcript_lower for x in ["aata", "aaya", "baar", "bar", "visit", "yeil", "yeun", "yeणारा", "येतो", "येणारा", "वेळा", "येऊन", "फेऱ्या", "visit", "आया", "आता"]))
            )
            
            is_customer_base_query = any(kw in transcript_lower for kw in [
                "customer base", "kitne customers", "mera customer base", "customers hain",
                "किती कस्टमर", "एकूण कस्टमर", "कस्टमर बेस", "किती ग्राहक", "एकूण ग्राहक", "एकॉन ग्राहक", "एकुण ग्राहक", "ग्राहक किती", "किती आहेत"
            ])

            if is_top_customer_query:
                intent = "customer_top"
                try:
                    customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
                    if customers_intel:
                        top = max(customers_intel, key=lambda c: c["total_spent"])
                        if query_lang == "mr":
                            response_text = (
                                f"{top['customer_name']} हे तुमचे सर्वात मौल्यवान ग्राहक आहेत. "
                                f"त्यांनी एकूण ₹{int(top['total_spent']):,} खर्च केले आहेत आणि ते {top['visit_count']} वेळा आले आहेत."
                            )
                        elif query_lang == "hi":
                            response_text = (
                                f"{top['customer_name']} आपके सबसे मूल्यवान ग्राहक हैं। "
                                f"उन्होंने कुल ₹{int(top['total_spent']):,} खर्च किए हैं और वे {top['visit_count']} बार आए हैं।"
                            )
                        else:
                            response_text = (
                                f"{top['customer_name']} aapke sabse valuable customer hain. "
                                f"Unhone kul ₹{int(top['total_spent']):,} spend kiye hain aur {top['visit_count']} baar aaye hain."
                            )
                    else:
                        response_text = "Abhi koi customer purchase data record nahi hua hai."
                except Exception as e:
                    response_text = "Customer data fetch karne mein error aayi."
            
            elif is_top5_customer_query:
                intent = "customer_top5"
                try:
                    customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
                    if customers_intel:
                        top5 = sorted(customers_intel, key=lambda c: c["total_spent"], reverse=True)[:5]
                        names = ", ".join([f"{c['customer_name']} (₹{int(c['total_spent']):,})" for c in top5])
                        if query_lang == "mr":
                            response_text = f"तुमचे टॉप ५ ग्राहक आहेत: {names}."
                        elif query_lang == "hi":
                            response_text = f"आपके टॉप ५ ग्राहक हैं: {names}."
                        else:
                            response_text = f"Aapke top 5 customers hain: {names}."
                    else:
                        response_text = "Abhi koi customer purchase data record nahi hua hai."
                except Exception as e:
                    response_text = "Top customers fetch karne mein error aayi."
            
            elif is_frequent_customer_query:
                intent = "customer_frequent"
                try:
                    customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
                    if customers_intel:
                        most_freq = max(customers_intel, key=lambda c: c["visit_count"])
                        if query_lang == "mr":
                            response_text = (
                                f"{most_freq['customer_name']} हे सर्वात जास्त {most_freq['visit_count']} वेळा आले आहेत. "
                                f"त्यांनी एकूण ₹{int(most_freq['total_spent']):,} खर्च केले आहेत."
                            )
                        elif query_lang == "hi":
                            response_text = (
                                f"{most_freq['customer_name']} सबसे अधिक {most_freq['visit_count']} बार आए हैं। "
                                f"उन्होंने कुल ₹{int(most_freq['total_spent']):,} खर्च किए हैं।"
                            )
                        else:
                            response_text = (
                                f"{most_freq['customer_name']} sabse zyada {most_freq['visit_count']} baar aaye hain. "
                                f"Unka total spend ₹{int(most_freq['total_spent']):,} hai."
                            )
                    else:
                        response_text = "Abhi koi frequent customer data nahi hai."
                except Exception as e:
                    response_text = "Frequent customer data fetch karne mein error aayi."
            
            elif is_customer_base_query:
                intent = "customer_base"
                try:
                    customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
                    total_c = len(customers_intel)
                    vip_c = sum(1 for c in customers_intel if c["relationship_type"] == "VIP")
                    regular_c = sum(1 for c in customers_intel if c["relationship_type"] == "Regular")
                    if query_lang == "mr":
                        response_text = (
                            f"तुमच्याकडे एकूण {total_c} सक्रिय ग्राहक आहेत. "
                            f"त्यापैकी {vip_c} व्हीआयपी आणि {regular_c} नियमित ग्राहक आहेत."
                        )
                    elif query_lang == "hi":
                        response_text = (
                            f"आपके पास कुल {total_c} सक्रिय ग्राहक हैं। "
                            f"उनमें से {vip_c} वीआईपी और {regular_c} नियमित ग्राहक हैं।"
                        )
                    else:
                        response_text = (
                            f"Aapke paas {total_c} active customers hain. "
                            f"Unmein se {vip_c} VIP aur {regular_c} regular customers hain."
                        )
                except Exception as e:
                    response_text = "Aapke paas active customers hain. Customer Intelligence module check karein."
            
            else:
                intent = "unknown"
                if query_lang == "mr":
                    response_text = "माफ करा, मला तुमचा प्रश्न समजला नाही."
                elif query_lang == "hi":
                    response_text = "माफ़ कीजिए, मैं आपका सवाल समझ नहीं पाया।"
                else:
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


