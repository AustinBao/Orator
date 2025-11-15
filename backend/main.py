import json
import base64
import queue
import threading
import time
import cv2

#flask import
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_sock import Sock

#speech to text import
from audio.streaming_speech_to_text import StreamingSpeechRecognizer
from audio.openai import PresentationAnalyzer

#dot env
from dotenv import load_dotenv

#video detection (gesture)
from video.gesture import process_frame

#emotion detection (eeg)
from eeg.detect import (
    connectMuse,
    record_calm_state,
    record_current_state,
    detect_stress,
    BOARD_ID
)



# Load environment variables
load_dotenv()

app = Flask(__name__)
# Configure CORS to allow requests from Vercel frontend
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://orator-liart.vercel.app",
            "http://localhost:5173",  # For local development
            "http://localhost:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
sock = Sock(app)

# Initialize camera
camera = cv2.VideoCapture(0)  # pylint: disable=no-member
camera.set(38, 5)  # CAP_PROP_BUFFERSIZE = 38

presentation_analyzer = PresentationAnalyzer("")

@app.route("/")
def home():
    return jsonify({"message": "Flask backend running!"})

def gen_frames():
    global latest_gesture_data
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Process frame with gesture analysis
        annotated_frame = frame  # Default to original frame
        result = None
        try:
            annotated_frame, result = process_frame(frame)
            if result:
                # Update the latest gesture data
                latest_gesture_data = result
        except Exception as e:
            print(f"Error processing frame with gesture analysis: {e}")
        
        # Encode annotated frame (with YOLO keypoints/boxes) as JPEG
        ret, buffer = cv2.imencode('.jpg', annotated_frame)  # pylint: disable=no-member 
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# Global variable to store the latest gesture analysis results
latest_gesture_data = {}

# Muse / EEG state tracking
muse_state = {
    "board": None,
    "board_info": None,
    "baseline": None
}

@app.route('/gesture_data')
def get_gesture_data():
    return jsonify(latest_gesture_data or {"message": "No gesture data available yet"})

@app.route('/video_feed')
def video_feed():
    def generate():
        global latest_gesture_data
        for frame_with_gestures in gen_frames():
            # Extract gesture data from the frame generation process
            if hasattr(frame_with_gestures, 'gesture_data'):
                latest_gesture_data = frame_with_gestures.gesture_data
            yield frame_with_gestures
    
    return Response(generate(),
                  mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/transcript', methods=['POST'])
def save_transcript():
    try:
        transcript = request.get_json()
        print("Received transcript:", transcript)
        global presentation_analyzer
        presentation_analyzer = PresentationAnalyzer(transcript)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to receive transcription: {str(e)}"
        })
    return jsonify({"status": "success", "received": ""})

@app.route('/eeg/connect', methods=['POST'])
def connect_muse():
    global muse_state
    try:
        board = connectMuse()
        if board is None:
            raise RuntimeError("Unable to connect to Muse device.")

        sampling_rate = board.get_sampling_rate(BOARD_ID)
        eeg_channels = board.get_eeg_names(BOARD_ID)

        board_info = {
            "board_id": BOARD_ID,
            "sampling_rate": sampling_rate,
            "eeg_channels": eeg_channels
        }

        muse_state["board"] = board
        muse_state["board_info"] = board_info

        return jsonify({
            "status": "connected",
            "board": board_info,
            "message": "Muse device connected."
        })
    except Exception as e:
        muse_state["board"] = None
        muse_state["board_info"] = None
        print(f"/eeg/connect error: {e}")
        return jsonify({
            "status": "error",
            "message": f"Failed to connect to Muse device: {str(e)}"
        }), 500

@app.route('/eeg/baseline', methods=['POST'])
def capture_baseline():
    global muse_state
    board = muse_state.get("board")
    board_info = muse_state.get("board_info")

    if board is None or board_info is None:
        return jsonify({
            "status": "error",
            "message": "Connect to the Muse device before capturing the baseline."
        }), 400

    try:
        baseline = record_calm_state(
            board,
            board_info["board_id"],
            board_info["sampling_rate"]
        )
        muse_state["baseline"] = baseline

        return jsonify({
            "status": "baseline_ready",
            "baseline": baseline,
            "message": "Baseline captured. Please remain calm for consistent readings.",
            "suggested_message": "Baseline captured. Take a deep breath and begin when you feel ready."
        })
    except Exception as e:
        print(f"/eeg/baseline error: {e}")
        return jsonify({
            "status": "error",
            "message": f"Unable to capture baseline: {str(e)}"
        }), 500

@app.route('/eeg/detect', methods=['POST'])
def detect_emotion():
    global muse_state
    board = muse_state.get("board")
    board_info = muse_state.get("board_info")
    baseline = muse_state.get("baseline")

    if board is None or board_info is None:
        return jsonify({
            "status": "error",
            "message": "Connect to the Muse device before running detection."
        }), 400

    if baseline is None:
        return jsonify({
            "status": "error",
            "message": "Capture a baseline before running detection."
        }), 400

    try:
        current_ratio = record_current_state(
            board,
            board_info["board_id"],
            board_info["sampling_rate"]
        )
        stressed = detect_stress(current_ratio, baseline)

        suggestion = (
            "We're detecting elevated stress—slow your pace and take a calming breath."
            if stressed else
            "Great composure detected! Keep your steady delivery."
        )

        return jsonify({
            "status": "analysis_complete",
            "stressed": stressed,
            "baseline": baseline,
            "current_ratio": current_ratio,
            "suggested_message": suggestion
        })
    except Exception as e:
        print(f"/eeg/detect error: {e}")
        return jsonify({
            "status": "error",
            "message": f"Unable to run detection: {str(e)}"
        }), 500

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
    app.run(host="0.0.0.0", port=8000, debug=True)
