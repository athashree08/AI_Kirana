import os
import sys
from datetime import datetime

# Add the project root to python path to import app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services import finance
from app import models

def validate_demo_data():
    db = SessionLocal()
    try:
        merchant_id = "merchant_001"
        
        # Check if database has data
        merchant = db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()
        if not merchant:
            print("ERROR: Merchant merchant_001 not found. Please run 'python scripts/seed.py' first.")
            return

        tx_count = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).count()
        udhar_count = db.query(models.Udhar).filter(models.Udhar.merchant_id == merchant_id).count()
        
        print("=" * 60)
        print("          AI MUNSHI DATA VALIDATION REPORT")
        print("=" * 60)
        print(f"Merchant Name : {merchant.name}")
        print(f"City          : {merchant.city}")
        print(f"Business Type : {merchant.business_type}")
        print("-" * 60)
        print(f"Database Stats:")
        print(f"  - Total Transactions : {tx_count}")
        print(f"  - Total Udhar Ledgers: {udhar_count}")
        print("-" * 60)
        
        # Get CFO Insights
        insights = finance.get_cfo_insights(db, merchant_id)
        
        # Extract metrics
        total_revenue = insights.revenue.total_revenue
        avg_monthly_rev = insights.revenue.average_monthly_revenue
        proj_annual_rev = insights.revenue.projected_annual_revenue
        gst_util = insights.gst.gst_utilization_ratio
        loan_score = insights.loan_readiness.score
        
        # Calculate Digital vs Cash
        # Get transactions for manual check of digital average
        transactions = db.query(models.Transaction).filter(models.Transaction.merchant_id == merchant_id).all()
        digital_txs = [t for t in transactions if t.payment_mode in ("UPI", "WALLET", "CARD")]
        cash_txs = [t for t in transactions if t.payment_mode == "CASH"]
        
        total_digital_rev = sum(d.amount for d in digital_txs)
        total_cash_rev = sum(c.amount for c in cash_txs)
        
        # Calculate days of simulation
        timestamps = [t.timestamp for t in transactions]
        days_simulated = (max(timestamps).date() - min(timestamps).date()).days
        months_simulated = days_simulated / 30.0
        
        avg_digital_monthly = total_digital_rev / months_simulated
        avg_cash_monthly = total_cash_rev / months_simulated
        
        # --- VERIFICATION TARGETS ---
        print("CALCULATED CFO METRICS vs TARGET DEMO NUMBERS:")
        print("-" * 60)
        
        # 1. Total Annualized Revenue (Target: ~Rs 14 Lakh)
        print(f"1. Annualized Revenue:")
        print(f"   - Target : ~ Rs 14,00,000 (14 Lakh)")
        print(f"   - Actual :   Rs {proj_annual_rev:,.2f}")
        rev_status = "PASS" if 1300000 <= proj_annual_rev <= 1500000 else "WARNING"
        print(f"   - Status : [{rev_status}]")
        
        # 2. Average Monthly Digital/Paytm Revenue (Target: ~Rs 62,000)
        print(f"\n2. Average Monthly Digital (Paytm/UPI/Wallet) Revenue:")
        print(f"   - Target : ~ Rs 62,000")
        print(f"   - Actual :   Rs {avg_digital_monthly:,.2f}")
        dig_status = "PASS" if 58000 <= avg_digital_monthly <= 66000 else "WARNING"
        print(f"   - Status : [{dig_status}]")
        
        # 3. Average Monthly Cash Revenue
        print(f"\n3. Average Monthly Cash Revenue:")
        print(f"   - Actual :   Rs {avg_cash_monthly:,.2f}")
        print(f"   - Total Avg Monthly (Digital + Cash): Rs {avg_monthly_rev:,.2f}")
        
        # 4. GST Utilization Ratio (Target: ~71%)
        gst_pct = gst_util * 100
        print(f"\n4. GST Utilization (Taxable Sales Ratio):")
        print(f"   - Target : ~ 71.00%")
        print(f"   - Actual :   {gst_pct:.2f}%")
        gst_status = "PASS" if 70.0 <= gst_pct <= 72.0 else "WARNING"
        print(f"   - Status : [{gst_status}]")
        
        # 5. Loan Readiness Score (Target: 70-75)
        print(f"\n5. Loan Readiness Score:")
        print(f"   - Target : 70 - 75")
        print(f"   - Actual : {loan_score} ({insights.loan_readiness.risk_level})")
        loan_status = "PASS" if 70 <= loan_score <= 75 else "WARNING"
        print(f"   - Status : [{loan_status}]")
        
        print("-" * 60)
        print("ADDITIONAL BEHAVIORAL CHECKS:")
        print("-" * 60)
        
        # Check weekend revenue bias
        sat_rev = insights.revenue.weekly_revenue.get("Saturday", 0)
        sun_rev = insights.revenue.weekly_revenue.get("Sunday", 0)
        weekend_avg = (sat_rev + sun_rev) / 2
        
        weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        weekday_avg = sum(insights.revenue.weekly_revenue.get(day, 0) for day in weekday_names) / 5
        print(f"  - Avg Weekend Daily Sales : Rs {weekend_avg:,.2f}")
        print(f"  - Avg Weekday Daily Sales : Rs {weekday_avg:,.2f}")
        weekend_bias = (weekend_avg / weekday_avg - 1) * 100 if weekday_avg > 0 else 0
        print(f"  - Weekend Sales Boost     : {weekend_bias:+.2f}% (Target: Positive boost)")
        
        # Check peak hours
        print(f"  - Sales Peak Hours Volume Share:")
        total_peaks = sum(insights.revenue.peak_hours_analysis.values())
        for peak_name, count in insights.revenue.peak_hours_analysis.items():
            pct = (count / total_peaks) * 100 if total_peaks > 0 else 0
            print(f"    * {peak_name:<25}: {count} transactions ({pct:.1f}%)")
            
        print("=" * 60)
        
    except Exception as e:
        print(f"Validation Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    validate_demo_data()
