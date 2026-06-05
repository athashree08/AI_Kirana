"""
migrate_customer_intelligence.py
---------------------------------
One-time migration script to add Customer Intelligence columns 
to the existing 'customers' table in the SQLite database.

Run this script ONCE before starting the server:
    python migrate_customer_intelligence.py

These columns are added safely using IF NOT EXISTS checks.
"""
import sqlite3
import os
import sys

# The DB file path - same as used by the app (from config.py: BASE_DIR/test_db.db)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_db.db")

# Fallback path checks
if not os.path.exists(DB_PATH):
    # Try the AI_Kirana subdirectory
    alt_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "AI_Kirana", "test_db.db"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data", "ai_kirana.db"),
    ]
    for ap in alt_paths:
        if os.path.exists(ap):
            DB_PATH = ap
            break
    else:
        print(f"[WARNING] Database not found at {DB_PATH}")
        print("Database will be auto-created by SQLAlchemy on first server run.")
        print("This migration will be skipped — run it again after the server starts.")
        sys.exit(0)

print(f"[INFO] Using database at: {DB_PATH}")

# Columns to add
NEW_COLUMNS = [
    ("visit_count", "INTEGER DEFAULT 0"),
    ("total_spent", "REAL DEFAULT 0.0"),
    ("average_transaction", "REAL DEFAULT 0.0"),
    ("first_transaction_date", "DATE"),
    ("last_transaction_date", "DATE"),
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(customers)")
existing_columns = {row[1] for row in cursor.fetchall()}

print(f"[INFO] Existing columns: {existing_columns}")

changes = 0
for col_name, col_def in NEW_COLUMNS:
    if col_name not in existing_columns:
        sql = f"ALTER TABLE customers ADD COLUMN {col_name} {col_def}"
        print(f"[ADD] {sql}")
        cursor.execute(sql)
        changes += 1
    else:
        print(f"[SKIP] Column '{col_name}' already exists.")

conn.commit()
conn.close()

print(f"\n[DONE] Migration complete. {changes} columns added.")
print("\nNext steps:")
print("1. Restart your FastAPI server")
print("2. Click 'Reset Demo Data' in the dashboard to populate customer profiles")
