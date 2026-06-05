from sqlalchemy import Column, Integer, Float, String, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False)
    business_type = Column(String, nullable=False)
    city = Column(String, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="merchant", cascade="all, delete-orphan")
    udhars = relationship("Udhar", back_populates="merchant", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False, index=True)
    payment_mode = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=False, index=True)

    # Relationships
    merchant = relationship("Merchant", back_populates="transactions")


class Udhar(Base):
    __tablename__ = "udhar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_name = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    date_added = Column(Date, nullable=False, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="udhars")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_name = Column(String, nullable=False, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String, default="New")  # VIP, Regular, New (sales-based) or loyal, normal, risky (udhar-based)
    late_repayments = Column(Integer, default=0)
    total_repayments = Column(Integer, default=0)
    last_reminder_sent = Column(DateTime, nullable=True)
    phone_number = Column(String, nullable=True)  # WhatsApp-capable phone number

    # --- Customer Intelligence Fields (auto-updated from transactions) ---
    visit_count = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    average_transaction = Column(Float, default=0.0)
    first_transaction_date = Column(Date, nullable=True)
    last_transaction_date = Column(Date, nullable=True)

    # Relationships
    merchant = relationship("Merchant")

