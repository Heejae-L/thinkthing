import cv2
import base64
import numpy as np
import json
from collections import defaultdict
from ultralytics import YOLO
# from deep_sort_realtime.deepsort_tracker import DeepSort
# import tensorflow as tf

class ModelHandler:
    def __init__(self):
        self.model = YOLO("path/to/your/yolov10n.pt")  # 모델 경로를 변경
        self.model.conf = 0.8  # Confidence threshold 설정
        self.track_history = defaultdict(lambda: [])

    def process_image(self, encoded_data):
        encoded_data = encoded_data.split(',')[1] if ',' in encoded_data else encoded_data
        frame = base64.b64decode(encoded_data)
        nparr = np.frombuffer(frame, np.uint8)

        if nparr.size == 0:
            return json.dumps({"error": "No data in buffer"}), "No data in buffer"

        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return json.dumps({"error": "Failed to decode the image"}), "Failed to decode the image"

        try:
            results = self.model.track(img, persist=True)
        except Exception as e:
            return json.dumps({"error": str(e)}), str(e)

        if not results or len(results) == 0 or not results[0].boxes:
            return json.dumps({"error": "No detections"}), "No detections"
        
        boxes = []
        try:
            for result in results:
                for box, cls_id, track_id in zip(result.boxes.xywh.cpu(), result.boxes.cls.int().cpu().tolist(), result.boxes.id.int().cpu().tolist()):
                        
                    x, y, w, h = box
                    track = self.track_history[track_id]
                    track.append((float(x), float(y)))  # x, y center point
                    if len(track) > 30:  # retain 30 tracks for 30 frames
                        track.pop(0)

                    box_dict = {
                        "coordinates": [int(x - w/2), int(y - h/2), int(x + w/2), int(y + h/2)],
                        "confidence": float(result.boxes.conf[0]),
                        "class": cls_id,
                        "track_id": track_id,
                        "track_history": track
                    }
                    boxes.append(box_dict)
        except Exception as e:
            return json.dumps({"error": f"Error processing results: {str(e)}"}), f"Error processing results: {str(e)}"

        return json.dumps(boxes), None