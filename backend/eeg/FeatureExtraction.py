import numpy as np

#function to calculate the average power (= average of the squared amplitude) of the filtered singal
def calculate_power(filtered_signal):
    signal = np.asarray(filtered_signal)
    return np.mean(signal ** 2)

#function to calculate the mean amplitude of the filtered signal
def calculate_mean_amplitude(filtered_signal):
    signal = np.asarray(filtered_signal)
    return np.mean(np.abs(signal))

def extract_features(filtered_data):
    features = {}

    for key, filtered_signal in filtered_data.items():
        power = calculate_power(filtered_signal)
        mean_amplitude = calculate_mean_amplitude(filtered_signal)
        features[key] = {
            "power": power,
            "mean_amplitude": mean_amplitude
        }

    return features

def average_features(filtered_data):

    features = extract_features(filtered_data)
    averaged_features = {}
    
    for band in ['Theta', 'Alpha', 'Beta']:
        #For each band (Alpha, Beta, Gamma), the function creates a subset of the features dictionary (band_features) containing only the entries related to that band.
        band_features = {key: value for key, value in features.items() if band in key}

        averaged_features[band] = {
            "avg_power": np.mean([f["power"] for f in band_features.values()]),
            "avg_mean_amplitude": np.mean([f["mean_amplitude"] for f in band_features.values()])
        }

    return averaged_features

