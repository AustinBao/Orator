import cv2
import time
import numpy as np
from ultralytics import YOLO
import json

model = YOLO("yolo11n-pose.pt")
camera = cv2.VideoCapture(0)
camera.set(cv2.CAP_PROP_BUFFERSIZE, 5)

# --- storage for rolling positions ---
history = {
    "hips": [],
    "center": [],
}

# ======== helper functions ========= #
def too_still(center_positions, duration=15, still_threshold=15):
    """
    Return 1 if the user's body center has stayed nearly still for the past 15 seconds.
    Only triggers after 15s of data have accumulated.
    """
    now = time.time()
    # Only keep data within the last 'duration' seconds
    recent = [(x, y) for (x, y, t) in center_positions if now - t < duration]

    # If we don't have a full 15s window yet, skip detection
    if len(recent) < 2:
        return 0
    earliest_time = min(t for _, _, t in center_positions)
    if now - earliest_time < duration:
        return 0  # Not enough total time has passed yet

    xs = [x for x, _ in recent]
    ys = [y for _, y in recent]

    # Calculate total displacement of center within the window
    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    total_move = np.sqrt(dx**2 + dy**2)

    # Only return 1 if they’ve been nearly motionless for full duration
    return int(total_move < still_threshold)


def hip_sway(hip_positions, duration=2, threshold=20):
    """Return 1 if hips move a lot horizontally within duration."""
    if len(hip_positions) < 2:
        return 0
    xs = [x for (x, y, t) in hip_positions if time.time() - t < duration]
    if len(xs) < 2:
        return 0
    std_x = np.std(xs)
    return int(std_x > threshold)


def pacing(center_positions, duration=2, min_shift=40):
    """
    Return 1 if the user's body moves side-to-side once within the last 3 seconds.

    - duration: time window in seconds
    - min_shift: minimum horizontal distance (in pixels) to count as a real movement
    """
    # Get recent center positions
    recent = [(x, y) for (x, y, t) in center_positions if time.time() - t < duration]
    if len(recent) < 3:
        return 0

    xs = np.array([x for x, _ in recent])

    # Smooth tiny jitter using a simple moving average
    smooth_x = np.convolve(xs, np.ones(5) / 5, mode="valid")

    # Compute movement range and direction
    min_x, max_x = np.min(smooth_x), np.max(smooth_x)
    total_range = max_x - min_x

    # Check if there's a clear left→right or right→left pattern
    start_dir = np.sign(smooth_x[-1] - smooth_x[0])
    midpoint = smooth_x[len(smooth_x)//2]
    mid_dir = np.sign(midpoint - smooth_x[0])

    # If range is large enough and direction changes at least once → pacing
    direction_changed = (start_dir != mid_dir) and (mid_dir != 0)
    if total_range > min_shift and direction_changed:
        return 1
    return 0



def head_tilt(keypoints, sensitivity=1):
    """
    Return 1 if the head is tilted downward noticeably.
    - 'sensitivity' defines how much above the ear line eyes can be
       before we still consider it a tilt (fraction of ear distance).
    """
    try:
        left_eye = keypoints[1]
        right_eye = keypoints[2]
        left_ear = keypoints[3]
        right_ear = keypoints[4]
    except IndexError:
        return 0

    avg_eye_y = (left_eye[1] + right_eye[1]) / 2
    avg_ear_y = (left_ear[1] + right_ear[1]) / 2

    # Approximate ear-to-eye distance (for scaling)
    ear_dist = abs(avg_ear_y - avg_eye_y)
    # Add tolerance to catch slightly-above-ear positions
    threshold = ear_dist * sensitivity

    # Trigger if eyes are below OR within small margin above ear level
    return int(avg_eye_y > (avg_ear_y - threshold))

def hand_to_mouth(keypoints, scale_factor=0.6):
    """
    Return 1 if either hand is close to the user's head region.
    - Uses the average of head keypoints (nose, eyes, ears) as the 'head center'
    - Automatically scales threshold based on body size for sensitivity
    """
    try:
        # Head region points (rough estimate)
        head_points = [
            keypoints[0],  # nose
            keypoints[1],  # left eye
            keypoints[2],  # right eye
            keypoints[3],  # left ear
            keypoints[4],  # right ear
        ]
        left_hand = keypoints[9]   # left wrist
        right_hand = keypoints[10] # right wrist
        left_shoulder = keypoints[5]
        right_shoulder = keypoints[6]
    except IndexError:
        return 0

    def dist(a, b):
        return np.linalg.norm(np.array(a) - np.array(b))

    # Compute adaptive distance threshold (scaled by shoulder width)
    shoulder_dist = dist(left_shoulder, right_shoulder)
    threshold = shoulder_dist * scale_factor  # increases sensitivity with body size

    # Get head center
    head_center = np.mean(head_points, axis=0)

    # Compute distances
    left_dist = dist(left_hand, head_center)
    right_dist = dist(right_hand, head_center)

    # Return 1 if either hand is within the threshold distance
    if left_dist < threshold or right_dist < threshold:
        return 1
    return 0


# ============ main loop ============ #
last_eval = time.time()
duration = 2  # seconds

while True:
    ret, frame = camera.read()
    if not ret:
        break

    results = model.predict(frame, conf=0.7, verbose=False)
    annotated_frame = results[0].plot()

    # Extract first detected person keypoints
    if results[0].keypoints is not None and len(results[0].keypoints.xy) > 0:
        kpts = results[0].keypoints.xy[0].cpu().numpy()

        # mid hip and body center
        left_hip, right_hip = kpts[11], kpts[12]
        hips_mid = ((left_hip[0] + right_hip[0]) / 2, (left_hip[1] + right_hip[1]) / 2)
        shoulders_mid = ((kpts[5][0] + kpts[6][0]) / 2, (kpts[5][1] + kpts[6][1]) / 2)
        center = ((hips_mid[0] + shoulders_mid[0]) / 2, (hips_mid[1] + shoulders_mid[1]) / 2)

        # record with timestamps
        history["hips"].append((*hips_mid, time.time()))
        history["center"].append((*center, time.time()))

        # every 2 seconds evaluate
        if time.time() - last_eval >= duration:
            hipsway = hip_sway(history["hips"], duration)
            pace = pacing(history["center"], duration)
            tilt = head_tilt(kpts)
            handmouth = hand_to_mouth(kpts)
            still = too_still(history["center"], duration=15, still_threshold=15)
            
            output = {
                "hipsway": hipsway,
                "pacing": pace,
                "headtilt": tilt,
                "handtomouth": handmouth,
                "toostill": still
            }
            print(json.dumps(output))

            last_eval = time.time()

    cv2.imshow("YOLO Detection", annotated_frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

camera.release()
cv2.destroyAllWindows()
