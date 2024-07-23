import cv2
import base64
import numpy as np
import json
from ultralytics import YOLO

class ModelHandler:
    def __init__(self):
        self.model = YOLO("/Users/LeeHeejae/projects/thinkthing/yolov10n.pt")  # 모델 경로를 변경
        self.model.conf = 0.7  # Confidence threshold 설정

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
            results = self.model(img)
        except Exception as e:
            return json.dumps({"error": str(e)}), str(e)

        if not results or len(results) == 0:
            return json.dumps({"error": "No detections"}), "No detections"

        # 결과에서 바운딩 박스 좌표 추출
        boxes = []
        try:
            for result in results:
                for box in result.boxes:
                    xyxy = box.xyxy[0].tolist()  # xyxy 리스트의 첫 번째 요소를 변환
                    conf = box.conf
                    cls = box.cls
                    box_dict = {
                        "coordinates": [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],
                        "confidence": float(conf),
                        "class": int(cls)
                    }
                    boxes.append(box_dict)
        except Exception as e:
            return json.dumps({"error": f"Error processing results: {str(e)}"}), f"Error processing results: {str(e)}"

        return json.dumps(boxes), None