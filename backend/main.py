from flask import Flask, jsonify, request
from flask_cors import CORS
from speech_to_text import transcribe_audio

app = Flask(__name__)
CORS(app)

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
