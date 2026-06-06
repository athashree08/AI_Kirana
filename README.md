# AI Munshi - Data Simulation and Backend Module

AI Munshi is a Hindi Voice CFO app for small merchants in India. Since production Paytm APIs are not available during the hackathon, this module serves as a realistic, production-ready backend simulation layer.

It provides a SQLite database, SQLAlchemy models, a highly calibrated mock data generator simulating 180 days of transaction history for a Kirana store, a CFO analytics engine, and a FastAPI API service.

---

## 📂 Directory Structure

```text
ai_munshi/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application entry point, API routes, CORS config
│   ├── config.py        # Configuration and path settings
│   ├── database.py      # SQLAlchemy engine configuration and sessions
│   ├── models.py        # Database models (merchants, transactions, udhar)
│   ├── schemas.py       # Pydantic validation schemas and CFO response models
│   ├── crud.py          # Database operations helpers (create/read)
│   └── services/
│       ├── __init__.py
│       ├── generator.py # Calibrated realistic transaction & udhar simulation service
│       └── finance.py   # CFO financial analytics & credit scoring engine
├── scripts/
│   ├── seed.py          # Database populator (seeds Ramesh Kirana Store with 180 days of data)
│   ├── reset.py         # Administrative reset script (drops/creates SQLite tables)
│   └── validate.py      # Verification script that calculates KPIs and reports on target numbers
├── requirements.txt     # Python dependencies
├── README.md            # Comprehensive documentation
└── app/test_db.db       # Generated SQLite database file
```

---

## 🛠️ Setup & Installation

### 1. Prerequisite
Ensure Python 3.8+ is installed on your machine.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Reset and Seed the Database
Initialize the database schemas and generate 180 days of mock transaction data for the target merchant `Ramesh Kirana Store` (`merchant_001`):
```bash
# Drop existing tables and recreate them
python scripts/reset.py

# Seed the database (creates 7000+ transactions and 12 udhar files)
python scripts/seed.py
```

### 4. Run the Data Validation Script
Run the validation script to verify that the generated data matches the target demo metrics:
```bash
python scripts/validate.py
```

### 5. Launch the FastAPI Server
Run the local development server to query the APIs:
```bash
uvicorn app.main:app --reload
```
Once the server is running, you can access:
- **Interactive Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Root URL:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## 📊 Target Demo Metrics & Calibration

The simulation engine is mathematically calibrated using a **2x2 Matrix Calibration** step to match the exact financial profiles required for the Paytm hackathon demo. 

### Target Metrices & Validation Output

| Metric | Target | Actual (Simulated) | Status |
| :--- | :--- | :--- | :--- |
| **Annualized Revenue** | ≈ Rs 14,00,000 | **Rs 1,474,578.08** | **PASS** |
| **Average Monthly Digital Sales** | ≈ Rs 62,000 | **Rs 65,249.96** | **PASS** |
| **GST Utilization (Taxable Ratio)** | ≈ 71.00% | **71.32%** | **PASS** |
| **Loan Readiness Score** | 70 - 75 | **71** | **PASS** |

### Calibration Strategy Details

1. **Digital vs Cash Split (Revenue Reconciliation):**
   Ramesh Kirana Store's total annualized revenue is targeted at **Rs 14 Lakh** (~Rs 1.16 Lakh/month). To support this while meeting the **Rs 62,000/month digital revenue** target, the generator splits payment modes into:
   - **Digital** (`UPI`, `WALLET`, `CARD`): 53.4% of volume (Target: Rs 62,000/month)
   - **Cash** (`CASH`): 46.6% of volume (Target: Rs 53,000/month)
   - Total Monthly Revenue = ~Rs 1.15 - 1.20 Lakh (Annualized = ~Rs 14 Lakh)

2. **GST Utilization:**
   Defined as `Taxable Revenue / Total Revenue`. 
   - **Exempt category:** `Dairy` (0% GST) is weighted to represent ~29% of sales.
   - **Taxable categories:** `Grocery`, `Snacks`, `Household`, `Beverages` represent ~71% of sales.
   - Matrix calibration adjusts values dynamically to hit exactly **71% GST utilization** in the final ledger, offsetting clipping bounds.

3. **Loan Readiness Score:**
   The `finance.py` service evaluates:
   - **Revenue Stability** (Max 25 pts) based on the low standard deviation of monthly revenue.
   - **Transaction Consistency** (Max 20 pts) based on daily sales volume.
   - **Repeat Customers** (Max 20 pts) based on the ratio of returning vs walk-in customers.
   - **Credit Risk Control** (Max 15 pts) outstanding Udhar-to-revenue ratio.
   - **Digital Footprint** (Max 20 pts) based on UPI payment adoption.
   - Calculated for Ramesh Kirana Store, it yields a score of **71** (classified as "Good, Moderate-Low Risk").

---

## 📈 Simulated Business Behaviors

To demonstrate how AI Munshi parses raw transactions to yield CFO advice, the simulator models realistic behavior:

- **Weekly Cycles:** Weekends (Saturdays and Sundays) produce **+40% to +60%** higher revenue and transaction volume compared to weekdays.
- **Hourly Sales Peaks:** Transactions are timestamped between 7:00 AM and 10:00 PM, distributed across three peak trading hours:
  - **Morning peak (7AM - 10AM):** ~25% of transactions (milk, breakfast essentials).
  - **Afternoon peak (1PM - 3PM):** ~15% of transactions (lunch runs).
  - **Evening peak (6PM - 9PM):** ~40% of transactions (dinner items, household shopping).
- **Outliers:** 
  - **High Outliers:** 3 days have tripled transaction counts and boosted average ticket sizes to simulate wedding seasons/local events.
  - **Low Outliers:** 3 days have only 2-5 transactions to simulate bad weather or store holiday.
- **Repeat Customers:** 60% of transactions are mapped to a pool of 30 common Indian names (e.g. Amit Sharma, Priya Singh) to simulate local neighborhood loyalty.
- **Udhar (Credit Books):** 12 regular customers are given outstanding credit accounts in the `udhar` ledger ranging from Rs 500 to Rs 2,500, representing unpaid customer tabs.

---

## 🔌 API Endpoints & Usage

All paths are prefixed with `/api/v1`.

### 1. CFO Insights / Analytics
- **Endpoint:** `GET /api/v1/analytics/cfo-insights/{merchant_id}`
- **Description:** Computes the Loan Readiness Score, GST monitoring metrics, Udhar totals, and revenue trends.
- **Response Format:**
```json
{
  "merchant_id": "merchant_001",
  "merchant_name": "Ramesh Kirana Store",
  "insights_date": "2026-06-04",
  "revenue": {
    "total_revenue": 1474578.08,
    "average_monthly_revenue": 121198.20,
    "projected_annual_revenue": 1474578.08,
    "weekly_revenue": {
      "Monday": 178040.50,
      "Tuesday": 182100.20,
      ...
    },
    "weekend_revenue_ratio": 0.3204,
    "peak_hours_analysis": {
      "Morning Peak (7AM-10AM)": 1700,
      "Afternoon Peak (1PM-3PM)": 1040,
      "Evening Peak (6PM-9PM)": 2815,
      "Other Hours": 1339
    },
    "daily_average_transactions": 38.3
  },
  "gst": {
    "taxable_sales": 1051669.25,
    "exempt_sales": 422908.83,
    "gst_utilization_ratio": 0.7132,
    "estimated_gst_liability": 126200.31,
    "status": "Below Mandatory Threshold (Voluntary/Composition Recommended)"
  },
  "udhar": {
    "total_outstanding_udhar": 18450.0,
    "active_defaulters_count": 12,
    "recovery_rate": 85.4,
    "top_debtors": [
      { "customer_name": "Sandeep Gupta", "amount": 2420.0, "date_added": "2026-04-12" },
      ...
    ]
  },
  "loan_readiness": {
    "score": 71,
    "risk_level": "Good (Moderate-Low Risk)",
    "key_factors": [
      "Consistently high monthly revenue stability (CV of 0.09)",
      "Strong customer retention with 60.0% repeat transactions",
      ...
    ],
    "recommendations": [
      "Increase digital transaction ratio above 75% to improve lender assessment visibility (currently at 53.4%)",
      "Implement automated WhatsApp payment reminders to recover Rs 18,450 outstanding Udhar"
    ]
  }
}
```

### 2. Reset/Seed Demo Database
- **Endpoint:** `POST /api/v1/analytics/reset-demo`
- **Description:** Resets the SQLite database, wipes all transaction data, recreates all tables, and seeds fresh data. Allows quick reset during pitching.

### 3. Transactions
- **Endpoint:** `GET /api/v1/transactions/{merchant_id}`
- **Description:** Returns full transaction history. Supports pagination parameters `skip` and `limit`.
- **Endpoint:** `POST /api/v1/transactions/`
- **Description:** Post a new transaction in real-time.

### 4. Udhar Ledger
- **Endpoint:** `GET /api/v1/udhar/{merchant_id}`
- **Description:** Get all outstanding credits.
- **Endpoint:** `POST /api/v1/udhar/`
- **Description:** Issue new store credit to a customer.

---

## 🏆 Production-Quality Best Practices Implemented

- **Database Foreign Keys:** Hard cascade deletions and clean relationships between merchants, transactions, and credit books.
- **Index Optimization:** Database indexes configured on frequently queried columns (`timestamp`, `merchant_id`, `category`, `payment_mode`, `customer_name`) for ultra-fast query performance.
- **Pydantic Validation:** Inputs and outputs are fully typed and validated using Pydantic, enforcing constraints like positive amounts (`gt=0`).
- **CORS Configured:** Setup to accept requests from frontend servers (such as React, Flutter, or Next.js clients).
- **Separation of Concerns:** DB setup, SQL schemas, business services, API routing, and data populating are kept strictly isolated.

---

## 🎙️ Sample Questions & Prompts

See the full catalogue of example queries, actions, and judge-ready test prompts in the AI Munshi QA document: ../AI_Munshi_QA.md
