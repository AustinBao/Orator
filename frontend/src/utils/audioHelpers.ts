/**
 * Convert audio blob to WAV format (LINEAR16 PCM)
 * @param webmBlob - The WebM audio blob from MediaRecorder
 * @returns A WAV-formatted blob with 16kHz sample rate and mono channel
 */
export const convertToWav = async (webmBlob: Blob): Promise<Blob> => {
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const arrayBuffer = await webmBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Convert to mono if stereo
    const channelData = audioBuffer.numberOfChannels > 1 
        ? audioBuffer.getChannelData(0) 
        : audioBuffer.getChannelData(0)
    
    // Convert Float32Array to Int16Array (LINEAR16)
    const int16Array = new Int16Array(channelData.length)
    for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]))
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    
    // Create WAV file
    const wavBuffer = createWavBuffer(int16Array, audioBuffer.sampleRate)
    return new Blob([wavBuffer], { type: 'audio/wav' })
}

/**
 * Create a WAV file buffer from PCM samples
 * @param samples - Int16Array of PCM samples
 * @param sampleRate - Sample rate in Hz
 * @returns ArrayBuffer containing the complete WAV file
 */
const createWavBuffer = (samples: Int16Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)
    
    // WAV header helper
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
        }
    }
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    
    // fmt sub-chunk
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, 1, true) // audio format (1 = PCM)
    view.setUint16(22, 1, true) // number of channels (1 = mono)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate
    view.setUint16(32, 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    
    // data sub-chunk
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)
    
    // Write PCM samples
    const offset = 44
    for (let i = 0; i < samples.length; i++) {
        view.setInt16(offset + i * 2, samples[i], true)
    }
    
    return buffer
}

