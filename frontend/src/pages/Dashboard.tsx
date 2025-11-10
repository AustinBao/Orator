import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SimplePDFViewer from '../components/SimplePDFViewer';

const channelNames = [
  { label: 'TP9', strength: 82 },
  { label: 'AF7', strength: 68 },
  { label: 'AF8', strength: 74 },
  { label: 'TP10', strength: 59 }
];

const ratioTargets = [
  { label: 'α / β', value: 0.45, tone: 'Calm' },
  { label: 'θ / β', value: 0.21, tone: 'Focus' }
];

const steps = [
  { id: 0, title: 'Connect Muse & Baseline (optional)' },
  { id: 1, title: 'Upload Slides & Script' }
];

const lightGradient = 'bg-gradient-to-br from-indigo-50 via-white to-sky-100 text-slate-900';
const darkGradient = 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100';

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const [museConnected, setMuseConnected] = useState(false);
  const [museSkipped, setMuseSkipped] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [baselineProgress, setBaselineProgress] = useState(0);
  const [isBaselineRecording, setIsBaselineRecording] = useState(false);

  const [bandPower, setBandPower] = useState({
    Alpha: 34.2,
    Beta: 28.4,
    Theta: 22.1
  });

  const [scriptText, setScriptText] = useState('');
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfMeta, setPdfMeta] = useState<string | null>(null);

  const navigate = useNavigate();

  const themeClasses = isDarkMode ? darkGradient : lightGradient;
  const cardBase = isDarkMode
    ? 'bg-white/5 border border-white/10'
    : 'bg-white shadow-xl border border-slate-200';
  const subtle = isDarkMode ? 'text-slate-300' : 'text-slate-600';
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

  const scriptReady = scriptText.trim().length >= 30;
  const museSatisfied = museConnected || museSkipped;
  const canStartPresentation = museSatisfied && pdfReady && scriptReady;

  const handleConnectMuse = () => {
    setMuseConnected(true);
    setMuseSkipped(false);
  };

  const handleSkipMuse = () => {
    setMuseSkipped(true);
    setMuseConnected(false);
    setCurrentStep(1);
  };

  const handleStartBaseline = () => {
    if (!isBaselineRecording) {
      setIsBaselineRecording(true);
    }
  };

  const goPrevious = () => setCurrentStep(step => Math.max(step - 1, 0));
  const goNext = () => setCurrentStep(step => Math.min(step + 1, steps.length - 1));

  const startPresentation = () => {
    if (!canStartPresentation) return;
    navigate('/presentation');
  };

  const museStepContent = (
    <div className="space-y-6">
      <section className={`${cardBase} rounded-3xl p-6 space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-400">Step 1</p>
            <h2 className="text-2xl font-semibold mt-1">Muse S Status</h2>
            <p className={`${subtle} text-sm`}>Connect your headband and review live signals.</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              museConnected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'
            }`}
          >
            {museConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleConnectMuse}
            className={`${accentButton} text-white bg-indigo-500 hover:bg-indigo-400`}
          >
            Connect device
          </button>
          <button
            onClick={() => setIsRecording(v => !v)}
            className={`${accentButton} ${isRecording ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
          >
            {isRecording ? 'Stop record' : 'Start record'}
          </button>
          <button
            onClick={handleSkipMuse}
            className={`${accentButton} ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
          >
            Skip device setup
          </button>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border border-white/10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300 mb-2">Live activity</p>
          <div className="relative h-20 rounded-xl overflow-hidden bg-slate-900/40">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/60 via-indigo-400/50 to-blue-500/60 blur-2xl opacity-60 animate-pulse" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[pulse_2.5s_ease-in-out_infinite]" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Channel signal quality</h3>
          <div className="space-y-3">
            {channelNames.map(channel => (
              <div key={channel.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{channel.label}</span>
                  <span className={channel.strength > 70 ? 'text-emerald-400' : 'text-amber-300'}>
                    {channel.strength}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-700/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-blue-500"
                    style={{ width: `${channel.strength}%` }}
                  />
                </div>
              </div>
            ))}
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
            <span className="text-sm text-indigo-300">{Math.round(baselineProgress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-800/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-blue-500 transition-all duration-500"
              style={{ width: `${baselineProgress}%` }}
            />
          </div>
          <button
            onClick={handleStartBaseline}
            disabled={isBaselineRecording}
            className={`${accentButton} text-white bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isBaselineRecording ? 'Recording calm baseline...' : 'Record calm baseline'}
          </button>
        </div>

        <div className={`${cardBase} rounded-3xl p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Current Ratios</h3>
            <span className="text-xs uppercase tracking-[0.3em] text-indigo-300">Live</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ratioTargets.map(ratio => (
              <div
                key={ratio.label}
                className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-white/10"
              >
                <p className="text-xs uppercase tracking-wide text-indigo-200">{ratio.label}</p>
                <p className="text-3xl font-semibold mt-1">{ratio.value.toFixed(2)}</p>
                <p className="text-xs mt-1 text-indigo-200">{ratio.tone}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(bandPower).map(([band, value], idx) => (
              <div key={band} className="rounded-2xl p-3 bg-slate-900/40 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-indigo-200">{band}</p>
                <p className="text-lg font-semibold mt-1">{value.toFixed(1)} μV</p>
                <div className="mt-2 h-2 rounded-full bg-slate-800/60 overflow-hidden">
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
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-400">Step 2</p>
            <h2 className="text-2xl font-semibold mt-1">Presentation Uploader</h2>
            <p className={`${subtle} text-sm`}>Load your PDF slides for rehearsal.</p>
          </div>
          {pdfMeta && (
            <div className="text-xs text-indigo-200">
              Loaded <span className="font-semibold">{pdfMeta}</span>
            </div>
          )}
        </div>
        <SimplePDFViewer
          className="max-w-none"
          onDocumentReady={({ fileName }) => {
            setPdfReady(true);
            setPdfMeta(fileName);
          }}
        />
      </section>

      <section className={`${cardBase} rounded-3xl p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Script Uploader</h2>
          <span className="text-sm text-indigo-300">Word count: {wordCount}</span>
        </div>
        <div className="rounded-3xl border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-4">
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            className={`w-full h-64 rounded-2xl p-4 resize-none ${
              isDarkMode ? 'bg-slate-950/60 text-white border border-white/10' : 'bg-white text-slate-900 border border-slate-200'
            }`}
            placeholder="Paste or type your script here. Highlight key points just like in Textbox."
          />
          <div className="flex justify-end mt-3 gap-3">
            <button className={`${accentButton} ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}>
              Preview
            </button>
            <button className={`${accentButton} text-white bg-indigo-500 hover:bg-indigo-400`}>
              Save script
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className={`${themeClasses} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Setup / Dashboard</p>
            <h1 className="text-4xl font-bold mt-2">EEG Presentation Coach</h1>
            <p className={`${subtle} text-sm mt-1`}>Follow the guided steps before you start presenting.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => setIsDarkMode(v => !v)}
              className={`${accentButton} ${isDarkMode ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40' : 'bg-slate-900 text-white'}`}
            >
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </button>
            <Link to="/" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
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
                      ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border-indigo-300'
                      : 'border-white/10'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Step {index + 1}</p>
                  <p className="text-lg font-semibold mt-1">{step.title}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={goPrevious}
                disabled={currentStep === 0}
                className={`${accentButton} ${currentStep === 0 ? 'bg-slate-500/30 text-slate-300 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                Go previous
              </button>
              <button
                onClick={goNext}
                disabled={currentStep === steps.length - 1}
                className={`${accentButton} ${
                  currentStep === steps.length - 1
                    ? 'bg-slate-500/30 text-slate-300 cursor-not-allowed'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400'
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
              canStartPresentation ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-emerald-500/30 cursor-not-allowed'
            }`}
          >
            Start presenting
          </button>
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function gradientForBand(index: number) {
  if (index === 0) return 'from-cyan-400 to-blue-500';
  if (index === 1) return 'from-indigo-400 to-purple-500';
  return 'from-violet-400 to-pink-500';
}
