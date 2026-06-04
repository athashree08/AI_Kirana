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

