const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const status = document.getElementById('status');
const distanceDisplay = document.getElementById('distance');
const ws = new WebSocket('ws://localhost:8000/ws');

let hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

let handLandmarks = [];
let trackIdToNumber = {};  // 트랙 ID에 할당된 숫자
let audio = new Audio();
let lastPlayed = {};  // 각 트랙 ID의 마지막 재생 시간을 저장할 객체
let playingTrackId = null;  // 현재 재생 중인 트랙 ID

/* 웹캠에서 비디오 스크림 가져오기 */
if (navigator.mediaDevices.getUserMedia) {  /* 웹캠을 지원하는 디바이스인지 확인*/
    navigator.mediaDevices.getUserMedia({ video: true }) /* 웹캠을 요청*/
        .then(function(stream) { /*stream : 웹캠에서 받아온 비디오 스트림 */
            video.srcObject = stream;
            streamVideoToServer();
        })
        .catch(function(error) {
            console.log("웹캠 접근에 실패했습니다:", error);
        });
}

/* 웹캠 비디오 스트림이 유요한 데이터를 가지고 있으면 서버로 전송 */
/* mediapipe를 사용해서 hands의 위치를 탐지하여 서버로 전송 */
function streamVideoToServer() {  /* 비디오 스트림을 서버로 전송 */
    video.addEventListener('play', () => { 
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) { // 비디오에 충분한 데이터가 있을 때만 서버로 전송함 
                context.drawImage(video, 0, 0, canvas.width, canvas.height);//캔버스에 현재 프레임을 캡쳐함 */
                const imageData = canvas.toDataURL('image/jpeg'); /* 이미지 형식을 url로 변경*/
                if (imageData.length > 23) {
                    ws.send(imageData);
                    hands.send({image: video});
                } else {
                    console.log('데이터가 비어 있습니다.');
                }
            }
        }, 300);
    });
}

/* webSocket을 통해 서버로부터 메시지를 수신하고 처리 */
ws.onmessage = function(event) {// webSocket을 통해 서버로부터 메시지를 수신하고 처리 */
    let data;
    try {
        data = JSON.parse(event.data);  //json 형태로 파싱
        console.log("Received data:", data);  // 수신된 데이터 출력
    } catch (e) {
        console.error("Received non-JSON message:", event.data);
        status.textContent = "Error: Received non-JSON message.";
        return;
    }

    if (data.error) {
        status.textContent = data.error;
        return;
    }

    if (Array.isArray(data)) {  // 좌표 데이터가 배열 형태로 제공된 경우
        const filteredData = data.filter(box => box.class !== 0);  // person 클래스 제외
        drawBoxes(filteredData);
        calculateAndDisplayDistances(filteredData); //손과 객체간의 거리 계산 
    } else {
        status.textContent = "Unexpected message format";
    }
};

// 인지한 객체 바운딩 박스 그리기 
function drawBoxes(boxes) {
    context.clearRect(0, 0, canvas.width, canvas.height);  // 이전 프레임의 그림 삭제
    context.drawImage(video, 0, 0, canvas.width, canvas.height);  // 현재 비디오 프레임 그리기
    boxes.forEach(box => {
        if (box.class ==0){
            return 
        }

        console.log("Drawing box:", box);  // 그릴 박스 정보 출력
        context.beginPath();
        context.rect(box.coordinates[0], box.coordinates[1], box.coordinates[2] - box.coordinates[0], box.coordinates[3] - box.coordinates[1]);
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.stroke();

        // Draw tracking ID
        context.fillStyle = 'blue';
        context.font = '16px Arial';
        context.fillText(`ID: ${box.track_id}`, box.coordinates[0], box.coordinates[1] - 10);

        // Draw tracking lines
        if (box.track_history && box.track_history.length > 1) {
            context.beginPath();
            context.moveTo(box.track_history[0][0], box.track_history[0][1]);
            for (let i = 1; i < box.track_history.length; i++) {
                context.lineTo(box.track_history[i][0], box.track_history[i][1]);
            }
            context.strokeStyle = 'blue';
            context.lineWidth = 2;
            context.stroke();
        }
    });
}

// 인식한 손 객체를 비디오 상에 출력함 
function onResults(results) { //result : 인식한 손 객체 
    handLandmarks = [];
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);   // 이전 프레임의 그림 삭제
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height); // 현재 비디오 프레임 그리기
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) { 
            handLandmarks.push(landmarks); // 각 손의 랜드마크를 handLandmarks 배열에 추가 
            drawConnectors(context, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
            drawLandmarks(context, landmarks, {color: '#FF0000', lineWidth: 2});
        }
    }
    context.restore();
}

function calculateAndDisplayDistances(boxes) {
    let distanceInfo = "";
    let isHandCloseToBox = false;  // 손이 박스에 가까이 있는지 여부를 확인하는 플래그

    handLandmarks.forEach(hand => {
        hand.forEach(lm => {
            let handX = lm.x * canvas.width;
            let handY = lm.y * canvas.height;
            boxes.forEach(box => {
                let boxCenterX = (box.coordinates[0] + box.coordinates[2]) / 2;
                let boxCenterY = (box.coordinates[1] + box.coordinates[3]) / 2;
                let distance = Math.sqrt(Math.pow(handX - boxCenterX, 2) + Math.pow(handY - boxCenterY, 2));
                if (distance <= 200) {
                    const now = Date.now();
                    const trackId = box.track_id;
                    const assignedNumber = trackIdToNumber[trackId];
                    if (assignedNumber) {
                        if (!lastPlayed[trackId] || now - lastPlayed[trackId] > 1000) { // 1초 이상 지났는지 확인
                            if (playingTrackId !== trackId) {  // 현재 재생 중인 트랙 ID가 다른 경우
                                audio.src = `/Users/two_jyy/project_openSW/thinkthing/new_sound_files/stretched_audio_${assignedNumber}.wav`;
                                audio.play();
                                playingTrackId = trackId;
                                lastPlayed[trackId] = now; // 마지막 재생 시간 업데이트
                            }
                        }
                        isHandCloseToBox = true;  // 손이 박스에 가까이 있음
                    }
                }
                distanceInfo += `Distance to object ${box.class}: ${Math.round(distance)}px<br>`;
            });
        });
    });

    if (!isHandCloseToBox && playingTrackId !== null) {  // 손이 박스에서 멀어졌고 현재 재생 중인 오디오가 있는 경우
        audio.pause();
        audio.currentTime = 0;  // 오디오 재생 위치를 처음으로 이동
        playingTrackId = null;
    }

    distanceDisplay.innerHTML = distanceInfo;
}

function assignNumber() {
    const trackId = parseInt(document.getElementById("track-id").value);
    const assignedNumber = parseInt(document.getElementById("sound-id").value);
    trackIdToNumber[trackId] = assignedNumber;
    alert(`Sound note assigned to track ID ${trackId}`);
}
