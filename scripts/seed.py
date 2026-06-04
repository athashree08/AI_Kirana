import os
import sys

# Add the project root to python path to import app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services import generator

def seed_data():
    db = SessionLocal()
    try:
        print("Starting seeding process for Ramesh Kirana Store...")
        
        # 1. Generate Merchant
        merchant = generator.generate_merchant_data(db)
        print(f"Seeded merchant: {merchant.name} (ID: {merchant.id})")
        
        # 2. Generate 180 Days of Transactions
        print("Generating 180 days of realistic transactions (this might take a few seconds)...")
        tx_count = generator.generate_mock_transactions(db, merchant_id=merchant.id, days=180)
        print(f"Successfully generated {tx_count} transactions.")
        
        # 3. Generate Udhar Credit Book
        print("Generating active Udhar (credit ledger) entries...")
        udhar_count = generator.generate_mock_udhar(db, merchant_id=merchant.id)
        print(f"Successfully generated {udhar_count} outstanding Udhar records.")
        
        print("\nDatabase seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
