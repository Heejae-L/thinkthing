const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const status = document.getElementById('status');
const distanceDisplay = document.getElementById('distance');
const trackIdDisplay = document.getElementById('trackIdDisplay')
const ws = new WebSocket('ws://localhost:8000/ws');

let hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
let recording = false;
let recordedNotes = [];

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

let handLandmarks = [];
let trackIdToNumber = {};
let audio = new Audio();
let lastPlayed = {};
let playingTrackId = null;
let notesInfo = [];


if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            video.srcObject = stream;
            streamVideoToServer();
        })
        .catch(function(error) {
            console.log("웹캠 접근에 실패했습니다:", error);
            status.textContent = "Error accessing webcam: " + error.message;
        });
}

function streamVideoToServer() {
    video.addEventListener('play', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg');
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

ws.onmessage = function(event) {
    let data;
    try {
        data = JSON.parse(event.data);
        console.log("Received data:", data);
    } catch (e) {
        console.error("Received non-JSON message:", event.data);
        status.textContent = "Error: Received non-JSON message.";
        return;
    }

    if (data.error) {
        status.textContent = data.error;
        return;
    }

    if (Array.isArray(data)) {
        const filteredData = data.filter(box => box.class !== 0);
        drawBoxes(filteredData);
        calculateAndDisplayDistances(filteredData);
    } else {
        status.textContent = "Unexpected message format";
    }
};

// 악보 정보 출력 
document.addEventListener("DOMContentLoaded", function() {
    const timestamp = new Date().getTime(); // 현재 시간을 가져와서 쿼리 파라미터로 사용
    fetch(`/static/twinkle_twinkle.xml?timestamp=${timestamp}`)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
        .then(data => {
            const notes = data.getElementsByTagName("note");
            for (let i = 0; i < notes.length; i++) {
                let pitch = notes[i].getElementsByTagName("pitch")[0];
                let duration = notes[i].getElementsByTagName("duration")[0];

                if (pitch && duration) {
                    let step = pitch.getElementsByTagName("step")[0].textContent;
                    let octave = pitch.getElementsByTagName("octave")[0].textContent;
                    let durationValue = duration.textContent;
                    notesInfo.push(`${step}${octave} (duration: ${durationValue})`);
                }
            }

            console.log(notesInfo.join("\n"));
        })
        .catch(error => console.error("Error loading XML file:", error));
});


function drawBoxes(boxes) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    boxes.forEach(box => {
        if (box.class == 0) return;

        console.log("Drawing box:", box);
        context.beginPath();
        context.rect(box.coordinates[0], box.coordinates[1], box.coordinates[2] - box.coordinates[0], box.coordinates[3] - box.coordinates[1]);
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.stroke();

        // track_id와 음계 정보를 표시하기 위한 텍스트 설정
        let displayText = `ID: ${box.track_id}`;
        if (trackIdToNumber[box.track_id]) {
            const assignedNote = trackIdToNumber[box.track_id];
            displayText += `, 음정: ${assignedNote}`;
        }

        context.fillStyle = 'blue';
        context.font = '16px Arial';
        context.fillText(displayText, box.coordinates[0], box.coordinates[1] - 10);

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



function onResults(results) {
    handLandmarks = [];
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            handLandmarks.push(landmarks);
            drawConnectors(context, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
            drawLandmarks(context, landmarks, {color: '#FF0000', lineWidth: 2});
        }
    }
    context.restore();
}

document.getElementById('startRecording').addEventListener('click', function() {
    recording = true;
    recordedNotes = [];  // Clear previous records if any
    console.log("Recording started");
});

document.getElementById('finishRecording').addEventListener('click', function() {
    recording = false;
    console.log("Recording stopped");
    console.log("Recorded Notes:", recordedNotes);
});

document.getElementById("scoreCalculating").addEventListener('click', function(){
    const accuracyScore = calculateAccuracyAndScore(recordedNotes, notesInfo);
    alert(`Accuracy Score: ${accuracyScore} / 100`);
})

// 트랙 ID와 음정을 표시하는 함수
function updateTrackIdDisplay() {
    let objectList = "";

    for (const trackId in trackIdToNumber) {
        if (trackIdToNumber.hasOwnProperty(trackId)) {
            objectList += `Track ID: ${trackId}, Note: ${trackIdToNumber[trackId]}<br>`;
        }
    }
    trackIdDisplay.innerHTML = objectList; // 정보를 trackIdDisplay에 표시
}


function calculateAndDisplayDistances(boxes) {
    let distanceInfo = "";
    let isHandCloseToBox = false;
    
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
                        if (!lastPlayed[trackId] || now - lastPlayed[trackId] > 1000) {
                            if (playingTrackId !== trackId) {
                                    playAndRecord(trackId, assignedNumber, now);
                            }
                        }
                        isHandCloseToBox = true;
                    }
                }
                distanceInfo += `Distance to object ${box.class}: ${Math.round(distance)}px<br>`;
            });
        });
    });
    
    if (!isHandCloseToBox && playingTrackId !== null) {
        const now = Date.now();
        const duration = now - lastPlayed[playingTrackId];
        recordedNotes.push({
            note: trackIdToNumber[playingTrackId], // Assuming it maps directly to the note played
            startTime: new Date(lastPlayed[playingTrackId]),
            duration: duration
        });
        audio.pause();
        audio.currentTime = 0;
        playingTrackId = null;
    }
    
    distanceDisplay.innerHTML = distanceInfo;
}
    
function playAndRecord(trackId, assignedNumber, startTime) {
    audio.src = `static/new_sound_files/${assignedNumber}.wav`;
    audio.play();
    playingTrackId = trackId;
    lastPlayed[trackId] = startTime;
}

function assignNumber() {
    const trackId = parseInt(document.getElementById("track-id").value);
    const assignedNumber = document.getElementById("sound-id").value;
    trackIdToNumber[trackId] = assignedNumber;
    alert(`Sound note ${assignedNumber} assigned to track ID ${trackId}`);

    updateTrackIdDisplay();
}


function calculateAccuracyAndScore(recordedNotes, notesInfo) {
    const pitchOrder = ['C4', 'Cs4', 'D4', 'Ds4', 'E4', 'F4', 'Fs4', 'G4', 'Gs4', 'A4', 'As4', 'B4', 'C5'];
    
    let totalWeight = 0;
    let totalScore = 0;

    console.error("Recorded Notes:", recordedNotes);
    console.error("Sheet Notes: ", notesInfo);

    for (let i = 0; i < recordedNotes.length; i++) {
        const recordedNote = recordedNotes[i]; // 연주한 노트
        const sheetNote = notesInfo[i]; // 악보 노트

        console.error(`Comparing Recorded Note ${i}:`, recordedNote);
        console.error(`With Sheet Note ${i}:`, sheetNote);

        // 음계 정확도 계산
        const recordedPitch = recordedNote.note;
        const sheetPitch = sheetNote.split(" ")[0]; // 악보의 음계 정보 추출
        
        // 음계 간 거리 계산
        const pitchDifference = Math.abs(pitchOrder.indexOf(recordedPitch) - pitchOrder.indexOf(sheetPitch));
        
        // 음계 거리에 따른 가중치 적용 (거리가 멀수록 점수 감소)
        const pitchWeight = 10;  // 음계에 대한 기본 가중치
        const pitchScore = Math.max(0, pitchWeight - pitchDifference * 2); // 거리가 1이면 2점 감소, 거리가 2면 4점 감소 등
        totalWeight += pitchWeight;
        totalScore += pitchScore;

        // 박자 정확도 계산
        const recordedDuration = recordedNote.duration;
        const sheetDuration = parseInt(sheetNote.match(/\d+/)[0], 10); // 악보의 duration 정보 추출
        
        const durationDifference = Math.abs(recordedDuration - sheetDuration);
        const durationWeight = 10;  // 박자에 대한 기본 가중치
        let durationScore;

        // 박자 차이에 따른 점수 감소
        if (durationDifference <= 30) {
            durationScore = durationWeight - (durationDifference / 30); // 0 ~ 30ms 차이에서 
        } else if (durationDifference <= 60) {
            durationScore = durationWeight - 2 - ((durationDifference - 30) / 30) ; // 30 ~ 60ms 차이에서
        } else if (durationDifference <= 90) {
            durationScore = durationWeight - 3 - ((durationDifference - 60) / 30) ; // 60 ~ 90ms 차이에서 
        } else if (durationDifference <= 110) {
            durationScore = durationWeight - 4 - ((durationDifference - 90) / 20) ; // 90 ~ 110ms 차이에서 
        } else {
            durationScore = 4; // 110ms 이상 차이는 0점
        }

        totalWeight += durationWeight;
        totalScore += Math.max(0, durationScore);

        console.error(`Pitch Score: ${pitchScore}, Duration Score: ${durationScore}`);
    }

    // 총점 계산 및 100점 만점으로 환산
    const accuracyScore = (totalScore / totalWeight) * 100;
    console.error(`Accuracy Score: ${accuracyScore.toFixed(2)} / 100`);
    return accuracyScore.toFixed(2);
}
