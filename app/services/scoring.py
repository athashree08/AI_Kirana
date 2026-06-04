from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from app import models, schemas
import math

def calculate_loan_score(db: Session, merchant_id: str) -> schemas.LoanScoreResponse:
    """
    Computes the loan readiness score, risk label, estimated loan amount,
    and explainable AI response reason.
    """
    merchant = db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()
    if not merchant:
        raise ValueError(f"Merchant {merchant_id} not found")

    # Fetch all transactions
    transactions = db.query(models.Transaction)\
        .filter(models.Transaction.merchant_id == merchant_id)\
        .order_by(models.Transaction.timestamp.asc()).all()

    if not transactions:
        # Default response for new merchants with no transaction history
        return schemas.LoanScoreResponse(
            score=0,
            label="Poor",
            estimated_amount=0.0,
            reason="No transaction history available to perform credit scoring.",
            breakdown=schemas.LoanScoreBreakdown(
                revenue_score=0,
                consistency_score=0,
                growth_score=0
            )
        )

    # 1. Calculate Average Monthly Revenue
    timestamps = [t.timestamp for t in transactions]
    min_date = min(timestamps).date()
    max_date = max(timestamps).date()
    total_days = max((max_date - min_date).days, 1)
    
    total_revenue = sum(t.amount for t in transactions)
    months_count = total_days / 30.0
    avg_monthly_rev = total_revenue / months_count if months_count > 0 else total_revenue
    
    # Map average monthly revenue to a score out of 40
    # Capped at Rs. 1,50,000/month for a maximum score of 40
    max_rev_cap = 150000.0
    revenue_score = min(40, int((avg_monthly_rev / max_rev_cap) * 40))
    revenue_score = max(0, revenue_score)

    # 2. Calculate Consistency Score (Max 30 points)
    # Group transactions by calendar day to find daily revenue volatility
    daily_revenue = {}
    # Initialize all dates with 0.0 to account for days with zero transactions
    for i in range(total_days + 1):
        day_date = min_date + timedelta(days=i)
        daily_revenue[day_date] = 0.0
        
    for t in transactions:
        tx_date = t.timestamp.date()
        daily_revenue[tx_date] = daily_revenue.get(tx_date, 0.0) + t.amount

    daily_rev_values = list(daily_revenue.values())
    n = len(daily_rev_values)
    
    if n > 1:
        mean_daily = sum(daily_rev_values) / n
        variance = sum((x - mean_daily) ** 2 for x in daily_rev_values) / n
        std_dev = math.sqrt(variance)
        
        cv = std_dev / mean_daily if mean_daily > 0 else 1.0
        # Less volatility (lower CV) = higher consistency score
        # A CV of 0.2 or below gets full points, and a CV of 1.0+ gets 0 points.
        consistency_score = max(0, min(30, int(30 * (1.0 - (cv - 0.2) / 0.8))))
        # Clean up if cv <= 0.2
        if cv <= 0.2:
            consistency_score = 30
    else:
        cv = 0.0
        consistency_score = 15

    # 3. Calculate Growth Score (Max 30 points)
    # Compare: Last 30 Days (0-29 days ago) vs Previous 30 Days (30-59 days ago)
    # This guarantees exact, non-overlapping 30-day buckets
    today = datetime.now().date()
    last_30_start = today - timedelta(days=29)
    prev_30_start = today - timedelta(days=59)
    prev_30_end = today - timedelta(days=30)
    
    rev_last_30 = sum(t.amount for t in transactions if last_30_start <= t.timestamp.date() <= today)
    rev_prev_30 = sum(t.amount for t in transactions if prev_30_start <= t.timestamp.date() <= prev_30_end)
    
    if rev_prev_30 > 0:
        growth_rate = (rev_last_30 - rev_prev_30) / rev_prev_30
        
        # Scoring scale:
        # +20% or more growth = 30 points
        # 0% growth (flat) = 15 points
        # -20% or more decline = 0 points
        if growth_rate >= 0.20:
            growth_score = 30
        elif growth_rate <= -0.20:
            growth_score = 0
        elif growth_rate >= 0:
            # Linear scale between 15 and 30
            growth_score = int(15 + (growth_rate / 0.20) * 15)
        else:
            # Linear scale between 0 and 15
            growth_score = int(15 - (abs(growth_rate) / 0.20) * 15)
    else:
        # If no previous 30-day baseline, base on simple daily transaction progression
        growth_rate = 0.0
        growth_score = 15

    # 4. Aggregate Score
    score = revenue_score + consistency_score + growth_score
    score = max(0, min(100, score))

    # 5. Risk Label
    if score >= 81:
        label = "Excellent"
    elif score >= 61:
        label = "Good"
    elif score >= 31:
        label = "Fair"
    else:
        label = "Poor"

    # 6. Loan Eligibility (Estimated Amount)
    # Base: 1.5x average monthly revenue, scaled by readiness score.
    base_loan_amount = avg_monthly_rev * 1.5
    estimated_amount = base_loan_amount * (score / 100.0)
    
    # Rounded to nearest Rs 5000
    estimated_amount = round(estimated_amount / 5000.0) * 5000.0
    
    # Cap between minimum Rs 10,000 and maximum Rs 5,00,000
    if score < 30:
        estimated_amount = 0.0  # Disqualified
    else:
        estimated_amount = max(10000.0, min(500000.0, estimated_amount))

    # 7. Explainable AI Reason
    reasons = []
    if growth_rate > 0.05:
        reasons.append(f"steady revenue growth of {growth_rate*100:.1f}% over the last month")
    elif growth_rate < -0.05:
        reasons.append(f"a recent decline in month-over-month revenue")
    else:
        reasons.append("stable and consistent sales patterns")

    if cv < 0.35:
        reasons.append("exceptionally low volatility in daily sales")
    else:
        reasons.append("moderate fluctuations in daily customer traffic")
        
    if avg_monthly_rev > 80000:
        reasons.append("healthy monthly volume exceeding Rs. 80,000")
        
    # Join into a clean explainable sentence
    reason_details = ", ".join(reasons)
    reason = f"Your readiness score is '{label}' due to {reason_details}."

    return schemas.LoanScoreResponse(
        score=score,
        max_score=100,
        label=label,
        estimated_amount=estimated_amount,
        reason=reason,
        breakdown=schemas.LoanScoreBreakdown(
            revenue_score=revenue_score,
            consistency_score=consistency_score,
            growth_score=growth_score
        )
    )


def calculate_risk_score(customer: str, amount_pending: float, days_pending: int, previous_late_repayments: int) -> dict:
    """
    Calculates a credit risk score from 0 to 100 for a customer.
    Inputs:
        - customer: customer name (str)
        - amount_pending: outstanding udhar amount (float)
        - days_pending: days since the oldest outstanding entry (int)
        - previous_late_repayments: number of payments made late (int)
    """
    if amount_pending <= 0:
        return {
            "customer": customer,
            "risk_score": 0,
            "risk_level": "low"
        }

    # Weight amount pending (max 40 pts)
    # E.g. Rs. 2500 pending gets full 40 pts
    amount_factor = min(amount_pending / 2500.0 * 40.0, 40.0)

    # Weight oldest days pending (max 40 pts)
    # E.g. 45 days pending gets full 40 pts
    days_factor = min(days_pending / 45.0 * 40.0, 40.0)

    # Weight late repayments history (max 20 pts)
    # E.g. 2 late repayments gets full 20 pts
    late_factor = min(previous_late_repayments * 10.0, 20.0)

    score = int(round(amount_factor + days_factor + late_factor))
    score = max(0, min(100, score))

    if score <= 39:
        level = "low"
    elif score <= 69:
        level = "medium"
    else:
        level = "high"

    return {
        "customer": customer,
        "risk_score": score,
        "risk_level": level
    }

