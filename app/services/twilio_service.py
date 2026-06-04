import os
import uuid
from twilio.rest import Client
from dotenv import load_dotenv

def send_whatsapp_reminder(customer_name: str, message: str, to_number: str = None) -> dict:
    """
    Sends a WhatsApp reminder to a customer using Twilio API.
    Gracefully falls back to mock mode if credentials are missing or configured as mock.
    """
    load_dotenv(override=True)
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "whatsapp:+14155238886")
    
    # Check if we should run in mock mode
    is_mock = os.getenv("MOCK_TWILIO", "true").lower() in ("true", "1", "yes")
    
    if not to_number:
        # Default mock number for demo purposes
        to_number = "whatsapp:+919999999999"
    elif not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
        
    if is_mock or not account_sid or not auth_token or account_sid.startswith("your_"):
        import sys
        def _safe_print(text: str):
            try:
                print(text)
            except UnicodeEncodeError:
                sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))
                sys.stdout.buffer.flush()
        _safe_print(f"[MOCK TWILIO WHATSAPP] Sending reminder to {customer_name} ({to_number}):")
        _safe_print(f"Message content:\n{message}")
        
        mock_sid = f"SM{uuid.uuid4().hex}"
        return {
            "success": True,
            "message_sid": mock_sid,
            "customer": customer_name,
            "status": "delivered",
            "message": message
        }

    try:
        client = Client(account_sid, auth_token)
        twilio_message = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        return {
            "success": True,
            "message_sid": twilio_message.sid,
            "customer": customer_name,
            "status": twilio_message.status,
            "message": message
        }
    except Exception as e:
        print(f"Error sending Twilio WhatsApp message: {e}")
        return {
            "success": False,
            "error": str(e),
            "customer": customer_name,
            "message": message
        }
