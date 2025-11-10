import { useRef, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// const API_URL = 'http://localhost:8000';



type ConnectionStep = 'idle' | 'connecting' | 'baseline' | 'complete' | 'error';

export interface EegStatusDigest {
  stressed: boolean;
  message: string;
  timestamp: number;
}

interface EEGProps {
  onStatusDigest?: (digest: EegStatusDigest | null) => void;
  onConnectionChange?: (ready: boolean) => void;
  shouldDetect?: boolean;
}

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

interface ConnectingModalProps {
  isOpen: boolean;
  step: ConnectionStep;
  error?: string | null;
  onClose: () => void;
}

const STEP_COPY: Record<Exclude<ConnectionStep, 'idle'>, { title: string; description: string; icon: string }> = {
  connecting: {
    title: 'Connecting Muse device…',
    description: 'Establishing a secure Bluetooth session with the headset.',
    icon: '🔌'
  },
  baseline: {
    title: 'Analyzing baseline ratio…',
    description: 'Please remain calm and relax to collect accurate baseline data.',
    icon: '🧘'
  },
  complete: {
    title: 'Baseline captured!',
    description: 'You are ready to begin emotion detection and live feedback.',
    icon: '✅'
  },
  error: {
    title: 'Unable to connect',
    description: 'Please check the Muse headset, then try again.',
    icon: '⚠️'
  }
};

function ConnectingModal({ isOpen, step, error, onClose }: ConnectingModalProps) {
  if (!isOpen || step === 'idle') {
    return null;
  }

  const copy = STEP_COPY[error ? 'error' : step];
  const canDismiss = step === 'complete' || step === 'error';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 text-gray-100">
        <div className="text-5xl mb-4">{copy.icon}</div>
        <h2 className="text-2xl font-semibold mb-2">{copy.title}</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          {error ?? copy.description}
        </p>

        {step !== 'complete' && step !== 'error' && (
          <div className="mt-6 flex items-center gap-3 text-indigo-200">
            <span className="h-3 w-3 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm">This can take up to a minute.</span>
          </div>
        )}

        {canDismiss && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors"
            >
              {step === 'error' ? 'Try again' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const defaultMessage = 'Press “Connect with a Muse device” to fetch the latest message.';

export default function EEG({ onStatusDigest, onConnectionChange, shouldDetect }: EEGProps = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>('idle');
  const [modalError, setModalError] = useState<string | null>(null);

  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  const [baselineRatios, setBaselineRatios] = useState<BaselineRatios | null>(null);
  const [suggestedMessage, setSuggestedMessage] = useState<string | null>(null);

  const [rawResponse, setRawResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<string>('Idle');
  const [lastDetection, setLastDetection] = useState<EegStatusDigest | null>(null);
  const [isReadyForDetection, setIsReadyForDetection] = useState(false);

  const detectionLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectionActiveRef = useRef(false);

  const callEndpoint = async (path: string): Promise<ApiResponse> => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST'
    });

    let payload: ApiResponse = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok || payload.status === 'error') {
      const message =
        typeof payload.message === 'string'
          ? payload.message
          : `Request to ${path} failed.`;
      throw new Error(message);
    }

    return payload;
  };

  const updateModal = (step: ConnectionStep, modalMessage: string | null = null) => {
    setConnectionStep(step);
    setModalError(modalMessage);
    setIsModalOpen(step !== 'idle');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setConnectionStep('idle');
  };

  const clearDetectionLoop = () => {
    if (detectionLoopRef.current) {
      clearTimeout(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  };

  const handleConnectFlow = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);
    setModalError(null);
    setLastDetection(null);
    setIsReadyForDetection(false);
    onConnectionChange?.(false);
    updateModal('connecting');

    try {
      const connectPayload = await callEndpoint('/eeg/connect');
      setBoardInfo((connectPayload.board as BoardInfo) ?? null);
      setRawResponse(connectPayload);

      updateModal('baseline');

      const baselinePayload = await callEndpoint('/eeg/baseline');
      setBaselineRatios((baselinePayload.baseline as BaselineRatios) ?? null);
      setRawResponse(baselinePayload);

      const message =
        typeof baselinePayload.suggested_message === 'string'
          ? baselinePayload.suggested_message
          : typeof baselinePayload.message === 'string'
            ? baselinePayload.message
            : 'Baseline captured. Ready for emotion detection.';

      setSuggestedMessage(message);
      setLastUpdated(new Date().toLocaleTimeString());
      setIsReadyForDetection(true);
      onConnectionChange?.(true);

      updateModal('complete');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to connect to Muse device.';
      setError(message);
      setSuggestedMessage(null);
      setRawResponse(null);
      setIsReadyForDetection(false);
      onConnectionChange?.(false);
      updateModal('error', message);
    } finally {
      setIsConnecting(false);
    }
  };

  const pollDetection = async () => {
    if (!detectionActiveRef.current) return;
    try {
      setDetectionStatus('Analyzing live readings…');
      const detectionPayload = await callEndpoint('/eeg/detect');
      setRawResponse(detectionPayload);

      const message =
        typeof detectionPayload.suggested_message === 'string'
          ? detectionPayload.suggested_message
          : 'Live detection running. Maintain steady delivery.';

      setSuggestedMessage(message);
      setLastUpdated(new Date().toLocaleTimeString());
      setDetectionError(null);
      const digest = {
        stressed: Boolean(detectionPayload.stressed),
        message,
        timestamp: Date.now()
      };
      setLastDetection(digest);
      onStatusDigest?.(digest);

      if (detectionPayload.current_ratio) {
        setBaselineRatios(prev => prev ?? null); // keep prior baseline
      }

      if (detectionActiveRef.current) {
        detectionLoopRef.current = setTimeout(pollDetection, 4000);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to detect emotion.';
      setDetectionError(message);
      setDetectionStatus('Error');
      setIsDetecting(false);
      detectionActiveRef.current = false;
      clearDetectionLoop();
      setLastDetection(null);
    }
  };

  const startDetection = () => {
    if (!baselineRatios || !boardInfo) {
      setDetectionError('Connect and capture a baseline before detecting emotion.');
      return;
    }
    if (isDetecting) return;

    detectionActiveRef.current = true;
    setIsDetecting(true);
    setDetectionError(null);
    setDetectionStatus('Starting detection…');
    setLastDetection(null);
    pollDetection();
  };

  const stopDetection = () => {
    detectionActiveRef.current = false;
    setIsDetecting(false);
    setDetectionStatus('Cancelled');
    clearDetectionLoop();
    setLastDetection(null);
  };

  useEffect(() => {
    return () => {
      detectionActiveRef.current = false;
      clearDetectionLoop();
    };
  }, []);

  useEffect(() => {
    onStatusDigest?.(lastDetection);
  }, [lastDetection, onStatusDigest]);

  useEffect(() => {
    if (!shouldDetect) {
      if (isDetecting) {
        stopDetection();
      }
      return;
    }

    if (shouldDetect && !isDetecting && isReadyForDetection && !isConnecting) {
      startDetection();
    }
  }, [shouldDetect, isDetecting, isReadyForDetection, isConnecting]);

  return (
    <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Muse EEG Assistant</h2>
          <p className="text-gray-300 text-sm">
            Start the Muse program to pull live EEG insights and get a suggested coaching message.
          </p>
        </div>

        <button
          onClick={handleConnectFlow}
          disabled={isConnecting}
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isConnecting ? 'Connecting…' : 'Connect with a Muse device'}
        </button>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="bg-black/30 rounded-xl p-4 min-h-[120px] text-gray-100">
          <h3 className="text-indigo-200 font-semibold mb-2">Suggested Message</h3>
          <p className="leading-relaxed">
            {suggestedMessage ?? defaultMessage}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-3">Last updated at {lastUpdated}</p>
          )}
        </div>

        {boardInfo && (
          <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-200">
            <h4 className="text-indigo-200 font-semibold mb-2">Board Information</h4>
            <div className="space-y-1 text-gray-300">
              {'board_id' in boardInfo && (
                <p>Board ID: <span className="text-white">{boardInfo.board_id}</span></p>
              )}
              {'sampling_rate' in boardInfo && (
                <p>Sampling Rate: <span className="text-white">{boardInfo.sampling_rate} Hz</span></p>
              )}
              {boardInfo.eeg_channels && boardInfo.eeg_channels.length > 0 && (
                <p>
                  Channels:{' '}
                  <span className="text-white">
                    {boardInfo.eeg_channels.join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {baselineRatios && (
          <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-200">
            <h4 className="text-indigo-200 font-semibold mb-2">Baseline Ratios</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(baselineRatios).map(([key, value]) => {
                const formattedValue =
                  typeof value === 'number' ? value.toFixed(2) : String(value);
                return (
                  <div key={key} className="bg-black/20 rounded-lg px-3 py-2 flex justify-between">
                    <span className="uppercase tracking-wide text-xs text-indigo-300">{key}</span>
                    <span className="text-white font-semibold">{formattedValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detection controls */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={isDetecting ? stopDetection : startDetection}
            disabled={isConnecting || !baselineRatios || !boardInfo}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              isDetecting
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-green-500 hover:bg-green-400 text-white'
            } ${isConnecting || !baselineRatios || !boardInfo ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isDetecting ? 'Cancel' : 'Start Detecting'}
          </button>

          <div className="text-sm text-gray-300">
            <div className="font-medium">{detectionStatus}</div>
            {detectionError && <div className="text-xs text-red-300 mt-1">{detectionError}</div>}
            {!baselineRatios && <div className="text-xs text-gray-500 mt-1">Capture baseline first</div>}
          </div>
        </div>

        {rawResponse && (
          <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-200 overflow-x-auto">
            <h4 className="text-indigo-200 font-semibold mb-2">Latest Response</h4>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <ConnectingModal
        isOpen={isModalOpen}
        step={connectionStep}
        error={modalError}
        onClose={closeModal}
      />
    </div>
  );
}
