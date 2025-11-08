import os, json, asyncio
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)              # allow frontend (React) requests
sock = Sock(app)

# --- Normal HTTP route ---
@app.route("/")
def home():
    return jsonify({"message": "Flask backend running!"})

# --- WebSocket route ---
@sock.route("/stream")
def stream(ws):
    # later you’ll stream audio to OpenAI here
    while True:
        data = ws.receive()
        if data is None:
            break
        # echo back for now (test)
        ws.send(json.dumps({"received": data}))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
