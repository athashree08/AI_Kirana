from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Dict, Any, Optional

# --- MERCHANT SCHEMAS ---
class MerchantBase(BaseModel):
    id: str = Field(..., description="Unique merchant identifier")
    name: str = Field(..., description="Business name of the merchant")
    language: str = Field(..., description="Language preference of the merchant (e.g. Hindi)")
    business_type: str = Field(..., description="Business type (e.g. Kirana)")
    city: str = Field(..., description="City of operation")

class MerchantCreate(MerchantBase):
    pass

class MerchantResponse(MerchantBase):
    class Config:
        from_attributes = True


# --- TRANSACTION SCHEMAS ---
class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    timestamp: datetime = Field(..., description="Date and time of transaction")
    category: str = Field(..., description="Transaction category (Grocery, Dairy, etc.)")
    payment_mode: str = Field(..., description="Payment mode (UPI, WALLET, CARD, CASH)")
    customer_name: str = Field(..., description="Customer name")

class TransactionCreate(TransactionBase):
    merchant_id: str

class TransactionResponse(TransactionBase):
    id: int
    merchant_id: str

    class Config:
        from_attributes = True


# --- UDHAR SCHEMAS ---
class UdharBase(BaseModel):
    customer_name: str = Field(..., description="Customer name who took the credit")
    amount: float = Field(..., gt=0, description="Outstanding credit amount in INR")
    date_added: date = Field(..., description="Date when credit was extended")

class UdharCreate(UdharBase):
    merchant_id: str

class UdharResponse(UdharBase):
    id: int
    merchant_id: str

    class Config:
        from_attributes = True


# --- ANALYTICS AND CFO INSIGHTS SCHEMAS ---
class RevenueInsight(BaseModel):
    total_revenue: float
    average_monthly_revenue: float
    projected_annual_revenue: float
    weekly_revenue: Dict[str, float]
    weekend_revenue_ratio: float
    peak_hours_analysis: Dict[str, int]
    daily_average_transactions: float

class GSTInsight(BaseModel):
    taxable_sales: float
    exempt_sales: float
    gst_utilization_ratio: float
    estimated_gst_liability: float
    status: str

class UdharInsight(BaseModel):
    total_outstanding_udhar: float
    active_defaulters_count: int
    recovery_rate: float
    top_debtors: List[Dict[str, Any]]

class LoanReadinessInsight(BaseModel):
    score: int
    risk_level: str
    key_factors: List[str]
    recommendations: List[str]

class CFOInsightsResponse(BaseModel):
    merchant_id: str
    merchant_name: str
    insights_date: date
    revenue: RevenueInsight
    gst: GSTInsight
    udhar: UdharInsight
    loan_readiness: LoanReadinessInsight


# --- NEW SCHEMAS FOR LOAN READYNESS & UDHAR SYSTEM ---

class LoanScoreBreakdown(BaseModel):
    revenue_score: int
    consistency_score: int
    growth_score: int

class LoanScoreResponse(BaseModel):
    score: int
    max_score: int = 100
    label: str
    estimated_amount: float
    reason: str
    breakdown: LoanScoreBreakdown

class UdharCreateRequest(BaseModel):
    customer_name: str = Field(..., description="Customer name")
    amount: float = Field(..., gt=0, description="Outstanding credit amount in INR")
    date_added: Optional[date] = Field(None, description="Date when credit was extended (defaults to today)")
    merchant_id: str = Field(..., description="Merchant identifier")
    phone_number: Optional[str] = Field(None, description="Customer WhatsApp phone number (e.g. +919876543210)")

class UdharSummaryResponse(BaseModel):
    customer: str
    amount: float
    days_pending: int
    merchant_id: str
    entries_count: int


class VoiceResponse(BaseModel):
    transcript: str
    intent: str
    response_text: str
    audio_url: str


# --- DAILY SUMMARY & GST SCHEMAS ---

class SevenDayRevenueItem(BaseModel):
    day: str
    revenue: float

class SummaryResponse(BaseModel):
    today_revenue: float
    today_count: int
    yesterday_revenue: float
    change_pct: int
    peak_hour: str
    seven_day_revenue: List[SevenDayRevenueItem]

class GSTStatusResponse(BaseModel):
    ytd_revenue: float
    threshold: float
    percentage: int
    alert_level: str


# --- UDHAR INTELLIGENCE & REMINDER SCHEMAS ---

class CustomerResponse(BaseModel):
    id: int
    customer_name: str
    merchant_id: str
    relationship_type: str
    late_repayments: int
    total_repayments: int
    last_reminder_sent: Optional[datetime] = None
    phone_number: Optional[str] = None
    pending_amount: float
    days_pending: int
    risk_score: int
    risk_level: str
    # Sales-intelligence fields
    visit_count: int = 0
    total_spent: float = 0.0
    average_transaction: float = 0.0
    first_transaction_date: Optional[date] = None
    last_transaction_date: Optional[date] = None

    class Config:
        from_attributes = True


class ReminderGenerateRequest(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None


class ReminderGenerateResponse(BaseModel):
    customer: str
    pending_amount: float
    relationship: str
    message: str


class ReminderSendRequest(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    to_number: Optional[str] = None


class ReminderSendResponse(BaseModel):
    success: bool
    message_sid: Optional[str] = None
    customer: str
    message: Optional[str] = None


class UdharHealthResponse(BaseModel):
    total_udhar: float
    healthy_amount: float
    warning_amount: float
    risky_amount: float
    insights: List[str]


# --- CUSTOMER INTELLIGENCE SCHEMAS ---

class TopCustomerItem(BaseModel):
    customer_name: str
    total_spent: float
    visit_count: int
    relationship_type: str
    last_transaction_date: Optional[date] = None


class CustomerInsightsResponse(BaseModel):
    total_customers: int
    vip_customers: int
    regular_customers: int
    new_customers: int
    avg_customer_spend: float
    top_by_spend: List[TopCustomerItem]
    top_by_frequency: List[TopCustomerItem]
    newest_customers: List[TopCustomerItem]
    ai_insights: List[str]


class PaymentInsightResponse(BaseModel):
    customer_name: str
    visit_count: int
    total_spent: float
    relationship_type: str
    insight_message: str
    is_milestone: bool



