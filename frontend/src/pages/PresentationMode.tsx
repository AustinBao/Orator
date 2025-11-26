import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Camera from '../components/Camera';
import Recorder from '../components/Recorder';
import type { RecorderHandle, FeedbackMessage } from '../components/Recorder';
import SimplePDFViewer from '../components/SimplePDFViewer';
import type { EegStatusDigest } from '../components/EEG';

interface PresentationNavState {
  boardInfo?: Record<string, unknown>;
  baselineRatios?: Record<string, number>;
  script?: string;
  pdfFile?: File;
  pdfMeta?: string | null;
}

interface GestureData {
  hipsway?: number;
  pacing?: number;
  headtilt?: number;
  handtomouth?: number;
  toostill?: number;
  message?: string;
}

interface GestureToast {
  id: number;
  label: string;
  timestamp: number;
}

export default function PresentationMode() {
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [presentationSummary, setPresentationSummary] = useState<string | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isStartingPresentation, setIsStartingPresentation] = useState(false);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const [transcriptData, setTranscriptData] = useState<{ realtime: string; partial: string }>({
    realtime: '',
    partial: ''
  });
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const feedbackScrollRef = useRef<HTMLDivElement | null>(null);
  const [eegDigest, setEegDigest] = useState<EegStatusDigest | null>(null);
  const [isMuseReady, setIsMuseReady] = useState(false);
  const location = useLocation();
  const navState = (location.state ?? null) as PresentationNavState | null;
  const [gestureToasts, setGestureToasts] = useState<GestureToast[]>([]);
  const lastGestureRef = useRef<GestureData>({});

  const accentButton =
    'px-4 py-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const handlePresentationUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setPresentationFile(selected);
      setPresentationSummary(`${selected.name}`);
    } else if (selected) {
      alert('Please select a PDF file.');
    }
  };

  const [isEegDetecting, setIsEegDetecting] = useState(false);

  const callDetectEmotion = async () => {
    try {
      const response = await fetch(`${API_URL}/eeg/detect`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || payload.status === 'error') {
        throw new Error(payload?.message ?? 'EEG detection failed');
      }
      setEegDigest({
        stressed: Boolean(payload.stressed),
        message:
          typeof payload.suggested_message === 'string'
            ? payload.suggested_message
            : 'Live EEG detection updated.',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('EEG detection error:', err);
    }
  };

  const handleTogglePresentation = async () => {
    if (isPresenting) {
      recorderRef.current?.stopRecording();
      if (isEegDetecting) {
        setIsEegDetecting(false);
      }
      return;
    }

    if (!recorderRef.current) {
      return;
    }

    setIsStartingPresentation(true);
    setFeedbackMessages([]);
    setTranscriptData({ realtime: '', partial: '' });
    try {
      await recorderRef.current.startRecording();
      if (isMuseReady) {
        setIsEegDetecting(true);
        callDetectEmotion();
      }
    } finally {
      setIsStartingPresentation(false);
    }
  };

  useEffect(() => {
    if (!navState) return;
    if (navState.pdfFile) {
      setPresentationFile(navState.pdfFile);
      setPresentationSummary(navState.pdfMeta ?? navState.pdfFile.name);
    } else if (navState.pdfMeta) {
      setPresentationSummary(navState.pdfMeta);
    }
    if (navState.script) {
      setTranscriptData({ realtime: navState.script, partial: '' });
    }
    if (navState.boardInfo) {
      setIsMuseReady(true);
    }
  }, [navState]);

  useEffect(() => {
    if (feedbackScrollRef.current) {
      feedbackScrollRef.current.scrollTop = 0;
    }
  }, [feedbackMessages]);

  useEffect(() => {
    let isMounted = true;
    const pollGestures = async () => {
      try {
        const response = await fetch(`${API_URL}/gesture_data`);
        if (!response.ok) {
          throw new Error('Failed to fetch gesture data');
        }
        const data: GestureData = await response.json();
        if (!isMounted) return;
        const gestureKeys: Array<keyof GestureData> = ['hipsway', 'pacing', 'headtilt', 'handtomouth', 'toostill'];
        gestureKeys.forEach((key) => {
          const current = data[key];
          const previous = lastGestureRef.current[key];
          if (current === 1 && previous !== 1) {
            const labelMap: Record<string, string> = {
              hipsway: 'Hip sway detected',
              pacing: 'Pacing detected',
              headtilt: 'Head tilt detected',
              handtomouth: 'Hand-to-face detected',
              toostill: 'Too little movement detected'
            };
            const toast: GestureToast = {
              id: Date.now() + Math.random(),
              label: labelMap[key as string] ?? 'Gesture detected',
              timestamp: Date.now()
            };
            setGestureToasts((prev) => [toast, ...prev].slice(0, 5));
            setTimeout(() => {
              setGestureToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 3500);
          }
        });
        lastGestureRef.current = data;
      } catch (err) {
        console.error('Gesture polling error:', err);
      }
    };

    pollGestures();
    const interval = setInterval(pollGestures, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const transcriptWordCount = transcriptData.realtime.trim()
    ? transcriptData.realtime.trim().split(/\s+/).length
    : 0;

  return (
    <div className="bg-gradient-to-br from-custom-pink via-white to-custom-orange text-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600 font-semibold">Presentation Mode</p>
            <h1 className="text-4xl font-bold mt-2">Live Monitoring & Coaching</h1>
            <p className="text-sm text-gray-700 mt-1">Keep an eye on EEG, slides, and speech feedback in one view.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Link
              to="/dashboard"
              className={`${accentButton} bg-gray-700 text-white hover:bg-gray-600`}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${isMuseReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}
              />
              <p className={`text-sm font-semibold ${isMuseReady ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isMuseReady ? 'Muse device connected' : 'Muse device not connected'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.4em] text-orange-600 font-semibold">Auto-saving session data</p>
            <button
              onClick={handleTogglePresentation}
              disabled={isStartingPresentation && !isPresenting}
              className={`${accentButton} text-white ${
                isPresenting ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isPresenting ? 'Stop presenting' : isStartingPresentation ? 'Starting…' : 'Start presenting'}
            </button>
         
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-4 flex flex-wrap items-center gap-3">
          <input
            id="live-pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handlePresentationUpload}
            className="hidden"
          />
          <label
            htmlFor="live-pdf-upload"
            className="w-full px-5 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl cursor-pointer font-semibold transition-colors"
          >
            {presentationFile ? 'Change presentation PDF' : 'Upload presentation PDF'}
          </label>
        </div>

        <div className="flex flex-wrap gap-4 items-stretch">
          <div className="rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-4 flex flex-col flex-1 min-w-[280px] relative overflow-visible">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Live Camera</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Gesture view</span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-300 flex-1">
              <Camera />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <div className="space-y-2 w-full max-w-sm px-4">
                {gestureToasts.map((toast) => (
                  <div
                    key={toast.id}
                    className="pointer-events-auto bg-rose-500/90 text-white px-3 py-2 rounded-xl shadow-lg text-sm flex items-center gap-2"
                  >
                    <span>⚠️</span>
                    <span>{toast.label}</span>
                  </div>
                ))}
              </div>
            </div>
           
          </div>

          <div className="rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-4 flex flex-col w-fit max-w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">Presentation Viewer</h2>
                {presentationSummary && (
                  <p className="text-sm text-orange-700 font-medium truncate">{presentationSummary}</p>
                )}
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Power Point</span>
            </div>
            <div className="rounded-2xl bg-gray-100 border border-gray-300 p-3 flex-1 overflow-auto">
              <SimplePDFViewer
                className=" w-full h-full"
                file={presentationFile}
                showUploader={false}
                onDocumentReady={({ fileName }) => setPresentationSummary(fileName)}
              />
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">AI Live Coach</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Feedback stream</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-gray-300 bg-gray-50 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
                <p className="text-sm text-orange-700 font-medium">Latest feedback</p>
                <span className="text-xs text-orange-600 font-semibold">Live</span>
              </div>
              <div
                ref={feedbackScrollRef}
                className="flex-1 max-h-64 overflow-y-auto p-4 space-y-3 text-sm text-gray-800"
              >
                {feedbackMessages.length === 0 ? (
                  <div className="text-center text-gray-600">
                    <p className="text-xl mb-2">🎧</p>
                    <p>Start presenting to receive AI feedback.</p>
                  </div>
                ) : (
                  feedbackMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl border ${
                        msg.stuttering_detected
                          ? 'bg-yellow-100 border-yellow-400'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.feedback}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        {msg.stuttering_detected && (
                          <span className="flex items-center gap-1 text-yellow-700 font-semibold">
                            <span>⚠️</span> Stuttering detected
                          </span>
                        )}
                        <span>{new Date(msg.timestamp * 1000).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {isMuseReady ? (
              <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4 space-y-3 text-sm text-gray-800">
                <p className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">EEG live activity</p>
                {eegDigest ? (
                  <div className="rounded-2xl border border-orange-400 bg-gradient-to-r from-rose-500/15 to-orange-500/15 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          eegDigest.stressed ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="font-semibold">
                          {eegDigest.stressed ? 'Stress detected' : 'Calm & focused'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(eegDigest.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800">{eegDigest.message}</p>
                    {eegDigest.stressed ? (
                      <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                        <li>Pause for a deep breath.</li>
                        <li>Relax shoulders and slow your delivery.</li>
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-700 font-medium">Steady signals detected—keep it up!</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Waiting for live EEG readings…
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4 space-y-3 text-sm text-gray-800">
                <p className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Session status</p>
                <p>
                  • Recording:{' '}
                  <span className={isPresenting ? 'text-emerald-700 font-semibold' : 'text-gray-600'}>
                    {isPresenting ? 'Active' : 'Idle'}
                  </span>
                </p>
                <p>• Feedback count: {feedbackMessages.length}</p>
                <p>• Transcript words: {transcriptWordCount}</p>
                <p className="text-rose-700 text-xs font-medium">
                  Connect the Muse headset to start emotion detection.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-300 bg-white/90 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Live Transcript</h2>
            {isPresenting && <span className="text-xs text-emerald-700 font-semibold">Recording…</span>}
          </div>
          <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-300 p-4 text-gray-900">
            {transcriptData.realtime || transcriptData.partial ? (
              <>
                <p className="leading-relaxed whitespace-pre-wrap">{transcriptData.realtime}</p>
                {transcriptData.partial && (
                  <p className="mt-3 text-orange-700 italic">{transcriptData.partial}</p>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm">Start presenting to populate the live transcript.</p>
            )}
          </div>
        </section>

        <Recorder
          ref={recorderRef}
          showControls={false}
          showTranscript={false}
          showFeedbackPanel={false}
          onRecordingStateChange={setIsPresenting}
          onTranscriptUpdate={setTranscriptData}
          onFeedbackUpdate={setFeedbackMessages}
          className="hidden"
        />
      </div>
    </div>
  );
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
