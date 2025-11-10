import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Camera from '../components/Camera';
import Recorder from '../components/Recorder';
import type { RecorderHandle, FeedbackMessage } from '../components/Recorder';
import SimplePDFViewer from '../components/SimplePDFViewer';
import EEG from '../components/EEG';
import type { EegStatusDigest } from '../components/EEG';

const lightGradient = 'bg-gradient-to-br from-indigo-50 via-white to-sky-100 text-slate-900';
const darkGradient = 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100';

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
  const [isDarkMode, setIsDarkMode] = useState(true);
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
    <div className={`${isDarkMode ? darkGradient : lightGradient} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Presentation Mode</p>
            <h1 className="text-4xl font-bold mt-2">Live Monitoring & Coaching</h1>
            <p className="text-sm text-indigo-300 mt-1">Keep an eye on EEG, slides, and speech feedback in one view.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Link
              to="/dashboard"
              className={`${accentButton} ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-900 text-white'}`}
            >
              ← Go previous
            </Link>
            <button
              onClick={() => setIsDarkMode(v => !v)}
              className={`${accentButton} ${isDarkMode ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40' : 'bg-slate-900 text-white'}`}
            >
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${isMuseReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`}
              />
              <p className={`text-sm font-semibold ${isMuseReady ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isMuseReady ? 'Muse device connected' : 'Muse device not connected'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">Auto-saving session data</p>
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

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
          <input
            id="live-pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handlePresentationUpload}
            className="hidden"
          />
          <label
            htmlFor="live-pdf-upload"
            className="w-full px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl cursor-pointer font-semibold transition-colors"
          >
            {presentationFile ? 'Change presentation PDF' : 'Upload presentation PDF'}
          </label>
        </div>

        <div className="flex flex-wrap gap-4 items-stretch">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col flex-1 min-w-[280px] relative overflow-visible">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Live Camera</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-indigo-300">Gesture view</span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 flex-1">
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col w-fit max-w-full">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-xl font-semibold">Presentation Viewer</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-indigo-300">PDF</span>
              {presentationSummary && (
                <p className="text-sm text-indigo-200 truncate">{presentationSummary}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-900/30 p-3 flex-1 overflow-auto">
              <SimplePDFViewer
                className=" w-full h-full"
                file={presentationFile}
                showUploader={false}
                onDocumentReady={({ fileName }) => setPresentationSummary(fileName)}
              />
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">AI Live Coach</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-indigo-300">Feedback stream</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/30 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <p className="text-sm text-indigo-200">Latest feedback</p>
                <span className="text-xs text-indigo-300">Live</span>
              </div>
              <div
                ref={feedbackScrollRef}
                className="flex-1 max-h-64 overflow-y-auto p-4 space-y-3 text-sm text-slate-200"
              >
                {feedbackMessages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    <p className="text-xl mb-2">🎧</p>
                    <p>Start presenting to receive AI feedback.</p>
                  </div>
                ) : (
                  feedbackMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl border ${
                        msg.stuttering_detected
                          ? 'bg-yellow-900/20 border-yellow-600/40'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.feedback}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-indigo-200">
                        {msg.stuttering_detected && (
                          <span className="flex items-center gap-1 text-yellow-300">
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
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 space-y-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">EEG live activity</p>
                {eegDigest ? (
                  <div className="rounded-2xl border border-indigo-400/40 bg-gradient-to-r from-indigo-500/10 to-rose-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          eegDigest.stressed ? 'bg-rose-400 animate-pulse' : 'bg-emerald-300'
                        }`}
                      />
                      <div>
                        <p className="font-semibold">
                          {eegDigest.stressed ? 'Stress detected' : 'Calm & focused'}
                        </p>
                        <p className="text-xs text-indigo-200">
                          {new Date(eegDigest.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-indigo-100">{eegDigest.message}</p>
                    {eegDigest.stressed ? (
                      <ul className="text-xs text-rose-100 space-y-1 list-disc list-inside">
                        <li>Pause for a deep breath.</li>
                        <li>Relax shoulders and slow your delivery.</li>
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-200">Steady signals detected—keep it up!</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Waiting for live EEG readings…
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 space-y-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Session status</p>
                <p>
                  • Recording:{' '}
                  <span className={isPresenting ? 'text-emerald-300' : 'text-slate-400'}>
                    {isPresenting ? 'Active' : 'Idle'}
                  </span>
                </p>
                <p>• Feedback count: {feedbackMessages.length}</p>
                <p>• Transcript words: {transcriptWordCount}</p>
                <p className="text-rose-300 text-xs">
                  Connect the Muse headset to start emotion detection.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Live Transcript</h2>
            {isPresenting && <span className="text-xs text-emerald-300">Recording…</span>}
          </div>
          <div className="max-h-64 overflow-y-auto bg-slate-900/30 rounded-2xl border border-white/10 p-4 text-slate-100">
            {transcriptData.realtime || transcriptData.partial ? (
              <>
                <p className="leading-relaxed whitespace-pre-wrap">{transcriptData.realtime}</p>
                {transcriptData.partial && (
                  <p className="mt-3 text-indigo-200 italic">{transcriptData.partial}</p>
                )}
              </>
            ) : (
              <p className="text-indigo-200 text-sm">Start presenting to populate the live transcript.</p>
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
