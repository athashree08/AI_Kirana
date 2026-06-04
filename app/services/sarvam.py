import os
import requests
from dotenv import load_dotenv

# A tiny, valid base64-encoded silent WAV file to satisfy audio players without failing
TINY_SILENT_WAV = (
    "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
)

def get_sarvam_config():
    # Force reload environment variables from .env dynamically
    load_dotenv(override=True)
    api_key = os.getenv("SARVAM_API_KEY")
    mock_sarvam = os.getenv("MOCK_SARVAM", "true").lower() in ("true", "1", "yes")
    return api_key, mock_sarvam

def speech_to_text(audio_file_bytes: bytes, filename: str, content_type: str = "audio/webm") -> str:
    """
    Sends audio bytes to Sarvam STT REST API and returns transcription.
    Bypasses API calls if MOCK_SARVAM is enabled to save credits.
    """
    api_key, mock_sarvam = get_sarvam_config()
    
    if mock_sarvam or not api_key or api_key == "your_sarvam_api_key_here":
        # Return a mock query for testing
        return "prathmesh ka kitna udhar pending hai"
        
    url = "https://api.sarvam.ai/speech-to-text"
    headers = {
        "api-subscription-key": api_key
    }
    
    # Send files and additional data as multipart/form-data
    files = {
        "file": (filename, audio_file_bytes, content_type)
    }
    data = {
        "model": "saaras:v3",
        "language_code": "hi-IN",
        "mode": "translit"
    }
    
    try:
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"Sarvam STT API returned status {response.status_code}: {response.text}")
            
        result = response.json()
        return result.get("transcript", "")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error communicating with Sarvam STT: {str(e)}")

def text_to_speech(text: str) -> str:
    """
    Sends text to Sarvam TTS REST API, gets base64 encoded audio, and returns it as a Data URI.
    Bypasses API calls if MOCK_SARVAM is enabled to save credits.
    """
    api_key, mock_sarvam = get_sarvam_config()
    
    if mock_sarvam or not api_key or api_key == "your_sarvam_api_key_here":
        return f"data:audio/wav;base64,{TINY_SILENT_WAV}"
        
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "text": text,
        "target_language_code": "hi-IN",
        "speaker": "neha",
        "model": "bulbul:v3",
        "output_audio_codec": "wav"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"Sarvam TTS API returned status {response.status_code}: {response.text}")
            
        result = response.json()
        audios = result.get("audios", [])
        if not audios:
            raise Exception("Sarvam TTS API did not return any audio data")
            
        audio_base64 = audios[0]
        return f"data:audio/wav;base64,{audio_base64}"
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error communicating with Sarvam TTS: {str(e)}")
