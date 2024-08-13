from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from lxml import etree
from model_handler import ModelHandler
import json
import uvicorn
import os 

app = FastAPI()
model_handler = ModelHandler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인에서의 접근을 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드를 허용
    allow_headers=["*"],  # 모든 헤더를 허용
)

current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
templates_dir = os.path.join(current_dir, "templates")
musicxml_path = os.path.join(static_dir, "adagio_in_g_minor.xml")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    template_path = os.path.join(templates_dir, "index.html")
    
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Template file not found")
    
    with open(template_path, 'r', encoding="utf-8") as f:
        html_content = f.read()
        
    return HTMLResponse(content=html_content)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            if not data:
                await websocket.send_text("Received empty data")
                continue

            boxes_json, error = model_handler.process_image(data)
            if error:
                await websocket.send_text(error)
                continue

            await websocket.send_text(boxes_json)

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error during websocket communication: {e}")
    finally:
        await websocket.close()
        print("WebSocket connection closed")
        

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)