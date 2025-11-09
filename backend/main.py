from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sock import Sock
from audio.speech_to_text import transcribe_audio
from audio.streaming_speech_to_text import StreamingSpeechRecognizer
from audio.openai import PresentationAnalyzer
import json
import base64
import queue
import threading
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Load script from file and create analyzer
script_path = "audio/script.txt"
try:
    with open(script_path, 'r', encoding='utf-8') as f:
        presentation_script = f.read()
    presentation_analyzer = PresentationAnalyzer(presentation_script)
except Exception as e:
    print(f"Could not load script.txt: {e}")
    presentation_analyzer = None

@app.route("/")
def home():
    return jsonify({"message": "Flask backend running!"})


@app.route("/client_audio", methods=['POST'])
def client_audio():    
    if 'audio' in request.files:
        audio_file = request.files['audio']
        audio_content = audio_file.read()
        try:
            response = transcribe_audio(audio_content)
            return jsonify(response)
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Transcription failed: {str(e)}"
            }), 500
    else:
        return jsonify({"status": "error", "message": "No audio file received"}), 400

@app.route('/transcript', methods=['POST'])
def save_transcript():
    try:
        transcript = request.get_json()
        print("Received transcript:", transcript)
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to receive transcription: {str(e)}"
        })
    return jsonify({"status": "success", "received": ""})

@sock.route('/stream_audio')
def stream_audio(ws):
    """
    WebSocket endpoint for realtime audio streaming and transcription
    Uses proper streaming recognition to maintain context across chunks
    Includes AI-powered presentation analysis every 3 seconds
    """
    print("WebSocket connection established")
    
    # Queue to hold audio chunks
    audio_queue = queue.Queue()
    
    # Flag to control streaming
    is_streaming = {'active': True}
    
    # Transcript accumulation and analysis timing
    full_transcript = []
    last_analysis_time = time.time()
    analysis_interval = 4.0  # seconds (balanced for real-time with recovery time)
    
    # Timer-based analysis trigger
    def check_and_run_analysis():
        """Check if it's time to run analysis based on timer"""
        nonlocal last_analysis_time
        current_time = time.time()
        
        if presentation_analyzer and (current_time - last_analysis_time) >= analysis_interval:
            if len(full_transcript) > 0:  # Only analyze if we have something
                last_analysis_time = current_time
                
                # Run AI analysis
                def run_analysis():
                    try:
                        # Only analyze the VERY LATEST transcript - focus on what they're saying right now
                        recent_transcript = full_transcript[-1] if full_transcript else ""
                        # Minimal context to avoid dwelling on past mistakes
                        context = ' '.join(full_transcript[-3:])
                        
                        print(f"Running AI analysis on: {recent_transcript[:100]}...")
                        analysis_result = presentation_analyzer.analyze_presentation(
                            live_transcript=recent_transcript,
                            context_window=context
                        )
                        
                        if analysis_result.get('success'):
                            feedback_message = {
                                'type': 'ai_feedback',
                                'feedback': analysis_result['feedback'],
                                'stuttering_detected': analysis_result['stuttering_detected'],
                                'stuttering_details': analysis_result.get('stuttering_details'),
                                'timestamp': current_time
                            }
                            ws.send(json.dumps(feedback_message))
                            print(f"AI Feedback sent: {analysis_result['feedback'][:100]}...")
                        else:
                            print(f"AI analysis failed: {analysis_result.get('error')}")
                    except Exception as e:
                        print(f"Error in AI analysis: {e}")
                
                threading.Thread(target=run_analysis, daemon=True).start()
    
    def audio_generator():
        """Generator that yields audio chunks from the queue"""
        print("Audio generator started")
        chunk_count = 0
        while is_streaming['active']:
            try:
                chunk = audio_queue.get(timeout=0.5)  # Increased timeout
                if chunk is None:  # Sentinel value to stop
                    print("Audio generator received stop signal")
                    break
                chunk_count += 1
                print(f"Generator yielding chunk #{chunk_count}")
                yield chunk
            except queue.Empty:
                # Don't print on every empty - too noisy
                pass
    
    def transcription_callback(result):
        """Callback for transcription results"""
        nonlocal full_transcript
        
        try:
            # Send transcription result to frontend
            ws.send(json.dumps(result))
            
            # Accumulate transcript
            if result.get('is_final') and result.get('transcript'):
                full_transcript.append(result['transcript'])
                # Check if it's time for analysis
                check_and_run_analysis()
                    
        except Exception as e:
            print(f"Error sending result: {e}")
    
    # Create streaming recognizer
    recognizer = StreamingSpeechRecognizer(
        callback=transcription_callback,
        sample_rate=16000,
        language_code="en-US"
    )
    
    # Start streaming recognition in a separate thread
    def run_streaming():
        try:
            recognizer.start_streaming(audio_generator())
        except Exception as e:
            print(f"Streaming error: {e}")
            transcription_callback({'error': str(e), 'is_final': False})
    
    streaming_thread = threading.Thread(target=run_streaming)
    streaming_thread.start()
    
    try:
        while True:
            # Receive audio data from client
            message = ws.receive()
            
            if message is None:
                break
            
            try:
                data = json.loads(message)
                
                if 'audio' in data:
                    # Decode base64 audio and add to queue
                    audio_base64 = data['audio']
                    audio_bytes = base64.b64decode(audio_base64)
                    print(f"Received audio chunk: {len(audio_bytes)} bytes")
                    audio_queue.put(audio_bytes)
                        
            except json.JSONDecodeError:
                ws.send(json.dumps({'error': 'Invalid JSON', 'is_final': False}))
            except Exception as e:
                print(f"Error processing message: {str(e)}")
                ws.send(json.dumps({'error': str(e), 'is_final': False}))
                
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        print("WebSocket connection closing...")
        is_streaming['active'] = False
        audio_queue.put(None)  # Stop the generator
        recognizer.stop()
        streaming_thread.join(timeout=2)
        print("WebSocket connection closed")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
