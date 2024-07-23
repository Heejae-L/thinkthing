from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from model_handler import ModelHandler
import json

app = FastAPI()
model_handler = ModelHandler()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            if not data:
                await websocket.send_text("Received empty data")
                continue

            # 이미지 처리
            boxes_json, error = model_handler.process_image(data)
            if error:
                await websocket.send_text(error)
                continue

            # JSON 형태로 처리된 바운딩 박스 좌표 전송
            await websocket.send_text(boxes_json)  # 여기서 boxes_json은 JSON 문자열

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    finally:
        await websocket.close()
        print("WebSocket connection closed")
