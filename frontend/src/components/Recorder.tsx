import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { RealtimeAudioCapture } from '../utils/realtimeAudioCapture';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export interface FeedbackMessage {
  id: number;
  feedback: string;
  stuttering_detected: boolean;
  timestamp: number;
}

export interface RecorderHandle {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

interface TranscriptPayload {
  realtime: string;
  partial: string;
}

interface RecorderProps {
  showControls?: boolean;
  showTranscript?: boolean;
  showFeedbackPanel?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onTranscriptUpdate?: (payload: TranscriptPayload) => void;
  onFeedbackUpdate?: (messages: FeedbackMessage[]) => void;
  className?: string;
}

const Recorder = forwardRef<RecorderHandle, RecorderProps>(function Recorder({showControls = true, showTranscript = true, showFeedbackPanel = true, onRecordingStateChange, onTranscriptUpdate, onFeedbackUpdate, className = ''}, ref) {
  const [isRecording, setIsRecording] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
 
  const realtimeTranscriptRef = useRef('');
  const audioCapture = useRef<RealtimeAudioCapture | null>(null);
  const websocket = useRef<WebSocket | null>(null);
  const feedbackEndRef = useRef<HTMLDivElement | null>(null);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    if (audioCapture.current) {
      audioCapture.current.stop();
      audioCapture.current = null;
    }

    if (websocket.current) {
      websocket.current.close();
      websocket.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setRealtimeTranscript('');
    setPartialTranscript('');
    setFeedbackMessages([]);

    try {
      websocket.current = new WebSocket(`${WS_URL}/stream_audio`);

      websocket.current.onopen = () => {
        console.log('WebSocket connected');
      };

      websocket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'ai_feedback') {
          const newFeedback: FeedbackMessage = {
            id: Date.now(),
            feedback: data.feedback,
            stuttering_detected: data.stuttering_detected,
            timestamp: data.timestamp
          };
          setFeedbackMessages((prev) => {
            const updated = [newFeedback, ...prev];
            onFeedbackUpdate?.(updated);
            return updated;
          });
          return;
        }

        if (data.error) {
          console.error('Transcription error:', data.error);
          return;
        }

        if (data.is_final) {
          setRealtimeTranscript((prev) => {
            const updated = prev ? `${prev} ${data.transcript}` : data.transcript;
            onTranscriptUpdate?.({ realtime: updated, partial: '' });
            return updated;
          });
          setPartialTranscript('');
        } else {
          const partial = data.transcript || '';
          setPartialTranscript(partial);
          onTranscriptUpdate?.({ realtime: realtimeTranscriptRef.current, partial });
        }
      };

      websocket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocket.current.onclose = () => {
        console.log('WebSocket closed');
      };

      audioCapture.current = new RealtimeAudioCapture({
        sampleRate: 16000, // best sample rate for speech recognition
        bufferSize: 4096, // tell us how many samples to collect before sending to the server
        onAudioData: (audioData: Int16Array) => {  
          if (websocket.current?.readyState === WebSocket.OPEN) {
            const bytes = new Uint8Array(audioData.buffer);
            const base64 = btoa(String.fromCharCode(...bytes)); // converts the audio data to base64
            websocket.current.send(JSON.stringify({ audio: base64 })); // sends the audio data to the backend server at /stream_audio
          }
        },
        onError: (error) => {
          console.error('Audio capture error:', error);
          setIsRecording(false);
        }
      });

      await audioCapture.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ // allows us to access the startRecording and stopRecording functions from the parent component
      startRecording,
      stopRecording
    }),
    [startRecording, stopRecording]
  );

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  useEffect(() => {
    realtimeTranscriptRef.current = realtimeTranscript;
  }, [realtimeTranscript]);

  useEffect(
    () => () => {
      if (audioCapture.current) {
        audioCapture.current.stop();
      }
      if (websocket.current) {
        websocket.current.close();
      }
    },
    []
  );

  useEffect(() => {
    if (feedbackEndRef.current) {
      feedbackEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feedbackMessages]);

  return (
    <div className={`flex gap-4 h-full ${className}`}>
      <div className="flex-1">
        {showControls && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        )}

        {showTranscript && (realtimeTranscript || partialTranscript) && (
          <div className="mt-6">
            <h3 className="text-2xl font-bold mb-3 text-indigo-300">Live Transcript:</h3>
            <div className="p-6 bg-gray-800 rounded-lg">
              <p className="text-lg text-gray-100 leading-relaxed">
                {realtimeTranscript}
                {partialTranscript && <span className="text-gray-400 italic"> {partialTranscript}</span>}
              </p>
            </div>
            {isRecording && <p className="mt-2 text-sm text-green-400">● Recording...</p>}
          </div>
        )}
      </div>

      {showFeedbackPanel && (
        <div className="w-96 flex flex-col bg-gray-900 rounded-lg border border-gray-700 h-[calc(100vh-200px)] sticky top-4">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
              <span>🎯</span>
              AI Coach
            </h3>
            <p className="text-sm text-gray-400 mt-1">Real-time feedback every ~4 seconds</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {feedbackMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg mb-2">👂</p>
                <p>Start recording to receive AI feedback...</p>
              </div>
            ) : (
              <>
                {feedbackMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.stuttering_detected ? 'bg-yellow-900/30 border border-yellow-700/50' : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <div className="text-sm text-gray-100 whitespace-pre-line">{msg.feedback}</div>
                    {msg.stuttering_detected && (
                      <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                        <span>⚠️</span>
                        Stuttering detected in this segment
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                <div ref={feedbackEndRef} />
              </>
            )}
          </div>

          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {feedbackMessages.length} feedback{feedbackMessages.length !== 1 ? 's' : ''}
              </span>
              {isRecording && <span className="text-green-400 animate-pulse">● Live</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Recorder;
