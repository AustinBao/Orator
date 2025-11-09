from google.cloud import speech_v1 as speech
import base64
from typing import Callable

# Initialize the Speech client once at module level
client = speech.SpeechClient.from_service_account_file("gcp_key.json")


class StreamingSpeechRecognizer:
    """
    Handles streaming speech recognition using Google Cloud Speech-to-Text API
    """
    
    def __init__(
        self, 
        callback: Callable[[dict], None],
        sample_rate: int = 16000,
        language_code: str = "en-US"
    ):
        """
        Initialize streaming recognizer
        
        Args:
            callback: Function to call with transcription results
            sample_rate: Audio sample rate (default: 16000 Hz)
            language_code: Language code (default: "en-US")
        """
        self.callback = callback
        self.sample_rate = sample_rate
        self.language_code = language_code
        self.is_streaming = False
        
        # Configure streaming recognition
        self.config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_automatic_punctuation=False,  # Disabled to prevent premature periods
            # Streaming-specific settings
            model="latest_long",  # Better for continuous speech
            # use_enhanced=True,  # Commented out - might not be available for all accounts
        )
        
        self.streaming_config = speech.StreamingRecognitionConfig(
            config=self.config,
            interim_results=True,  # Get partial results
            single_utterance=False,  # Continuous recognition - don't stop after first utterance
        )
        
        print(f"StreamingSpeechRecognizer initialized: {sample_rate}Hz, {language_code}")
    
    def process_audio_chunk(self, audio_base64: str) -> None:
        """
        Process a single audio chunk (not used in streaming mode)
        This is for immediate processing without maintaining a stream.
        """
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_base64)
            
            # Create audio object
            audio = speech.RecognitionAudio(content=audio_bytes)
            
            # Perform recognition
            response = client.recognize(config=self.config, audio=audio)
            
            if response.results:
                result = response.results[0]
                if result.alternatives:
                    transcript = result.alternatives[0].transcript
                    confidence = result.alternatives[0].confidence
                    
                    self.callback({
                        "transcript": transcript,
                        "confidence": confidence,
                        "is_final": True
                    })
                    
        except Exception as e:
            self.callback({
                "error": str(e),
                "is_final": False
            })
    
    def generate_requests(self, audio_generator):
        """
        Generate streaming requests from audio chunks
        
        Args:
            audio_generator: Generator yielding audio chunks
        """
        # Just yield audio content (config passed separately to streaming_recognize)
        chunk_count = 0
        for audio_chunk in audio_generator:
            chunk_count += 1
            print(f"Sending audio chunk #{chunk_count}: {len(audio_chunk)} bytes")
            yield speech.StreamingRecognizeRequest(audio_content=audio_chunk)
    
    def start_streaming(self, audio_generator) -> None:
        """
        Start streaming recognition
        
        Args:
            audio_generator: Generator yielding audio chunks (bytes)
        """
        try:
            self.is_streaming = True
            print("Starting streaming recognition...")
            
            # Create streaming recognize requests
            requests = self.generate_requests(audio_generator)
            
            # Perform streaming recognition
            print("Calling streaming_recognize...")
            responses = client.streaming_recognize(
                config=self.streaming_config,
                requests=requests
            )
            
            # Process responses
            print("Processing responses...")
            response_count = 0
            for response in responses:
                response_count += 1
                if not self.is_streaming:
                    print("Streaming stopped by flag")
                    break
                
                # Check for errors
                if response.error.code != 0:
                    print(f"Error in response: {response.error.message}")
                    self.callback({
                        "error": response.error.message,
                        "is_final": False
                    })
                    continue
                
                # Process results
                for result in response.results:
                    if not result.alternatives:
                        continue
                    
                    alternative = result.alternatives[0]
                    transcript = alternative.transcript
                    is_final = result.is_final
                    
                    print(f"Result #{response_count}: '{transcript}' (final={is_final})")
                    
                    self.callback({
                        "transcript": transcript,
                        "confidence": alternative.confidence if is_final else 0.0,
                        "is_final": is_final,
                        "stability": result.stability if hasattr(result, 'stability') else 0.0
                    })
                    
        except Exception as e:
            print(f"Exception in streaming: {str(e)}")
            import traceback
            traceback.print_exc()
            self.callback({
                "error": str(e),
                "is_final": False
            })
        finally:
            print("Streaming ended")
            self.is_streaming = False
    
    def stop(self) -> None:
        """Stop streaming recognition"""
        self.is_streaming = False


def process_audio_chunk_simple(audio_base64: str, sample_rate: int = 16000, language_code: str = "en-US") -> dict:
    """
    Simple function to process a single audio chunk without maintaining state.
    Good for testing or simple use cases.
    
    Args:
        audio_base64: Base64-encoded audio data
        sample_rate: Sample rate in Hz
        language_code: Language code
    
    Returns:
        dict with transcript and metadata
    """
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Configure recognition
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_automatic_punctuation=True,
        )
        
        # Create audio object
        audio = speech.RecognitionAudio(content=audio_bytes)
        
        # Perform recognition
        response = client.recognize(config=config, audio=audio)
        
        if not response.results:
            return {
                "success": True,
                "transcript": "",
                "is_final": True,
                "message": "No speech detected"
            }
        
        result = response.results[0]
        alternative = result.alternatives[0]
        
        return {
            "success": True,
            "transcript": alternative.transcript,
            "confidence": alternative.confidence,
            "is_final": True
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "is_final": False
        }

