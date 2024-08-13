const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const status = document.getElementById('status');
const distanceDisplay = document.getElementById('distance');
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

document.addEventListener("DOMContentLoaded", function() {
    const timestamp = new Date().getTime(); // 현재 시간을 가져와서 쿼리 파라미터로 사용
    fetch(`/static/twinkle_twinkle.xml?timestamp=${timestamp}`)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
        .then(data => {
            const notes = data.getElementsByTagName("note");
            let notesInfo = [];
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

        context.fillStyle = 'blue';
        context.font = '16px Arial';
        context.fillText(`ID: ${box.track_id}`, box.coordinates[0], box.coordinates[1] - 10);

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
}


