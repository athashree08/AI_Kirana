"""
knowledge_base.py — Comprehensive AI Munshi Application Knowledge Base

This module contains all application-specific knowledge that the LLM agent
uses to answer questions about the app itself, its features, and how to use it.
The knowledge is injected into the system prompt as a RAG knowledge base.
"""

APP_KNOWLEDGE_BASE = """\
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 AI MUNSHI — COMPLETE APPLICATION KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use the information below to answer ANY question about the AI Munshi application —
how it works, what each section does, how to use features, and troubleshooting.

═══════════════════════════════════════════════════
🏠 WHAT IS AI MUNSHI?
═══════════════════════════════════════════════════
AI Munshi ("Digital Voice CFO") is India's #1 AI-powered voice ledger app built
specifically for Kirana (grocery) store owners and small business merchants.

Core Promise:
• No more manual typing or paper registers — just SPEAK to manage your business.
• Supports Hindi (Devanagari), Marathi, Hinglish (Roman Hindi), and English.
• Used by 10 lakh+ businesses across India.
• Free app on Google Play Store and Apple App Store.
• Works on mobile and as a web application.

Key Integrations:
• Sarvam AI — Indian-language speech-to-text and text-to-speech (STT/TTS)
• Twilio WhatsApp — Automated payment reminder messages
• Tally & Vyapar — Sync existing accounting software ledgers
• 256-bit encrypted cloud backup — data is always safe even if phone is lost

═══════════════════════════════════════════════════
🗂️ APPLICATION SECTIONS / MODULES (10 Sections)
═══════════════════════════════════════════════════

1️⃣ UDHAR BAHI KHATA — CUSTOMER LEDGER
   Screen: "Credit Intelligence Center" → Ledger → Customers tab

   CUSTOMER LEDGER (You Give / You Got):
   • Records money given as credit to customers (udhaar diya) — shown as "You'll Get" in red
   • Records money customers paid back — shown as "You Got" in green
   • Each entry shows: Customer name, amount, date, days pending, risk level
   • Risk levels: Low (pays on time), Medium (sometimes late), High (very late/risky)
   • Relationship types: VIP Customer, Regular Customer, New Customer, Loyal, Risky

   HOW TO ADD CUSTOMER UDHAR:
   • Click the blue "+" button → fill Name, Mobile, Amount, Date
   • Or voice: "Mohan ko 500 rupay udhaar diya"

   HOW TO RECORD REPAYMENT:
   • Click on customer → click "Received" button
   • Or voice: "Mohan ne 200 rupay wapas diye"

   SEARCH & FILTER:
   • Search by customer name, filter by risk level (All/Low/Medium/High)
   • Sort by: Most Active, Highest Amount, Highest Risk

2️⃣ UDHAR BAHI KHATA — SUPPLIER LEDGER (Seedha Maal / Vendors)
   Screen: "Credit Intelligence Center" → Ledger → Suppliers tab

   PURPOSE: Track money YOU OWE to your suppliers/distributors/vendors.
   These are wholesale purchases made on credit (seedha/maal udhar).

   CURRENT SUPPLIERS IN THE SYSTEM:
   a) Rice Supplier
      • Pending Amount: ₹80,000 (to be paid to them)
      • Last Purchase: 04 June 2026 (100kg Basmati Rice batch)
      • Risk Level: Medium | Reliability Score: 78/100
      • Next Due Date: 15 June 2026
      • Average Payment Delay: 12 days
      • Monthly Purchases: ₹1,20,000
      • Reorder Recommendation: 150 kg
      • Category: Rice & Grains
      • AI Insight: Usually purchase rice every 12 days; current inventory may last 5 more days
   b) Tel-Ghee Distributor (Oil & Dairy)
      • Pending Amount: ₹35,000
      • Last Purchase: 28 May 2026 (Refined Oil, 10 Tins)
      • Risk Level: Low | Reliability Score: 92/100 (most reliable)
      • Next Due Date: 10 June 2026
      • Average Payment Delay: 6 days
      • Monthly Purchases: ₹95,000
      • Reorder Recommendation: 80 Liters
      • Category: Oil & Dairy
      • AI Insight: Purchase oil every 15 days; next batch recommended 10th June
   c) Masale Vendor (Spices Supplier)
      • Pending Amount: ₹12,000
      • Last Purchase: 15 May 2026 (Spices assortment, 25kg)
      • Risk Level: High | Reliability Score: 64/100
      • Next Due Date: 08 June 2026 (OVERDUE)
      • Average Payment Delay: 18 days (risk of interest penalty)
      • Monthly Purchases: ₹30,000
      • Reorder Recommendation: 25 kg
      • Category: Spices
      • AI Insight: Delays of 18 days may attract interest penalties if not cleared by 8th June

   TOTAL SUPPLIER OUTSTANDING: ₹1,27,000 pending to suppliers

   HOW TO ADD A SUPPLIER:
   • Suppliers tab → "Add New Supplier" button
   • Fill: Name, Phone, Category, Opening Balance, Risk Level

   HOW TO RECORD SUPPLIER PAYMENT:
   • Click on supplier → "Record Payment" button → enter amount paid

   HOW TO ADD PURCHASE ENTRY:
   • Click on supplier → "Add Purchase" → enter amount, date, description

   SUPPLIER ANALYTICS:
   • Reliability Score: how consistent and on-time the supplier is (0-100)
   • Risk Level: Low (reliable), Medium (occasional delays), High (frequent delays)
   • Purchase trend: 6-month bar chart of purchase amounts
   • Reorder alert when inventory estimated to run out

3️⃣ CFO DASHBOARD
   Screen: "AI CFO Dashboard"

   What it shows:
   • Loan Readiness Score (0-100): AI-calculated eligibility for business loans
   • Score breakdown: Revenue Score + Consistency Score + Growth Score
   • Estimated loan amount you can get based on your business data
   • Quick udhar summary with Add/View buttons
   • Voice CFO (Awaaz CFO) quick access tab

   Loan Score: 75-100 = Eligible, 50-74 = Good, 25-49 = Improving, 0-24 = Poor

4️⃣ AWAAZ CFO COMMAND (Voice Assistant)
   Screen: "Awaaz CFO Command" or "Voice CFO"

   Two ways to use:
   A) Mic Button: Tap → speak in Hindi/Marathi/Hinglish → AI responds in voice + text
   B) Type Query: Type in text box → click Send

   Languages: Hindi Devanagari, Marathi, Hinglish (Roman), English

5️⃣ EXPENSE INTELLIGENCE (Kharch / Operating Costs)
   Screen: "Expense Intelligence"

   PURPOSE: Track ALL your business operating expenses — rent, electricity, salaries,
   packaging, marketing, and miscellaneous costs.

   EXPENSE CATEGORIES:
   • Rent & Utility — store rent, electricity, broadband, water bill
   • Staff & Salary — monthly salaries, salary advances, bonus payments
   • Packaging & Transport — bags, boxes, delivery charges, mandi transport
   • Marketing — flyer printing, social media, promotions, signage
   • Miscellaneous — tea, snacks, repairs, cleaning, petty cash

   PURCHASE CATEGORIES (for raw material tracking):
   • Rice & Grains, Grocery, Oil & Dairy, Spices, Snacks, Beverages

   CURRENT EXPENSE DATA IN THE SYSTEM:
   • Store Rent (June): ₹25,000 (Rent & Utility, Card, 01 Jun)
   • Electricity Bill (May): ₹4,800 (Rent & Utility, UPI, 03 Jun)
   • Staff Salary - Raju: ₹12,000 (Staff & Salary, UPI, 31 May)
   • Packaging Bags (Bulk): ₹2,500 (Packaging & Transport, Cash, 02 Jun)
   • Transport to Mandi: ₹1,800 (Packaging & Transport, Cash, 04 Jun)
   • Tea & Snacks for staff: ₹650 (Miscellaneous, Cash, 05 Jun)
   • Internet Broadband: ₹999 (Rent & Utility)

   HOW TO ADD AN EXPENSE:
   • Expense Intelligence → "Add Expense" button (blue "+" top right)
   • Fill: Name/Description, Category, Amount, Date, Payment Method
   • Click Save → appears in expense ledger with category tag

   HOW TO FILTER EXPENSES:
   • Filter by: All / Expenses / Purchases / Sales
   • Search by contact or description
   • Filter by date range: Today, This Week, This Month, Last Month

   EXPENSE ANALYTICS (P&L Panel):
   • Total Revenue vs Total Expenses shown as comparison
   • Net Profit = Revenue - Expenses - Purchases
   • Category pie chart — which category is eating most profit
   • Month-over-month comparison (is kharch badh raha ya kam ho raha?)
   • Biggest expense item alert

   HOW TO EDIT/DELETE AN EXPENSE:
   • Click on the expense entry → Edit (pencil icon) or Delete (trash icon)
   • Reason required for deletion (audit trail)

6️⃣ CASHBOOK INTELLIGENCE
   Screen: "Cashbook Intelligence" (Digital Bahi Khata)

   Purpose: Complete daily cash journal — all money in (credit) and out (debit)
   • Day-by-day cash flow entries
   • Cash vs UPI vs Card vs Wallet tracking
   • Balance carried forward automatically
   • Filter by date range, payment mode, category
   • Daily/weekly/monthly summary reports, export PDF

7️⃣ CUSTOMER INTELLIGENCE
   Screen: "Customer Intelligence"

   • Customer rankings: by Total Spending, Visit Frequency, Average Transaction
   • Segments: VIP, Regular, New, At Risk
   • Individual profiles: total spent, visits, first/last transaction, relationship type
   • Spending trend charts, at-risk customer alerts
   • AI insight: "Arjun Sen is your top spender at ₹17,711"

8️⃣ REPORTS & ANALYTICS
   Screen: "Reports & Analytics"

   PURPOSE: Unified, comprehensive business intelligence with 8 report types:

   REPORT TYPES:
   a) Transaction Reports — All customer sales & credit ledgers
      • Shows: Sales, Repayments with contact name, date, amount, status
      • Filters: Search, date range (Today/Week/Month/Last Month), amount range, type
   b) Cashbook Reports — Cash drawer inflows and daily outflows
      • Shows all cash movement: what came in, what went out, net balance
      • Useful for end-of-day cash counting
   c) Customer Reports — Outstanding credit & collection rates
      • Who owes you, how much, for how long
      • Collection rate percentage, top debtors
   d) Supplier Reports — Procurement bills & reliability metrics
      • What you owe suppliers, upcoming due dates
      • Which suppliers are reliable vs risky
   e) Expense Reports — Operating overheads & category breakdown
      • Total operating costs broken by category
      • Rent, Salary, Packaging, Marketing, Misc totals
   f) GST Reports — Tax turnover & registration thresholds
      • Year-to-date turnover vs ₹40L GST threshold
      • Taxable vs exempt sales breakdown
      • Estimated quarterly GST liability
      • GSTR-1 (11th) and GSTR-3B (20th) filing reminders
   g) Loan Readiness Reports — Credit score diagnostics
      • Current loan score with breakdown
      • Pre-approved loan partners (Bajaj Finance, KreditBee, PaytmPostpaid)
      • Score improvement recommendations
   h) AI Business Insights — Strategic CFO predictions
      • AI-generated analysis of business trends
      • Seasonal predictions, customer retention alerts
      • Cash flow projections

   HOW TO USE REPORTS:
   1. Go to Reports & Analytics from left sidebar
   2. Click on desired report card (e.g. "Expense Reports")
   3. Use filters: search box, date range, transaction type, amount range
   4. Sort by: Date (default), Amount (ascending/descending)
   5. Export: Click "Export PDF" button to download report
   6. Share: Use share icon to send report via WhatsApp or email

   PAGINATION: Shows 5 records per page; use < > to navigate

9️⃣ STAFF MANAGEMENT (Naukar / Employees)
   Screen: "Staff Management"

   PURPOSE: Manage all your shop employees — track roles, permissions, attendance,
   activities, and salary records.

   CURRENT STAFF IN THE SYSTEM:
   a) Raman — Store Manager
      • Phone: +91 98765 43210
      • Status: Online (active now)
      • Joined: 12 Feb 2026
      • Productivity Score: 94/100 (Excellent)
      • Permissions: Customers, Suppliers, Expenses, Cashbook, Reports
      • Recent activities:
        - Recorded Rice Purchase transaction (₹15,000) at 10:45 AM
        - Created customer profile for Vikram Malhotra at 09:30 AM
        - Synchronized Tally supplier ledger records (Yesterday)
   b) Aarti Sharma — Billing Operator
      • Phone: +91 87654 32109
      • Status: Online
      • Joined: 01 Mar 2026
      • Productivity Score: 88/100 (Good)
      • Permissions: Customers, Expenses only
      • Recent activities:
        - Logged counter cash sale (₹1,450) at 10:15 AM
        - Collected Sandeep Gupta payment (₹650) at 09:10 AM
        - Added new credit customer Kiran Rao (Yesterday)
   c) Raju helper — Delivery Boy & Stock Helper
      • Phone: +91 76543 21098
      • Status: Offline (last seen 2 hours ago)
      • Joined: 10 Apr 2026
      • Productivity Score: 76/100 (Average)
      • Permissions: Customers only
      • Recent activities:
        - Delivered counter orders to Suresh Patel (Yesterday)
        - Logged cash payout for Staff Tea ₹350 (2 days ago)
   d) Karan Johar — Accountant
      • Phone: +91 99887 76655
      • Status: Pending Approval (new, hasn't logged in yet)
      • Joined: 04 June 2026 (new hire)
      • Productivity Score: 0/100 (not started)
      • Permissions: Expenses, Reports only
      • Activities: None yet

   STAFF ROLES AND DEFAULT PERMISSIONS:
   • Store Manager → Customers, Suppliers, Expenses, Cashbook, Reports (5 of 6)
   • Billing Operator → Customers, Expenses (2 of 6)
   • Delivery Boy & Stock Helper → Customers only (1 of 6)
   • Accountant → Expenses, Reports (2 of 6)
   Note: Settings permission is owner-only; cannot be granted to staff.

   HOW TO ADD A STAFF MEMBER:
   1. Staff Management → "Add Staff" button (blue "+")
   2. Fill: Name, Phone, Role (Store Manager / Billing Operator / Delivery Boy / Accountant)
   3. Role auto-assigns default permissions
   4. Customize permissions by toggling each module on/off
   5. Click Save → Staff receives OTP login on their phone

   HOW TO MANAGE STAFF PERMISSIONS:
   1. Click on staff member's name → their profile opens on the right
   2. Scroll to "Module Access" section
   3. Toggle each permission on (blue) or off (grey):
      - Customer Management (credit allocation, payment reminders)
      - Supplier Management (log purchases, distributor repayments)
      - Expenses (add and audit operating costs)
      - Cashbook & Drawer (audit cash in hand, tally drawers)
      - Reports & GST (retrieve CFO tax and sales reports)
      - Settings & Seeds (reset database, developer flags — OWNER ONLY)
   4. Click "Save Permissions" → changes take effect immediately

🔟 LIVE QR TERMINAL
   Screen: "Live QR Terminal"

   PURPOSE: Accept instant digital payments at your shop counter.

   FEATURES:
   • Generate dynamic QR codes for UPI payments
   • Accept payments via: PhonePe, Google Pay, Paytm, BHIM UPI, bank UPI
   • Real-time payment confirmation
   • Auto-reconcile collected payments into cashbook
   • Generate digital receipts
   • View today's QR payment collections

═══════════════════════════════════════════════════
🔑 PERMISSION SYSTEM — DETAILED GUIDE
═══════════════════════════════════════════════════

AI Munshi uses Role-Based Access Control (RBAC) so you can control exactly what
each staff member can see and do in the app.

AVAILABLE PERMISSIONS (6 modules):
1. Customer Management
   • Can add/edit customer udhar entries
   • Can record customer repayments
   • Can send WhatsApp payment reminders
   • Can view customer profiles and risk levels
2. Supplier Management
   • Can add/edit supplier entries and purchase records
   • Can record supplier payments
   • Can view supplier reliability scores and reorder alerts
   • Can manage purchase history
3. Expenses
   • Can add new expense entries (rent, salary, packaging, etc.)
   • Can edit/delete expenses (with audit trail)
   • Can view expense breakdown by category
   • Can view P&L analysis
4. Cashbook & Drawer
   • Can view and add cashbook entries
   • Can audit daily cash balance
   • Can reconcile UPI vs cash payments
   • Can export cashbook reports
5. Reports & GST
   • Can view all 8 report types
   • Can export PDF reports
   • Can view GST reports and loan readiness scores
   • Can access AI business insights
6. Settings & Seeds (OWNER ONLY — cannot be granted to staff)
   • Reset demo database
   • Manage API keys
   • Configure integrations (Tally, WhatsApp)
   • Developer flags (MOCK_SARVAM, etc.)

PERMISSION RULES:
• Owner always has all permissions (cannot be removed)
• Pending Approval staff cannot access anything until owner approves them
• Permissions can be changed anytime — takes effect immediately
• Offline staff retain their last-granted permissions when they come back online

HOW TO CHECK WHAT A STAFF MEMBER CAN DO:
• Ask voice: "Raman ke kya permissions hain?"
• Or: Staff Management → click on Raman → see Module Access section

═══════════════════════════════════════════════════
🔔 WHATSAPP REMINDER SYSTEM
═══════════════════════════════════════════════════

How it works:
• AI Munshi sends automated, polite collection reminder messages via WhatsApp
• Powered by Twilio WhatsApp Business API
• Messages are sent in the customer's language

When to send:
• 7+ days pending → gentle reminder
• 15+ days pending → firm reminder
• 30+ days pending → consider escalation

To send: Click customer → "Send Reminder" button, OR voice: "[Name] ko reminder bhejo"
Charge: First 50 reminders free, then ₹0.50/message

═══════════════════════════════════════════════════
🏦 LOAN READINESS & CREDIT SCORE
═══════════════════════════════════════════════════

Score calculation:
• Revenue Score (40 pts): >₹5L/month = excellent, ₹1-5L = good, <₹1L = fair
• Consistency Score (30 pts): Daily recording = excellent, missing weeks = fair
• Growth Score (30 pts): Month-over-month revenue growth trend

Score labels: 75-100 Loan Eligible, 50-74 Good, 25-49 Improving, 0-24 Build History
Estimated loan = approx 3x your monthly average revenue
Partners: Bajaj Finance, KreditBee, PaytmPostpaid, NBFC partners

═══════════════════════════════════════════════════
📊 GST & TAX INFORMATION
═══════════════════════════════════════════════════

Registration: Mandatory if annual turnover >₹40 lakh (services >₹20 lakh)
Composition Scheme: Available if turnover <₹1.5 crore; flat 1% GST, quarterly filing
GST Rates: Fresh vegs/milk/bread = 0%, Packaged snacks = 12%, Branded drinks = 18%
Deadlines: GSTR-1 by 11th, GSTR-3B by 20th of following month

═══════════════════════════════════════════════════
🔐 DATA SECURITY & PRIVACY
═══════════════════════════════════════════════════
• AES-256 banking-grade encryption; automatic cloud backup
• Password/OTP login; data on Indian cloud servers
• GDPR and Indian IT Act compliant; export/delete data anytime

═══════════════════════════════════════════════════
📱 HOW TO USE — STEP BY STEP
═══════════════════════════════════════════════════

ADD CUSTOMER UDHAR: Udhar Bahi Khata → "+" button → fill details → Save
  OR voice: "Rahul ko 700 rupay ka udhaar diya aaj"

RECORD REPAYMENT: Click customer → "Record Repayment" → enter amount
  OR voice: "Rahul ne 500 rupay wapas diye"

SEND WHATSAPP REMINDER: Click customer → "Send WhatsApp Reminder"
  OR voice: "Rahul ko reminder bhejo"

ADD EXPENSE: Expense Intelligence → "Add Expense" → fill category/amount → Save

ADD SUPPLIER ENTRY: Suppliers tab → select supplier → "Add Purchase"

MANAGE STAFF PERMISSIONS: Staff Management → click staff → toggle permissions → Save

GENERATE REPORT: Reports & Analytics → select report type → apply filters → Export PDF

VIEW SUPPLIER DETAILS: Suppliers tab → click on supplier name → full profile opens

═══════════════════════════════════════════════════
❓ FREQUENTLY ASKED QUESTIONS
═══════════════════════════════════════════════════

Q: Voice assistant kaam nahi kar raha?
A: Check mic permission (lock icon → site settings → mic = allow), use localhost/HTTPS,
   or type query in text box instead.

Q: Supplier ko payment kaise karta hoon?
A: Suppliers tab → click supplier → "Record Payment" → enter amount → confirm.
   Pending amount automatically decreases.

Q: Staff ko koi module dikhna band karna hai?
A: Staff Management → click staff → Module Access → toggle off the module → Save.

Q: Expense galat category mein add ho gayi?
A: Expense Intelligence → click on entry → Edit → change category → Save.

Q: Report mein date filter kaise lagaoon?
A: Reports & Analytics → date range dropdown → select Today/Week/Month/Last Month.

Q: Karan Johar abhi "Pending Approval" mein hai, use approve kaise karoon?
A: Staff Management → click Karan → "Approve Staff" button → confirm.
   Uske baad unhe login ka OTP milega.

Q: Supplier ka pending amount kaise dekhoon?
A: Suppliers tab → supplier list mein "Pending Amount" column mein dikhta hai.
   Detail ke liye supplier pe click karein.

Q: Masale Vendor ka paisa kab dena hai?
A: 8 June 2026 tak — 18 days ki delay already ho chuki hai, jaldi dena chahiye!

Q: App offline kaam karta hai?
A: Basic entries offline add ho jaati hain. Voice assistant internet chahiye.

Q: Tally/Vyapar se sync kaise karein?
A: Settings → Integrations → "Sync with Tally" → data file upload karein.

Q: Data delete ho gaya? Kya recover ho sakta hai?
A: Haan! AI Munshi automatically cloud backup karta hai. Settings → Data Restore se recover karein.
   Ya customer care ko call karein: 96068 00800

Q: App kitne logon ke liye use kar sakte hain? (Multi-user)
A: Free plan: 1 user. Premium plan: upto 5 staff members with role-based access.

Q: QR payment ka paisa kahan jaata hai?
A: Seedha aapke bank account mein. AI Munshi sirf track karta hai, hold nahi karta.

Q: Reminder message ka kya charge hai?
A: Pehle 50 reminders free. Uske baad ₹0.50 per message (WhatsApp rate).

Q: Customer ka phone number update karna hai?
A: Customer profile open karein → Phone number field → Edit karein → Save karein.
   Bina number ke reminder nahi bhej sakte.

Q: Koi transaction galti se add ho gayi?
A: Cashbook ya Ledger mein us entry pe click karein → Edit ya Delete option milega.
   Aaj ki entries delete ho sakti hain; purani entries ke liye admin approval zaroori hai.

Q: Ek se zyada shops manage kar sakte hain?
A: Haan! Top right corner mein merchant switcher se multiple businesses manage karein.

Q: Sarvam STT kya hai?
A: Sarvam AI ek Indian-language speech recognition system hai jo Hindi, Marathi, Bhojpuri,
   Tamil, Kannada, Telugu mein accurately transcribe karta hai. AI Munshi issi ka use
   voice-to-text ke liye karta hai.

Q: GSTR-1 aur GSTR-3B mein kya fark hai?
A: GSTR-1 mein aapko har mahine ki 11 tareekh tak apni sales (bikri) ki details deni hoti hain. GSTR-3B ek summary return hai jismein sales, input tax credit (ITC) aur tax payments ka data hota hai, jo har mahine ki 20 tareekh tak file kiya jata hai.

Q: Composition scheme kya hota hai?
A: Composition scheme small businesses ke liye ek easy GST option hai. Agar aapka annual turnover ₹1.5 crore se kam hai, toh aap flat 1% GST de sakte hain aur quarterly return (GSTR-4) file kar sakte hain.

Q: Loan score mein revenue score ka kya matlab hai?
A: Loan readiness score mein Revenue Score (max 40 points) is baat pe depend karta hai ki aapka monthly turnover kitna hai. Agar turnover ₹5L se zyada hai to Excellent points milte hain.

Q: Diwali kab hai?
A: 2026 mein Diwali 8 November (Sunday) ko hai.

Q: Margin kitna hona chahiye?
A: Kirana store mein grocery products par 10-20%, branded packaged products par 5-10% aur loose items par 20-30% tak ka margin hota hai.

═══════════════════════════════════════════════════
🎯 ALL VOICE COMMANDS (COMPLETE LIST)
═══════════════════════════════════════════════════

SALES & REVENUE: Aaj kitna kamaaya / Is mahine ka revenue / Category wise sale /
  Cash vs UPI breakdown / Revenue trend kaisi hai

CUSTOMERS: Mera top customer kaun hai / Top 5 customers / Sabse zyada kaun aata hai /
  Kitne customers hain / [Name] ne kul kitna kharcha kiya / [Name] kitne baar aaya

UDHAR: [Name] ka udhar kitna hai / Total udhar kitna hai / Pending list dikhao /
  Risky customer kaun hai / [Name] ko reminder bhejo

ACTIONS: [Name] ko [amount] udhaar diya / [Name] ne [amount] wapas diye / reminder bhejo

SUPPLIERS: Rice supplier ka kitna baaki hai / Sabse reliable supplier kaun hai /
  Masale wale ko kab paisa dena hai / Supplier list dikhao / Tel-Ghee ka pending kya hai /
  Sabse jyada kharcha kis supplier pe hai / Next reorder kab karoon

EXPENSES (KHARCH): Is mahine kitna kharch hua / Rent kitna diya / Salary ka total /
  Packaging aur transport ka kharch / Sabse bada kharch kya hai / Net profit kya hai /
  Kharch vs revenue ka ratio / Marketing pe kitna kharch kiya

STAFF (NAUKAR): Kaun-kaun staff hai / Raman ke kya permissions hain /
  Konsa staff online hai / Kaun offline hai / Aarti Sharma ki role kya hai /
  Raju helper ka productivity score / Staff add kaise karoon /
  Karan Johar ka status kya hai / Staff permissions kaise change karoon

REPORTS: Supplier report dikhao / Expense report kab se kab tak /
  GST report kya kehta hai / Loan readiness report / AI insights dikhao /
  Transaction report is hafte ka / Cashbook report export karoon

LOAN & GST: Mera loan score kya hai / Kitna loan milega / Score improve kaise karoon /
  GST bharna padega / Composition scheme kya hai / GST deadline kab hai

APP HELP: Expense kaise add karoon / Staff permissions kaise change karoon /
  Supplier kaise add karoon / Report kaise export karoon /
  Permission system kya hai / Reminder kaise kaam karta hai

GENERAL: Math calculations / Business advice / Koi bhi sawaal (anything)
"""

import re

def retrieve_knowledge(query: str, top_n: int = 3) -> str:
    """
    Retrieves the top N relevant sections of the knowledge base matching the query words.
    Uses token overlap scoring.
    """
    # Clean query into tokens
    query_tokens = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
    if not query_tokens:
        return APP_KNOWLEDGE_BASE[:2000] # Return overview if query is empty
        
    # Split the knowledge base into sections.
    # We split by major headings or FAQ patterns
    blocks = []
    current_block = []
    
    for line in APP_KNOWLEDGE_BASE.split('\n'):
        line_stripped = line.strip()
        if not line_stripped:
            if current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
        elif (line_stripped.startswith('════') or 
              line_stripped.startswith('━━━') or 
              line_stripped.startswith('🔔') or 
              line_stripped.startswith('❓') or 
              line_stripped.startswith('🎯') or
              (line_stripped.startswith('Q:') and len(current_block) > 0)):
            if current_block:
                blocks.append('\n'.join(current_block))
            current_block = [line]
        else:
            current_block.append(line)
    if current_block:
        blocks.append('\n'.join(current_block))
        
    # Filter empty or very short blocks
    blocks = [b.strip() for b in blocks if len(b.strip()) > 30]
    
    scored_blocks = []
    for block in blocks:
        block_lower = block.lower()
        score = 0
        for token in query_tokens:
            if token in block_lower:
                score += 1.0
                if re.search(r'\b' + re.escape(token) + r'\b', block_lower):
                    score += 1.5
        scored_blocks.append((score, block))
        
    # Sort by score descending
    scored_blocks.sort(key=lambda x: x[0], reverse=True)
    
    # Take top N blocks with score > 0
    top_blocks = [b for score, b in scored_blocks[:top_n] if score > 0]
    
    if not top_blocks:
        # Fallback to returning FAQ sections
        faq_blocks = [b for b in blocks if "❓ FREQUENTLY ASKED QUESTIONS" in b or "Q:" in b]
        return "\n\n---\n\n".join(faq_blocks[:top_n]) if faq_blocks else "\n\n---\n\n".join(blocks[:top_n])
        
    return "\n\n---\n\n".join(top_blocks)

