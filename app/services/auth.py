import hashlib
import os

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2 HMAC with SHA-256 and a random salt.
    """
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verifies a password against its stored hash.
    """
    if not stored_hash or "$" not in stored_hash:
        return False
    try:
        salt, key_hex = stored_hash.split("$", 1)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return key.hex() == key_hex
    except Exception:
        return False
