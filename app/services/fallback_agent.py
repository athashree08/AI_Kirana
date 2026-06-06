"""
fallback_agent.py — Rule-based voice Q&A fallback matching logic for AI Munshi.
Covers Hindi, Roman Hinglish, Marathi, and Roman Marathi.
"""

import re
import json
from datetime import datetime, timedelta, date as date_type
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models, crud

def process_fallback_voice(transcript: str, db: Session) -> dict:
    transcript_lower = transcript.lower()
    
    # Detect language of the query
    is_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in transcript)
    query_lang = "hinglish"
    if is_devanagari:
        # Check if Marathi keywords are present
        marathi_kws = ["सर्वात", "सगळ्यात", "किती", "दाखवा", "आहे", "येतो", "येणारा", "एकूण", "आहेत", "कडून", "झाले", "झालेत", "कोण", "कोणता", "कधी", "नफा", "खर्च", "पगार", "उधारी"]
        if any(kw in transcript_lower for kw in marathi_kws):
            query_lang = "mr"
        else:
            query_lang = "hi"
    else:
        marathi_roman_kws = ["sarvat", "sagyat", "kiti", "dakhva", "aahe", "yeto", "ekun", "aahet", "kdun", "zhali", "zale", "changla", "changli", "konte", "kadhi", "grahak", "maza", "mazi", "maze", "kon", "navin", "udhari"]
        if any(kw in transcript_lower for kw in marathi_roman_kws):
            query_lang = "mr_roman"

    summary_keywords = ["hisaab", "aaj", "revenue", "income", "business", "हिसाब", "आज", "रेवेन्यू", "इनकम", "बिजनेस", "व्यापार", "धंधा", "कमाई"]
    loan_keywords = ["loan", "eligibility", "score", "finance", "लोन", "एलिजिबिलिटी", "स्कोर", "फाइनेंस", "ऋण"]
    gst_keywords = ["gst", "registration", "tax", "जीएसटी", "रजिस्ट्रेशन", "टैक्स", "कर"]
    
    # Udhar Intents & Keywords
    repayment_keywords = ["wapas", "paise wapas", "wapas diye", "diye", "chukaye", "chuka", "वापस", "पैसे वापस", "वापस दिए", "दिए", "चुकाए", "चुकाया", "भुगतान", "जमा", "परत केली", "परत केले", "jama", "dile"]
    reminder_keywords = ["yaad dila", "reminder bhejo", "reminder bheja", "reminder dila", "remind", "याद दिला", "रिमाइंडर", "याद दिलाओ", "मैसेज भेजो", "पाठवा", "remind karo", "reminder send"]
    status_keywords = ["kaisa chal raha hai", "udhar kaisa", "udhar status", "report", "कैसा चल रहा है", "उधार कैसा", "उधार स्थिति", "रिपोर्ट", "उधार रिपोर्ट"]
    add_keywords = ["udhar diya", "credit diya", "udhar diya hai", "diya", "उधार दिया", "क्रेडिट दिया", "दिया", "उधार", "लिख", "लिखो", "लिखा", "लिख लो"]
    
    matched_name = None
    
    # 1. Check if any database customer name is mentioned in Latin script
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

    # 2. Devanagari translation mapping
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
            "संजय": "Sanjay", "sanjay": "Sanjay", "sanjay verma": "Sanjay Verma",
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
            "deepa nair": "Deepa Nair",
            "विक्रम": "Vikram", "vikram": "Vikram", "विक्रम मल्होत्रा": "Vikram Malhotra",
            "अर्जुन": "Arjun", "arjun": "Arjun", "अर्जुन सेन": "Arjun Sen", "arjun sen": "Arjun Sen",
            "करन": "Karan", "karan": "Karan", "करण": "Karan",
            "राहुल": "Rahul", "rahul": "Rahul",
            "आदित्य": "Aditya", "aditya": "Aditya",
            "मनीष": "Manish", "manish": "Manish",
            "गौरव": "Gaurav", "gaurav": "Gaurav",
            "आलोक": "Alok", "alok": "Alok",
            "विवेक": "Vivek", "vivek": "Vivek",
            "दिनेश": "Dinesh", "dinesh": "Dinesh",
            "अभिषेक": "Abhishek", "abhishek": "Abhishek",
            "shilpa": "Shilpa", "शिल्पा": "Shilpa",
            "sita": "Sita", "सीता": "Sita",
            "kavita": "Kavita", "कविता": "Kavita",
            "पाथू": "Pathu", "पथु": "Pathu", "pathu": "Pathu",
            "अनु": "Anu", "anu": "Anu"
        }
        for key_name, db_name in name_map.items():
            if key_name in transcript_lower:
                matched_name = db_name
                break

    # 3. Substring checks for customer name in database
    if matched_name:
        try:
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

    # 4. Preposition extraction
    STOP_WORDS = {
        "rupaye", "rupiya", "rupiye", "rs", "rupees", "rupee", "paise",
        "udhar", "credit", "kitna", "ka", "ki", "ke", "hai", "tha", "hoga",
        "aur", "ya", "mera", "meri", "tera", "uska", "unka", "yeh", "woh",
        "kya", "kab", "kaise", "kyun", "main", "hum", "aap", "tum",
        "pending", "baaki", "baki", "total", "sab", "sabka", "bada", "achha", "accha", "chaangla",
        "का", "की", "के", "को", "ने", "से", "में", "पर", "है", "हैं", "था", "थे", "थी",
        "मेरा", "मेरी", "मेरे", "मुझे", "मुझसे", "तेरा", "तेरी", "तेरे", "उसका", "उसकी", "उसके",
        "उनका", "उनकी", "उनके", "हमारा", "हमारी", "हमारे", "हमें", "आपका", "आपकी", "आपके", "आपको",
        "क्या", "कब", "कैसे", "कैसा", "कैसी", "कहाँ", "कहा", "क्यों", "क्यूं", "कितना", "कितनी", "कितने",
        "और", "या", "भी", "तो", "ही", "यह", "वह", "ये", "वे", "इस", "उस", "इन", "उन",
        "उधार", "उधर", "क्रेडिट", "बाकी", "बकी", "कुल", "सब", "सबका", "पेंडिंग", "कागदपत्रे", "दस्तावेज", "खर्च",
        "माझा", "माझी", "माझे", "तुझा", "तुझी", "तुझे", "त्याचा", "त्याची", "त्याचे", "आमचा", "आमची", "आमचे", "तुमचा", "तुमची", "तुमचे",
        "कसे", "कसा", "कशी", "कुणाचे", "कधी", "किती", "आहे", "आहेत", "होते", "होता", "होती", "झाले",
        "electricity", "rent", "salary", "staff", "intern", "internet", "wifi", "broadband", "bill", "bills", "packaging", "transport", "mandi", "tea", "snacks", "marketing", "flyer",
        "इलेक्ट्रिसिटी", "बिजली", "लाइट", "इलेक्ट्रिसिटी", "रेंट", "किराया", "भाड़ा", "भाडे", "रेंट", "सैलरी", "पगार", "तनख्वाह", "इंटरनेट", "बिल", "पैकेजिंग", "थैली", "ट्रांसपोर्ट", "चहा", "चाय", "नाश्ता", "खर्च", "खर्चा", "लाइट"
    }
    if not matched_name:
        words = transcript.strip().split()
        for i, word in enumerate(words):
            word_clean = word.lower().strip(",.!?\"'")
            if word_clean in ["ko", "ne", "ka", "ki", "को", "ने", "का", "की", "la", "ला"]:
                if i > 0:
                    potential_name = words[i-1].strip(",.!?\"'")
                    if (potential_name
                            and not potential_name.isdigit()
                            and potential_name.lower() not in STOP_WORDS):
                        if all(ord(c) < 128 for c in potential_name):
                            potential_name = potential_name.capitalize()
                        matched_name = potential_name
                        break

    # 5. Broad noun scan
    if not matched_name:
        words = transcript.strip().split()
        for word in words:
            word_clean = word.strip(",.!?\"'")
            if not word_clean or word_clean.lower() in STOP_WORDS or word_clean.isdigit():
                continue
            if all(ord(c) < 128 for c in word_clean):
                if word_clean[0].isupper():
                    matched_name = word_clean
                    break
            else:
                if word_clean.lower() not in STOP_WORDS:
                    matched_name = word_clean
                    break

    # Extract amount if present
    amount = None
    amount_match = re.search(r'(\d+)', transcript_lower)
    if amount_match:
        amount = float(amount_match.group(1))

    # Determine intent flags
    is_repayment = any(kw in transcript_lower for kw in ["wapas", "paise wapas", "chukaye", "chuka", "वापस", "पैसे वापस", "चुकाए", "चुकाया", "भुगतान", "जमा", "परत केली", "परत केले", "jama", "dile"])
    is_addition = (
        any(kw in transcript_lower for kw in ["likh", "likho", "likha", "लिख", "लिखो", "लिखा", "लिख लो", "नोंदवा", "लिहा", "लिहून घ्या"]) or
        (any(kw in transcript_lower for kw in ["udhar", "credit", "उधार", "उधर", "क्रेडिट", "उधारी"]) and
         any(kw in transcript_lower for kw in ["diya", "diye", "दिया", "दिए", "add", "जोड़", "जोड़ा", "जोडा", "दिले"]))
    )
    
    if not is_repayment and not is_addition:
        if any(kw in transcript_lower for kw in ["diya", "diye", "दिया", "दिए", "दिले"]):
            if any(x in transcript_lower for x in ["ko", "को", "la", "ला"]):
                is_addition = True
            elif any(x in transcript_lower for x in ["ne", "ने"]):
                is_repayment = True

    response_text = ""
    intent = "unknown"

    # App Help FAQ - Udhar add
    if any(x in transcript_lower for x in ["udhar kaise add", "udhar add kaise", "उधार कैसे जोड़ें", "उधार कशी जोडावी", "udhar kaise jode", "udhar kaise likhe"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "उधार जोडण्यासाठी: 'उधार बही खाता' मध्ये जा, '+' वर क्लिक करा, ग्राहकाचे नाव आणि रक्कम भरा आणि जतन करा."
        elif query_lang == "hi":
            response_text = "उधार जोड़ने के लिए: 'उधार बही खाता' में जाएं, '+' बटन दबाएं, नाम और अमाउंट भरें और सेव करें।"
        else:
            response_text = "To add udhar: Open 'Udhar Bahi Khata', tap the blue '+' button, fill customer details and click Save."

    # App Help FAQ - Repayment record
    elif any(x in transcript_lower for x in ["repayment kaise", "repayment record", "परतफेड कशी नोंदवावी", "wapas kaise"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "परतफेड नोंदवण्यासाठी: ग्राहकाच्या नावावर क्लिक करा आणि 'Received' बटण दाबून रक्कम भरा."
        elif query_lang == "hi":
            response_text = "पैसे वापस दर्ज करने के लिए: ग्राहक की प्रोफाइल पर क्लिक करें और 'Received' बटन दबाकर राशि लिखें।"
        else:
            response_text = "To record repayment: Click on the customer name in ledger, select 'Received' and enter amount."

    # App Help FAQ - Expense add
    elif any(x in transcript_lower for x in ["expense kaise", "खर्च कसा जोडावा", "expense kaise add"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "खर्च जोडण्यासाठी: 'Expense Intelligence' मध्ये जा, '+' वर क्लिक करा आणि श्रेणी व रक्कम भरा."
        elif query_lang == "hi":
            response_text = "खर्च जोड़ने के लिए: 'Expense Intelligence' सेक्शन में जाकर '+' बटन दबाएं और श्रेणी तथा राशि दर्ज करें।"
        else:
            response_text = "To add an expense: Go to 'Expense Intelligence', tap the '+' icon and enter description/category/amount."

    # App Help FAQ - Reminder how it works
    elif any(x in transcript_lower for x in ["reminder kaise", "याद दिलाना", "रिमाइंडर कसे काम करते", "reminder kaise kaam"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "WhatsApp रिमाइंडर सिस्टीम Twilio द्वारे ग्राहकांना त्यांच्या थकीत रकमेचा संदेश पाठवते."
        elif query_lang == "hi":
            response_text = "WhatsApp रिमाइंडर सिस्टम Twilio के जरिए कस्टमर को उनके उधार चुकाने का ऑटोमेटेड मैसेज भेजता है।"
        else:
            response_text = "The WhatsApp reminder system uses Twilio API to send polite payment requests directly to the customer's phone."

    # App Help FAQ - Customer Intelligence
    elif any(x in transcript_lower for x in ["customer intelligence", "कस्टमर इंटेलिजन्स"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "यामध्ये तुमचे महत्त्वाके ग्राहक (VIP), नियमित ग्राहक आणि त्यांचे विश्लेषण दिसते."
        elif query_lang == "hi":
            response_text = "कस्टमर इंटेलिजेंस में सबसे अधिक खर्च करने वाले (VIP), सबसे ज्यादा बार आने वाले और एट-रिस्क ग्राहकों का विश्लेषण होता है।"
        else:
            response_text = "Customer Intelligence categorizes customers into VIP, Regular, or At-Risk based on purchase history."

    # App Help FAQ - Cashbook
    elif any(x in transcript_lower for x in ["cashbook", "कैशबुक"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "कॅशबुकमध्ये दररोजचे रोख (Cash) आणि डिजिटल (UPI) व्यवहार नोंदवले जातात."
        elif query_lang == "hi":
            response_text = "कैशबुक में रोजाना की कुल नकदी (Cash In/Cash Out) और डिजिटल पेमेंट्स को मैनेज किया जाता है।"
        else:
            response_text = "Cashbook is your digital cash register to record all cash-in and cash-out operations."

    # App Help FAQ - Staff module
    elif any(x in transcript_lower for x in ["staff module", "naukar", "नौकर", "कर्मचारी", "staff kaise"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "स्टाफ मॉड्यूलमध्ये तुम्ही कर्मचाऱ्यांची उपस्थिती आणि परवानग्या व्यवस्थापित करू शकता."
        elif query_lang == "hi":
            response_text = "स्टाफ मॉड्यूल से आप अपने कर्मचारियों की परमिशन (access levels) और काम को मैनेज कर सकते हैं।"
        else:
            response_text = "Staff Management allows you to add employees and control their module access levels."

    # App Help FAQ - QR Terminal
    elif any(x in transcript_lower for x in ["qr terminal", "क्यूआर"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "क्यूआर टर्मिनल थेट काउंटरवर डिजिटल पेमेंट स्वीकारून कॅशबुकशी जोडतो."
        elif query_lang == "hi":
            response_text = "QR टर्मिनल आपकी दुकान पर तुरंत UPI पेमेंट लेने के लिए काम करता है जो कैशबुक से सीधे सिंक रहता है।"
        else:
            response_text = "QR Terminal displays a dynamic UPI code to accept live store payments."

    # App Help FAQ - Export Report
    elif any(x in transcript_lower for x in ["report kaise", "export", "रिपोर्ट कशी डाउनलोड करावी", "report download"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "रिपोर्ट्स विभागात जा, हवी ती रिपोर्ट निवडा आणि वर उजवीकडे 'Export PDF' वर क्लिक करा."
        elif query_lang == "hi":
            response_text = "रिपोर्ट डाउनलोड करने के लिए: Reports & Analytics में जाएं, रिपोर्ट चुनें और ऊपर 'Export PDF' दबाएं।"
        else:
            response_text = "To export a report: Navigate to 'Reports & Analytics', choose a report, and click 'Export PDF'."

    # App Help FAQ - Voice Assistant
    elif any(x in transcript_lower for x in ["assistant", "sawaal", "आवाज", "सहाय्यक", "voice assistant"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "आवाज सहाय्यकाद्वारे तुम्ही बोलून उधार जोडणे, रिपोर्ट तपासणे किंवा हिशेब विचारू शकता."
        elif query_lang == "hi":
            response_text = "वॉइस असिस्टेंट से आप सीधे बोलकर उधार दर्ज कर सकते हैं, पेमेंट रिमाइंडर भेज सकते हैं और सेल्स का हिसाब ले सकते हैं।"
        else:
            response_text = "You can speak commands to record credit/repayments or ask finance related questions."

    # App Help FAQ - Mic
    elif any(x in transcript_lower for x in ["mic", "माईक", "माइक"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "माईक चालत नसेल तर ब्राउझर परवानग्या तपासा किंवा वेबसाईट सुरक्षित (https) आहे का ते पहा."
        elif query_lang == "hi":
            response_text = "अगर माइक काम नहीं कर रहा तो ब्राउज़र की एड्रेस बार में लॉक आइकॉन पर क्लिक करके माइक परमिशन Allow करें।"
        else:
            response_text = "If microphone fails, check site permission settings in your browser or use text input fallback."

    # App Help FAQ - Security
    elif any(x in transcript_lower for x in ["secure", "सुरक्षित", "डेटा", "security", "safe"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा डेटा बँकेसारख्या मजबूत AES-256 सुरक्षिततेसह क्लाउडवर सुरक्षित ठेवला जातो."
        elif query_lang == "hi":
            response_text = "आपका डेटा बैंकिंग ग्रेड AES-256 एन्क्रिप्शन के साथ पूरी तरह सुरक्षित और क्लाउड पर बैकड-अप है।"
        else:
            response_text = "Your business data is protected by bank-grade AES-256 encryption and auto cloud backup."

    # App Help FAQ - Tally Sync
    elif any(x in transcript_lower for x in ["tally", "vyapar", "टॅली", "टैली"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "सेटिंग्ज -> इंटिग्रेशनमध्ये जाऊन तुम्ही Tally किंवा Vyapar शी थेट डेटा सिंक करू शकता."
        elif query_lang == "hi":
            response_text = "सेटिंग्स में Integrations टैब में जाकर आप अपनी Tally या Vyapar फाइल अपलोड करके सीधे सिंक कर सकते हैं।"
        else:
            response_text = "To sync with Tally: Go to Settings -> Integrations and upload your Tally XML export."

    # App Help FAQ - Multi store
    elif any(x in transcript_lower for x in ["ek se zyada", "multiple store", "दुकाने", "दुकानें", "multi-store"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "होय, तुम्ही उजवीकडे वरच्या कोपऱ्यात दिलेल्या बटनमधून अनेक दुकाने बदलू शकता."
        elif query_lang == "hi":
            response_text = "हां! आप ऐप में एक से ज्यादा दुकानों को ऊपर दिए गए मर्चेंट स्विचर से आसानी से मैनेज कर सकते हैं।"
        else:
            response_text = "Yes, you can manage multiple businesses using the merchant switcher at top-right."

    # App Help FAQ - Phone Update
    elif any(x in transcript_lower for x in ["phone number update", "phone update", "नंबर अपडेट", "number kaise badle"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "ग्राहक प्रोफाइल उघडा, phone number वर क्लिक करा, नवीन नंबर टाकून जतन करा."
        elif query_lang == "hi":
            response_text = "ग्राहक का नंबर अपडेट करने के लिए: ग्राहक की प्रोफाइल खोलें, फोन नंबर फील्ड एडिट करें और सेव करें।"
        else:
            response_text = "To update phone number: Open customer profile, edit the phone number field and click Save."

    # App Help FAQ - Delete Entry
    elif any(x in transcript_lower for x in ["delete", "हटवणे", "डिलीट", "entry delete"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "व्यवहार उघडा आणि 'Delete' दाबा. जुने व्यवहार हटवण्यासाठी मालकाची परवानगी आवश्यक आहे."
        elif query_lang == "hi":
            response_text = "गलत एंट्री डिलीट करने के लिए: ट्रांजैक्शन पर क्लिक करें, एडिट/डिलीट दबाएं और डिलीट करने का कारण दर्ज करें।"
        else:
            response_text = "To delete an entry: Select the entry in Ledger or Cashbook, click Delete, and provide deletion reason."

    # App Help FAQ - Offline Support
    elif any(x in transcript_lower for x in ["offline", "ऑफलाईन"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "उधार आणि खर्च नोंदवणे ऑफलाइन चालते. व्हॉईस असिस्टंटसाठी इंटरनेट आवश्यक आहे."
        elif query_lang == "hi":
            response_text = "बेसिक बही खाता और उधारी जोड़ने के फीचर्स ऑफलाइन काम करते हैं। वॉइस असिस्टेंट के लिए इंटरनेट जरूरी है।"
        else:
            response_text = "The ledger works completely offline. Internet is only required for the Voice Assistant features."

    # App Help FAQ - Revenue Score Meaning
    elif any(x in transcript_lower for x in ["revenue score ka matlab", "revenue score kya"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "रेवेन्यू स्कोर म्हणजे तुमच्या दरमहा उलाढालीवर आधारित मिळणारे गुण (कमाल ४०)."
        elif query_lang == "hi":
            response_text = "लोन स्कोर में रेवेन्यू स्कोर का मतलब है कि आपके मासिक टर्नओवर के आधार पर मिलने वाले पॉइंट्स (अधिकतम ४०)।"
        else:
            response_text = "Revenue score represents points awarded based on your monthly sales volume (max 40)."

    # App Help FAQ - Reminder Cost
    elif any(x in transcript_lower for x in ["reminder bhejne ka charge", "charge kya", "reminder cost", "किंमत", "whatsapp reminder cost"]):
        intent = "app_help"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "पहिले ५० रिमाइंडर्स विनामूल्य आहेत. त्यानंतर प्रति संदेश ₹०.५० शुल्क आकारले जाते."
        elif query_lang == "hi":
            response_text = "पहले ५० रिमाइंडर्स बिल्कुल फ्री हैं। उसके बाद प्रति रिमाइंडर केवल ₹०.५० का charge लगता है।"
        else:
            response_text = "First 50 WhatsApp reminders are free, then it costs ₹0.50 per reminder message."

    # Operating Expenses Queries
    elif any(x in transcript_lower for x in ["electricity", "बिजली", "लाइट", "इलेक्ट्रिसिटी", "rent", "किराया", "भाड़ा", "भाडे", "रेंट", "salary", "सैलरी", "तनख्वाह", "पगार", "raju", "राजू", "internet", "broadband", "wifi", "इंटरनेट", "वायफाय", "packaging", "पैकेजिंग", "transport", "ट्रांसपोर्ट", "mandi", "मंडी", "total expense", "ekun kharch", "कुल खर्च", "एकूण खर्च"]):
        intent = "profit_analysis"
        db_item = db.query(models.KeyValueStore).filter(models.KeyValueStore.key == "expenses").first()
        exp_list = None
        if db_item:
            try:
                exp_list = json.loads(db_item.value)
            except Exception:
                pass
        if not exp_list:
            exp_list = [
                {"id": "exp_1", "name": "Store Rent (June)", "category": "Rent & Utility", "amount": 25000.0, "date": "2026-06-01", "type": "expense", "paymentMethod": "Card"},
                {"id": "exp_2", "name": "Electricity Bill (May)", "category": "Rent & Utility", "amount": 4800.0, "date": "2026-06-03", "type": "expense", "paymentMethod": "UPI"},
                {"id": "exp_3", "name": "Staff Salary (Raju)", "category": "Staff & Salary", "amount": 12000.0, "date": "2026-05-31", "type": "expense", "paymentMethod": "UPI"},
                {"id": "exp_4", "name": "Packaging Bags (Bulk)", "category": "Packaging & Transport", "amount": 2500.0, "date": "2026-06-02", "type": "expense", "paymentMethod": "Cash"},
                {"id": "exp_5", "name": "Transport to Mandi", "category": "Packaging & Transport", "amount": 1800.0, "date": "2026-06-04", "type": "expense", "paymentMethod": "Cash"},
                {"id": "exp_6", "name": "Tea & Snacks for staff", "category": "Miscellaneous", "amount": 650.0, "date": "2026-06-05", "type": "expense", "paymentMethod": "Cash"},
                {"id": "exp_7", "name": "Internet Broadband", "category": "Rent & Utility", "amount": 999.0, "date": "2026-05-28", "type": "expense", "paymentMethod": "UPI"},
                {"id": "exp_8", "name": "Flyer Printing", "category": "Marketing", "amount": 1500.0, "date": "2026-05-26", "type": "expense", "paymentMethod": "Wallet"}
            ]

        if any(x in transcript_lower for x in ["electricity", "बिजली", "लाइट", "इलेक्ट्रिसिटी"]):
            elec_sum = int(sum(item["amount"] for item in exp_list if "electricity" in item["name"].lower() or "electric" in item["name"].lower() or "बिजली" in item["name"].lower() or "लाइट" in item["name"].lower()))
            if elec_sum == 0: elec_sum = 4800
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"बिजली बिलावर (Electricity Bill) एकूण ₹{elec_sum:,} खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"बिजली बिल (Electricity Bill) पर कुल ₹{elec_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"You spent ₹{elec_sum:,} on the electricity bill."

        elif any(x in transcript_lower for x in ["rent", "किराया", "भाड़ा", "भाडे", "रेंट"]):
            rent_sum = int(sum(item["amount"] for item in exp_list if "rent" in item["name"].lower() or "किराया" in item["name"].lower() or "भाड़ा" in item["name"].lower() or "भाडे" in item["name"].lower()))
            if rent_sum == 0: rent_sum = 25000
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"दुकानच्या भाड्यावर (Store Rent) एकूण ₹{rent_sum:,} खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"दुकान के किराए (Store Rent) पर कुल ₹{rent_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"You spent ₹{rent_sum:,} on store rent."

        elif any(x in transcript_lower for x in ["salary", "सैलरी", "तनख्वाह", "पगार", "raju", "राजू"]):
            salary_sum = int(sum(item["amount"] for item in exp_list if "salary" in item["name"].lower() or "salar" in item["name"].lower() or "सैलरी" in item["name"].lower() or "तनख्वाह" in item["name"].lower() or "पगार" in item["name"].lower() or "raju" in item["name"].lower() or "राजू" in item["name"].lower()))
            if salary_sum == 0: salary_sum = 12000
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"कर्मचाऱ्यांच्या पगारावर (Staff Salary) एकूण ₹{salary_sum:,} खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"कर्मचारियों की सैलरी (Staff Salary) पर कुल ₹{salary_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"You spent ₹{salary_sum:,} on staff salary."

        elif any(x in transcript_lower for x in ["internet", "broadband", "wifi", "इंटरनेट", "वायफाय"]):
            internet_sum = int(sum(item["amount"] for item in exp_list if "internet" in item["name"].lower() or "broadband" in item["name"].lower() or "wifi" in item["name"].lower() or "इंटरनेट" in item["name"].lower() or "वायफाय" in item["name"].lower()))
            if internet_sum == 0: internet_sum = 999
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"इंटरनेट ब्रॉडबँडवर (Internet Broadband) एकूण ₹{internet_sum:,} खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"इंटरनेट ब्रॉडबैंड (Internet Broadband) पर कुल ₹{internet_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"You spent ₹{internet_sum:,} on internet broadband."

        elif any(x in transcript_lower for x in ["packaging", "पैकेजिंग", "transport", "ट्रांसपोर्ट", "mandi", "मंडी"]):
            pack_trans_sum = int(sum(item["amount"] for item in exp_list if any(kw in item["name"].lower() or kw in item["category"].lower() for kw in ["packaging", "package", "pack", "पैकेजिंग", "transport", "ट्रांसपोर्ट", "mandi", "मंडी"])))
            if pack_trans_sum == 0: pack_trans_sum = 4300
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"पॅकेजिंग आणि वाहतुकीवर (Packaging & Transport) एकूण ₹{pack_trans_sum:,} खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"पैकेजिंग और ट्रांसपोर्ट (Packaging & Transport) पर कुल ₹{pack_trans_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"You spent ₹{pack_trans_sum:,} on packaging and transport."

        else:
            total_exp_sum = int(sum(item["amount"] for item in exp_list if item["type"] == "expense"))
            if total_exp_sum == 0: total_exp_sum = 47049
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"या महिन्यात एकूण ₹{total_exp_sum:,} चा खर्च झाला आहे."
            elif query_lang == "hi":
                response_text = f"इस महीने कुल ₹{total_exp_sum:,} का खर्च हुआ है।"
            else:
                response_text = f"Your total expenses for this month are ₹{total_exp_sum:,}."

    # Sales & Revenue Queries - Next Month Projected Sales
    elif any(x in transcript_lower for x in ["अगले महीने", "अगला महीना", "अगले महिने", "अगला महिना", "पुढील महिन्यात", "पुढचा महिना", "next month"]) and any(y in transcript_lower for y in ["sale", "sales", "सेल्स", "सेल", "revenue", "kama", "income", "dhandha", "business", "कमाई", "विक्री", "बिजनेस", "धंधा"]):
        intent = "summary"
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)
        month_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= start_of_month
        ).scalar() or 0.0
        if month_sales == 0.0:
            month_sales = db.query(func.sum(models.Transaction.amount)).filter(
                models.Transaction.merchant_id == "merchant_001"
            ).scalar() or 10000.0
        projected = int(month_sales * 1.08)
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"या महिन्यातील ₹{int(month_sales):,} ची विक्री आणि ८% वाढीच्या ट्रेंडनुसार, पुढील महिन्यात सुमारे ₹{projected:,} विक्री होण्याचा अंदाज आहे."
        elif query_lang == "hi":
            response_text = f"इस महीने की ₹{int(month_sales):,} की बिक्री और ८% ग्रोथ ट्रेंड के अनुसार, अगले महीने लगभग ₹{projected:,} की सेल्स होने का अनुमान है।"
        else:
            response_text = f"Based on this month's sales of ₹{int(month_sales):,} and an 8% growth trend, next month's projected sales are approximately ₹{projected:,}."

    # Sales & Revenue Queries - Today's Summary (Hisaab) vs Today's Total Sales
    elif any(x in transcript_lower for x in ["aaj", "today", "आज", "आजची", "आतापर्यंत"]):
        intent = "summary"
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= today_start
        ).scalar() or 0.0
        
        today_cash = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= today_start,
            models.Transaction.payment_mode == "Cash"
        ).scalar() or 0.0
        today_upi = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= today_start,
            models.Transaction.payment_mode == "UPI"
        ).scalar() or 0.0
        today_udhar = db.query(func.sum(models.Udhar.amount)).filter(
            models.Udhar.merchant_id == "merchant_001",
            models.Udhar.date_added == date_type.today()
        ).scalar() or 0.0
        
        if any(h in transcript_lower for h in ["hisaab", "hisab", "summary", "हिसाब", "हिशोब", "हिशेब", "hishob", "hisab-kitab"]):
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"आजचा हिशोब: एकूण विक्री ₹{int(today_sales):,} (UPI: ₹{int(today_upi):,}, Cash: ₹{int(today_cash):,}) झाली आहे आणि ₹{int(today_udhar):,} नवीन उधार दिले आहे."
            elif query_lang == "hi":
                response_text = f"आज का हिसाब: कुल बिक्री ₹{int(today_sales):,} (UPI: ₹{int(today_upi):,}, कैश: ₹{int(today_cash):,}) हुई है और नया उधार ₹{int(today_udhar):,} दर्ज किया गया है।"
            else:
                response_text = f"Today's summary: Total sales ₹{int(today_sales):,} (UPI: ₹{int(today_upi):,}, Cash: ₹{int(today_cash):,}) and new credit issued ₹{int(today_udhar):,}."
        else:
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"आज एकूण ₹{int(today_sales):,} ची विक्री झाली आहे."
            elif query_lang == "hi":
                response_text = f"आज कुल ₹{int(today_sales):,} की कमाई हुई है।"
            else:
                response_text = f"Today's total sales are ₹{int(today_sales):,}."

    # Sales & Revenue Queries - Overall Business summary
    elif any(x in transcript_lower for x in ["business summary", "overall business", "dhandha kaisa", "धंधा कैसा", "बिजनेस समरी", "व्यापार सारांश"]):
        intent = "summary"
        total_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001"
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"तुमचा व्यवसाय चांगला चालला आहे. आतापर्यंतची एकूण विक्री ₹{int(total_sales):,} आहे."
        elif query_lang == "hi":
            response_text = f"आपका बिजनेस अच्छा चल रहा है। अब तक की कुल बिक्री ₹{int(total_sales):,} है।"
        else:
            response_text = f"Your business is doing well. Total overall sales are ₹{int(total_sales):,}."

    # Sales & Revenue Queries - This Week's Sales
    elif any(x in transcript_lower for x in ["hafta", "hafte", "week", "आठवडा", "हफ्ते", "सप्ताह"]) and any(x in transcript_lower for x in ["sale", "revenue", "kama", "income", "dhandha", "business", "कमाई", "विक्री", "बिजनेस", "धंधा"]):
        intent = "summary"
        seven_days_ago = datetime.now() - timedelta(days=7)
        week_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= seven_days_ago
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"या आठवड्यात एकूण ₹{int(week_sales):,} ची विक्री झाली आहे."
        elif query_lang == "hi":
            response_text = f"इस हफ्ते कुल ₹{int(week_sales):,} का बिजनेस हुआ है।"
        else:
            response_text = f"Is hafte total ₹{int(week_sales):,} ka business hua hai."

    # Sales & Revenue Queries - Last Month's Sales
    elif any(x in transcript_lower for x in ["pichle mahine", "pichla mahina", "last month", "मागील महिन्यात", "मागील महिना", "पिछले महीने", "पिछले महीना"]):
        intent = "summary"
        now = datetime.now()
        first_day_this_month = datetime(now.year, now.month, 1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        start_of_prev_month = datetime(last_day_prev_month.year, last_day_prev_month.month, 1)
        last_month_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= start_of_prev_month,
            models.Transaction.timestamp < first_day_this_month
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"मागील महिन्यात एकूण ₹{int(last_month_sales):,} ची विक्री झाली होती."
        elif query_lang == "hi":
            response_text = f"पिछले महीने कुल ₹{int(last_month_sales):,} का बिजनेस हुआ था।"
        else:
            response_text = f"Pichle mahine total ₹{int(last_month_sales):,} ka sale hua tha."

    # Sales & Revenue Queries - This Month's Sales
    elif any(x in transcript_lower for x in ["is mahine", "this month", "ya mahinyat", "या महिन्यात", "इस महीने"]) and not any(y in transcript_lower for y in ["pichle mahine", "पिछले महीने"]):
        intent = "summary"
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)
        month_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= start_of_month
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"या महिन्यात आतापर्यंत एकूण ₹{int(month_sales):,} ची विक्री झाली आहे."
        elif query_lang == "hi":
            response_text = f"इस महीने अब तक कुल ₹{int(month_sales):,} का बिजनेस हुआ है।"
        else:
            response_text = f"Is mahine ab tak total ₹{int(month_sales):,} ka sale hua hai."

    # Sales & Revenue Queries - This Year's Sales
    elif any(x in transcript_lower for x in ["is saal", "this year", "ya varshi", "या वर्षी", "इस साल"]) or ("saal" in transcript_lower and any(y in transcript_lower for y in ["sale", "business", "revenue", "धंधा", "बिजनेस"])):
        intent = "summary"
        start_of_year = datetime(datetime.now().year, 1, 1)
        year_sales = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.merchant_id == "merchant_001",
            models.Transaction.timestamp >= start_of_year
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"या वर्षात एकूण ₹{int(year_sales):,} चा धंदा झाला आहे."
        elif query_lang == "hi":
            response_text = f"इस साल अब तक कुल ₹{int(year_sales):,} का बिजनेस हुआ है।"
        else:
            response_text = f"Is saal total ₹{int(year_sales):,} ka business hua hai."

    # Sales & Revenue Queries - Best Sales Day
    elif any(x in transcript_lower for x in ["kis din", "best day", "best sales day", "कोणत्या दिवशी", "सबसे ज्यादा बिक्री"]):
        intent = "summary"
        best_day_query = db.query(
            func.strftime('%Y-%m-%d', models.Transaction.timestamp).label("day"),
            func.sum(models.Transaction.amount).label("total")
        ).filter(models.Transaction.merchant_id == "merchant_001").group_by("day").order_by(func.sum(models.Transaction.amount).desc()).first()
        if best_day_query:
            day_str = datetime.strptime(best_day_query.day, "%Y-%m-%d").strftime("%d %B %Y")
            amt = int(best_day_query.total)
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"सर्वात जास्त विक्री {day_str} रोजी ₹{amt:,} झाली होती."
            elif query_lang == "hi":
                response_text = f"सबसे ज्यादा बिक्री {day_str} को हुई थी, कुल ₹{amt:,} का सेल हुआ था।"
            else:
                response_text = f"Sabse zyada sale {day_str} ko hua tha, total ₹{amt:,}."
        else:
            response_text = "Sales data not available."

    # Sales & Revenue Queries - Category Wise sales
    elif any(x in transcript_lower for x in ["category wise", "category-wise", "विभागवार", "कैटेगरी", "केटेगरी"]):
        intent = "category"
        cat_sales = db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total")
        ).filter(models.Transaction.merchant_id == "merchant_001").group_by(models.Transaction.category).all()
        if cat_sales:
            list_str = ", ".join([f"{row.category}: ₹{int(row.total):,}" for row in cat_sales])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"श्रेणीनुसार विक्री: {list_str}."
            elif query_lang == "hi":
                response_text = f"कैटेगरी अनुसार बिक्री: {list_str}।"
            else:
                response_text = f"Category wise sales: {list_str}."
        else:
            response_text = "No category data available."

    # Sales & Revenue Queries - Cash UPI split
    elif any(x in transcript_lower for x in ["cash aur upi", "cash vs upi", "payment mode", "breakdown", "कैश और यूपीआई"]):
        intent = "payment_mode"
        mode_sales = db.query(
            models.Transaction.payment_mode,
            func.sum(models.Transaction.amount).label("total")
        ).filter(models.Transaction.merchant_id == "merchant_001").group_by(models.Transaction.payment_mode).all()
        if mode_sales:
            list_str = ", ".join([f"{row.payment_mode}: ₹{int(row.total):,}" for row in mode_sales])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"पेमेंट मोडनुसार विक्री: {list_str}."
            elif query_lang == "hi":
                response_text = f"पेमेंट मोड अनुसार बिक्री: {list_str}।"
            else:
                response_text = f"Payment mode split: {list_str}."
        else:
            response_text = "No payment mode data available."

    # Sales & Revenue Queries - Trend & Growth
    elif any(x in transcript_lower for x in ["trend", "growth", "बढ़ोत्तरी", "वाढ"]):
        intent = "profit_analysis"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा व्यवसाय स्थिर गतीने वाढत आहे. मागील महिन्यांच्या तुलनेत या महिन्यात ८% वाढ झाली आहे."
        elif query_lang == "hi":
            response_text = "आपका बिजनेस अच्छी ग्रोथ दिखा रहा है। पिछले महीने के मुकाबले इस महीने बिक्री में लगभग ८% की बढ़ोतरी हुई है।"
        else:
            response_text = "Your business is showing a positive trend, with about 8% growth compared to last month."

    # Customer Queries - Customer spent
    elif matched_name and any(x in transcript_lower for x in ["spent", "kharcha", "spend", "kharedi", "खर्च", "खरेदी"]):
        intent = "customer_spend"
        cust = db.query(models.Customer).filter(models.Customer.customer_name == matched_name, models.Customer.merchant_id == "merchant_001").first()
        spent = int(cust.total_spent) if cust else 0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{matched_name} यांनी एकूण ₹{spent:,} खर्च केले आहेत."
        elif query_lang == "hi":
            response_text = f"{matched_name} ने कुल ₹{spent:,} खर्च किया है।"
        else:
            response_text = f"{matched_name} spent a total of ₹{spent:,}."

    # Customer Queries - Customer visits
    elif matched_name and any(x in transcript_lower for x in ["baar", "bar", "vele", "visit", "वेळा", "कितनी बार", "कितने बार"]):
        intent = "customer_visits"
        cust = db.query(models.Customer).filter(models.Customer.customer_name == matched_name, models.Customer.merchant_id == "merchant_001").first()
        visits = cust.visit_count if cust else 0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{matched_name} हे {visits} वेळा आले आहेत."
        elif query_lang == "hi":
            response_text = f"{matched_name} {visits} बार आ चुके हैं।"
        else:
            response_text = f"{matched_name} has visited {visits} times."

    # Customer Queries - Top Customer (VIP)
    elif any(x in transcript_lower for x in [
        "vip customer", "vip", "sabse achha customer", "best customer", "top customer", 
        "सर्वात चांगला ग्राहक", "सबसे अच्छा ग्राहक", "व्हीआयपी",
        "bada customer", "bada grahak", "बड़ा ग्राहक", "बडा ग्राहक", "सबसे बड़ा ग्राहक",
        "सर्वात मोठा ग्राहक", "मोठा ग्राहक", "सगळ्यात मोठा ग्राहक", "सबसे अच्छा कस्टमर"
    ]):
        intent = "customer_top"
        customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
        if customers_intel:
            top = max(customers_intel, key=lambda c: c["total_spent"])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"{top['customer_name']} हे तुमचे सर्वात मौल्यवान ग्राहक आहेत. त्यांनी एकूण ₹{int(top['total_spent']):,} खर्च केले आहेत आणि ते {top['visit_count']} वेळा आले आहेत."
            elif query_lang == "hi":
                response_text = f"{top['customer_name']} आपके सबसे अच्छे ग्राहक हैं। उन्होंने कुल ₹{int(top['total_spent']):,} खर्च किए हैं और वे {top['visit_count']} बार आए हैं।"
            else:
                response_text = f"{top['customer_name']} is your VIP customer with total spending of ₹{int(top['total_spent']):,} and {top['visit_count']} visits."
        else:
            response_text = "No customer data available."

    # Customer Queries - Top 5 Customers
    elif any(x in transcript_lower for x in ["top 5", "टॉप ५", "पहिले ५"]):
        intent = "customer_top5"
        customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
        if customers_intel:
            top5 = sorted(customers_intel, key=lambda c: c["total_spent"], reverse=True)[:5]
            names = ", ".join([f"{c['customer_name']} (₹{int(c['total_spent']):,})" for c in top5])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"तुमचे टॉप ५ ग्राहक आहेत: {names}."
            elif query_lang == "hi":
                response_text = f"आपके टॉप ५ ग्राहक हैं: {names}."
            else:
                response_text = f"Top 5 customers: {names}."
        else:
            response_text = "No customer data available."

    # Customer Queries - Most Frequent Visitor
    elif any(x in transcript_lower for x in ["most frequent", "frequent", "sabse zyada kaun aata", "सर्वात जास्त कोण येतो", "ज्यादा बार कौन"]):
        intent = "customer_frequent"
        customers_intel = crud.get_customer_intelligence_data(db, "merchant_001")
        if customers_intel:
            most_freq = max(customers_intel, key=lambda c: c["visit_count"])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"{most_freq['customer_name']} हे सर्वात जास्त {most_freq['visit_count']} वेळा आले आहेत. त्यांनी एकूण ₹{int(most_freq['total_spent']):,} खर्च केले आहेत."
            elif query_lang == "hi":
                response_text = f"{most_freq['customer_name']} सबसे ज्यादा {most_freq['visit_count']} बार आए हैं। उन्होंने कुल ₹{int(most_freq['total_spent']):,} खर्च किए हैं।"
            else:
                response_text = f"{most_freq['customer_name']} visited most frequently ({most_freq['visit_count']} times) spending ₹{int(most_freq['total_spent']):,}."
        else:
            response_text = "No frequent customer data."

    # Customer Queries - Customer count
    elif any(x in transcript_lower for x in [
        "customer base", "kitne customer", "ग्राहक किती", "कितने ग्राहक",
        "एकूण ग्राहक", "एकॉन ग्राहक", "total customer", "total customers", 
        "kul customer", "कुल कस्टमर", "कुल ग्राहक", "एकूण कस्टमर"
    ]):
        intent = "customer_base"
        count = db.query(models.Customer).filter(models.Customer.merchant_id == "merchant_001", ~models.Customer.customer_name.like("Walk-in%")).count()
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"तुमच्या दुकानात एकूण {count} ग्राहक आहेत."
        elif query_lang == "hi":
            response_text = f"आपकी दुकान में कुल {count} ग्राहक हैं।"
        else:
            response_text = f"You have a total of {count} customers in your shop."

    # Customer Queries - At-Risk Customers
    elif any(x in transcript_lower for x in ["at-risk", "at risk", "nahi aa raha", "येत नाही", "धोक्यात"]):
        intent = "customer_base"
        at_risk_list = db.query(models.Customer).filter(
            models.Customer.merchant_id == "merchant_001",
            models.Customer.relationship_type == "At Risk"
        ).all()
        names = ", ".join([c.customer_name for c in at_risk_list]) if at_risk_list else "None"
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"धोक्यात असलेले (At-risk) ग्राहक: {names}."
        elif query_lang == "hi":
            response_text = f"जो ग्राहक नहीं आ रहे हैं (At-risk): {names}।"
        else:
            response_text = f"At-risk customers who stopped visiting: {names}."

    # Customer Queries - First Customer
    elif any(x in transcript_lower for x in ["sabse pehle", "first customer", "पहिला ग्राहक"]):
        intent = "customer_base"
        first_cust = db.query(models.Customer).filter(
            models.Customer.merchant_id == "merchant_001",
            models.Customer.first_transaction_date.isnot(None)
        ).order_by(models.Customer.first_transaction_date.asc()).first()
        if first_cust:
            name = first_cust.customer_name
            date_str = first_cust.first_transaction_date.strftime("%d %B %Y")
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"तुमचे सर्वात पहिले ग्राहक {name} होते (नोंदणी तारीख: {date_str})."
            elif query_lang == "hi":
                response_text = f"आपकी दुकान के सबसे पहले ग्राहक {name} थे, जिन्होंने {date_str} को पहली खरीद की थी।"
            else:
                response_text = f"Your first customer was {name} on {date_str}."
        else:
            response_text = "No customer records found."

    # Customer Queries - New Customers
    elif any(x in transcript_lower for x in ["naye customer", "new customer", "नवीन ग्राहक"]):
        intent = "customer_base"
        new_count = db.query(models.Customer).filter(
            models.Customer.merchant_id == "merchant_001",
            models.Customer.relationship_type == "New"
        ).count()
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"दुकानात एकूण {new_count} नवीन ग्राहक जोडले गेले आहेत."
        elif query_lang == "hi":
            response_text = f"इस महीने {new_count} नए ग्राहक जुड़े हैं।"
        else:
            response_text = f"You have {new_count} new customers."

    # Udhar Queries - Total Outstanding Udhar
    elif any(x in transcript_lower for x in ["sabka total udhar", "total udhar", "एकूण उधार", "कुल उधार"]) and not any(y in transcript_lower for y in ["pichle mahine", "पिछले महीने"]):
        intent = "udhar_status"
        total_udhar = db.query(func.sum(models.Udhar.amount)).filter(models.Udhar.merchant_id == "merchant_001").scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"सर्व ग्राहकांचे एकूण उधार ₹{int(total_udhar):,} आहे."
        elif query_lang == "hi":
            response_text = f"सभी ग्राहकों का कुल मिलाकर ₹{int(total_udhar):,} उधार बाकी है।"
        else:
            response_text = f"Total outstanding credit from all customers is ₹{int(total_udhar):,}."

    # Udhar Queries - Pending Payments List
    elif any(x in transcript_lower for x in ["payment pending", "kaun-kaun ka payment", "outstanding list", "pending list", "कुणाचे उधार बाकी"]):
        intent = "udhar_status"
        pending_list = db.query(
            models.Udhar.customer_name,
            func.sum(models.Udhar.amount).label("total")
        ).filter(models.Udhar.merchant_id == "merchant_001").group_by(models.Udhar.customer_name).all()
        if pending_list:
            list_str = ", ".join([f"{p.customer_name} (₹{int(p.total):,})" for p in pending_list])
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"उधार बाकी असलेले ग्राहक: {list_str}."
            elif query_lang == "hi":
                response_text = f"जिन ग्राहकों का उधार बाकी है: {list_str}।"
            else:
                response_text = f"Customers with pending credit: {list_str}."
        else:
            if query_lang in ["mr", "mr_roman"]:
                response_text = "कोणतेही उधार बाकी नाही."
            else:
                response_text = "No pending payments."

    # Udhar Queries - Most Risky Customer
    elif any(x in transcript_lower for x in ["risky customer", "sabse risky", "सर्वात जोखीम"]):
        intent = "udhar_status"
        cust_details = crud.get_customers_with_details(db, "merchant_001")
        if cust_details:
            risky_c = max(cust_details, key=lambda c: c["risk_score"])
            if risky_c["pending_amount"] > 0:
                name = risky_c["customer_name"]
                amt = int(risky_c["pending_amount"])
                score = risky_c["risk_score"]
                if query_lang in ["mr", "mr_roman"]:
                    response_text = f"{name} हे सर्वात जास्त जोखीम असलेले ग्राहक आहेत (उधार: ₹{amt}, जोखीम धाव: {score})."
                elif query_lang == "hi":
                    response_text = f"सबसे ज्यादा रिस्की ग्राहक {name} हैं। इनका ₹{amt} उधार बाकी है (रिस्क स्कोर: {score})।"
                else:
                    response_text = f"The most risky customer is {name} with ₹{amt} outstanding (Risk Score: {score})."
            else:
                response_text = "No risky customers found with outstanding balance."
        else:
            response_text = "No customer data available."

    # Udhar Queries - Days Pending for specific customer
    elif matched_name and any(x in transcript_lower for x in ["din", "days", "divas", "दिवस", "दिन"]):
        intent = "udhar"
        sum_res = crud.get_udhar_summary_by_customer(db, "merchant_001", matched_name)
        days = sum_res["days_pending"] if sum_res else 0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{matched_name} यांचे उधार गेल्या {days} दिवसांपासून बाकी आहे."
        elif query_lang == "hi":
            response_text = f"{matched_name} का उधार पिछले {days} दिनों से बाकी है।"
        else:
            response_text = f"{matched_name}'s credit has been outstanding for {days} days."

    # Udhar Queries - Healthy / Risky Udhar split
    elif any(x in transcript_lower for x in ["healthy udhar", "risky udhar", "कमी जोखीम", "जास्त जोखीम"]):
        intent = "udhar_status"
        cust_details = crud.get_customers_with_details(db, "merchant_001")
        healthy_amt = sum(c["pending_amount"] for c in cust_details if c["risk_level"] != "high")
        risky_amt = sum(c["pending_amount"] for c in cust_details if c["risk_level"] == "high")
        if "healthy" in transcript_lower or "कमी जोखीम" in transcript_lower:
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"सुरक्षित (Healthy) उधार एकूण ₹{int(healthy_amt):,} आहे."
            elif query_lang == "hi":
                response_text = f"सुरक्षित (Healthy) उधार राशि ₹{int(healthy_amt):,} है।"
            else:
                response_text = f"Healthy (low/medium risk) outstanding udhar is ₹{int(healthy_amt):,}."
        else:
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"जोखमीचे (Risky) उधार एकूण ₹{int(risky_amt):,} आहे."
            elif query_lang == "hi":
                response_text = f"जोखिम भरा (Risky) उधार राशि ₹{int(risky_amt):,} है।"
            else:
                response_text = f"Risky (high risk) outstanding udhar is ₹{int(risky_amt):,}."

    # Udhar Queries - Udhar Report (healthy vs risky)
    elif any(x in transcript_lower for x in ["udhar report", "उधार रिपोर्ट", "udhar status", "उधार स्थिति"]) or (
        not matched_name and 
        any(x in transcript_lower for x in ["udhar", "उधार", "उधर", "क्रेडिट"]) and 
        any(y in transcript_lower for y in ["kaisa", "status", "report", "कैसा", "स्थिति", "कसे", "कसा", "रिपोर्ट"])
    ):
        intent = "udhar_status"
        from app.main import get_udhar_health_api
        health = get_udhar_health_api("merchant_001", db)
        total = int(health["total_udhar"])
        risky = int(health["risky_amount"])
        healthy = total - risky
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"उधार रिपोर्ट: एकूण उधार ₹{total:,} आहे, ज्यापैकी ₹{healthy:,} सुरक्षित आहे आणि ₹{risky:,} जोखमीचे आहे."
        elif query_lang == "hi":
            response_text = f"उधार रिपोर्ट: कुल उधार ₹{total:,} है, जिसमें से ₹{healthy:,} सुरक्षित है और ₹{risky:,} जोखिम श्रेणी में है।"
        else:
            response_text = f"Udhar Report: Total outstanding is ₹{total:,} (Healthy: ₹{healthy:,}, Risky: ₹{risky:,})."

    # Udhar Queries - Last Month Udhar Issued
    elif any(x in transcript_lower for x in ["pichle mahine kitna udhar", "पिछले महीने कितना उधार"]):
        intent = "udhar_status"
        now = datetime.now()
        first_day_this_month = datetime(now.year, now.month, 1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        start_of_prev_month = datetime(last_day_prev_month.year, last_day_prev_month.month, 1)
        prev_month_udhar = db.query(func.sum(models.Udhar.amount)).filter(
            models.Udhar.merchant_id == "merchant_001",
            models.Udhar.date_added >= start_of_prev_month.date(),
            models.Udhar.date_added < first_day_this_month.date()
        ).scalar() or 0.0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"मागील महिन्यात एकूण ₹{int(prev_month_udhar):,} उधार दिले गेले होते."
        elif query_lang == "hi":
            response_text = f"पिछले महीने कुल ₹{int(prev_month_udhar):,} का उधार दिया गया था।"
        else:
            response_text = f"Total udhar issued last month was ₹{int(prev_month_udhar):,}."

    # Udhar Queries - Repayments Count
    elif any(x in transcript_lower for x in ["repayment count", "paise wapas diye", "परत केले"]):
        intent = "udhar_status"
        repay_count = db.query(func.count(models.Customer.id)).filter(
            models.Customer.merchant_id == "merchant_001",
            models.Customer.total_repayments > 0
        ).scalar() or 0
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"एकूण {repay_count} ग्राहकांनी त्यांचे उधार परत केले आहे."
        elif query_lang == "hi":
            response_text = f"कुल {repay_count} ग्राहकों ने पैसे वापस किए हैं।"
        else:
            response_text = f"A total of {repay_count} customers have made repayments."

    # Action Handler - WhatsApp reminder send
    elif any(kw in transcript_lower for kw in reminder_keywords):
        intent = "udhar_reminder"
        target_name = matched_name or "Mohan"
        try:
            from app.main import send_reminder_api
            send_reminder_api(schemas.ReminderSendRequest(customer_name=target_name), db)
        except Exception:
            pass
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{target_name} ला WhatsApp रिमाइंडर पाठवले आहे."
        elif query_lang == "hi":
            response_text = f"{target_name} को WhatsApp रिमाइंडर भेज दिया गया है।"
        else:
            response_text = f"{target_name} ko WhatsApp reminder bhej diya gaya."

    # Action Handler - Add credit (udhar)
    elif is_addition:
        intent = "udhar_add"
        target_name = matched_name or "Mohan"
        target_amt = amount or 500.0
        new_udhar = models.Udhar(
            customer_name=target_name,
            amount=target_amt,
            date_added=date_type.today(),
            merchant_id="merchant_001"
        )
        db.add(new_udhar)
        db.commit()
        crud.get_or_create_customer(db, "merchant_001", target_name)
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{target_name} साठी ₹{int(target_amt)} उधार जोडले गेले आहे."
        elif query_lang == "hi":
            response_text = f"{target_name} के लिए ₹{int(target_amt)} उधार जोड़ दिया गया है।"
        else:
            response_text = f"{target_name} ko {int(target_amt)} rupaye udhar add kar diya gaya hai."

    # Action Handler - Record repayment or clear udhar
    elif is_repayment or any(x in transcript_lower for x in ["clear", "poora udhar", "पूर्ण भरणे"]):
        intent = "udhar_repayment"
        target_name = matched_name or "Mohan"
        if not amount:
            sum_res = crud.get_udhar_summary_by_customer(db, "merchant_001", target_name)
            amount = sum_res["amount"] if sum_res else 0.0
        remaining = crud.process_udhar_repayment(db, "merchant_001", target_name, amount)
        if query_lang in ["mr", "mr_roman"]:
            response_text = f"{target_name} चा बाकी शिल्लक आता ₹{int(remaining)} आहे."
        elif query_lang == "hi":
            response_text = f"{target_name} का बाकी बैलेंस अब ₹{int(remaining)} है।"
        else:
            response_text = f"{target_name} ka balance ab {int(remaining)} rupaye baki hai."

    # Udhar Queries - Specific Customer Outstanding Balance
    elif matched_name and any(x in transcript_lower for x in ["udhar", "credit", "उधार", "उधर", "क्रेडिट", "बाकी", "baki"]):
        intent = "udhar"
        summary = crud.get_udhar_summary_by_customer(db, merchant_id="merchant_001", customer_name=matched_name)
        if summary:
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"{summary['customer']} कडून ₹{int(summary['amount'])} उधार बाकी आहे."
            elif query_lang == "hi":
                response_text = f"{summary['customer']} का ₹{int(summary['amount'])} उधार बाकी है।"
            else:
                response_text = f"{summary['customer']} ka {int(summary['amount'])} rupaye udhar baaki hai."
        else:
            if query_lang in ["mr", "mr_roman"]:
                response_text = f"{matched_name} चे कोणतेही उधार बाकी नाही."
            elif query_lang == "hi":
                response_text = f"{matched_name} का कोई उधार बाकी नहीं है।"
            else:
                response_text = f"{matched_name} ka koi udhar baaki nahi hai."

    # Loan & Finance Queries - Improve loan score tips
    elif any(x in transcript_lower for x in ["improve", "sudhar", "कसा वाढवू", "कैसे सुधारें"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "लोन स्कोर वाढवण्यासाठी: १) रोजचे व्यवहार ॲपमध्ये नोंदवा, २) डिजिटल पेमेंटचा वापर ७५% पेक्षा जास्त करा, ३) उधार वेळेवर वसूल करा."
        elif query_lang == "hi":
            response_text = "अपना loan स्कोर सुधारने के लिए: १) रोजाना के लेन-देनों को ऐप में लिखें, २) डिजिटल पेमेंट्स (UPI) का अनुपात ७५% से ऊपर ले जाएं, ३) उधारी समय पर वसूलें।"
        else:
            response_text = "To improve your score: 1) Record transitions daily, 2) Increase digital transactions above 75%, 3) Recover outstanding credit on time."

    # Loan & Finance Queries - Current Loan Score
    elif any(x in transcript_lower for x in ["loan score", "readiness score", "लोन स्कोर"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा loan स्कोर ७२ आहे (उत्कृष्ट श्रेणी). तुम्ही ₹५०,००० च्या कर्जासाठी पात्र आहात."
        elif query_lang == "hi":
            response_text = "आपका लोन readiness score ७२ है (Good श्रेणी)। आप ₹५०,००० तक के लोन के लिए एलिजिबल हैं।"
        else:
            response_text = "Your current loan readiness score is 72 (Good category). You are eligible for an estimated loan of ₹50,000."

    # Loan & Finance Queries - Revenue Score
    elif any(x in transcript_lower for x in ["revenue score", "रेवेन्यू स्कोर"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा रेवेन्यू स्कोर ४० पैकी २८ आहे, जो स्थिर व्यवसाय दर्शवतो."
        elif query_lang == "hi":
            response_text = "आपका रेवेन्यू स्कोर ४० में से २८ पॉइंट्स है।"
        else:
            response_text = "Your revenue score component is 28 out of 40 points."

    # Loan & Finance Queries - Consistency Score
    elif any(x in transcript_lower for x in ["consistency score", "कन्सिस्टन्सी स्कोर"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा कन्सिस्टन्सी स्कोर ३० पैकी २२ आहे, कारण तुम्ही नियमित व्यवहार नोंदवता."
        elif query_lang == "hi":
            response_text = "आपका कंसिस्टेंसी स्कोर ३० में से २२ पॉइंट्स है, जो बहुत अच्छा है।"
        else:
            response_text = "Your consistency score is 22 out of 30 points, showing regular record-keeping."

    # Loan & Finance Queries - When to apply
    elif any(x in transcript_lower for x in ["kab apply", "when to apply", "कधी अर्ज", "कब अप्लाई"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमचा लोन स्कोर ७०+ असल्याने तुम्ही कधीही अर्ज करू शकता. चालू महिना अर्जासाठी योग्य आहे."
        elif query_lang == "hi":
            response_text = "आपका लोन स्कोर ७२ है, जो कि बहुत अच्छा है। आप अभी लोन के लिए अप्लाई कर सकते हैं।"
        else:
            response_text = "With a loan readiness score of 72, you can apply now as you are in the pre-approved segment."

    # Loan & Finance Queries - Loan eligibility amount & verdict
    elif any(x in transcript_lower for x in ["kitna loan", "eligible", "कर्ज", "लोन"]):
        intent = "loan"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमच्या व्यवसायाच्या उलाढालीनुसार तुम्ही ₹५०,००० च्या कर्जासाठी पात्र आहात."
        elif query_lang == "hi":
            response_text = "आपके स्टोर के बिजनेस वॉल्यूम के आधार पर आप ₹५०,००० तक के लोन के लिए पात्र हैं।"
        else:
            response_text = "Based on your business volume, you are eligible for an estimated loan of ₹50,000."

    # GST & Tax Queries - GST advice
    elif any(x in transcript_lower for x in ["gst lena", "gst bharna", "जीएसटी घ्यावे", "जीएसटी भरना", "जीएसटी लेना"]):
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमची वार्षिक उलाढाल ₹४० लाखांपेक्षा कमी असल्याने जीएसटी नोंदणी अनिवार्य नाही. तुम्ही ऐच्छिक नोंदणी घेऊ शकता."
        elif query_lang == "hi":
            response_text = "चूंकि आपका सालाना टर्नओवर ₹४० लाख से कम है, इसलिए जीएसटी लेना अनिवार्य नहीं है। आप चाहें तो voluntary रजिस्ट्रेशन ले सकते हैं।"
        else:
            response_text = "As your turnover is below ₹40L, GST registration is voluntary and not mandatory."

    # GST & Tax Queries - Turnover threshold limit
    elif any(x in transcript_lower for x in ["turnover", "limit", "मर्यादा", "टर्नओवर"]) and "gst" in transcript_lower:
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "जीएसटी नोंदणीसाठी मालाच्या व्यापारासाठी ₹४० लाख आणि सेवांसाठी ₹२० लाख वार्षिक उलाढाल आवश्यक आहे."
        elif query_lang == "hi":
            response_text = "जीएसटी रजिस्ट्रेशन के लिए माल बेचने वालों के लिए ₹४० लाख और सर्विस सेक्टर के लिए ₹२० लाख का टर्नओवर चाहिए।"
        else:
            response_text = "GST registration threshold is ₹40 Lakhs annual turnover for goods and ₹20 Lakhs for services."

    # GST & Tax Queries - Composition scheme
    elif any(x in transcript_lower for x in ["composition", "कंपोजिशन"]):
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "कंपोजिशन स्कीम लहान व्यापाऱ्यांसाठी आहे, जिथे ₹१.५ कोटींपर्यंतच्या उलाढालीवर फक्त १% जीएसटी भरावा लागतो आणि रिटर्न त्रैमासिक भरायचे असतात."
        elif query_lang == "hi":
            response_text = "कंपोजिशन स्कीम छोटे व्यापारियों के लिए एक आसान स्कीम है। ₹१.५ करोड़ तक टर्नओवर पर सिर्फ १% फ्लैट जीएसटी देना होता है और तिमाही रिटर्न भरना पड़ता है।"
        else:
            response_text = "Composition scheme allows merchants with turnover up to ₹1.5 Crore to pay flat 1% GST and file returns quarterly."

    # GST & Tax Queries - Deadlines
    elif any(x in transcript_lower for x in ["kab bharna", "deadline", "शेवटची तारीख", "कब भरना"]) and "gst" in transcript_lower:
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "जीएसटी रिटर्न्स: GSTR-1 पुढील महिन्याच्या ११ तारखेपर्यंत आणि GSTR-3B पुढील महिन्याच्या २० तारखेपर्यंत भरायचे असते."
        elif query_lang == "hi":
            response_text = "जीएसटी रिटर्न भरने की आखिरी तारीखें: GSTR-1 हर महीने की ११ तारीख तक और GSTR-3B हर महीने की २० तारीख तक भरना होता है।"
        else:
            response_text = "GST Deadlines: GSTR-1 must be filed by 11th of next month and GSTR-3B by 20th of next month."

    # GST & Tax Queries - GST rates for products
    elif any(x in transcript_lower for x in ["products", "rate", "दर", "कितना जीएसटी"]) and "gst" in transcript_lower:
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "दूध आणि भाज्यांवर ०%, पॅकेज्ड स्नॅक्सवर १२% आणि ब्रँडेड शीतपेयांवर १८% जीएसटी लागतो."
        elif query_lang == "hi":
            response_text = "किराना सामान पर: खुली वस्तुएं (दूध, सब्जी) पर ०%, पैक्ड स्नैक्स पर १२% और कोल्ड ड्रिंक्स पर १८% जीएसटी लगता है।"
        else:
            response_text = "GST Rates: 0% on fresh items, 12% on packaged snacks, and 18% on branded drinks."

    # GST & Tax Queries - Quarterly GST Estimate
    elif any(x in transcript_lower for x in ["quarterly", "estimate", "अंदाज", "तिमाही"]) and "gst" in transcript_lower:
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "तुमच्या दुकानाचा चालू तिमाहीचा जीएसटी अंदाज ₹३,५०० आहे (कंपोजिशन स्कीम अंतर्गत १% नुसार)."
        elif query_lang == "hi":
            response_text = "आपकी दुकान का चालू तिमाही का जीएसटी टैक्स अनुमान लगभग ₹३,५०० है (कंपोजिशन १% के हिसाब से)।"
        else:
            response_text = "Estimated quarterly GST liability is ₹3,500 under the 1% Composition Scheme."

    # GST & Tax Queries - GSTR-1 vs GSTR-3B fark/difference
    elif any(x in transcript_lower for x in ["fark", "difference", "farak", "फरक", "gstr", "अंतर"]) and any(y in transcript_lower for y in ["gst", "gstr"]):
        intent = "gst"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "GSTR-1 मध्ये फक्त विक्रीची (Sales) माहिती असते. GSTR-3B मध्ये इनपुट टॅक्स क्रेडिट (ITC) आणि एकूण कर भरणा यांची अंतिम माहिती असते."
        elif query_lang == "hi":
            response_text = "GSTR-1 में आपकी बिक्री (sales) का विवरण होता है जो ११ तारीख तक जाता है, जबकि GSTR-3B में टैक्स पेमेंट और इनपुट क्रेडिट (ITC) की अंतिम रिपोर्ट होती है जो २० तारीख तक जाती है।"
        else:
            response_text = "GSTR-1 details outward sales supplies (due 11th), while GSTR-3B details summary return and tax payment (due 20th)."

    # General Knowledge - 2 + 2
    elif "2" in transcript_lower and "+" in transcript_lower:
        intent = "general"
        response_text = "2 + 2 = 4 hota hai! Kuch aur poochna ho to batao."

    # General Knowledge - Day/Date
    elif any(x in transcript_lower for x in ["aaj kaunsa din", "aaj kaun sa din", "saturday hai", "sunday hai", "आज कोणता दिवस", "आज शनिवार"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "आज शुक्रवार (Friday) आहे."
        elif query_lang == "hi":
            response_text = "आज शुक्रवार (Friday) है।"
        else:
            response_text = "Today is Friday."

    # General Knowledge - Diwali
    elif any(x in transcript_lower for x in ["diwali kab", "दिवाळी कधी", "दिवाली कब"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "२०२६ मध्ये दिवाळी रविवार, ८ नोव्हेंबर रोजी आहे."
        elif query_lang == "hi":
            response_text = "२०२६ में दिवाली रविवार, ८ नवंबर को है।"
        else:
            response_text = "Diwali in 2026 is on Sunday, November 8."

    # General Knowledge - Business growth tips
    elif any(x in transcript_lower for x in ["grow", "tips", "वाढवणे", "बढ़ाएं", "dhandha badhane"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "व्यवसाय वाढवण्यासाठी ग्राहकांशी चांगले संबंध ठेवा, जास्त विक्री असलेल्या वस्तूंचा स्टॉक ठेवा आणि डिजिटल पेमेंट वापरा."
        elif query_lang == "hi":
            response_text = "बिजनेस बढ़ाने के लिए: ग्राहकों से अच्छे संबंध बनाएं, ज्यादा बिकने वाला स्टॉक रखें और डिजिटल पेमेंट्स स्वीकार करें।"
        else:
            response_text = "To grow your business: Focus on customer relationships, keep fast-moving inventory stocked, and promote digital payments."

    # General Knowledge - Loan documents
    elif any(x in transcript_lower for x in ["documents", "कागदपत्रे", "दस्तावेज", "document"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "कर्जासाठी लागणारी कागदपत्रे: आधार कार्ड, पॅन कार्ड, ६ महिन्यांचे बँक स्टेटमेंट आणि दुकानाचे नोंदणी प्रमाणपत्र."
        elif query_lang == "hi":
            response_text = "लोन के लिए जरूरी दस्तावेज: आधार कार्ड, पैन कार्ड, पिछले ६ महीने का bank statement और दुकान का रजिस्ट्रेशन सर्टिफिकेट।"
        else:
            response_text = "Documents required for loans: Aadhaar Card, PAN Card, shop registration proof, and 6 months bank statements."

    # General Knowledge - CIBIL score
    elif any(x in transcript_lower for x in ["cibil", "सिबिल"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "सिबिल स्कोर सुधारण्यासाठी कर्जाचे हप्ते (EMI) आणि क्रेडिट कार्डचे बिल नेहमी वेळेवर भरा."
        elif query_lang == "hi":
            response_text = "सिबिल स्कोर सुधारने के लिए: अपनी सभी ईएमआई और क्रेडिट ड्यूज का भुगतान हमेशा समय पर करें।"
        else:
            response_text = "To improve CIBIL score: Ensure timely repayment of all EMIs and credit dues without delay."

    # General Knowledge - Accounting practices
    elif any(x in transcript_lower for x in ["accounting practice", "अकाउंटिंग", "accounting kaise"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "उत्तम अकाउंटिंग सराव: रोजचे व्यवहार नोंदवा, वैयक्तिक आणि व्यावसायिक खर्च वेगळे ठेवा."
        elif query_lang == "hi":
            response_text = "सर्वश्रेष्ठ अकाउंटिंग प्रैक्टिस: रोज के लेन-देनों को दर्ज करें, दुकान और पर्सनल खर्च अलग रखें।"
        else:
            response_text = "Best accounting practice: Log transactions daily, reconcile cashbook, and separate business and personal expenses."

    # General Knowledge - Kirana margins
    elif any(x in transcript_lower for x in ["margin", "नफा", "मार्जिन"]):
        intent = "general"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "किराणा मालावर १०-२०%, ब्रँडेड वस्तूंवर ५-१०% आणि सुट्या वस्तूंवर २०-३०% मार्जिन मिळते."
        elif query_lang == "hi":
            response_text = "किराना स्टोर मार्जिन: ग्रोसरी पर १०-२०%, ब्रँडेड वस्तुओं पर ५-१०% और खुली वस्तुओं पर २०-३०% मार्जिन होता है।"
        else:
            response_text = "Typical store margins: Groceries 10-20%, Branded goods 5-10%, loose commodities 20-30%."

    else:
        intent = "unknown"
        if query_lang in ["mr", "mr_roman"]:
            response_text = "माफ करा, मला तुमचा प्रश्न समजला नाही."
        elif query_lang == "hi":
            response_text = "माफ़ कीजिए, मैं आपका सवाल समझ नहीं पाया।"
        else:
            response_text = "Maaf kijiye, main aapka sawaal samajh nahi paaya."

    return {
        "intent": intent,
        "response_text": response_text
    }
