/**
 * Realtime Audio Capture using Web Audio API
 * Captures raw PCM audio samples at 16kHz for streaming transcription
 */

export interface AudioCaptureConfig {
    sampleRate: number // Target sample rate (e.g., 16000 for speech recognition)
    bufferSize: number // How many samples to collect before calling onAudioData
    onAudioData: (audioData: Int16Array) => void // Callback when audio data is ready
    onError?: (error: Error) => void
}

export class RealtimeAudioCapture {
    private audioContext: AudioContext | null = null
    private mediaStream: MediaStream | null = null
    private sourceNode: MediaStreamAudioSourceNode | null = null
    private processorNode: ScriptProcessorNode | null = null
    private isCapturing: boolean = false
    private config: AudioCaptureConfig

    constructor(config: AudioCaptureConfig) {
        this.config = config
    }

    /**
     * Start capturing audio
     */
    async start(): Promise<void> {
        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1, // Mono
                    sampleRate: this.config.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            })

            // Create audio context with target sample rate
            this.audioContext = new AudioContext({ 
                sampleRate: this.config.sampleRate 
            })

            // Create source from media stream
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

            // Create processor node for raw audio data
            // bufferSize must be power of 2 between 256-16384
            const bufferSize = this.getValidBufferSize(this.config.bufferSize)
            this.processorNode = this.audioContext.createScriptProcessor(
                bufferSize,
                1, // mono input
                1  // mono output
            )

            // Handle audio processing
            this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
                if (!this.isCapturing) return

                const inputData = e.inputBuffer.getChannelData(0) // Float32Array
                
                // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
                const int16Data = this.float32ToInt16(inputData)
                
                // Send data via callback
                this.config.onAudioData(int16Data)
            }

            // Connect nodes
            this.sourceNode.connect(this.processorNode)
            this.processorNode.connect(this.audioContext.destination)

            this.isCapturing = true

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            this.config.onError?.(err)
            throw err
        }
    }

    /**
     * Stop capturing audio
     */
    stop(): void {
        this.isCapturing = false

        // Disconnect and cleanup
        if (this.processorNode) {
            this.processorNode.disconnect()
            this.processorNode = null
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect()
            this.sourceNode = null
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop())
            this.mediaStream = null
        }

        if (this.audioContext) {
            this.audioContext.close()
            this.audioContext = null
        }
    }

    /**
     * Check if currently capturing
     */
    getIsCapturing(): boolean {
        return this.isCapturing
    }

    /**
     * Convert Float32Array to Int16Array (LINEAR16 PCM)
     */
    private float32ToInt16(float32Array: Float32Array): Int16Array {
        const int16Array = new Int16Array(float32Array.length)
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]))
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        return int16Array
    }

    /**
     * Get valid buffer size (must be power of 2)
     */
    private getValidBufferSize(requested: number): number {
        const validSizes = [256, 512, 1024, 2048, 4096, 8192, 16384]
        // Find closest valid size
        return validSizes.reduce((prev, curr) => 
            Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev
        )
    }
}

