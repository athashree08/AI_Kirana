from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime

# --- MERCHANT CRUD ---
def get_merchant(db: Session, merchant_id: str):
    return db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()

def get_merchants(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Merchant).offset(skip).limit(limit).all()

def create_merchant(db: Session, merchant: schemas.MerchantCreate):
    db_merchant = models.Merchant(
        id=merchant.id,
        name=merchant.name,
        language=merchant.language,
        business_type=merchant.business_type,
        city=merchant.city
    )
    db.add(db_merchant)
    db.commit()
    db.refresh(db_merchant)
    return db_merchant


# --- TRANSACTION CRUD ---
def get_transaction(db: Session, transaction_id: int):
    return db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()

def get_transactions_by_merchant(db: Session, merchant_id: str, skip: int = 0, limit: int = 1000):
    return db.query(models.Transaction)\
        .filter(models.Transaction.merchant_id == merchant_id)\
        .order_by(models.Transaction.timestamp.desc())\
        .offset(skip).limit(limit).all()

def create_transaction(db: Session, transaction: schemas.TransactionCreate):
    db_transaction = models.Transaction(
        amount=transaction.amount,
        timestamp=transaction.timestamp,
        merchant_id=transaction.merchant_id,
        category=transaction.category,
        payment_mode=transaction.payment_mode,
        customer_name=transaction.customer_name
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


# --- UDHAR CRUD ---
def get_udhar_by_merchant(db: Session, merchant_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Udhar)\
        .filter(models.Udhar.merchant_id == merchant_id)\
        .order_by(models.Udhar.date_added.desc())\
        .offset(skip).limit(limit).all()

def create_udhar(db: Session, udhar: schemas.UdharCreate):
    db_udhar = models.Udhar(
        customer_name=udhar.customer_name,
        amount=udhar.amount,
        date_added=udhar.date_added,
        merchant_id=udhar.merchant_id
    )
    db.add(db_udhar)
    db.commit()
    db.refresh(db_udhar)
    return db_udhar


# --- ADDITIONAL UDHAR CRUD FOR INTERACTIVE SYSTEM ---

def get_udhar_summary_by_customer(db: Session, merchant_id: str, customer_name: str):
    """
    Retrieves aggregated credit summary for a specific customer:
    - Sum of amounts.
    - Days pending of the oldest outstanding entry.
    """
    from datetime import date
    entries = db.query(models.Udhar)\
        .filter(models.Udhar.merchant_id == merchant_id)\
        .filter(models.Udhar.customer_name.like(customer_name))\
        .all()
        
    if not entries:
        return None
        
    total_amount = sum(e.amount for e in entries)
    oldest_date = min(e.date_added for e in entries)
    days_pending = (date.today() - oldest_date).days
    
    return {
        "customer": entries[0].customer_name,
        "amount": total_amount,
        "days_pending": max(0, days_pending),
        "merchant_id": merchant_id,
        "entries_count": len(entries)
    }

def get_udhar_entries_paginated(
    db: Session,
    merchant_id: str,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "date_added",
    sort_order: str = "desc"
):
    """
    Retrieves raw credit entries for the merchant with support for pagination and sorting.
    """
    query = db.query(models.Udhar).filter(models.Udhar.merchant_id == merchant_id)
    
    # Configure sorting
    sort_column = getattr(models.Udhar, sort_by, models.Udhar.date_added)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
        
    total_count = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return items, total_count


# --- CUSTOMER AND INTELLIGENT REPAYMENT CRUD ---
from datetime import date, datetime
from app.services.scoring import calculate_risk_score
from app.services.relationship import update_customer_relationship

def get_or_create_customer(db: Session, merchant_id: str, customer_name: str, phone_number: str = None) -> models.Customer:
    """
    Retrieves or creates a Customer record. If phone_number is provided and customer
    already exists, it updates the stored number.
    """
    customer = db.query(models.Customer).filter(
        models.Customer.customer_name == customer_name,
        models.Customer.merchant_id == merchant_id
    ).first()
    
    if not customer:
        customer = models.Customer(
            customer_name=customer_name,
            merchant_id=merchant_id,
            relationship_type="normal",
            late_repayments=0,
            total_repayments=0,
            last_reminder_sent=None,
            phone_number=phone_number
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    elif phone_number and not customer.phone_number:
        # Update phone number if not already set
        customer.phone_number = phone_number
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
    return customer

def get_customers_with_details(db: Session, merchant_id: str):
    """
    Fetches all customer records with active outstanding credit or existing profiles,
    and aggregates their status including pending amount, days pending, risk score, and relationship.
    """
    # Get all distinct customer names from Udhar + Customers
    udhar_names = db.query(models.Udhar.customer_name).filter(models.Udhar.merchant_id == merchant_id).distinct().all()
    customer_names = db.query(models.Customer.customer_name).filter(models.Customer.merchant_id == merchant_id).distinct().all()
    
    names = set([n[0] for n in udhar_names] + [n[0] for n in customer_names])
    
    results = []
    for name in sorted(names):
        # 1. Get or create Customer profile
        cust_profile = get_or_create_customer(db, merchant_id, name)
        
        # 2. Get outstanding Udhar summaries
        udhar_summary = get_udhar_summary_by_customer(db, merchant_id, name)
        
        if udhar_summary:
            pending_amount = udhar_summary["amount"]
            days_pending = udhar_summary["days_pending"]
        else:
            pending_amount = 0.0
            days_pending = 0
            
        # 3. Calculate Risk Score
        risk_res = calculate_risk_score(
            customer=name,
            amount_pending=pending_amount,
            days_pending=days_pending,
            previous_late_repayments=cust_profile.late_repayments
        )
        
        # 4. Update relationship type dynamically
        rel_type = update_customer_relationship(db, cust_profile, pending_amount, days_pending)
        
        results.append({
            "id": cust_profile.id,
            "customer_name": name,
            "merchant_id": merchant_id,
            "relationship_type": rel_type,
            "late_repayments": cust_profile.late_repayments,
            "total_repayments": cust_profile.total_repayments,
            "last_reminder_sent": cust_profile.last_reminder_sent,
            "phone_number": cust_profile.phone_number,
            "pending_amount": pending_amount,
            "days_pending": days_pending,
            "risk_score": risk_res["risk_score"],
            "risk_level": risk_res["risk_level"]
        })
        
    return results

def process_udhar_repayment(db: Session, merchant_id: str, customer_name: str, repayment_amount: float) -> float:
    """
    Deducts repayment from outstanding Udhar entries using FIFO queue order.
    If entries are fully paid after being outstanding for >30 days, registers them as late.
    Updates the Customer's total repayment count and updates relationship type.
    """
    cust_profile = get_or_create_customer(db, merchant_id, customer_name)
    
    # Fetch active udhar records for the customer sorted by oldest date_added first (FIFO)
    entries = db.query(models.Udhar).filter(
        models.Udhar.merchant_id == merchant_id,
        models.Udhar.customer_name.like(customer_name)
    ).order_by(models.Udhar.date_added.asc()).all()
    
    remaining_repayment = repayment_amount
    
    for entry in entries:
        if remaining_repayment <= 0:
            break
            
        # Check if this entry is considered late (date_added is >30 days ago from today)
        is_late = (date.today() - entry.date_added).days > 30
        
        if entry.amount <= remaining_repayment:
            # Fully pay off this entry
            remaining_repayment -= entry.amount
            if is_late:
                cust_profile.late_repayments += 1
            db.delete(entry)
        else:
            # Partially pay off this entry
            entry.amount -= remaining_repayment
            remaining_repayment = 0.0
            
    # Increment total repayments
    cust_profile.total_repayments += 1
    db.add(cust_profile)
    db.commit()
    db.refresh(cust_profile)
    
    # Recalculate remaining total pending amount and days pending
    updated_entries = db.query(models.Udhar).filter(
        models.Udhar.merchant_id == merchant_id,
        models.Udhar.customer_name.like(customer_name)
    ).all()
    
    new_pending_amount = sum(e.amount for e in updated_entries)
    
    if updated_entries:
        oldest_date = min(e.date_added for e in updated_entries)
        new_days_pending = max(0, (date.today() - oldest_date).days)
    else:
        new_days_pending = 0
        
    # Update relationship status
    update_customer_relationship(db, cust_profile, new_pending_amount, new_days_pending)
    
    return new_pending_amount


