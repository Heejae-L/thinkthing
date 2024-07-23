import torch
import cv2
import base64
import numpy as np
import json

class ModelHandler:
    def __init__(self):
        self.model = torch.hub.load('ultralytics/yolov5', 'custom', path='/Users/LeeHeejae/projects/yolov5/runs/train/households_yolov5s_result/weights/best.pt')
        self.model.conf = 0.5

    def process_image(self, encoded_data):
        encoded_data = encoded_data.split(',')[1] if ',' in encoded_data else encoded_data
        frame = base64.b64decode(encoded_data)
        nparr = np.frombuffer(frame, np.uint8)

        if nparr.size == 0:
            return None, "No data in buffer"

        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None, "Failed to decode the image."

        results = self.model(img)

        # 결과에서 바운딩 박스 좌표 추출
        boxes = []
        for *xyxy, conf, cls in results.xyxy[0]:  # results.xyxy[0]에 바운딩 박스 정보가 있음
            box = {
                "coordinates": [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],  # xmin, ymin, xmax, ymax
                "confidence": float(conf),
                "class": int(cls)
            }
            boxes.append(box)

        return json.dumps(boxes), None
