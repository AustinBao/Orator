import { useRef, useState, useEffect } from 'react'
import { convertToWav } from '../utils/audioHelpers'
import { RealtimeAudioCapture } from '../utils/realtimeAudioCapture'

type RecordingMode = 'batch' | 'realtime'

interface FeedbackMessage {
    id: number
    feedback: string
    stuttering_detected: boolean
    timestamp: number
}

export default function Recorder() {
    const [mode, setMode] = useState<RecordingMode>('batch')
    const [isRecording, setIsRecording] = useState(false)
    const [response, setResponse] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [realtimeTranscript, setRealtimeTranscript] = useState<string>('')
    const [partialTranscript, setPartialTranscript] = useState<string>('')
    const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])

    // Batch mode refs
    const mediaStream = useRef<MediaStream | null>(null)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])

    // Realtime mode refs
    const audioCapture = useRef<RealtimeAudioCapture | null>(null)
    const websocket = useRef<WebSocket | null>(null)
    const feedbackEndRef = useRef<HTMLDivElement | null>(null)

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
                const webmBlob = new Blob(chunks.current, { type: 'audio/webm' })
                chunks.current = []
                
                // Convert to WAV format
                setIsProcessing(true)
                try {
                    const wavBlob = await convertToWav(webmBlob)
                    
                    // Send to backend
                    const formData = new FormData()
                    formData.append('audio', wavBlob, 'recording.wav')

                    const res = await fetch('http://localhost:8000/client_audio', {
                        method: 'POST',
                        body: formData
                    })
                    const data = await res.json()
                    setResponse(data)
                    console.log('Backend response:', data)
                } catch (error) {
                    console.error('Error processing audio:', error)
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

    // ===== REALTIME MODE FUNCTIONS =====
    
    const startRealtimeRecording = async () => {
        setIsRecording(true)
        setRealtimeTranscript('')
        setPartialTranscript('')
        setFeedbackMessages([]) // Clear previous feedback
        
        try {
            // Connect to WebSocket
            websocket.current = new WebSocket('ws://localhost:8000/stream_audio')
            
            websocket.current.onopen = () => {
                console.log('WebSocket connected')
            }
            
            websocket.current.onmessage = (event) => {
                const data = JSON.parse(event.data)
                console.log('Received from backend:', data)
                
                // Handle AI feedback messages
                if (data.type === 'ai_feedback') {
                    const newFeedback: FeedbackMessage = {
                        id: Date.now(),
                        feedback: data.feedback,
                        stuttering_detected: data.stuttering_detected,
                        timestamp: data.timestamp
                    }
                    setFeedbackMessages(prev => [...prev, newFeedback])
                    return
                }
                
                if (data.error) {
                    console.error('Transcription error:', data.error)
                    setResponse({ error: data.error })
                    return
                }
                
                if (data.is_final) {
                    // Final transcript - append to complete transcript
                    console.log('Final result:', data.transcript)
                    setRealtimeTranscript(prev => {
                        const newText = prev ? prev + ' ' + data.transcript : data.transcript
                        return newText
                    })
                    setPartialTranscript('')
                } else {
                    // Partial/interim transcript
                    console.log('Interim result:', data.transcript)
                    setPartialTranscript(data.transcript || '')
                }
            }
            
            websocket.current.onerror = (error) => {
                console.error('WebSocket error:', error)
                // Error removed - connection failures are silent
            }
            
            websocket.current.onclose = () => {
                console.log('WebSocket closed')
            }
            
            // Start audio capture - send immediately for continuous streaming
            audioCapture.current = new RealtimeAudioCapture({
                sampleRate: 16000,
                bufferSize: 4096, // Smaller chunks, sent more frequently for continuous flow
                onAudioData: (audioData: Int16Array) => {
                    // Send audio immediately via WebSocket
                    if (websocket.current?.readyState === WebSocket.OPEN) {
                        const bytes = new Uint8Array(audioData.buffer)
                        const base64 = btoa(String.fromCharCode(...bytes))
                        websocket.current.send(JSON.stringify({
                            audio: base64
                        }))
                    }
                },
                onError: (error) => {
                    console.error('Audio capture error:', error)
                    setResponse({ error: error.message })
                    setIsRecording(false)
                }
            })
            
            await audioCapture.current.start()
            
        } catch (error) {
            console.error('Error starting realtime recording:', error)
            setIsRecording(false)
            setResponse({ error: String(error) })
        }
    }
    
    const stopRealtimeRecording = () => {
        setIsRecording(false)
        
        // Stop audio capture
        if (audioCapture.current) {
            audioCapture.current.stop()
            audioCapture.current = null
        }
        
        // Close WebSocket
        if (websocket.current) {
            websocket.current.close()
            websocket.current = null
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioCapture.current) {
                audioCapture.current.stop()
            }
            if (websocket.current) {
                websocket.current.close()
            }
        }
    }, [])

    // Auto-scroll feedback panel when new messages arrive
    useEffect(() => {
        if (feedbackEndRef.current) {
            feedbackEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [feedbackMessages])

    // Handler functions based on mode
    const handleStartRecording = mode === 'batch' ? startRecording : startRealtimeRecording
    const handleStopRecording = mode === 'batch' ? stopRecording : stopRealtimeRecording

    return (
        <div className='flex gap-4 h-full'>
            {/* Main Content */}
            <div className='flex-1'>
                {/* Mode Toggle */}
                <div className='mb-4 flex gap-2'>
                <button
                    onClick={() => setMode('batch')}
                    disabled={isRecording}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        mode === 'batch' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Batch Mode
                </button>
                <button
                    onClick={() => setMode('realtime')}
                    disabled={isRecording}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        mode === 'realtime' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Realtime Mode
                </button>
            </div>

            {/* Recording Button */}
            <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg font-semibold ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} 
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isRecording ? 'Stop Recording' : `Start Recording (${mode})`}
            </button>

            {isProcessing && (
                <div className='mt-6 p-4 bg-blue-900 rounded-lg'>
                    <p className='text-blue-200'>Processing audio and transcribing...</p>
                </div>
            )}

            {/* Realtime Transcript Display */}
            {mode === 'realtime' && (realtimeTranscript || partialTranscript) && (
                <div className='mt-6'>
                    <h3 className='text-2xl font-bold mb-3 text-indigo-300'>Live Transcript:</h3>
                    <div className='p-6 bg-gray-800 rounded-lg'>
                        <p className='text-lg text-gray-100 leading-relaxed'>
                            {realtimeTranscript}
                            {partialTranscript && (
                                <span className='text-gray-400 italic'> {partialTranscript}</span>
                            )}
                        </p>
                    </div>
                    {isRecording && (
                        <p className='mt-2 text-sm text-green-400'>● Recording...</p>
                    )}
                </div>
            )}

            {/* Batch Mode Transcript Display */}
            {mode === 'batch' && response && response.transcript && (
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

            {/* AI Feedback Sidebar */}
            {mode === 'realtime' && (
                <div className='w-96 flex flex-col bg-gray-900 rounded-lg border border-gray-700 h-[calc(100vh-200px)] sticky top-4'>
                    {/* Sidebar Header */}
                    <div className='p-4 border-b border-gray-700'>
                        <h3 className='text-xl font-bold text-indigo-300 flex items-center gap-2'>
                            <span>🎯</span>
                            AI Coach
                        </h3>
                        <p className='text-sm text-gray-400 mt-1'>Real-time feedback every 4 seconds</p>
                    </div>

                    {/* Feedback Messages */}
                    <div className='flex-1 overflow-y-auto p-4 space-y-3'>
                        {feedbackMessages.length === 0 ? (
                            <div className='text-center text-gray-500 mt-8'>
                                <p className='text-lg mb-2'>👂</p>
                                <p>Start recording to receive AI feedback...</p>
                            </div>
                        ) : (
                            <>
                                {feedbackMessages.map((msg) => (
                                    <div 
                                        key={msg.id}
                                        className={`p-3 rounded-lg ${
                                            msg.stuttering_detected 
                                                ? 'bg-yellow-900/30 border border-yellow-700/50' 
                                                : 'bg-gray-800 border border-gray-700'
                                        }`}
                                    >
                                        <div className='text-sm text-gray-100 whitespace-pre-line'>
                                            {msg.feedback}
                                        </div>
                                        {msg.stuttering_detected && (
                                            <div className='mt-2 text-xs text-yellow-400 flex items-center gap-1'>
                                                <span>⚠️</span>
                                                Stuttering detected in this segment
                                            </div>
                                        )}
                                        <div className='mt-2 text-xs text-gray-500'>
                                            {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                                <div ref={feedbackEndRef} />
                            </>
                        )}
                    </div>

                    {/* Sidebar Footer */}
                    <div className='p-3 border-t border-gray-700 bg-gray-800/50'>
                        <div className='flex items-center justify-between text-xs text-gray-400'>
                            <span>{feedbackMessages.length} feedback{feedbackMessages.length !== 1 ? 's' : ''}</span>
                            {isRecording && <span className='text-green-400 animate-pulse'>● Live</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}