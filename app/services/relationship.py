from sqlalchemy.orm import Session
from app import models

def determine_relationship_type(total_repayments: int, late_repayments: int, pending_amount: float, days_pending: int) -> str:
    """
    Determines the relationship type of a customer based on their history:
    - loyal: many repayments, low delay history
    - risky: frequent delays, high pending balance
    - normal: average behaviour
    """
    late_ratio = (late_repayments / total_repayments) if total_repayments > 0 else 0.0

    # Risky conditions:
    # 1. High pending balance (>= 2000)
    # 2. Frequent delays (late_repayments >= 2 or late ratio >= 0.4)
    # 3. Oldest days pending >= 30 days
    if (pending_amount >= 2000.0) or \
       (late_repayments >= 2) or \
       (total_repayments >= 2 and late_ratio >= 0.4) or \
       (days_pending >= 30):
        return "risky"

    # Loyal conditions:
    # 1. Many repayments (total_repayments >= 3)
    # 2. Low delay history (late_repayments == 0 or late ratio < 0.2)
    # 3. Controlled pending balance & low days pending (pending < 1500, days_pending < 15)
    if (total_repayments >= 3) and \
       (late_repayments == 0 or late_ratio < 0.2) and \
       (pending_amount < 1500.0) and \
       (days_pending < 15):
        return "loyal"

    return "normal"

def update_customer_relationship(db: Session, customer: models.Customer, pending_amount: float, days_pending: int) -> str:
    """
    Calculates the relationship type of a customer and updates it in the database.
    """
    relationship = determine_relationship_type(
        total_repayments=customer.total_repayments,
        late_repayments=customer.late_repayments,
        pending_amount=pending_amount,
        days_pending=days_pending
    )
    customer.relationship_type = relationship
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return relationship
