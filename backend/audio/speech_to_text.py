from google.cloud import speech_v1 as speech

# Initialize the Speech client once at module level
client = speech.SpeechClient.from_service_account_file("gcp_key.json")


def transcribe_audio(audio_content: bytes, sample_rate: int = 16000, encoding: str = "LINEAR16", language_code: str = "en-US",enable_automatic_punctuation: bool = True) -> dict:
    """
    Transcribe audio blob using Google Cloud Speech-to-Text API.
    
    Args:
        audio_content: Audio data as bytes
        sample_rate: Sample rate of the audio (default: 16000 Hz)
        encoding: Audio encoding format (default: "LINEAR16") Options: "LINEAR16", "WEBM_OPUS", "OGG_OPUS", "MP3", etc.
        language_code: Language code (default: "en-US")
        enable_automatic_punctuation: Enable automatic punctuation (default: True)
    
    Returns:
        dict: JSON response containing transcription results
        {
            "success": bool,
            "transcript": str,
            "confidence": float,
            "error": str (only if success is False)
        }
    """
    try:
        # Map string encoding to enum value
        encoding_map = {
            "LINEAR16": speech.RecognitionConfig.AudioEncoding.LINEAR16,
            "WEBM_OPUS": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            "OGG_OPUS": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            "MP3": speech.RecognitionConfig.AudioEncoding.MP3,
        }
        
        audio_encoding = encoding_map.get(encoding.upper(), speech.RecognitionConfig.AudioEncoding.LINEAR16)
        
        # Configure recognition settings
        config = speech.RecognitionConfig(
            encoding=audio_encoding,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_automatic_punctuation=enable_automatic_punctuation
        )
        
        # Create audio object
        audio = speech.RecognitionAudio(content=audio_content)
        
        # Perform synchronous speech recognition
        response = client.recognize(config=config, audio=audio)
        
        # Process response
        if not response.results:
            return {
                "success": True,
                "transcript": "",
                "confidence": 0.0,
                "message": "No speech detected"
            }
        
        # Get the first result (most confident)
        result = response.results[0]
        alternative = result.alternatives[0]
        
        return {
            "success": True,
            "transcript": alternative.transcript,
            "confidence": alternative.confidence
        }
        
    except Exception as e:
        return {
            "success": False,
            "transcript": "",
            "confidence": 0.0,
            "error": str(e)
        }
