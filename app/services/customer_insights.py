"""
customer_insights.py
--------------------
AI-powered customer intelligence helpers for AI Munshi.
Generates natural-language insights about customer base.
"""
from typing import List, Dict, Any


def classify_relationship(visit_count: int, total_spent: float) -> str:
    """
    Classifies a customer based on their purchase history.
    VIP   : visit_count > 10 AND total_spent > 10000
    Regular: visit_count > 3
    New   : visit_count <= 3
    """
    if visit_count > 10 and total_spent > 10000:
        return "VIP"
    elif visit_count > 3:
        return "Regular"
    else:
        return "New"


def generate_customer_insights(customers: List[Dict[str, Any]]) -> List[str]:
    """
    Generates 4-6 human-readable AI insight strings about a merchant's customer base.

    Args:
        customers: list of customer dicts (from get_customer_intelligence_data)

    Returns:
        list of insight strings in Hinglish / English
    """
    insights = []

    if not customers:
        insights.append("Abhi tak koi customer data record nahi hua hai.")
        return insights

    total = len(customers)
    vip_count = sum(1 for c in customers if c.get("relationship_type") == "VIP")
    regular_count = sum(1 for c in customers if c.get("relationship_type") == "Regular")
    new_count = sum(1 for c in customers if c.get("relationship_type") == "New")

    # Insight 1: Overall base
    insights.append(
        f"Aapke paas kul {total} active customers hain. "
        f"Inmein se {vip_count} VIP aur {regular_count} regular customers hain."
    )

    # Insight 2: Top spender
    sorted_by_spend = sorted(customers, key=lambda c: c.get("total_spent", 0), reverse=True)
    if sorted_by_spend:
        top = sorted_by_spend[0]
        insights.append(
            f"{top['customer_name']} aapke sabse valuable customer hain. "
            f"Unhone kul ₹{int(top.get('total_spent', 0)):,} spend kiye hain."
        )

    # Insight 3: Most frequent
    sorted_by_freq = sorted(customers, key=lambda c: c.get("visit_count", 0), reverse=True)
    if sorted_by_freq:
        freq_top = sorted_by_freq[0]
        insights.append(
            f"{freq_top['customer_name']} sabse zyada {freq_top.get('visit_count', 0)} baar aaye hain."
        )

    # Insight 4: VIP near-threshold (visit_count 8-10, total_spent 7000-10000)
    near_vip = [
        c for c in customers
        if c.get("relationship_type") != "VIP"
        and (c.get("visit_count", 0) >= 8 or c.get("total_spent", 0) >= 7000)
    ]
    if near_vip:
        insights.append(
            f"{len(near_vip)} customers VIP status ke kareeb pahunch rahe hain. "
            "Unhe special offer dein."
        )

    # Insight 5: Revenue concentration
    total_revenue = sum(c.get("total_spent", 0) for c in customers)
    if total_revenue > 0 and total >= 5:
        top10_revenue = sum(c.get("total_spent", 0) for c in sorted_by_spend[:max(1, total // 10)])
        top10_pct = round((top10_revenue / total_revenue) * 100)
        insights.append(
            f"Aapke top {max(1, total // 10)} customers aapki {top10_pct}% revenue generate kar rahe hain."
        )

    # Insight 6: New customers
    if new_count > 0:
        insights.append(
            f"{new_count} naye customers abhi bhee store explore kar rahe hain. "
            "Unhe loyal banane ka accha mauka hai."
        )

    return insights[:6]  # Cap at 6 insights


def generate_payment_insight(
    customer_name: str,
    visit_count: int,
    total_spent: float,
    relationship_type: str,
    payment_amount: float
) -> Dict[str, Any]:
    """
    Generates an AI insight card shown immediately after a successful payment.

    Returns:
        dict with insight_message and is_milestone flag
    """
    is_milestone = False
    messages = []

    # First ever purchase
    if visit_count == 1:
        messages.append(f"Yeh {customer_name} ki pehli purchase hai! Swagat hai.")
        is_milestone = True

    # Round visit milestones
    elif visit_count in (5, 10, 15, 20, 25, 50):
        messages.append(f"Congratulations! Yeh {customer_name} ki {visit_count}vi purchase hai.")
        is_milestone = True

    # Just became VIP
    elif relationship_type == "VIP" and visit_count == 11:
        messages.append(f"{customer_name} ab aapke VIP customer ban gaye hain! 🎉")
        is_milestone = True

    # Just became Regular
    elif relationship_type == "Regular" and visit_count == 4:
        messages.append(f"{customer_name} ab Regular customer ban gaye hain.")
        is_milestone = True

    # Generic insights
    if not messages:
        if visit_count > 1:
            avg = round(total_spent / visit_count)
            messages.append(
                f"Yeh {customer_name} ki {visit_count}vi purchase hai. "
                f"Unka average spend ₹{avg:,} per visit hai."
            )

    if relationship_type == "VIP":
        messages.append(f"{customer_name} aapke VIP customer hain — inhe special deals dikhayein.")
    elif total_spent > 5000:
        messages.append(f"{customer_name} ne aaj tak kul ₹{int(total_spent):,} spend kiye hain.")

    insight_message = " ".join(messages) if messages else f"Payment of ₹{int(payment_amount):,} recorded successfully."

    return {
        "customer_name": customer_name,
        "visit_count": visit_count,
        "total_spent": total_spent,
        "relationship_type": relationship_type,
        "insight_message": insight_message,
        "is_milestone": is_milestone
    }
