from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from google.cloud import speech_v1 as speech
import io
from speech_to_text import transcribe_audio

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Google Cloud Speech client
speech_client = speech.SpeechClient.from_service_account_file("gcp_key.json")

@app.route("/")
def home():
    return jsonify({"message": "Flask backend running!"})


@app.route("/client_audio", methods=['POST'])
def client_audio():
    print("=" * 50)
    print("Client audio endpoint hit")
    
    # Check if audio file is in the request
    if 'audio' in request.files:
        audio_file = request.files['audio']
        print(f"Audio file received: {audio_file.filename}")
        print(f"Content type: {audio_file.content_type}")
        
        # Read audio content
        audio_content = audio_file.read()
        print(f"File size: {len(audio_content)} bytes")
        
        try:
            print("Sending audio to Google Cloud Speech-to-Text...")
            # Perform the transcription
            response = transcribe_audio(audio_content)
            print(f"Response: {response}")
            return jsonify(response)
            
        except Exception as e:
            print(f"Error during transcription: {str(e)}")
            return jsonify({
                "status": "error",
                "message": f"Transcription failed: {str(e)}"
            }), 500
    else:
        print("No audio file in request")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request files: {request.files}")
        return jsonify({"status": "error", "message": "No audio file received"}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
