"""
billing_import.py - Billing System File Parser for AI Munshi

Supports:
  - CSV files from common Indian billing software (Vyapar, Tally, Busy, Marg, custom)
  - Excel files (.xlsx, .xls)
  - Smart column auto-mapping using fuzzy matching
  - Extraction of: customer name, amount, date, transaction type, notes
  - All extracted data is normalized into standard LedgerEntry format
"""

import io
import csv
import json
import os
from datetime import datetime, date
from difflib import SequenceMatcher
from typing import Optional

# ─────────────────────────────────────────
# STANDARD OUTPUT SCHEMA
# ─────────────────────────────────────────

class LedgerEntry:
    def __init__(self, name: str, amount: float, entry_type: str = "sale",
                 date_str: Optional[str] = None, notes: str = ""):
        self.name = name
        self.amount = amount
        self.type = entry_type       # "sale" | "udhar" | "payment" | "expense"
        self.date = date_str or datetime.today().strftime("%Y-%m-%d")
        self.notes = notes

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "amount": self.amount,
            "type": self.type,
            "date": self.date,
            "notes": self.notes
        }


# ─────────────────────────────────────────
# COLUMN NAME FUZZY MATCHING
# ─────────────────────────────────────────

# Canonical field → list of possible column names from real Indian billing software
COLUMN_ALIASES = {
    "name": [
        "customer", "customer name", "customer_name", "party", "party name",
        "party_name", "naam", "client", "client name", "buyer", "vendor",
        "account name", "account", "ledger", "ledger name", "name"
    ],
    "amount": [
        "amount", "total", "total amount", "grand total", "net amount",
        "debit", "credit", "balance", "outstanding", "due", "invoice total",
        "bill amount", "rashi", "rakam", "amt", "value", "net"
    ],
    "date": [
        "date", "invoice date", "bill date", "transaction date", "payment date",
        "entry date", "tarikh", "dt", "trans date", "doc date", "voucher date"
    ],
    "type": [
        "type", "transaction type", "entry type", "mode", "nature",
        "category", "voucher type", "particulars", "ttype", "kind",
        "payment mode", "payment_mode"
    ],
    "notes": [
        "notes", "description", "narration", "remarks", "comment", "details",
        "particulars", "memo", "note", "item", "product", "goods", "invoice no",
        "invoice number", "bill no", "ref", "reference"
    ]
}


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def auto_map_columns(headers: list) -> dict:
    """
    Given a list of CSV/Excel column headers, returns a mapping:
    { canonical_field -> actual_column_header }
    Uses fuzzy matching to handle variations.
    """
    mapping = {}
    used_headers = set()

    for canonical, aliases in COLUMN_ALIASES.items():
        best_header = None
        best_score = 0.0
        for header in headers:
            if header in used_headers:
                continue
            for alias in aliases:
                score = _similarity(header, alias)
                if score > best_score:
                    best_score = score
                    best_header = header
        if best_score >= 0.55 and best_header:
            mapping[canonical] = best_header
            used_headers.add(best_header)

    return mapping


def _clean_amount(raw) -> Optional[float]:
    """Parse amount from common Indian billing formats."""
    if raw is None:
        return None
    s = str(raw).strip()
    # Remove currency symbols, commas, spaces
    for ch in ["₹", "Rs.", "Rs", "INR", ",", " "]:
        s = s.replace(ch, "")
    s = s.strip()
    # Remove trailing .00 style but keep decimals
    try:
        return float(s) if s else None
    except ValueError:
        return None


def _clean_date(raw) -> Optional[str]:
    """Parse date from common Indian formats."""
    if raw is None:
        return None
    s = str(raw).strip()
    # Try multiple common Indian date formats
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y",
        "%d-%m-%y", "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d",
        "%d %b %Y", "%d %B %Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _infer_type(row_value: Optional[str], amount: float) -> str:
    """Infer transaction type from type column or amount sign."""
    if row_value:
        v = str(row_value).lower().strip()
        if any(k in v for k in ["sale", "sales", "bikri", "payment received", "cash in"]):
            return "sale"
        if any(k in v for k in ["udhar", "credit", "debit", "receivable", "outstanding", "due"]):
            return "udhar"
        if any(k in v for k in ["payment", "paid", "repay", "recovery"]):
            return "payment"
        if any(k in v for k in ["expense", "purchase", "kharcha", "bill paid"]):
            return "expense"
    # Default by amount sign
    return "sale" if amount >= 0 else "expense"


# ─────────────────────────────────────────
# CSV PARSER
# ─────────────────────────────────────────

def parse_csv(file_bytes: bytes) -> list:
    """Parse a CSV billing file and return list of LedgerEntry dicts."""
    try:
        text = file_bytes.decode("utf-8", errors="replace")
    except Exception:
        text = file_bytes.decode("latin-1", errors="replace")

    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    col_map = auto_map_columns(list(headers))

    entries = []
    for row in reader:
        try:
            name_col = col_map.get("name")
            amount_col = col_map.get("amount")
            date_col = col_map.get("date")
            type_col = col_map.get("type")
            notes_col = col_map.get("notes")

            if not name_col or not amount_col:
                continue

            name = str(row.get(name_col, "")).strip()
            amount_raw = row.get(amount_col, "")
            amount = _clean_amount(amount_raw)

            if not name or amount is None or amount == 0:
                continue

            date_str = _clean_date(row.get(date_col, "")) if date_col else None
            type_str = _infer_type(row.get(type_col) if type_col else None, amount)
            notes_str = str(row.get(notes_col, "")).strip() if notes_col else ""

            entries.append(LedgerEntry(
                name=name,
                amount=abs(amount),
                entry_type=type_str,
                date_str=date_str,
                notes=notes_str
            ).to_dict())
        except Exception as e:
            print(f"[BillingImport CSV] Row parse error: {e}")
            continue

    return entries


# ─────────────────────────────────────────
# EXCEL PARSER
# ─────────────────────────────────────────

def parse_excel(file_bytes: bytes, filename: str) -> list:
    """Parse an Excel (.xlsx/.xls) billing file."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []

        # First non-empty row is headers
        headers = [str(h).strip() if h is not None else "" for h in rows[0]]
        col_map = auto_map_columns(headers)

        # Build column index lookup
        header_to_idx = {h: i for i, h in enumerate(headers)}

        entries = []
        for row in rows[1:]:
            try:
                name_col = col_map.get("name")
                amount_col = col_map.get("amount")
                date_col = col_map.get("date")
                type_col = col_map.get("type")
                notes_col = col_map.get("notes")

                if not name_col or not amount_col:
                    continue

                name_idx = header_to_idx.get(name_col)
                amount_idx = header_to_idx.get(amount_col)
                date_idx = header_to_idx.get(date_col) if date_col else None
                type_idx = header_to_idx.get(type_col) if type_col else None
                notes_idx = header_to_idx.get(notes_col) if notes_col else None

                if name_idx is None or amount_idx is None:
                    continue

                name = str(row[name_idx]).strip() if row[name_idx] is not None else ""
                amount = _clean_amount(row[amount_idx])

                if not name or amount is None or amount == 0 or name.lower() in ("none", "nan", ""):
                    continue

                # Handle Excel date objects
                date_val = row[date_idx] if date_idx is not None else None
                if isinstance(date_val, (datetime, date)):
                    date_str = date_val.strftime("%Y-%m-%d")
                else:
                    date_str = _clean_date(date_val)

                type_raw = str(row[type_idx]).strip() if type_idx is not None and row[type_idx] else None
                type_str = _infer_type(type_raw, amount)

                notes_str = str(row[notes_idx]).strip() if notes_idx is not None and row[notes_idx] else ""

                entries.append(LedgerEntry(
                    name=name,
                    amount=abs(amount),
                    entry_type=type_str,
                    date_str=date_str,
                    notes=notes_str
                ).to_dict())
            except Exception as e:
                print(f"[BillingImport Excel] Row parse error: {e}")
                continue

        return entries

    except ImportError:
        print("[BillingImport] openpyxl not installed. Falling back to CSV mock.")
        return []
    except Exception as e:
        print(f"[BillingImport Excel] Failed to parse: {e}")
        return []


# ─────────────────────────────────────────
# UNIFIED ENTRY POINT
# ─────────────────────────────────────────

def parse_billing_file(file_bytes: bytes, filename: str) -> dict:
    """
    Main entry point. Detects file type from filename extension,
    parses the file, and returns structured result with column mapping info.
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext in ("xlsx", "xls"):
        entries = parse_excel(file_bytes, filename)
        file_type = "excel"
    elif ext == "csv":
        entries = parse_csv(file_bytes)
        file_type = "csv"
    else:
        # Try CSV as fallback
        try:
            entries = parse_csv(file_bytes)
            file_type = "csv"
        except Exception:
            entries = []
            file_type = "unknown"

    # Stats summary
    total_amount = sum(e["amount"] for e in entries)
    by_type = {}
    for e in entries:
        by_type[e["type"]] = by_type.get(e["type"], 0) + 1

    return {
        "file_type": file_type,
        "total_entries": len(entries),
        "total_amount": round(total_amount, 2),
        "breakdown_by_type": by_type,
        "entries": entries
    }


# ─────────────────────────────────────────
# MOCK / DEMO DATA
# ─────────────────────────────────────────

MOCK_BILLING_ENTRIES = [
    {"name": "Ramesh Sharma", "amount": 4500.0, "type": "sale", "date": "2026-06-01", "notes": "INV-001"},
    {"name": "Suresh Yadav", "amount": 1200.0, "type": "udhar", "date": "2026-06-02", "notes": "Credit sale"},
    {"name": "Priya Gupta", "amount": 800.0, "type": "sale", "date": "2026-06-03", "notes": "Counter sale"},
    {"name": "Mohan Lal", "amount": 2300.0, "type": "udhar", "date": "2026-06-04", "notes": "INV-004"},
    {"name": "Kavita Joshi", "amount": 650.0, "type": "payment", "date": "2026-06-05", "notes": "Repayment"},
    {"name": "Amit Kumar", "amount": 3100.0, "type": "sale", "date": "2026-06-05", "notes": "Wholesale"},
]

def get_mock_billing_result() -> dict:
    total = sum(e["amount"] for e in MOCK_BILLING_ENTRIES)
    by_type = {}
    for e in MOCK_BILLING_ENTRIES:
        by_type[e["type"]] = by_type.get(e["type"], 0) + 1
    return {
        "file_type": "csv",
        "total_entries": len(MOCK_BILLING_ENTRIES),
        "total_amount": round(total, 2),
        "breakdown_by_type": by_type,
        "entries": MOCK_BILLING_ENTRIES
    }
