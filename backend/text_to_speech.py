from google.cloud import speech_v1 as speech
import os
import pyaudio
import sys # For printing interim results




client = speech.SpeechClient.from_service_account_file("gcp_key.json")

p = pyaudio.PyAudio()
# Print all microphones
for i in range(p.get_device_count()):
    info = p.get_device_info_by_index(i)
    print(f"Device {i}: {info['name']}")

mic_index = int(input("Enter the index of the microphone you want to use: "))

SAMPLE_RATE = 48000
CHUNK_SIZE = 4096 # You can tune this

stream = p.open(format=pyaudio.paInt16,
                channels=1,
                rate=SAMPLE_RATE,
                input=True,
                input_device_index=mic_index,
                frames_per_buffer=CHUNK_SIZE)

config = speech.RecognitionConfig(
    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
    sample_rate_hertz=SAMPLE_RATE,
    language_code="en-US",
    enable_automatic_punctuation=True,
)
streaming_config = speech.StreamingRecognitionConfig(
    config=config,
    interim_results=True
)

print("Listening for speech, say 'Terminate' to stop")

# --- === KEY CHANGES START HERE === ---

# 1. Define a generator function to stream audio
def request_generator(audio_stream):
    """Yields audio chunks from the PyAudio stream."""
    try:
        while True:
            # Read a chunk of audio
            chunk = audio_stream.read(CHUNK_SIZE, exception_on_overflow=False)
            if not chunk:
                break # Stop if stream is closed
            yield speech.StreamingRecognizeRequest(audio_content=chunk)
    except Exception as e:
        print(f"Error in audio generator: {e}")

# 2. Create the generator
requests = request_generator(stream)

# 3. Call streaming_recognize() ONCE
responses = client.streaming_recognize(streaming_config, requests)

# 4. Create a loop to process the responses from the server
try:
    for response in responses:
        if not response.results:
            continue

        result = response.results[0]
        if not result.alternatives:
            continue

        transcript = result.alternatives[0].transcript

        # Print interim results on the same line
        if not result.is_final:
            # \r moves cursor to start of line, end='' prevents newline
            sys.stdout.write(f"\rInterim: {transcript}   ")
            sys.stdout.flush()
        else:
            # Print final result on a new line
            sys.stdout.write(f"\rFinal: {transcript}      \n")
            sys.stdout.flush()

            # Check for termination keyword in the *final* transcript
            if "terminate" in transcript.lower():
                print("Termination keyword detected. Stopping...")
                break

except Exception as e:
    print(f"An error occurred: {e}")
finally:
    # 5. Clean up resources
    print("Stopping stream and terminating PyAudio.")
    stream.stop_stream()
    stream.close()
    p.terminate()
