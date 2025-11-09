import { useRef, useState } from 'react'

export default function Recorder() {
    const [isRecording, setIsRecording] = useState(false)
    const [response, setResponse] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const mediaStream = useRef<MediaStream | null>(null)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])

    const startRecording = async () => {
        setIsRecording(true)
        setResponse(null)
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStream.current = stream
            mediaRecorder.current = new MediaRecorder(stream)
            
            mediaRecorder.current.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) {
                    chunks.current.push(e.data)
                }
            }

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(chunks.current, { type: 'audio/webm' })
                chunks.current = []
                
                // Send to backend
                setIsProcessing(true)
                const formData = new FormData()
                formData.append('audio', audioBlob, 'recording.webm')

                try {
                    const res = await fetch('http://localhost:5000/client_audio', {
                        method: 'POST',
                        body: formData
                    })
                    const data = await res.json()
                    setResponse(data)
                    console.log('Backend response:', data)
                } catch (error) {
                    console.error('Error sending audio:', error)
                    setResponse({ error: String(error) })
                } finally {
                    setIsProcessing(false)
                }
            }

            mediaRecorder.current.start()
        } catch (error) {
            console.error('Error starting recording:', error)
            setIsRecording(false)
        }
    }


    const stopRecording = () => {
        setIsRecording(false)
        
        if (mediaRecorder.current) {
            mediaRecorder.current.stop()
        }
        if (mediaStream.current) {
            mediaStream.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        }
    }

    return (
        <div className='p-8 w-full max-w-3xl items'>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg font-semibold ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} 
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            {isProcessing && (
                <div className='mt-6 p-4 bg-blue-900 rounded-lg'>
                    <p className='text-blue-200'>Processing audio and transcribing...</p>
                </div>
            )}

            {response && response.transcript && (
                <div className='mt-6'>
                    <h3 className='text-2xl font-bold mb-3 text-indigo-300'>Transcript:</h3>
                    <div className='p-6 bg-gray-800 rounded-lg'>
                        <p className='text-lg text-gray-100 leading-relaxed'>
                            {response.transcript}
                        </p>
                    </div>
                </div>
            )}

            {response && response.error && (
                <div className='mt-6 p-4 bg-red-900 rounded-lg'>
                    <h3 className='font-bold mb-2 text-red-200'>Error:</h3>
                    <p className='text-red-100'>{response.message || response.error}</p>
                </div>
            )}

            {response && !response.error && (
                <div className='mt-6 p-4 bg-gray-800 rounded-lg'>
                    <h3 className='font-bold mb-2 text-gray-400'>Debug Info:</h3>
                    <pre className='text-xs overflow-auto text-gray-500'>
                        {JSON.stringify(response, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}