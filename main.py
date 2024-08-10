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
musicxml_path = os.path.join(static_dir, "twinkle_twinkle.xml")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

def extract_pitches_and_durations(xml_path):
    try:
        tree = etree.parse(xml_path)
        notes_info = []
        for note in tree.xpath("//note"):
            pitch = note.find("pitch")
            if pitch is not None:
                step = pitch.findtext("step")
                octave = pitch.findtext("octave")
                duration = note.findtext("duration")
                notes_info.append(f"{step}{octave} (duration: {duration})")
        return notes_info
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

@app.get("/", response_class=HTMLResponse)
async def read_root():
    template_path = os.path.join(templates_dir, "index.html")
    
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Template file not found")
    
    notes_info = extract_pitches_and_durations(musicxml_path)
    notes_str = "<br>".join(notes_info)
    
    with open(template_path, 'r', encoding="utf-8") as f:
        html_content = f.read()
    
    html_content = html_content.replace("<!--NOTES-->", f"<p><strong>사용된 음계 및 지속 시간:</strong><br>{notes_str}</p>")
    
    return HTMLResponse(content=html_content)

'''
# 정적 파일 디렉토리 설정
@app.get("/", response_class=HTMLResponse)
async def read_root():
    template_path = os.path.join(templates_dir, "index.html")
    
    with open(template_path, 'r', encoding="utf-8") as f:
        html_content = f.read()
    
    return HTMLResponse(content=html_content)

'''
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
