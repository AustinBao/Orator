import time 
from scipy.signal import butter, lfilter, iirnotch
import pandas as pd
import numpy as np
from brainflow.board_shim import BoardShim

def read_data(board, timeSec):
    board.start_stream()
    time.sleep(timeSec) #wait 5 seconds
    data = board.get_board_data()

    
    board.stop_stream()
    print("blehbleh")
    return data



#this function returns 2D NumPy array of eeg_data with each bands
def filter_EEG_from_data(board, board_id, data):
    eeg_channel_names = board.get_eeg_names(board_id)
    #to debug it. It doesn't do anything
    print("Getting EEG signals from ", eeg_channel_names)
    
    eeg_channels = board.get_eeg_channels(board_id) #this returns number of channels
    eeg_data = data[eeg_channels] #2D NumPy array[[  965.33203125   965.33203125   965.33203125 ...   578.125 and more

    return eeg_data

#function to create a bandpass filter
#low/highcut is the limit of frequencies in Hs
def bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyquist = 0.5 * fs #Nyquist frequency is half the sampling rate and represents the highest frequency the signal can accurately measure
   
    #if lowcut = 8 Hz, highcut = 13 Hz, and Nyquist = 128 Hz, then low = 0.0625, high = 0.1016
    low = lowcut / nyquist
    high = highcut / nyquist 
   
    #b, a are the numerator and denominator coefficients of the filter’s transfer function
    b, a = butter(order, [low, high], btype='band')
    return lfilter(b, a, data) #The output is the same shape as the input but contains only frequencies within your chosen band


#to filter out the movement motion
def adaptive_filter(eeg_channel, accel_ref, mu=0.01, n_taps=4):
    """Simple Least-Mean-Squares (LMS) adaptive filter."""
    N = len(eeg_channel)
    y = np.zeros(N)
    e = np.zeros(N)
    w = np.zeros((3, n_taps))
    x_buf = np.zeros((3, n_taps))
    
    for n in range(N):
        x_buf[:, 1:] = x_buf[:, :-1]
        x_buf[:, 0] = accel_ref[:, n]
        y[n] = np.sum(w * x_buf)
        e[n] = eeg_channel[n] - y[n]
        w += 2 * mu * np.outer(e[n], x_buf)
    return e

def notch_filter(data, freq=60.0, fs=256, Q=30):
    b, a = iirnotch(freq, Q, fs)
    return lfilter(b, a, data)

def process_eeg_data(eeg_data, sampling_rate): 
    #find a scienfic research paper for this # Frequency bands in Hz 
    bands = { "Theta": (4, 8), 
             "Alpha": (7.5, 13), 
             "Beta": (18, 30), #high beta waves, known as "beta three" are linked to sigificant stress and is range from 18 to 40 
             } # Channel labels corresponding to the Muse EEG device #TP9 = left ear, AF7 = left forehead, AF8 = right forehead, TP10 = right ear 
    channel_labels = ['TP9', 'AF7', 'AF8', 'TP10'] 
    # Initialize a dictionary to store the filtered signals and raw signals 
    data_dict = {}


    # Extract each frequency band for all channels 
    for band_name, (low, high) in bands.items(): 
        for i, channel in enumerate(channel_labels): 
            filtered_signal = bandpass_filter(eeg_data[i, :], low, high, sampling_rate)
            data_dict[f"{band_name}_{channel}"] = filtered_signal 
            
    # Add the raw data to the dictionary 
    for i, channel in enumerate(channel_labels): 
        data_dict[f"RAW_{channel}"] = eeg_data[i, :] 
    
    # Convert the dictionary to a DataFrame
    df = pd.DataFrame(data_dict) #for better visualization 
    
    return df

# def process_eeg_data(board, board_id, data, sampling_rate):
#     bands = {
#         "Theta": (4, 8),
#         "Alpha": (7.5, 13),
#         "Beta": (18, 30),
#     }
#     channel_labels = ['TP9', 'AF7', 'AF8', 'TP10']

#     eeg_channels = BoardShim.get_eeg_channels(board_id)

#     print("eeg_channels_work")
#     print(BoardShim.get_accel_channels(board_id))
#     accel_channels = BoardShim.get_accel_channels(board_id)

#     print("eeg_accel_work")

#     eeg_data = data[eeg_channels]
#     accel_data = data[accel_channels]

#     # Step 1: motion artifact removal
#     for i in range(eeg_data.shape[0]):
#         eeg_data[i, :] = adaptive_filter(eeg_data[i, :], accel_data)

#     # ⚡ Step 1.5: remove 50/60 Hz power-line interference
#     for i in range(eeg_data.shape[0]):
#         eeg_data[i, :] = notch_filter(eeg_data[i, :], freq=60.0, fs=sampling_rate)

#     # Step 2: bandpass each frequency band
#     data_dict = {}
#     for band_name, (low, high) in bands.items():
#         for i, channel in enumerate(channel_labels):
#             filtered_signal = bandpass_filter(eeg_data[i, :], low, high, sampling_rate)
#             data_dict[f"{band_name}_{channel}"] = filtered_signal

#     # Step 3: add raw data
#     for i, channel in enumerate(channel_labels):
#         data_dict[f"RAW_{channel}"] = eeg_data[i, :]

#     return pd.DataFrame(data_dict)


