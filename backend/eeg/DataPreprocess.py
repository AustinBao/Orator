import time 
from scipy.signal import butter, lfilter
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
