from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
from brainflow.data_filter import DataFilter, FilterTypes, WindowOperations
import numpy as np
import time
import pandas as pd
from scipy.signal import butter, lfilter
from .DataPreprocess import read_data, filter_EEG_from_data, process_eeg_data
from .FeatureExtraction import extract_features, average_features

params = BrainFlowInputParams()
params.serial_port = '/dev/tty' #Change this depending on your device and OS

# module-level singleton to reuse existing board/session
_board_instance = None
BOARD_ID = 39

def connectMuse():
    global _board_instance
    try:
        # reuse existing, healthy board if present
        if _board_instance is not None:
            try:
                # quick health check: try to get sampling rate (will raise if session invalid)
                _board_instance.get_sampling_rate(BOARD_ID)
                print("Reusing existing board session.")
                return _board_instance
            except Exception:
                # existing instance is invalid/closed — try to release and recreate
                try:
                    _board_instance.release_session()
                except Exception:
                    pass
                _board_instance = None

        # create and prepare new session
        board = BoardShim(BOARD_ID, params)
        board.prepare_session()
        _board_instance = board
        print("Prepared new board session.")
        return board

    except Exception as e:
        # If BrainFlow reports "already exists" in logs but raised, try returning the singleton
        print("connectMuse error:", e)
        if _board_instance is not None:
            try:
                _board_instance.get_sampling_rate(BOARD_ID)
                print("Returning existing board after error.")
                return _board_instance
            except Exception:
                pass
        return None
    

def detect_stress(current_ratio, baseline_ratios):
    #Define threshold values based on research paper (I need to find one)
    theta_beta_ratio = 20 #
    alpha_beta_ratio = 17

    alpha_drop = 100 * (baseline_ratios["alpha_beta"] - current_ratio["alpha_beta"]) / baseline_ratios["alpha_beta"]
    theta_drop = 100 * (baseline_ratios["theta_beta"] - current_ratio["theta_beta"]) / baseline_ratios["theta_beta"]

    if alpha_drop > alpha_beta_ratio or theta_drop > theta_beta_ratio:
        print(f"⚠️ Stress detected! α/β ↓{alpha_drop:.1f}%, θ/β ↓{theta_drop:.1f}%")
        return True
    else:
        print(f"Calm: α/β Δ{alpha_drop:.1f}%, θ/β Δ{theta_drop:.1f}%")
        
    return False

def record_calm_state(board, board_id, sampling_rate):
    print("Recording calm baseline for 10 seconds...")
    calm_data = read_data(board, 10)                         # your existing read_data()
    eeg_calm = filter_EEG_from_data(board, board_id, calm_data)
    calm_df = process_eeg_data(eeg_calm, sampling_rate)

    calm_features = average_features(calm_df.to_dict(orient='list'))

    baseline_ratios = {
        "alpha_beta": calm_features["Alpha"]["avg_power"] / calm_features["Beta"]["avg_power"],
        "theta_beta": calm_features["Theta"]["avg_power"] / calm_features["Beta"]["avg_power"]
    }
    print("Baseline:", baseline_ratios)
    return baseline_ratios


def record_current_state(board, board_id, sampling_rate):
    current_data = read_data(board, 5)
    eeg_current = filter_EEG_from_data(board, board_id, current_data)
    curr_df = process_eeg_data(eeg_current, sampling_rate)
    curr_features = average_features(curr_df.to_dict(orient='list'))

    curr_ratios = {
    "alpha_beta": curr_features["Alpha"]["avg_power"] / curr_features["Beta"]["avg_power"],
    "theta_beta": curr_features["Theta"]["avg_power"] / curr_features["Beta"]["avg_power"]
    }

    print(curr_ratios)
    return curr_ratios


def main():
    #Prepares the board for reading data
    try:
        board_id = 39 #Change this depending on your device
        board = BoardShim(board_id, params)
        board.prepare_session()
        print("Successfully prepared physical board.")

        sampling_rate = board.get_sampling_rate(board_id)

        baseline_ratios = record_calm_state(board, board_id, sampling_rate)

        print("baseline_ratios", baseline_ratios)

        while(True):
            current_ratio = record_current_state(board, board_id, sampling_rate)
            
            stress = detect_stress(current_ratio, baseline_ratios)

            print("stress", stress)

            if stress:
                print("Stress detected. Do something man")

    except Exception as e:
        print(e)
    #  If the device cannot be found or is being used elsewhere, creates a synthetic board instead
        print("Device could not be found or is being used by another program, creating synthetic board.")
        board_id = BoardIds.SYNTHETIC_BOARD
        board = BoardShim(board_id, params)
        board.prepare_session()


if __name__ == "__main__":
    main()
