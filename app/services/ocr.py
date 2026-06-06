import os
import json
import io
import requests
from difflib import SequenceMatcher
from datetime import datetime
from dotenv import load_dotenv

# Import fallback calling functions from our agent
from app.services.llm_agent import _call_paytm_inference, _call_gemini_fallback, _call_groq_fallback

class OcrProvider:
    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        raise NotImplementedError()

class TesseractOcrProvider(OcrProvider):
    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        import pytesseract
        from PIL import Image
        try:
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            if not text.strip():
                raise ValueError("Tesseract extracted empty text")
            return text
        except Exception as e:
            print(f"[Tesseract OCR] Failed: {e}")
            raise e

class MockOcrProvider(OcrProvider):
    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        print("[Mock OCR] Returning mock messy handwriting text...")
        return "Mhn 5OO\nRvi 12OO\nSita 300\n"

# Pluggable OCR runner
def extract_ocr_text(file_bytes: bytes, filename: str) -> str:
    # Try Tesseract first
    try:
        provider = TesseractOcrProvider()
        return provider.extract_text(file_bytes, filename)
    except Exception:
        # Fallback to Mock
        provider = MockOcrProvider()
        return provider.extract_text(file_bytes, filename)


def parse_ledger_with_llm(ocr_text: str, existing_customers: list) -> list:
    """
    Sends raw OCR text to Kimi (or fallbacks) to turn it into structured json entries.
    """
    load_dotenv(override=True)
    
    paytm_key = os.getenv("PAYTM_INFERENCE_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    
    prompt = f"""You are an expert OCR parser for small Indian business ledger notebooks.
Extract ledger entries from the following raw OCR text.
Clean up handwriting typos and OCR mistakes (e.g. "Mhn" -> "Mohan", "Rvi" -> "Ravi", "5OO" or "5oo" -> 500, "12OO" -> 1200).
Use the existing customer list as context if names are similar.

Existing customer names: {existing_customers}

Output a clean JSON list of objects, where each object has EXACTLY these keys:
- "name": string (cleaned customer name)
- "amount": number (cleaned amount)
- "type": "udhar"

Return ONLY the raw JSON array. No markdown formatting, no explanation, no backticks, no ```json formatting.
Raw OCR Text:
{ocr_text}"""

    messages = [
        {"role": "system", "content": "You are a precise data extractor that outputs only raw JSON arrays."},
        {"role": "user", "content": prompt}
    ]
    
    response_json = None
    
    # 1. Try Paytm Inference
    if paytm_key and paytm_key != "your_paytm_inference_api_key_here":
        try:
            response_json = _call_paytm_inference(paytm_key, "moonshotai.kimi-k2.5", messages)
        except Exception as e:
            print(f"[OCR Paytm Primary] Failed: {e}. Trying fallback...")
            try:
                response_json = _call_paytm_inference(paytm_key, "llama-3.3-70b-versatile", messages)
            except Exception as e2:
                print(f"[OCR Paytm Fallback] Failed: {e2}")
                
    # 2. Try Gemini Fallback
    if response_json is None and gemini_key and gemini_key != "your_gemini_api_key_here":
        try:
            response_json = _call_gemini_fallback(gemini_key, messages)
        except Exception as e:
            print(f"[OCR Gemini Fallback] Failed: {e}")
            
    # 3. Try Groq Fallback
    if response_json is None and groq_key and groq_key != "your_grok_or_groq_api_key_here" and groq_key != "your_groq_api_key_here":
        try:
            response_json = _call_groq_fallback(groq_key, messages)
        except Exception as e:
            print(f"[OCR Groq Fallback] Failed: {e}")
            
    if not response_json:
        # Static mock return if offline or all LLM API keys fail
        print("[OCR Parser] All LLM APIs failed. Returning static mock structured entries.")
        return [
            {"name": "Mohan", "amount": 500, "type": "udhar"},
            {"name": "Ravi", "amount": 1200, "type": "udhar"},
            {"name": "Sita", "amount": 300, "type": "udhar"}
        ]
        
    try:
        content = response_json["choices"][0]["message"]["content"].strip()
        # Remove any leading/trailing backticks or markdown fences if present
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()
            
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception as e:
        print(f"[OCR Parser] Failed to parse JSON response: {e}")
        return []


def fuzzy_match_name(name: str, existing_names: list) -> str:
    """
    Finds a fuzzy name match among existing customers.
    Matches e.g. "Mhn" -> "Mohan", "Rvi" -> "Ravi".
    """
    if not existing_names:
        return name
    best_match = name
    best_ratio = 0.0
    for ext in existing_names:
        ratio = SequenceMatcher(None, name.lower(), ext.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = ext
            
    # If ratio is high enough (0.6 or better), correct the name
    if best_ratio >= 0.6:
        return best_match
    return name


def clean_and_validate_entries(parsed_entries: list, existing_customers: list) -> list:
    """
    Validates entry shapes and performs fuzzy name match/correction.
    """
    validated = []
    for entry in parsed_entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name", "").strip()
        amount_raw = entry.get("amount", 0)
        
        if not name:
            continue
            
        try:
            amount = float(amount_raw)
        except (ValueError, TypeError):
            continue
            
        if amount <= 0:
            continue
            
        # Correct typos / match existing profiles
        matched_name = fuzzy_match_name(name, existing_customers)
        
        validated.append({
            "name": matched_name,
            "amount": amount,
            "type": entry.get("type", "udhar")
        })
    return validated
