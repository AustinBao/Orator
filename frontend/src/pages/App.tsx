import Recorder from '../components/Recorder'
import Camera from '../components/Camera'
import Textbox from '../components/Textbox'
import GestureTextbox from '../components/GestureTextbox'
import EEG from '../components/EEG';

function App() {
  return (
    <div className="bg-blue-950 min-h-screen w-full">
      <div className="flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold text-indigo-400 mb-6">🎤 Orator AI</h1>
        <EEG />

        <Textbox />
        <div className='mb-6 flex gap-4 w-full max-w-4xl'>
          <div className='flex-1'>
            <Camera />
          </div>
          <div className='w-80'>
            <GestureTextbox className='h-full' />
          </div>
        </div>
        <Recorder />
      </div>
    </div>
  );
}

export default App
