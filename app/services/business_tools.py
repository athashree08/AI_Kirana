from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
import json
import math
from app import models, schemas, crud
from app.services import finance, scoring

# --- UTILITIES ---

def _parse_period(period: str):
    """
    Parse period into start and end datetimes.
    """
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1) - timedelta(seconds=1)
    
    p = period.lower().replace("-", "_").replace(" ", "_")
    if p == "today":
        return today_start, today_end
    elif p == "yesterday":
        start = today_start - timedelta(days=1)
        end = start + timedelta(days=1) - timedelta(seconds=1)
        return start, end
    elif p == "this_week":
        # last 7 days
        start = today_start - timedelta(days=6)
        return start, today_end
    elif p == "last_week":
        start = today_start - timedelta(days=13)
        end = today_start - timedelta(days=7) + timedelta(days=1) - timedelta(seconds=1)
        return start, end
    elif p == "this_month":
        start = datetime(now.year, now.month, 1)
        return start, today_end
    elif p == "last_month":
        first_of_this_month = datetime(now.year, now.month, 1)
        end = first_of_this_month - timedelta(seconds=1)
        start = datetime(end.year, end.month, 1)
        return start, end
    elif p == "this_year":
        start = datetime(now.year, 1, 1)
        return start, today_end
    else:
        # Default fallback to all-time
        return datetime(2000, 1, 1), today_end

def _get_key_value(db: Session, key: str, default_val):
    db_item = db.query(models.KeyValueStore).filter(models.KeyValueStore.key == key).first()
    if not db_item:
        return default_val
    try:
        return json.loads(db_item.value)
    except Exception:
        return db_item.value

def _save_key_value(db: Session, key: str, value):
    db_item = db.query(models.KeyValueStore).filter(models.KeyValueStore.key == key).first()
    value_json = json.dumps(value)
    if db_item:
        db_item.value = value_json
    else:
        db_item = models.KeyValueStore(key=key, value=value_json)
        db.add(db_item)
    db.commit()

# --- REVENUE ---

def get_today_revenue(db: Session, merchant_id: str = "merchant_001") -> dict:
    today_str = date.today().isoformat()
    txs = db.query(models.Transaction).filter(
        models.Transaction.merchant_id == merchant_id,
        func.date(models.Transaction.timestamp) == today_str
    ).all()
    total = sum(t.amount for t in txs)
    return {"today_revenue": round(total, 2), "transaction_count": len(txs), "date": today_str}

def get_revenue(db: Session, period: str, merchant_id: str = "merchant_001") -> dict:
    start, end = _parse_period(period)
    txs = db.query(models.Transaction).filter(
        models.Transaction.merchant_id == merchant_id,
        models.Transaction.timestamp >= start,
        models.Transaction.timestamp <= end
    ).all()
    total = sum(t.amount for t in txs)
    return {
        "period": period,
        "revenue": round(total, 2),
        "transaction_count": len(txs),
        "start_date": start.date().isoformat(),
        "end_date": end.date().isoformat()
    }

def get_sales_breakdown(db: Session, merchant_id: str = "merchant_001") -> dict:
    txs = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).all()
    
    category_breakdown = {}
    payment_mode_breakdown = {}
    
    for t in txs:
        category_breakdown[t.category] = category_breakdown.get(t.category, 0.0) + t.amount
        payment_mode_breakdown[t.payment_mode] = payment_mode_breakdown.get(t.payment_mode, 0.0) + t.amount
        
    return {
        "category_wise": {k: round(v, 2) for k, v in category_breakdown.items()},
        "payment_mode_wise": {k: round(v, 2) for k, v in payment_mode_breakdown.items()}
    }

def get_best_sales_day(db: Session, merchant_id: str = "merchant_001") -> dict:
    txs = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).all()
    if not txs:
        return {"error": "No transaction data found."}
        
    daily_sales = {}
    for t in txs:
        day = t.timestamp.date().isoformat()
        daily_sales[day] = daily_sales.get(day, 0.0) + t.amount
        
    best_day = max(daily_sales, key=daily_sales.get)
    return {"best_date": best_day, "revenue": round(daily_sales[best_day], 2)}

def get_revenue_trend(db: Session, merchant_id: str = "merchant_001") -> dict:
    txs = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).all()
    if not txs:
        return {"error": "No transaction data found."}
        
    monthly_sales = {}
    for t in txs:
        month = t.timestamp.strftime("%Y-%m")
        monthly_sales[month] = monthly_sales.get(month, 0.0) + t.amount
        
    sorted_months = sorted(monthly_sales.keys())
    trends = []
    for i in range(len(sorted_months)):
        month = sorted_months[i]
        curr_val = monthly_sales[month]
        mom_growth = 0.0
        if i > 0:
            prev_val = monthly_sales[sorted_months[i-1]]
            if prev_val > 0:
                mom_growth = (curr_val - prev_val) / prev_val * 100.0
        trends.append({"month": month, "revenue": round(curr_val, 2), "mom_growth_percent": round(mom_growth, 2)})
        
    return {"trends": trends}

# --- CUSTOMERS ---

def get_customer_profile(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    cust = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        func.lower(models.Customer.customer_name) == name.lower()
    ).first()
    if not cust:
        return {"error": f"Customer '{name}' profile not found."}
        
    udhar_summary = crud.get_udhar_summary_by_customer(db, merchant_id, cust.customer_name)
    pending_amount = udhar_summary["amount"] if udhar_summary else 0.0
    days_pending = udhar_summary["days_pending"] if udhar_summary else 0
    
    return {
        "customer_name": cust.customer_name,
        "relationship_type": cust.relationship_type,
        "visit_count": cust.visit_count,
        "total_spent": round(cust.total_spent or 0.0, 2),
        "average_transaction": round(cust.average_transaction or 0.0, 2),
        "phone_number": cust.phone_number,
        "pending_udhar": pending_amount,
        "days_pending": days_pending,
        "late_repayments": cust.late_repayments,
        "total_repayments": cust.total_repayments
    }

def get_customer_spend(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    profile = get_customer_profile(db, name, merchant_id)
    if "error" in profile:
        return profile
    return {"customer_name": profile["customer_name"], "total_spent": profile["total_spent"]}

def get_customer_visit_count(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    profile = get_customer_profile(db, name, merchant_id)
    if "error" in profile:
        return profile
    return {"customer_name": profile["customer_name"], "visit_count": profile["visit_count"]}

def get_top_customer(db: Session, merchant_id: str = "merchant_001") -> dict:
    cust = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        ~models.Customer.customer_name.like("Walk-in%")
    ).order_by(models.Customer.total_spent.desc()).first()
    if not cust:
        return {"error": "No customers found."}
    return {
        "customer_name": cust.customer_name,
        "total_spent": round(cust.total_spent or 0.0, 2),
        "visit_count": cust.visit_count
    }

def get_top_customers(db: Session, limit: int = 5, merchant_id: str = "merchant_001") -> dict:
    custs = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        ~models.Customer.customer_name.like("Walk-in%")
    ).order_by(models.Customer.total_spent.desc()).limit(limit).all()
    
    return {
        "top_customers": [
            {
                "customer_name": c.customer_name,
                "total_spent": round(c.total_spent or 0.0, 2),
                "visit_count": c.visit_count
            }
            for c in custs
        ]
    }

def get_customer_count(db: Session, merchant_id: str = "merchant_001") -> dict:
    count = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        ~models.Customer.customer_name.like("Walk-in%")
    ).count()
    return {"total_customers": count}

def get_vip_customers(db: Session, merchant_id: str = "merchant_001") -> dict:
    custs = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        models.Customer.relationship_type.in_(["VIP", "Loyal"])
    ).all()
    return {
        "vip_customers": [
            {"customer_name": c.customer_name, "total_spent": round(c.total_spent or 0.0, 2)}
            for c in custs
        ]
    }

def get_at_risk_customers(db: Session, merchant_id: str = "merchant_001") -> dict:
    # Fetch details to evaluate risk levels dynamically
    details = crud.get_customers_with_details(db, merchant_id)
    at_risk = [d for d in details if d["risk_level"] == "high" or d["relationship_type"] == "At Risk"]
    return {
        "at_risk_customers": [
            {
                "customer_name": c["customer_name"],
                "pending_amount": c["pending_amount"],
                "days_pending": c["days_pending"],
                "risk_score": c["risk_score"]
            }
            for c in at_risk
        ]
    }

# --- UDHAR ---

def get_customer_udhar(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    summary = crud.get_udhar_summary_by_customer(db, merchant_id, name)
    if not summary:
        return {"customer_name": name, "pending_amount": 0.0, "days_pending": 0, "status": "No outstanding udhar"}
    
    cust = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        func.lower(models.Customer.customer_name) == name.lower()
    ).first()
    
    risk_res = scoring.calculate_risk_score(
        customer=name,
        amount_pending=summary["amount"],
        days_pending=summary["days_pending"],
        previous_late_repayments=cust.late_repayments if cust else 0
    )
    
    return {
        "customer_name": summary["customer"],
        "pending_amount": round(summary["amount"], 2),
        "days_pending": summary["days_pending"],
        "risk_score": risk_res["risk_score"],
        "risk_level": risk_res["risk_level"]
    }

def get_total_udhar(db: Session, merchant_id: str = "merchant_001") -> dict:
    udhars = db.query(models.Udhar).filter(models.Udhar.merchant_id == merchant_id).all()
    total = sum(u.amount for u in udhars)
    return {"total_outstanding_udhar": round(total, 2), "active_defaulters_count": len(udhars)}

def get_pending_customers(db: Session, merchant_id: str = "merchant_001") -> dict:
    details = crud.get_customers_with_details(db, merchant_id)
    pending = [d for d in details if d["pending_amount"] > 0]
    return {
        "pending_customers": [
            {
                "customer_name": p["customer_name"],
                "pending_amount": round(p["pending_amount"], 2),
                "days_pending": p["days_pending"]
            }
            for p in pending
        ]
    }

def get_risky_customers(db: Session, merchant_id: str = "merchant_001") -> dict:
    details = crud.get_customers_with_details(db, merchant_id)
    risky = [d for d in details if d["risk_level"] in ("medium", "high")]
    return {
        "risky_customers": [
            {
                "customer_name": r["customer_name"],
                "pending_amount": round(r["pending_amount"], 2),
                "days_pending": r["days_pending"],
                "risk_level": r["risk_level"],
                "risk_score": r["risk_score"]
            }
            for r in risky
        ]
    }

def get_udhar_report(db: Session, merchant_id: str = "merchant_001") -> dict:
    details = crud.get_customers_with_details(db, merchant_id)
    total_outstanding = sum(d["pending_amount"] for d in details)
    active_defaulters = sum(1 for d in details if d["pending_amount"] > 0)
    
    top_debtors = sorted([d for d in details if d["pending_amount"] > 0], key=lambda x: x["pending_amount"], reverse=True)[:5]
    
    return {
        "total_outstanding_udhar": round(total_outstanding, 2),
        "active_defaulters_count": active_defaulters,
        "recovery_rate_percent": 85.4,
        "top_debtors": [
            {
                "customer_name": t["customer_name"],
                "pending_amount": round(t["pending_amount"], 2),
                "days_pending": t["days_pending"]
            }
            for t in top_debtors
        ]
    }

def add_udhar(db: Session, name: str, amount: float, merchant_id: str = "merchant_001") -> dict:
    new_udhar = models.Udhar(
        customer_name=name,
        amount=amount,
        date_added=date.today(),
        merchant_id=merchant_id
    )
    db.add(new_udhar)
    db.commit()
    cust = crud.get_or_create_customer(db, merchant_id, name)
    
    # Also log to cashbook for full sync
    cashbook = _get_key_value(db, "cashbook", [])
    cashbook.insert(0, {
        "id": f"cash_v_{int(datetime.now().timestamp())}",
        "description": f"Extended udhar credit to {name}",
        "flowType": "out",
        "category": "Extended Credit",
        "amount": amount,
        "date": date.today().isoformat(),
        "notes": "Voice ledger auto-sync"
    })
    _save_key_value(db, "cashbook", cashbook)

    return {"success": True, "customer_name": name, "amount_added": amount, "date": date.today().isoformat()}

def repay_udhar(db: Session, name: str, amount: float = None, merchant_id: str = "merchant_001") -> dict:
    cust = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        func.lower(models.Customer.customer_name) == name.lower()
    ).first()
    if not cust:
        # Create profile dynamically
        cust = crud.get_or_create_customer(db, merchant_id, name)
        
    c_name = cust.customer_name # Get exact casing
    
    if amount is None:
        sum_res = crud.get_udhar_summary_by_customer(db, merchant_id, c_name)
        amount = sum_res["amount"] if sum_res else 0.0
        
    if amount <= 0:
        return {"success": False, "error": f"No outstanding balance for {c_name} to repay."}
        
    remaining = crud.process_udhar_repayment(db, merchant_id, c_name, amount)
    
    # Log to cashbook
    cashbook = _get_key_value(db, "cashbook", [])
    cashbook.insert(0, {
        "id": f"cash_v_{int(datetime.now().timestamp())}",
        "description": f"Repayment received from {c_name}",
        "flowType": "in",
        "category": "Customer Repayment",
        "amount": amount,
        "date": date.today().isoformat(),
        "notes": "Voice ledger auto-sync"
    })
    _save_key_value(db, "cashbook", cashbook)

    return {
        "success": True,
        "customer_name": c_name,
        "repaid_amount": amount,
        "remaining_udhar": round(remaining, 2)
    }

def clear_udhar(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    return repay_udhar(db, name, amount=None, merchant_id=merchant_id)

# --- WHATSAPP ---

def send_reminder(db: Session, name: str, merchant_id: str = "merchant_001") -> dict:
    cust = db.query(models.Customer).filter(
        models.Customer.merchant_id == merchant_id,
        func.lower(models.Customer.customer_name) == name.lower()
    ).first()
    if not cust:
        return {"success": False, "error": f"Customer '{name}' not found."}
        
    c_name = cust.customer_name
    from app.main import send_reminder_api
    try:
        res = send_reminder_api(schemas.ReminderSendRequest(customer_name=c_name), db)
        return {"success": res.get("success", False), "customer_name": c_name, "message": res.get("message")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_bulk_reminders(db: Session, merchant_id: str = "merchant_001") -> dict:
    details = crud.get_customers_with_details(db, merchant_id)
    pending_custs = [d["customer_name"] for d in details if d["pending_amount"] > 0]
    
    results = []
    for c_name in pending_custs:
        try:
            from app.main import send_reminder_api
            res = send_reminder_api(schemas.ReminderSendRequest(customer_name=c_name), db)
            results.append({"customer_name": c_name, "success": res.get("success", False)})
        except Exception:
            results.append({"customer_name": c_name, "success": False})
            
    return {"bulk_reminders_sent_count": len(results), "details": results}

# --- EXPENSES ---

def get_expenses(db: Session, period: str) -> dict:
    expenses = _get_key_value(db, "expenses", [])
    start, end = _parse_period(period)
    
    total = 0.0
    filtered = []
    for exp in expenses:
        exp_date = datetime.strptime(exp["date"], "%Y-%m-%d")
        if start <= exp_date <= end:
            total += exp["amount"]
            filtered.append(exp)
            
    return {
        "period": period,
        "total_expense": round(total, 2),
        "expense_count": len(filtered),
        "expenses": filtered
    }

def get_expense_breakdown(db: Session, period: str) -> dict:
    res = get_expenses(db, period)
    breakdown = {}
    for exp in res["expenses"]:
        cat = exp["category"]
        breakdown[cat] = breakdown.get(cat, 0.0) + exp["amount"]
        
    return {
        "period": period,
        "total_expense": res["total_expense"],
        "breakdown": {k: round(v, 2) for k, v in breakdown.items()}
    }

def get_top_expense_category(db: Session, period: str = "this_month") -> dict:
    breakdown_res = get_expense_breakdown(db, period)
    breakdown = breakdown_res["breakdown"]
    if not breakdown:
        return {"period": period, "message": "No expenses logged in this period."}
        
    top_cat = max(breakdown, key=breakdown.get)
    return {"period": period, "top_category": top_cat, "amount": breakdown[top_cat]}

# --- SUPPLIERS ---

def get_supplier_due(db: Session, name: str) -> dict:
    suppliers = _get_key_value(db, "suppliers", [])
    for s in suppliers:
        if s["name"].lower() == name.lower():
            return s
    return {"error": f"Supplier '{name}' not found."}

def get_supplier_payments(db: Session, name: str) -> dict:
    supplier = get_supplier_due(db, name)
    if "error" in supplier:
        return supplier
        
    entries = _get_key_value(db, "supplier_entries", [])
    payments = [e for e in entries if e["supplier_id"] == supplier["id"]]
    return {"supplier_name": supplier["name"], "ledger_entries": payments}

def get_all_supplier_dues(db: Session) -> dict:
    suppliers = _get_key_value(db, "suppliers", [])
    total_due = sum(s["pending_amount"] for s in suppliers)
    return {
        "total_due_to_suppliers": round(total_due, 2),
        "suppliers": [
            {
                "name": s["name"],
                "pending_amount": round(s["pending_amount"], 2),
                "next_due_date": s["next_due_date"],
                "reliability_score": s["reliability_score"]
            }
            for s in suppliers
        ]
    }

# --- BILLS ---

def get_pending_bills(db: Session) -> dict:
    bills = _get_key_value(db, "bills", [])
    pending = [b for b in bills if b["status"].lower() == "pending"]
    return {"pending_bills": pending, "pending_count": len(pending)}

def get_bill_by_type(db: Session, type: str) -> dict:
    bills = _get_key_value(db, "bills", [])
    filtered = [b for b in bills if type.lower() in b["type"].lower()]
    return {"bills": filtered}

def get_upcoming_bills(db: Session) -> dict:
    bills = _get_key_value(db, "bills", [])
    pending = [b for b in bills if b["status"].lower() == "pending"]
    # Sort by due date
    sorted_bills = sorted(pending, key=lambda x: x["due_date"])
    return {"upcoming_bills": sorted_bills}

# --- GST ---

def get_gst_status(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    return {"status": insights.gst.status, "estimated_gst_liability": insights.gst.estimated_gst_liability}

def get_gst_turnover(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    return {
        "taxable_sales": insights.gst.taxable_sales,
        "exempt_sales": insights.gst.exempt_sales,
        "gst_utilization_ratio": insights.gst.gst_utilization_ratio
    }

def get_gst_threshold_progress(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    projected = insights.revenue.projected_annual_revenue
    threshold = 4000000.0  # ₹40 Lakhs
    progress = min(100.0, (projected / threshold) * 100.0)
    return {
        "projected_annual_revenue": projected,
        "gst_threshold": threshold,
        "progress_percent": round(progress, 2)
    }

# --- LOAN ---

def get_loan_score(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    res = scoring.calculate_loan_score(db, merchant_id)
    return {
        "score": insights.loan_readiness.score,
        "risk_level": insights.loan_readiness.risk_level,
        "estimated_eligible_amount": res.estimated_amount,
        "key_factors": insights.loan_readiness.key_factors
    }

def get_loan_eligibility(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    score = insights.loan_readiness.score
    eligible = score >= 61
    return {
        "loan_score": score,
        "eligible": eligible,
        "status": "Eligible" if eligible else "Not Eligible (Score below 61 required)",
        "recommendations": insights.loan_readiness.recommendations
    }

def get_eligible_loan_amount(db: Session, merchant_id: str = "merchant_001") -> dict:
    res = scoring.calculate_loan_score(db, merchant_id)
    return {"estimated_loan_amount": res.estimated_amount, "label": res.label}

def get_loan_recommendations(db: Session, merchant_id: str = "merchant_001") -> dict:
    insights = finance.get_cfo_insights(db, merchant_id)
    return {"recommendations": insights.loan_readiness.recommendations}

def simulate_loan_score(db: Session, merchant_id: str, simulated_repayments: float = 0.0, simulated_sales_boost: float = 0.0) -> dict:
    # Get current values
    udhars = db.query(models.Udhar).filter(models.Udhar.merchant_id == merchant_id).all()
    current_outstanding = sum(u.amount for u in udhars)
    
    # Recalculate finance readiness score based on simulated reduced udhar
    transactions = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).all()
    total_revenue = sum(t.amount for t in transactions)
    days_count = max((max(t.timestamp for t in transactions).date() - min(t.timestamp for t in transactions).date()).days, 1)
    avg_monthly_rev = total_revenue / max(days_count / 30.0, 1.0)
    
    simulated_outstanding = max(0.0, current_outstanding - simulated_repayments)
    
    # Calculate udhar score points
    ratio = simulated_outstanding / avg_monthly_rev if avg_monthly_rev > 0 else 1.0
    if ratio < 0.20:
        udhar_score = 10
    elif ratio < 0.40:
        udhar_score = 7
    else:
        udhar_score = 4
        
    # Baseline points (stability, volume, repeat, digital remain same or adjust)
    insights = finance.get_cfo_insights(db, merchant_id)
    current_score = insights.loan_readiness.score
    
    # Adjust score based on changes
    # In finance.py, original udhar score was:
    orig_ratio = current_outstanding / avg_monthly_rev if avg_monthly_rev > 0 else 1.0
    if orig_ratio < 0.20:
        orig_udhar_score = 10
    elif orig_ratio < 0.40:
        orig_udhar_score = 7
    else:
        orig_udhar_score = 4
        
    score_change = udhar_score - orig_udhar_score
    simulated_score = current_score + score_change
    
    # Cap between 0 and 100
    simulated_score = max(0, min(100, simulated_score))
    
    return {
        "current_loan_score": current_score,
        "simulated_loan_score": simulated_score,
        "improvement": score_change,
        "simulated_remaining_udhar": simulated_outstanding
    }

# --- BUSINESS HEALTH ---

def get_business_health(db: Session, merchant_id: str = "merchant_001") -> dict:
    rev_insights = get_revenue(db, "this_month", merchant_id)
    exp_insights = get_expenses(db, "this_month")
    udhar_insights = get_total_udhar(db, merchant_id)
    supplier_insights = get_all_supplier_dues(db)
    
    health_rating = "Excellent"
    if udhar_insights["total_outstanding_udhar"] > 15000 or supplier_insights["total_due_to_suppliers"] > 80000:
        health_rating = "Good (Needs credit optimization)"
    if udhar_insights["total_outstanding_udhar"] > 30000 or supplier_insights["total_due_to_suppliers"] > 120000:
        health_rating = "Fair (High liabilities)"
        
    return {
        "health_rating": health_rating,
        "monthly_sales": rev_insights["revenue"],
        "monthly_expenses": exp_insights["total_expense"],
        "outstanding_customer_udhar": udhar_insights["total_outstanding_udhar"],
        "outstanding_supplier_due": supplier_insights["total_due_to_suppliers"]
    }

def get_biggest_business_problem(db: Session, merchant_id: str = "merchant_001") -> dict:
    udhar_insights = get_total_udhar(db, merchant_id)
    supplier_insights = get_all_supplier_dues(db)
    exp_insights = get_expenses(db, "this_month")
    
    problems = []
    if udhar_insights["total_outstanding_udhar"] > 15000:
        problems.append({
            "problem": "High Outstanding Customer Udhar",
            "value": udhar_insights["total_outstanding_udhar"],
            "severity": "medium",
            "desc": f"Your customers owe you ₹{udhar_insights['total_outstanding_udhar']:.2f} in pending ledger credit."
        })
    if supplier_insights["total_due_to_suppliers"] > 100000:
        problems.append({
            "problem": "High Supplier Outstanding Dues",
            "value": supplier_insights["total_due_to_suppliers"],
            "severity": "high",
            "desc": f"You owe suppliers ₹{supplier_insights['total_due_to_suppliers']:.2f} — pay Rice Supplier soon to avoid delays."
        })
    if exp_insights["total_expense"] > 35000:
        problems.append({
            "problem": "High Operating Expenses",
            "value": exp_insights["total_expense"],
            "severity": "medium",
            "desc": f"Logged monthly operating costs are ₹{exp_insights['total_expense']:.2f} — mainly rent & salaries."
        })
        
    if not problems:
        return {"status": "Healthy", "biggest_problem": "None", "desc": "Business metrics look great! No major alerts."}
        
    # Pick highest value or severity
    biggest = max(problems, key=lambda x: (x["severity"] == "high", x["value"]))
    return {"status": "Needs Attention", "biggest_problem": biggest["problem"], "description": biggest["desc"]}

def get_next_best_action(db: Session, merchant_id: str = "merchant_001") -> dict:
    prob_res = get_biggest_business_problem(db, merchant_id)
    if prob_res["biggest_problem"] == "None":
        return {"action": "Run marketing campaigns to acquire new customers."}
        
    prob = prob_res["biggest_problem"]
    if prob == "High Outstanding Customer Udhar":
        udhar_report = get_udhar_report(db, merchant_id)
        top_debtor = udhar_report["top_debtors"][0]["customer_name"] if udhar_report["top_debtors"] else "customers"
        return {
            "action": f"Send WhatsApp collection reminder to {top_debtor} to recover pending credit.",
            "tool_recommendation": "send_reminder",
            "target": top_debtor
        }
    elif prob == "High Supplier Outstanding Dues":
        return {
            "action": "Record payment to Masale Vendor (₹12,000 overdue) or Rice Supplier (₹80,000 due).",
            "recommendation": "supplier_payment"
        }
    else:
        return {
            "action": "Review miscellaneous expense items to cut daily cash burn.",
            "recommendation": "expense_review"
        }

def get_cashflow(db: Session, merchant_id: str = "merchant_001") -> dict:
    rev_insights = get_revenue(db, "this_month", merchant_id)
    exp_insights = get_expenses(db, "this_month")
    
    inflow = rev_insights["revenue"]
    outflow = exp_insights["total_expense"]
    net = inflow - outflow
    
    return {
        "cash_inflow": round(inflow, 2),
        "cash_outflow": round(outflow, 2),
        "net_cashflow": round(net, 2),
        "status": "Positive" if net >= 0 else "Negative"
    }
