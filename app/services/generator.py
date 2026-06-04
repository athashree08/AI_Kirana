import random
import math
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app import models

# --- REPEAT CUSTOMERS AND CATEGORIES SETUP ---
INDIAN_NAMES = [
    "Amit Sharma", "Sandeep Gupta", "Rajesh Kumar", "Sanjay Verma", "Suresh Patel",
    "Vijay Yadav", "Ramesh Chawla", "Anil Mishra", "Sunil Joshi", "Rakesh Tiwari",
    "Priya Singh", "Neha Sharma", "Sunita Devi", "Kiran Rao", "Meena Aggarwal",
    "Pooja Gupta", "Asha Bhosle", "Rekha Sharma", "Jyoti Prasad", "Deepa Nair",
    "Vikram Malhotra", "Arjun Sen", "Karan Johar", "Rahul Dravid", "Aditya Roy",
    "Manish Malhotra", "Gaurav Kapur", "Alok Nath", "Vivek Oberoi", "Dinesh Karthik"
]

# Category definitions
# Dairy: 0% GST (Exempt)
# Grocery, Snacks, Household, Beverages: 18% (Taxable)
CATEGORIES = {
    "Dairy": {"min": 20, "max": 200, "avg": 65},
    "Grocery": {"min": 50, "max": 2000, "avg": 130},
    "Snacks": {"min": 20, "max": 150, "avg": 45},
    "Household": {"min": 40, "max": 1500, "avg": 110},
    "Beverages": {"min": 20, "max": 300, "avg": 50}
}

# Transaction counts/revenue target configuration
# Total target revenue over 180 days = Rs 6,90,000 (which is Rs 1,15,000/month, giving ~Rs 14 Lakh/year annualized)
# Digital Monthly target: Rs 62,000 (Total Digital = Rs 3,72,000 over 180 days)
# Cash Monthly target: Rs 53,000 (Total Cash = Rs 3,18,000 over 180 days)
# Dairy Revenue share = 29% (GST Exempt), Taxable Revenue share = 71% (GST Taxable)

def get_base_amount(category: str, is_high_day: bool, is_festival: bool) -> float:
    """
    Generates a realistic transaction amount skewed heavily towards smaller values
    """
    cat_info = CATEGORIES[category]
    c_min = cat_info["min"]
    c_max = cat_info["max"]
    
    r = random.random()
    # Using power to skew towards the minimum amount
    skewed_r = r ** 3.0
    
    amount = c_min + (c_max - c_min) * skewed_r
    
    if is_festival:
        amount *= random.uniform(1.3, 1.6)
    elif is_high_day:
        amount *= random.uniform(1.1, 1.3)
        
    return max(c_min, min(c_max, amount))

def get_peak_hour() -> int:
    """
    Simulates peak business hours for a Kirana store:
    - Morning peak: 7AM - 10AM (25% probability)
    - Afternoon peak: 1PM - 3PM (15% probability)
    - Evening peak: 6PM - 9PM (40% probability)
    - Off-peak: 10AM - 1PM, 3PM - 6PM, 9PM - 10PM (20% probability)
    """
    r = random.random()
    if r < 0.25:
        return random.randint(7, 9)
    elif r < 0.40:
        return random.randint(13, 14)
    elif r < 0.80:
        return random.randint(18, 20)
    else:
        return random.choice([10, 11, 12, 15, 16, 17, 21])

def get_customer_name() -> str:
    """
    60% repeat customers, 40% walk-ins
    """
    if random.random() < 0.60:
        return random.choice(INDIAN_NAMES)
    else:
        walk_in_id = random.randint(100, 999)
        return f"Walk-in Customer #{walk_in_id}"

def generate_merchant_data(db: Session):
    """
    Seeds Ramesh Kirana Store.
    """
    merchant = db.query(models.Merchant).filter(models.Merchant.id == "merchant_001").first()
    if not merchant:
        merchant = models.Merchant(
            id="merchant_001",
            name="Ramesh Kirana Store",
            language="Hindi",
            business_type="Kirana",
            city="Jaipur"
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
    return merchant

def generate_mock_transactions(db: Session, merchant_id: str, days: int = 180):
    """
    Generates 180 days of transaction data ending at today.
    Uses matrix-based calibration to meet target numbers exactly while maintaining behavior.
    """
    db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).delete()
    db.commit()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    all_dates = [start_date + timedelta(days=i) for i in range(days)]
    
    # Identify outliers (excluding festival dates)
    candidate_dates = []
    for d in all_dates:
        is_fest = (d.month == 1 and d.day == 1) or (d.month == 3 and d.day == 3) or (d.month == 3 and d.day == 14)
        if not is_fest:
            candidate_dates.append(d)
            
    random.shuffle(candidate_dates)
    high_outliers = set(candidate_dates[:3])
    low_outliers = set(candidate_dates[3:6])
    
    # List to hold temporary transaction dictionaries in memory for calibration
    temp_txs = []
    
    for current_date in all_dates:
        is_weekend = current_date.weekday() in (5, 6)
        is_festival = (current_date.month == 1 and current_date.day == 1) or \
                      (current_date.month == 3 and current_date.day == 3) or \
                      (current_date.month == 3 and current_date.day == 14)
        
        # Determine transaction count
        if is_festival:
            tx_count = random.randint(65, 90)
        elif current_date in high_outliers:
            tx_count = random.randint(70, 95)
        elif current_date in low_outliers:
            tx_count = random.randint(2, 5)
        elif is_weekend:
            tx_count = random.randint(35, 65)
        else:
            tx_count = random.randint(20, 45)
            
        for _ in range(tx_count):
            # Select category based on calibrated proportions:
            # Shift Dairy slightly higher to compensate for clipping of small taxable transactions
            cat_r = random.random()
            if cat_r < 0.395:
                category = "Dairy"
            elif cat_r < 0.395 + 0.330:
                category = "Grocery"
            elif cat_r < 0.395 + 0.330 + 0.115:
                category = "Snacks"
            elif cat_r < 0.395 + 0.330 + 0.115 + 0.080:
                category = "Household"
            else:
                category = "Beverages"
                
            # Select payment mode based on target:
            # We want roughly 53.4% digital (UPI, WALLET, CARD) and 46.6% CASH
            mode_r = random.random()
            if mode_r < 0.450:
                payment_mode = "UPI"
            elif mode_r < 0.450 + 0.060:
                payment_mode = "WALLET"
            elif mode_r < 0.450 + 0.060 + 0.024:
                payment_mode = "CARD"
            else:
                payment_mode = "CASH"
                
            is_high_day = current_date in high_outliers
            amount = get_base_amount(category, is_high_day, is_festival)
            customer_name = get_customer_name()
            
            # Select timestamp
            hour = get_peak_hour()
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            
            tx_time = datetime(
                year=current_date.year,
                month=current_date.month,
                day=current_date.day,
                hour=hour,
                minute=minute,
                second=second
            )
            
            temp_txs.append({
                "amount": amount,
                "timestamp": tx_time,
                "merchant_id": merchant_id,
                "category": category,
                "payment_mode": payment_mode,
                "customer_name": customer_name
            })
            
    # --- CALIBRATION STEP (2x2 Matrix Calibration) ---
    # Cells:
    # 1. Digital & Dairy (exempt)
    # 2. Digital & Taxable
    # 3. Cash & Dairy (exempt)
    # 4. Cash & Taxable
    
    # Targets for the cells (Total target = 690,000 over 180 days)
    # Total Digital = 372,000, Total Cash = 318,000
    # Dairy = 30.5% of total (representing 29% target + 1.5% adjustment for taxable clipping)
    # Taxable = 69.5% of total
    targets = {
        ("digital", "Dairy"): 372000.0 * 0.305,
        ("digital", "taxable"): 372000.0 * 0.695,
        ("cash", "Dairy"): 318000.0 * 0.305,
        ("cash", "taxable"): 318000.0 * 0.695,
    }
    
    # Group generated transactions into the 4 buckets
    buckets = {
        ("digital", "Dairy"): [],
        ("digital", "taxable"): [],
        ("cash", "Dairy"): [],
        ("cash", "taxable"): []
    }
    
    for tx in temp_txs:
        mode_type = "digital" if tx["payment_mode"] in ("UPI", "WALLET", "CARD") else "cash"
        cat_type = "Dairy" if tx["category"] == "Dairy" else "taxable"
        buckets[(mode_type, cat_type)].append(tx)
        
    # Scale each bucket to match its target
    calibrated_txs = []
    for key, tx_list in buckets.items():
        if not tx_list:
            continue
        current_sum = sum(t["amount"] for t in tx_list)
        target_sum = targets[key]
        scaling_factor = target_sum / current_sum if current_sum > 0 else 1.0
        
        # Enforce range limits and verify category restrictions
        cat_name = key[1]
        for tx in tx_list:
            scaled_amount = tx["amount"] * scaling_factor
            
            # Apply hard boundaries per category constraints
            if cat_name == "Dairy":
                limits = CATEGORIES["Dairy"]
            else:
                limits = CATEGORIES[tx["category"]]
                
            scaled_amount = max(limits["min"], min(limits["max"], scaled_amount))
            tx["amount"] = round(scaled_amount, 2)
            
            db_tx = models.Transaction(
                amount=tx["amount"],
                timestamp=tx["timestamp"],
                merchant_id=tx["merchant_id"],
                category=tx["category"],
                payment_mode=tx["payment_mode"],
                customer_name=tx["customer_name"]
            )
            calibrated_txs.append(db_tx)
            
    # Bulk insert calibrated transactions
    db.add_all(calibrated_txs)
    db.commit()
    return len(calibrated_txs)

def generate_mock_udhar(db: Session, merchant_id: str):
    """
    Generates outstanding udhar accounts and corresponding customer metadata.
    """
    # Delete existing
    db.query(models.Udhar).filter(models.Udhar.merchant_id == merchant_id).delete()
    db.query(models.Customer).filter(models.Customer.merchant_id == merchant_id).delete()
    db.commit()
    
    # Core debtors we need for the demo script
    core_debtors = ["Mohan", "Geeta", "Ravi"]
    other_debtors = random.sample([n for n in INDIAN_NAMES if n.split()[0] not in core_debtors], 9)
    debtors = core_debtors + other_debtors
    
    today = date.today()
    udhars_to_add = []
    customers_to_add = []
    
    # Seed 4 loyal, 4 risky, 4 normal
    for idx, debtor in enumerate(debtors):
        # 1. Determine profile type properties
        if idx < 4:
            # Loyal profile (e.g. Mohan, Geeta)
            total_repayments = random.randint(3, 5)
            late_repayments = 0
            days_ago = random.randint(5, 12)
            amount = round(random.uniform(500, 1400), 0)
        elif idx < 8:
            # Risky profile (e.g. Ravi)
            total_repayments = random.randint(1, 3)
            late_repayments = random.randint(2, 3)
            days_ago = random.randint(35, 80) # > 30 days makes them risky
            amount = round(random.uniform(2000, 3000), 0) # >= 2000 makes them risky
        else:
            # Normal profile
            total_repayments = random.randint(1, 2)
            late_repayments = 0
            days_ago = random.randint(16, 28)
            amount = round(random.uniform(1000, 1800), 0)
            
        date_added = today - timedelta(days=days_ago)
        
        # Create Udhar Entry
        udhar_rec = models.Udhar(
            customer_name=debtor,
            amount=amount,
            date_added=date_added,
            merchant_id=merchant_id
        )
        udhars_to_add.append(udhar_rec)
        
        # Determine relationship type
        from app.services.relationship import determine_relationship_type
        rel_type = determine_relationship_type(
            total_repayments=total_repayments,
            late_repayments=late_repayments,
            pending_amount=amount,
            days_pending=days_ago
        )
        
        last_rem = today - timedelta(days=random.randint(1, 10)) if random.random() > 0.5 else None
        last_rem_dt = datetime(last_rem.year, last_rem.month, last_rem.day, 12, 0, 0) if last_rem else None
        
        customer_rec = models.Customer(
            customer_name=debtor,
            merchant_id=merchant_id,
            relationship_type=rel_type,
            late_repayments=late_repayments,
            total_repayments=total_repayments,
            last_reminder_sent=last_rem_dt
        )
        customers_to_add.append(customer_rec)
        
    db.add_all(udhars_to_add)
    db.add_all(customers_to_add)
    db.commit()
    return len(udhars_to_add)

