import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SimplePDFViewer from '../components/SimplePDFViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ratioTargets = [
  { label: 'Alpha / Beta', value: 0.45, tone: 'Calm' },
  { label: 'Theta / Beta', value: 0.21, tone: 'Focus' }
];

const steps = [
  { id: 0, title: 'Connect Muse & Baseline (optional)' },
  { id: 1, title: 'Upload Slides & Script' }
];

type ConnectionStep = 'idle' | 'connecting' | 'baseline' | 'complete' | 'error';

interface BoardInfo {
  board_id?: number;
  sampling_rate?: number;
  eeg_channels?: string[];
}

type BaselineRatios = Record<string, number>;

interface ApiResponse {
  status?: string;
  message?: string;
  suggested_message?: string;
  board?: BoardInfo;
  baseline?: BaselineRatios;
  [key: string]: unknown;
}

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(0);

  const [museConnected, setMuseConnected] = useState(false);
  const [museSkipped, setMuseSkipped] = useState(false);

  const [baselineProgress, setBaselineProgress] = useState(0);
  const [isBaselineRecording, setIsBaselineRecording] = useState(false);

  const [bandPower, setBandPower] = useState({
    Alpha: 34.2,
    Beta: 28.4,
    Theta: 22.1
  });

  const [scriptText, setScriptText] = useState('');
  const [pdfMeta, setPdfMeta] = useState<string | null>(null);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [savedScript, setSavedScript] = useState('');
  const [scriptSaveStatus, setScriptSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [scriptSaveMessage, setScriptSaveMessage] = useState<string | null>(null);
  const [isDeviceConnecting, setIsDeviceConnecting] = useState(false);
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  const [baselineRatios, setBaselineRatios] = useState<BaselineRatios | null>(null);
  const [channelQuality, setChannelQuality] = useState<Record<string, number>>({});
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const navigate = useNavigate();

  const themeClasses = 'bg-gradient-to-br from-custom-pink via-white to-custom-orange text-slate-900';
  const cardBase = 'bg-white/90 border border-gray-300 shadow-lg';
  const subtle = 'text-gray-600';
  const accentButton =
    'px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  useEffect(() => {
    if (!isBaselineRecording) return;
    setBaselineProgress(0);
    const interval = setInterval(() => {
      setBaselineProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBaselineRecording(false);
          return 100;
        }
        return prev + (100 / 60);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isBaselineRecording]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBandPower(prev => ({
        Alpha: clamp(prev.Alpha + (Math.random() - 0.5) * 4, 20, 45),
        Beta: clamp(prev.Beta + (Math.random() - 0.5) * 4, 15, 35),
        Theta: clamp(prev.Theta + (Math.random() - 0.5) * 4, 10, 30)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const wordCount = useMemo(() => {
    if (!scriptText.trim()) return 0;
    return scriptText.trim().split(/\s+/).length;
  }, [scriptText]);

  const effectiveScript = (savedScript || scriptText).trim();
  const scriptReady = effectiveScript.length >= 30 || savedScript.trim().length > 0;
  const museSatisfied = museConnected || museSkipped;
  const canStartPresentation = museSatisfied && scriptReady;

  const callEndpoint = async (path: string): Promise<ApiResponse> => {
    const response = await fetch(`${API_URL}${path}`, { method: 'POST' });
    let payload: ApiResponse = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok || payload.status === 'error') {
      const message =
        typeof payload.message === 'string' ? payload.message : `Request to ${path} failed.`;
      throw new Error(message);
    }
    return payload;
  };

  const updateModal = (step: ConnectionStep, error: string | null = null) => {
    setConnectionStep(step);
    setModalError(error);
    setIsModalOpen(step !== 'idle');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setConnectionStep('idle');
  };

  const handleConnectMuse = async () => {
    if (isDeviceConnecting) return;

    setIsDeviceConnecting(true);
    setConnectionMessage(null);
    updateModal('connecting');

    try {
      const connectPayload = await callEndpoint('/eeg/connect');
      const board = (connectPayload.board as BoardInfo) ?? null;
      setBoardInfo(board);
      setMuseConnected(true);
      setMuseSkipped(false);
      const channels = board?.eeg_channels ?? [];
      if (channels.length) {
        const qualities: Record<string, number> = {};
        channels.forEach(channel => {
          qualities[channel] = Math.floor(Math.random() * 30) + 65;
        });
        setChannelQuality(qualities);
      }
      setConnectionMessage('Device connected. Capturing baseline…');

      updateModal('baseline');
      setIsBaselineRecording(true);
      setBaselineProgress(0);

      const baselinePayload = await callEndpoint('/eeg/baseline');
      setBaselineRatios((baselinePayload.baseline as BaselineRatios) ?? null);
      const baselineMessage =
        typeof baselinePayload.suggested_message === 'string'
          ? baselinePayload.suggested_message
          : baselinePayload.message ?? 'Baseline captured successfully.';
      setConnectionMessage(baselineMessage);
      setLastUpdated(new Date().toLocaleTimeString());
      setBaselineProgress(100);
      setIsBaselineRecording(false);
      updateModal('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to Muse device.';
      setConnectionMessage(message);
      setMuseConnected(false);
      setBaselineRatios(null);
      updateModal('error', message);
    } finally {
      setIsDeviceConnecting(false);
    }
  };

  const handleSkipMuse = () => {
    setMuseSkipped(true);
    setMuseConnected(false);
    setBoardInfo(null);
    setBaselineRatios(null);
    setChannelQuality({});
    setConnectionMessage('You skipped Muse setup. EEG insights will be limited.');
    setBaselineProgress(0);
    setLastUpdated(null);
    setCurrentStep(1);
  };

  const handleStartBaseline = async () => {
    if (!boardInfo || isBaselineRecording) {
      if (!boardInfo) {
        setConnectionMessage('Connect the Muse device before recording baseline.');
      }
      return;
    }
    setIsBaselineRecording(true);
    setBaselineProgress(0);
    try {
      const baselinePayload = await callEndpoint('/eeg/baseline');
      setBaselineRatios((baselinePayload.baseline as BaselineRatios) ?? null);
      const baselineMessage =
        typeof baselinePayload.suggested_message === 'string'
          ? baselinePayload.suggested_message
          : baselinePayload.message ?? 'Baseline captured successfully.';
      setConnectionMessage(baselineMessage);
      setLastUpdated(new Date().toLocaleTimeString());
      setBaselineProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to capture baseline.';
      setConnectionMessage(message);
    } finally {
      setIsBaselineRecording(false);
    }
  };

  const handleSaveScript = async () => {
    if (!scriptText.trim()) {
      setScriptSaveStatus('error');
      setScriptSaveMessage('Enter a script before saving.');
      return;
    }
    setScriptSaveStatus('saving');
    setScriptSaveMessage('Saving script…');
    try {
      const response = await fetch(`${API_URL}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptText)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to save script');
      }
      setSavedScript(scriptText);
      setScriptSaveStatus('success');
      setScriptSaveMessage('Script saved for presentation mode.');
    } catch (err) {
      setScriptSaveStatus('error');
      setScriptSaveMessage(err instanceof Error ? err.message : 'Failed to save script.');
    }
  };

  const goPrevious = () => setCurrentStep(step => Math.max(step - 1, 0));
  const goNext = () => setCurrentStep(step => Math.min(step + 1, steps.length - 1));

  const startPresentation = () => {
    if (!canStartPresentation) return;
    navigate('/presentation', {
      state: {
        boardInfo,
        baselineRatios,
        script: effectiveScript,
        pdfFile: presentationFile ?? null,
        pdfMeta
      }
    });
  };

  const museStepContent = (
    <div className="space-y-6">
      <section className={`${cardBase} rounded-3xl p-6 space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-600 font-semibold">Step 1</p>
            <h2 className="text-2xl font-semibold mt-1">Muse S Status</h2>
            <p className={`${subtle} text-sm`}>Connect your headband and review live signals.</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              museConnected ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}
          >
            {museConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleConnectMuse}
            disabled={isDeviceConnecting}
            className={`${accentButton} text-white ${
              isDeviceConnecting ? 'bg-orange-800 cursor-wait' : 'bg-orange-500 hover:bg-orange-400'
            }`}
          >
            {isDeviceConnecting ? 'Connecting…' : 'Connect device'}
          </button>
        
          <button
            onClick={handleSkipMuse}
            className={`${accentButton} bg-gray-700 text-white hover:bg-gray-600`}
          >
            Skip device setup
          </button>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-orange-500/20 border border-orange-300">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-600 mb-2">Live activity</p>
          <div className="relative h-20 rounded-xl overflow-hidden bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400/60 via-pink-400/50 to-orange-500/60 blur-2xl opacity-60 animate-pulse" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[pulse_2.5s_ease-in-out_infinite]" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Channel signal quality</h3>
          <div className="space-y-3">
            {Object.keys(channelQuality).length === 0 ? (
              <p className="text-sm text-gray-600">
                Connect the Muse device to view live channel metrics.
              </p>
            ) : (
              Object.entries(channelQuality).map(([label, strength]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className={strength > 70 ? 'text-emerald-600' : 'text-amber-600'}>
                      {strength}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-300">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-orange-500"
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              ))
            )}
            {connectionMessage && (
              <p className="text-xs text-orange-700 font-medium">{connectionMessage}</p>
            )}
            {lastUpdated && (
              <p className="text-xs text-gray-600">Last updated at {lastUpdated}</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardBase} rounded-3xl p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Baseline Recorder</h3>
              <p className={`${subtle} text-sm`}>60-second calm capture for trustworthy ratios.</p>
            </div>
            <span className="text-sm text-orange-600 font-semibold">{Math.round(baselineProgress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-300 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-orange-500 transition-all duration-500"
              style={{ width: `${baselineProgress}%` }}
            />
          </div>
          <button
            onClick={handleStartBaseline}
            disabled={isBaselineRecording}
            className={`${accentButton} text-white bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isBaselineRecording ? 'Recording calm baseline...' : 'Record calm baseline'}
          </button>
        </div>

        <div className={`${cardBase} rounded-3xl p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Current Ratios</h3>
            <span className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Live</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(baselineRatios
              ? Object.entries(baselineRatios).map(([label, value]) => ({
                  label,
                  value,
                  tone: label.toLowerCase().includes('alpha') ? 'Calm' : 'Focus'
                }))
              : ratioTargets
            ).map(ratio => (
              <div
                key={ratio.label}
                className="rounded-2xl p-4 bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-orange-300"
              >
                <p className="text-xs uppercase tracking-wide text-orange-700 font-semibold">{ratio.label}</p>
                <p className="text-3xl font-semibold mt-1">
                  {typeof ratio.value === 'number' ? ratio.value.toFixed(2) : ratio.value}
                </p>
                {'tone' in ratio && <p className="text-xs mt-1 text-orange-700">{ratio.tone}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(bandPower).map(([band, value], idx) => (
              <div key={band} className="rounded-2xl p-3 bg-gray-200 border border-gray-400">
                <p className="text-xs uppercase tracking-wide text-orange-700 font-semibold">{band}</p>
                <p className="text-lg font-semibold mt-1">{value.toFixed(1)} μV</p>
                <div className="mt-2 h-2 rounded-full bg-gray-300 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientForBand(idx)} transition-all`}
                    style={{ width: `${(value / 45) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const uploaderStepContent = (
    <div className="space-y-6">
      <section className={`${cardBase} rounded-3xl p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-600 font-semibold">Step 2</p>
            <h2 className="text-2xl font-semibold mt-1">Presentation Uploader</h2>
            <p className={`${subtle} text-sm`}>Load your PDF slides for rehearsal.</p>
          </div>
          {pdfMeta && (
            <div className="text-xs text-orange-700 font-medium">
              Loaded <span className="font-semibold">{pdfMeta}</span>
            </div>
          )}
        </div>
        <SimplePDFViewer
          className="max-w-none"
          file={presentationFile}
          onSelectFile={(file) => {
            setPresentationFile(file);
            setPdfMeta(file.name);
          }}
          onDocumentReady={({ fileName }) => {
            setPdfMeta(fileName);
          }}
        />
      </section>

      <section className={`${cardBase} rounded-3xl p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Script Uploader</h2>
          <span className="text-sm text-orange-600 font-semibold">Word count: {wordCount}</span>
        </div>
        <div className="rounded-3xl border border-dashed border-orange-400 bg-gradient-to-br from-rose-500/15 to-orange-500/15 p-4">
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            className="w-full h-64 rounded-2xl p-4 resize-none bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500"
            placeholder="Paste or type your script here. Highlight key points just like in Textbox."
          />
          <div className="flex items-center justify-between mt-3">
            {scriptSaveMessage && (
              <p className={`text-sm font-medium ${scriptSaveStatus === 'success'? 'text-emerald-700' : scriptSaveStatus === 'error' ? 'text-rose-700' : 'text-orange-700'}`}>
                {scriptSaveMessage}
              </p>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleSaveScript}
                disabled={scriptSaveStatus === 'saving'}
                className={`${accentButton} text-white ${scriptSaveStatus === 'saving' ? 'bg-orange-800 cursor-wait' : 'bg-orange-500 hover:bg-orange-400'}`}>
                {scriptSaveStatus === 'saving' ? 'Saving…' : 'Save script'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <>
      <div className={`${themeClasses} min-h-screen`}>
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600 font-semibold">Setup / Dashboard</p>
            <h1 className="text-4xl font-bold mt-2">EEG Presentation Coach</h1>
            <p className={`${subtle} text-sm mt-1`}>Follow the guided steps before you start presenting.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Link to="/" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
              Back to landing
            </Link>
          </div>
        </header>

        <div className={`${cardBase} rounded-3xl p-5`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 min-w-[180px] rounded-2xl p-4 border ${
                    currentStep === index
                      ? 'bg-gradient-to-r from-rose-500/25 to-orange-500/25 border-orange-400 shadow-md'
                      : 'border-gray-300 bg-white/50'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-orange-600 font-semibold">Step {index + 1}</p>
                  <p className="text-lg font-semibold mt-1">{step.title}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={goPrevious}
                disabled={currentStep === 0}
                className={`${accentButton} ${currentStep === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              >
                ← Previous
              </button>
              <button
                onClick={goNext}
                disabled={currentStep === steps.length - 1}
                className={`${accentButton} ${
                  currentStep === steps.length - 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {currentStep === 0 ? museStepContent : uploaderStepContent}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className={`${subtle} text-sm`}>
            Complete each step or skip Muse setup to continue. You can always come back later.
          </p>
          <button
            onClick={startPresentation}
            disabled={!canStartPresentation}
            className={`${accentButton} text-white ${
              canStartPresentation ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start presenting
          </button>
        </div>
        </div>
      </div>

      <ConnectionModal
        isOpen={isModalOpen}
        step={connectionStep}
        error={modalError}
        onClose={closeModal}
      />
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function gradientForBand(index: number) {
  if (index === 0) return 'from-rose-400 to-pink-500';
  if (index === 1) return 'from-pink-400 to-orange-500';
  return 'from-orange-400 to-amber-500';
}

interface ConnectionModalProps {
  isOpen: boolean;
  step: ConnectionStep;
  error?: string | null;
  onClose: () => void;
}

const STEP_COPY: Record<Exclude<ConnectionStep, 'idle'>, { title: string; description: string; icon: string }> = {
  connecting: {
    title: 'Connecting Muse device…',
    description: 'Establishing a secure session with your Muse headset.',
    icon: '🔌'
  },
  baseline: {
    title: 'Recording calm baseline…',
    description: 'Please remain relaxed for the most accurate reading.',
    icon: '🧘'
  },
  complete: {
    title: 'Ready for practice!',
    description: 'Baseline captured—live metrics unlocked.',
    icon: '✅'
  },
  error: {
    title: 'Unable to connect',
    description: 'Check the headset and try again.',
    icon: '⚠️'
  }
};

function ConnectionModal({ isOpen, step, error, onClose }: ConnectionModalProps) {
  if (!isOpen || step === 'idle') {
    return null;
  }

  const copy = STEP_COPY[error ? 'error' : step];
  const allowClose = step === 'complete' || step === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 text-gray-100">
        <div className="text-5xl mb-4">{copy.icon}</div>
        <h2 className="text-2xl font-semibold mb-2">{copy.title}</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          {error ?? copy.description}
        </p>
        {!(step === 'complete' || step === 'error') && (
          <div className="mt-6 flex items-center gap-3 text-orange-200">
            <span className="h-3 w-3 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-sm">This may take up to a minute.</span>
          </div>
        )}
        {allowClose && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
