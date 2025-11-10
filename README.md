# **Orator – AI-Powered Public Speaking Coach**

### Built by Team EEGenius

### "Great ideas get lost in poor presentations. Everyone deserves to sound as good as their ideas."

![Orator](/assets/Orator.png)

## **Overview**

Orator is an AI-driven platform designed to help individuals improve their public speaking skills through real-time feedback powered by speech analysis, gesture tracking, and EEG-based emotion detection.
The platform enables users to record practice sessions, receive data-driven insights, and track their progress over time, turning nervous practice into confident performance.

## Features

- Speech-to-Text Analysis – Uses Google Cloud Speech-to-Text to compare what you say with your uploaded script. Detects filler words, off-topic moments, and skipped key points.
- Gesture Detection (YOLOv11) – Tracks body language in real time. Detects gestures such as covering your face, standing too still, pacing, or looking down.
- EEG Emotion Tracking (Muse S Headband) – Reads stress and focus levels to detect nervousness or distraction.
- Performance Report – Summarizes clarity, confidence, and presence after each session to help you improve.
- Real-time Feedback Loop – Immediate insights help users adjust speech and posture live.

## **Tech Stack**

- Frontend: React + TypeScript + TailwindCSS
- Backend: Flask (Python)
- AI Models:
    - Google Cloud Speech-to-Text API
    - YOLOv11 for gesture detection
    - BrainFlow + Muse EEG for emotion tracking

## **Installation**
1. Clone the Repository
```bash
git clone https://github.com/EEGenius/orator.git
cd orator
```
2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create a file named .env or gcp_key.json for your Google Cloud credentials.


Run the Flask server:
```bash
python main.py
```

3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## **How It Works**


1. The user records a presentation through the frontend recorder.
1. Audio data is sent to the Flask backend, which calls Google Cloud Speech-to-Text for transcription.
1. The system compares speech with the uploaded script to analyze clarity and focus.
1. YOLOv11 processes the video feed to detect key gestures and posture issues.
1. EEG data from Muse tracks confidence and stress levels.
1. A feedback report summarizes strengths and areas for improvement.


## _Business Model_

Orator follows a freemium model:

**Free Tier:** Basic recording and feedback.

**Premium Tier:** Advanced analytics, EEG insights, and longer sessions.

**Enterprise:** Institutional access for universities and training programs.


## **Vision**

At Team EEGenius, we believe confidence can be learned and measured.
Our mission is to make high-quality communication training accessible, affordable, and powered by AI.



## Team EEGenius

Austin Bao, Jion Choi, Kibo Amran, David Xia, Raphael Ho


