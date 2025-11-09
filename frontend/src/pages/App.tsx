import Recorder from '../components/Recorder'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-indigo-400 mb-6">🎤 Orator AI</h1>
      <Recorder />
    </div>
  );
}

export default App
