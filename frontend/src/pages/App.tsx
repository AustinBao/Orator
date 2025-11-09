import Recorder from '../components/Recorder'
import Camera from '../components/Camera'
import Textbox from '../components/Textbox'

function App() {
  return (
    <div className="bg-blue-950 min-h-screen w-full">
      <div className="flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold text-indigo-400 mb-6">🎤 Orator AI</h1>
        <div className='mb-6'><Camera /></div>
        <Recorder />
        <Textbox />
      </div>
    </div>
  );
}

export default App
