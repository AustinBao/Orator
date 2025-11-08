import { useState } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');

  const startRecording = () => {
    setIsRecording(true)
    console.log('Recording started')
  }
  const stopRecording = () => {
    setIsRecording(false)
    console.log('Recording stopped')
    // Simulate transcript and feedback for demo purposes
    setTranscript('This is a sample transcript of the recorded audio.')
    setFeedback('Great job! Your pronunciation was clear and confident.')
  }

 
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-6 space-y-6">
      <h1 className="text-3xl font-bold text-indigo-400">🎤 Orator AI</h1>

      <div className="flex space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold"
          >
            Stop Recording
          </button>
        )}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-2 text-indigo-300">Transcript</h2>
        <div className="bg-gray-800 rounded-lg p-4 min-h-[150px] whitespace-pre-wrap">
          {transcript || "Waiting for speech..."}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-2 text-indigo-300">Feedback</h2>
        <div className="bg-gray-800 rounded-lg p-4 min-h-[100px] whitespace-pre-wrap">
          {feedback || "No feedback yet."}
        </div>
      </div>
    </div>
  );
}

export default App
