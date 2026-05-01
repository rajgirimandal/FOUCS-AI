// =====================
// ATTENDANCE SYSTEM
// =====================
let students = []; // Data will now be fetched from DB
let attendance = {};
let attendanceChartInstance = null; // Store chart instance to prevent duplicates

function updateAttendanceTable() {
    let html = `
        <table border="1" style="width:100%; text-align:center; margin-top: 10px;">
            <tr>
                <th style="padding: 5px; border-bottom: 1px solid #ccc;">Name</th>
                <th style="padding: 5px; border-bottom: 1px solid #ccc;">Roll No</th>
                <th style="padding: 5px; border-bottom: 1px solid #ccc;">Status</th>
            </tr>
    `;

    students.forEach(student => {
        let status = attendance[student.name] ? "✔ Present" : "❌ Absent";
        let color = attendance[student.name] ? "green" : "red";

        html += `
            <tr>
                <td style="padding: 5px; border-bottom: 1px solid #eee;">${student.name}</td>
                <td style="padding: 5px; border-bottom: 1px solid #eee;">${student.roll}</td>
                <td style="padding: 5px; border-bottom: 1px solid #eee; font-weight: bold; color:${color}">${status}</td>
            </tr>
        `;
    });

    html += "</table>";

    const tableDiv = document.getElementById("attendanceTable");
    if (tableDiv) tableDiv.innerHTML = html;

    // Update the chart whenever the table updates
    renderChart();
}

function showSummary() {
    let present = Object.keys(attendance).length;
    let total = students.length;

    const summaryDiv = document.getElementById("attendanceSummary");
    if (summaryDiv) {
        summaryDiv.innerHTML = `<div class="text-sm font-bold mt-2 p-2 bg-slate-100 rounded text-center">Present: ${present} / ${total}</div>`;
    }
}

// =====================
// CHART SYSTEM (PIE CHART)
// =====================
function renderChart() {
    const present = Object.keys(attendance).length;
    const absent = students.length - present;
    const ctx = document.getElementById("attendanceChart");

    if (!ctx) return; // Failsafe if canvas is missing in HTML

    // Destroy old chart instance before drawing a new one to prevent glitching
    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }

    attendanceChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Present", "Absent"],
            datasets: [{
                data: [present, absent],
                backgroundColor: ["#22c55e", "#ef4444"] // Green & Red
            }]
        }
    });
}

// =====================
// REAL BACKEND TRIGGER (FACE REC & EXCEL)
// =====================
function startAttendance() {
    // 1. Get the token from session storage
    const token = sessionStorage.getItem("focusai_token");

    if (!token) {
        alert("Please log in first!");
        return;
    }

    alert("Starting official AI Face Recognition. Please wait...");

    // 2. Call the backend URL to trigger Python CV (Face Recognition & Excel Save)
    fetch('http://localhost:5000/start-attendance', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
    .then(data => {
        // Assuming backend returns { status: "success", present_students: ["Rajgiri", "Elon"] }
        alert("Attendance Complete! Data saved to Excel.");
        
        // Update local state with real data from backend
        attendance = {};
        if (data.present_students) {
            data.present_students.forEach(name => {
                attendance[name] = "Present";
            });
        }
        
        updateAttendanceTable();
        showSummary();
    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert("Failed to connect to the backend server.");
    });
}

// =====================
// GLOBAL ELEMENTS / STATE
// =====================
const splashScreen   = document.getElementById('splash-screen');
const modeSelection  = document.getElementById('modeSelection');
const classApp       = document.getElementById('classApp');
const examApp        = document.getElementById('examApp');
const studentsView   = document.getElementById('studentsView');
const settingsView   = document.getElementById('settingsView');
const mainMenu       = document.getElementById('mainMenu');
const alarmSound     = document.getElementById('alarmSound');

let currentTheme = 'light';
let currentMode  = null;

// =====================
// INITIAL SETUP
// =====================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        modeSelection.classList.remove('hidden');
    }, 3000);

    const themeSelect   = document.getElementById('themeSelect');
    const fontSizeRange = document.getElementById('fontSizeRange');

    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
        });
    }

    if (fontSizeRange) {
        fontSizeRange.addEventListener('input', (e) => {
            applyFontSize(e.target.value);
        });
        applyFontSize(fontSizeRange.value);
    }

    // Load real students on startup
    loadStudents();
});

// =====================
// NAVIGATION & VIEWS
// =====================
function toggleMainMenu() {
    mainMenu.classList.toggle('hidden');
}
function closeMainMenu() {
    mainMenu.classList.add('hidden');
}

function hideAllViews() {
    modeSelection.classList.add('hidden');
    classApp.classList.add('hidden');
    examApp.classList.add('hidden');
    studentsView.classList.add('hidden');
    settingsView.classList.add('hidden');
}

function goHome() {
    if (isRunning) stopSystem();
    stopExamSystem();
    hideAllViews();
    modeSelection.classList.remove('hidden');
    closeMainMenu();
}

async function openStudents() {
    if (isRunning) stopSystem();
    stopExamSystem();
    hideAllViews();
    studentsView.classList.remove('hidden');
    await loadStudents();
    closeMainMenu();
}

function openSettings() {
    hideAllViews();
    settingsView.classList.remove('hidden');
    closeMainMenu();
}

function selectMode(mode) {
    hideAllViews();
    if (mode === 'class') {
        classApp.classList.remove('hidden');
        currentMode = 'class';
    } else if (mode === 'exam') {
        examApp.classList.remove('hidden');
        currentMode = 'exam';
        initExamSystem();
    }
    closeMainMenu();
}

function openLibrary() {
    hideAllViews();
    document.getElementById("libraryView").classList.remove("hidden");
    closeMainMenu();
}

// =====================
// THEME & FONT
// =====================
function applyTheme(theme) {
    currentTheme = theme;
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && themeSelect.value !== theme) {
        themeSelect.value = theme;
    }
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function applyFontSize(percent) {
    document.documentElement.style.fontSize = percent + '%';
    const fontSizeValue = document.getElementById('fontSizeValue');
    if (fontSizeValue) {
        fontSizeValue.innerText = percent + '%';
    }
}

// =====================
// CLASS MODE (FOCUS & POSE TRACKING)
// =====================
let detector;
let studentStates = {};
let distractionTimers = {};
let isRunning = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let videoStream = null; // Clean video stream for detection
let audioStream = null; // Separate audio stream

let assignedNames = {};
let usedNames = new Set();

// --- NEW AUDIO VARS FOR CLASS MODE ---
let classAudioContext, classAnalyser, classMicrophone, classAudioDataArray;
let classNoiseActive = false;
// -------------------------------------

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const initBtn = document.getElementById('initBtn');
const recordStatus = document.getElementById('recordStatus');
const recordText = document.getElementById('recordText');

const countDisplay = document.getElementById('countDisplay');
const focusDisplay = document.getElementById('focusDisplay');
const senseSlider  = document.getElementById('sensitivity');
const senseVal     = document.getElementById('senseVal');

let STRICTNESS_THRESHOLD = 0.5;

if(senseSlider) {
    senseSlider.oninput = (e) => {
        STRICTNESS_THRESHOLD = e.target.value / 100;
        if(senseVal) senseVal.innerText = e.target.value + "%";
    };
}

async function toggleSystem() {
    if (!isRunning) {
        await initSystem();
    } else {
        stopSystem();
    }
}

async function initSystem() {
    loader.classList.remove("hidden");
    initBtn.disabled = true;

    try {
        await tf.ready();
        await tf.setBackend('webgl');

        // Step 1: Keep detection stream CLEAN (video only)
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false 
        });

        // Step 2 & 4: Separate audio stream for recording and noise monitoring
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true 
        });

        video.srcObject = videoStream;
        await new Promise(res => video.onloadedmetadata = res);
        video.play();

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;

        // Initialize Real-time Sound Detection
        classAudioContext = new window.AudioContext();
        classAnalyser = classAudioContext.createAnalyser();
        classMicrophone = classAudioContext.createMediaStreamSource(audioStream);
        classMicrophone.connect(classAnalyser);
        classAudioDataArray = new Uint8Array(classAnalyser.frequencyBinCount);
        classNoiseActive = true;
        detectClassSound(); // Start the audio loop

        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
                enableSmoothing: true,
                minPoseScore: 0.25
            }
        );

        loader.classList.add("hidden");
        isRunning = true;

        initBtn.disabled = false;
        initBtn.innerText = "STOP SYSTEM";
        initBtn.classList.remove("bg-yellow-400", "hover:bg-yellow-300", "text-black");
        initBtn.classList.add("bg-red-600", "hover:bg-red-500", "text-white");

        startRecording();
        renderLoop();

    } catch (err) {
        // Graceful error handling for denied permissions
        console.error("Device access error:", err);
        alert("Microphone or Camera access denied/unavailable. Please grant permissions in your browser to start the system.");
        loader.classList.add("hidden");
        initBtn.disabled = false;
    }
}

function stopSystem() {
    isRunning = false;
    classNoiseActive = false; // Stop the audio loop

    if (isRecording && mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        videoStream = null;
    }

    if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
    }

    if (classAudioContext && classAudioContext.state !== 'closed') {
        classAudioContext.close();
    }

    initBtn.innerText = "START SYSTEM";
    initBtn.classList.remove("bg-red-600", "hover:bg-red-500", "text-white");
    initBtn.classList.add("bg-yellow-400", "hover:bg-yellow-300", "text-black");

    recordStatus.classList.add("hidden");
    recordStatus.classList.remove("recording-status");
    recordText.classList.add("hidden");
}

// The noise detection loop for Class Mode
function detectClassSound() {
    if (!classNoiseActive || !isRunning) return;
    
    classAnalyser.getByteFrequencyData(classAudioDataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < classAudioDataArray.length; i++) {
        sum += classAudioDataArray[i];
    }
    let volume = sum / classAudioDataArray.length;

    // Threshold can be tweaked based on hardware sensitivity
    if (volume > 50) {
        console.log("Class Mode: Talking detected! Volume:", volume.toFixed(2));
        // Optional: Tie this into the alert system or UI later
    }

    requestAnimationFrame(detectClassSound);
}

async function renderLoop() {
    if (!isRunning) return;

    const poses = await detector.estimatePoses(video, {
        maxPoses: 20,
        flipHorizontal: false
    });

    drawResults(poses);
    requestAnimationFrame(renderLoop);
}

function drawResults(poses) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let total = 0;
    let totalScore = 0;
    
    let focusedCount = 0;
    let distractedCount = 0;        
    let alertCount = 0;

    poses.forEach(pose => {
        if (pose.score < 0.25) return;
        total++;

        const nose = pose.keypoints.find(k => k.name === "nose");
        const ls   = pose.keypoints.find(k => k.name === "left_shoulder");
        const rs   = pose.keypoints.find(k => k.name === "right_shoulder");
        if (!nose || !ls || !rs) return;

        // Note: Real face recognition runs in backend via Python now.
        // This is solely for attaching focus/distraction metrics to dynamic IDs on screen.
        const sId = Math.round(nose.x / 60);
        
        if (!assignedNames[sId]) {
            let knownNames = students.map(s => s.name);
            let available = knownNames.filter(n => !usedNames.has(n));

            if (available.length > 0) {
                let name = available[0]; 
                assignedNames[sId] = name;
                usedNames.add(name);
            } else {
                assignedNames[sId] = "Unknown";
            }
        }

        let personName = assignedNames[sId];

        if (!studentStates[sId]) {
            studentStates[sId] = {
                score: 100,
                risk: 0,
                reason: "Focused",
                alerted: false,
                lastUpdate: 0
            }
        }

        let state = studentStates[sId];
        const center = (ls.x + rs.x) / 2;
        const width  = Math.abs(ls.x - rs.x);

        let focused = false;
        if (nose && width > 0) {
            const offset = Math.abs(nose.x - center);
            const allowed = width * (1 - STRICTNESS_THRESHOLD);
            if (offset < allowed) focused = true;
        }

        if (focused) focusedCount++;
        else distractedCount++;

        if (!focused) {
            if (!distractionTimers[sId]) {
                distractionTimers[sId] = Date.now();
            }
            const duration = Date.now() - distractionTimers[sId];
            if (duration > 1500) {
                state.risk += 2;
            }
        } else {
            distractionTimers[sId] = null;
        }

        if (Date.now() - state.lastUpdate > 500) {
            if (focused) {
                state.score += 1;
                state.risk -= 1;
            } else {
                state.score -= 2;
                state.risk += 2;
            }
            state.lastUpdate = Date.now();
        }

        state.score = Math.max(0, Math.min(100, state.score));
        state.risk  = Math.max(0, Math.min(100, state.risk));
        
        if (state.risk > 70) alertCount++;

        if (currentMode === 'exam' && state.risk > 70 && !state.alerted) {
            if (alarmSound) alarmSound.play();
            document.body.classList.add("phone-alert-border");
            setTimeout(() => { document.body.classList.remove("phone-alert-border"); }, 500);

            const alertBanner = document.getElementById("alertBanner");
            if (alertBanner) {
                alertBanner.classList.remove("hidden");
                setTimeout(() => { alertBanner.classList.add("hidden"); }, 1500);
            }
            state.alerted = true;
        }
        if (state.risk < 40) {
            state.alerted = false;
        }

        if (!focused) state.reason = "DISTRACTED";
        else state.reason = "Focused";

        totalScore += state.score;
        
        let color = "#00ff88"; 
        let glow = 20;

        if (state.score < 70) { color = "#ea580c"; glow = 15; }
        if (state.score < 40) { color = "red"; glow = 30; }

        if (nose) {
            if (currentMode === 'exam') {
                ctx.shadowColor = color;
                ctx.shadowBlur = glow;
                ctx.strokeStyle = color;
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#2fd10f"; 
                color = "#0ddb22"; 
            }

            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(nose.x, nose.y, 40, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.shadowBlur = 0; 

            if (currentMode === 'exam' && state.risk > 70) {
                ctx.fillStyle = "red";
                ctx.font = "bold 16px Arial";
                ctx.fillText("⚠ CHEATING ALERT", nose.x - 60, nose.y - 100);
            }

            ctx.fillStyle = color;
            ctx.font = "bold 14px Arial";
            ctx.fillText(personName, nose.x - 40, nose.y - 80);
            ctx.fillText(`F:${Math.round(state.score)}%`, nose.x - 30, nose.y - 65);

            ctx.fillStyle = "red";
            ctx.fillText(`R:${Math.round(state.risk)}`, nose.x - 30, nose.y - 50);

            ctx.fillStyle = "yellow";
            ctx.fillText(state.reason, nose.x - 30, nose.y - 35);
        }

        if (ls && rs) {
            if (currentMode === 'exam') {
                ctx.shadowColor = color;
                ctx.shadowBlur = glow;
                ctx.strokeStyle = color;
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#2563eb"; 
            }

            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(ls.x, ls.y);
            ctx.lineTo(rs.x, rs.y);
            ctx.stroke();
            
            ctx.shadowBlur = 0; 
        }
    });

    if(countDisplay) countDisplay.innerText = total;
    const pct = total > 0 ? Math.round(totalScore / total) : 0;
    if(focusDisplay) {
        focusDisplay.innerText = pct + "%";
        if (pct > 80) focusDisplay.className = "text-2xl font-bold focused-text";
        else if (pct > 50) focusDisplay.className = "text-2xl font-bold warning-text";
        else focusDisplay.className = "text-2xl font-bold danger-text";
    }
    
    const totalStudentsEl = document.getElementById("totalStudents");
    const focusedCountEl = document.getElementById("focusedCount");
    const distractedCountEl = document.getElementById("distractedCount");
    const alertCountEl = document.getElementById("alertCount");
    
    if (totalStudentsEl) totalStudentsEl.innerText = total;
    if (focusedCountEl) focusedCountEl.innerText = focusedCount;
    if (distractedCountEl) distractedCountEl.innerText = distractedCount;
    if (alertCountEl) alertCountEl.innerText = alertCount;
}

// -------- CLASS RECORDING ----------
function startRecording() {
    if (!videoStream || !audioStream) return;
    try {
        recordedChunks = [];
        
        // Step 4: Merge canvas + audio 
        const canvasStream = canvas.captureStream(30);
        
        // Merge canvas video tracks with the audio tracks from our dedicated audio stream
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks() 
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            isRecording = false;
            if (recordedChunks.length > 0) {
                const shouldDownload = confirm("Do you want to download the recorded video for this session?");
                if (shouldDownload) {
                    saveRecording();
                } else {
                    recordedChunks = [];
                }
            }
        };

        mediaRecorder.start();
        isRecording = true;

        recordStatus.classList.remove("hidden");
        recordStatus.classList.add("recording-status");
        recordText.classList.remove("hidden");
    } catch (err) {
        alert("Error starting recording: " + err.message);
    }
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `focusai-class-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

window.addEventListener("beforeunload", () => {
    if (isRecording && mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
});


// ==========================================
// EXAM MODE (DUAL CAMERA: FLOOR & CEILING)
// ==========================================
let examStreamFront = null;
let examStreamCeiling = null;
let examIsRunning = false;
let examDetector = null;

const examVideoFront = document.getElementById('examVideoFront');
const examVideoCeiling = document.getElementById('examVideoCeiling');
const examCanvasFront = document.getElementById('examCanvasFront');
const examCanvasCeiling = document.getElementById('examCanvasCeiling');

let ctxFront = null;
let ctxCeiling = null;

const examLoader = document.getElementById('examLoader');
const examTotalDisplay   = document.getElementById('examTotalDisplay');
const examSuspectDisplay = document.getElementById('examSuspectDisplay');
const examStatusText     = document.getElementById('examStatusText');

let processCeilingFrame = false;

let handDetector = null;
let detectedHands = [];

async function initHands() {
    if (handDetector) return;
    handDetector = new window.Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    handDetector.setOptions({
        maxNumHands: 4,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    handDetector.onResults(res => {
        detectedHands = res.multiHandLandmarks || [];
    });
}

function runHands() {
    if (!handDetector || !examVideoFront) return;
    handDetector.send({ image: examVideoFront });
}

let audioContext, analyser, microphone, audioDataArray;
let noiseActive = false;
let noiseThreshold = 0.18;
let noiseSuspicionCooldown = false;
let lastAvgVolume = 0;

function startNoiseMonitoring() {
    if (noiseActive) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioContext = new window.AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 512;
        audioDataArray = new Uint8Array(analyser.frequencyBinCount);
        microphone.connect(analyser);

        noiseActive = true;
        monitorNoise();
    }).catch(err => console.warn("Mic access blocked:", err.message));
}

function monitorNoise() {
    if (!noiseActive) return;
    analyser.getByteFrequencyData(audioDataArray);

    let sum = 0;
    for (let i = 0; i < audioDataArray.length; i++) sum += audioDataArray[i];
    const avgVolume = sum / audioDataArray.length / 255;
    lastAvgVolume = avgVolume;

    if (avgVolume > noiseThreshold && !noiseSuspicionCooldown) {
        if(examStatusText) {
            examStatusText.innerText = "Talking / whisper detected 🎤";
            examStatusText.style.color = "#dc2626";
            setTimeout(() => examStatusText.style.color = "#475569", 2000);
        }
        noiseSuspicionCooldown = true;
        setTimeout(() => { noiseSuspicionCooldown = false; }, 3000);
    }
    requestAnimationFrame(monitorNoise);
}

let cheatPoints = [];
let heatDecayTime = 20000; 

function drawHeatmap(targetCtx) {
    if (!targetCtx) return;
    const now = Date.now();
    cheatPoints = cheatPoints.filter(p => now - p.time < heatDecayTime);

    cheatPoints.forEach(p => {
        const age   = (now - p.time) / heatDecayTime;
        const alpha = 1 - age;
        targetCtx.beginPath();
        targetCtx.arc(p.x, p.y, 60, 0, Math.PI * 2);
        targetCtx.fillStyle = `rgba(255,0,0,${alpha * 0.4})`;
        targetCtx.fill();
    });
}

let examRecorder;
let examChunks = [];
let clipBuffer = [];
let bufferTime = 5000;
let lastClipSaved = 0;
let clipCooldown = 7000;

function startExamRecording() {
    if (!examStreamFront) return;
    examChunks = [];
    examRecorder = new MediaRecorder(examStreamFront, { mimeType: "video/webm;codecs=vp9" });

    examRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
            examChunks.push(e.data);
            clipBuffer.push({ data: e.data, time: Date.now() });
            clipBuffer = clipBuffer.filter(f => Date.now() - f.time < bufferTime);
        }
    };

    examRecorder.start(200);
}

function stopExamRecording() {
    if (examRecorder && examRecorder.state !== "inactive") {
        examRecorder.stop();
    }
}

function saveEvidenceClip() {
    const now = Date.now();
    if (now - lastClipSaved < clipCooldown) return;
    lastClipSaved = now;

    if (clipBuffer.length === 0) return;

    const clipData = clipBuffer.map(f => f.data);
    const blob = new Blob(clipData, { type: "video/webm" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `cheatEvidence_Front_${timestamp}.webm`;
    a.click();
}

let timelineData = [];
let lastRecordTime = Date.now();

let phoneDetector = null;
let lastPhoneAlert = 0;
let phoneAlertCooldown = 4000;
let lastCheatSnapshotTime = 0;
const cheatSnapshotCooldown = 5000;

async function initExamSystem() {
    if (examIsRunning) return;
    
    if (examCanvasFront) ctxFront = examCanvasFront.getContext('2d');
    if (examCanvasCeiling) ctxCeiling = examCanvasCeiling.getContext('2d');

    const setupPanel = document.getElementById('examSetupPanel');
    const dualContainer = document.getElementById('dualVideoContainer');
    
    if (setupPanel) setupPanel.classList.remove('hidden');
    if (dualContainer) dualContainer.classList.add('hidden');
    
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        const frontSelect = document.getElementById('frontCamSelect');
        const ceilingSelect = document.getElementById('ceilingCamSelect');
        
        if (frontSelect && ceilingSelect) {
            frontSelect.innerHTML = '';
            ceilingSelect.innerHTML = '';
            
            videoDevices.forEach((device, index) => {
                const label = device.label || `Camera ${index + 1}`;
                frontSelect.innerHTML += `<option value="${device.deviceId}">${label}</option>`;
                ceilingSelect.innerHTML += `<option value="${device.deviceId}">${label}</option>`;
            });
            
            if (videoDevices.length > 1) {
                ceilingSelect.selectedIndex = 1;
            }
        }
    } catch (err) {
        alert("Camera access is required to setup dual monitoring: " + err.message);
    }
}

async function startDualExamCameras() {
    const frontCamId = document.getElementById('frontCamSelect').value;
    const ceilingCamId = document.getElementById('ceilingCamSelect').value;
    
    document.getElementById('examSetupPanel').classList.add('hidden');
    document.getElementById('dualVideoContainer').classList.remove('hidden');
    examLoader.classList.remove('hidden');

    try {
        await tf.ready();
        await tf.setBackend('webgl');

        examStreamFront = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: frontCamId }, width: 1280, height: 720 }
        });
        examVideoFront.srcObject = examStreamFront;
        await new Promise(res => examVideoFront.onloadedmetadata = res);
        await examVideoFront.play();
        examCanvasFront.width = examVideoFront.videoWidth;
        examCanvasFront.height = examVideoFront.videoHeight;

        examStreamCeiling = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: ceilingCamId }, width: 1280, height: 720 }
        });
        examVideoCeiling.srcObject = examStreamCeiling;
        await new Promise(res => examVideoCeiling.onloadedmetadata = res);
        await examVideoCeiling.play();
        examCanvasCeiling.width = examVideoCeiling.videoWidth;
        examCanvasCeiling.height = examVideoCeiling.videoHeight;

        examDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING, enableSmoothing: true }
        );
        phoneDetector = await cocoSsd.load();
        
        await initHands();
        startNoiseMonitoring();
        startExamRecording();

        examLoader.classList.add('hidden');
        examIsRunning = true;
        if(examStatusText) examStatusText.innerText = "Dual AI running · Floor & Ceiling Active.";

        examRenderLoop();

    } catch (err) {
        alert("Error starting dual cameras or AI: " + err.message);
        examLoader.classList.add('hidden');
    }
}

async function examRenderLoop() {
    if (!examIsRunning || !examDetector) return;

    if (ctxFront && examVideoFront) {
        ctxFront.clearRect(0, 0, examCanvasFront.width, examCanvasFront.height);
        ctxFront.drawImage(examVideoFront, 0, 0, examCanvasFront.width, examCanvasFront.height);
        ctxFront.fillStyle = "rgba(0,0,0,0.25)";
        ctxFront.fillRect(0, 0, examCanvasFront.width, examCanvasFront.height);

        runHands();
        const poses = await examDetector.estimatePoses(examVideoFront, { maxPoses: 30, flipHorizontal: false });
        drawExamResults(poses, ctxFront);
    }

    if (ctxCeiling && examVideoCeiling) {
        ctxCeiling.clearRect(0, 0, examCanvasCeiling.width, examCanvasCeiling.height);
        ctxCeiling.drawImage(examVideoCeiling, 0, 0, examCanvasCeiling.width, examCanvasCeiling.height);
    }

    if (processCeilingFrame && examVideoCeiling && ctxCeiling) {
        await detectCheatObjects(examVideoCeiling, ctxCeiling, "Ceiling");
    } else if (examVideoFront && ctxFront) {
        await detectCheatObjects(examVideoFront, ctxFront, "Front");
    }
    processCeilingFrame = !processCeilingFrame;

    requestAnimationFrame(examRenderLoop);
}

function analyzeGesture() {
    let suspicious = false;
    detectedHands.forEach(hand => {
        const wrist = hand[0];
        const thumb = hand[4];
        const pinky = hand[20];
        const palmWidth = Math.abs(thumb.x - pinky.x);
        const isLow     = wrist.y > 0.65;
        if (palmWidth < 0.05 && isLow) {
            suspicious = true;
        }
    });
    return suspicious;
}

function drawExamResults(poses, targetCtx) {
    if (!targetCtx) return;
    let total    = 0;
    let suspects = 0;

    poses.forEach(pose => {
        if (pose.score < 0.10) return;
        total++;

        const nose = pose.keypoints.find(k => k.name === "nose");
        const ls   = pose.keypoints.find(k => k.name === "left_shoulder");
        const rs   = pose.keypoints.find(k => k.name === "right_shoulder");

        if (!nose || !ls || !rs) return;
        if (nose.score < 0.25 || ls.score < 0.25 || rs.score < 0.25) return;

        const centerX        = (ls.x + rs.x) / 2;
        const shouldersWidth = Math.abs(ls.x - rs.x) || 1;
        const headOffsetX    = Math.abs(nose.x - centerX);
        const headTurnRatio  = headOffsetX / shouldersWidth;

        const shouldersY     = (ls.y + rs.y) / 2;
        const headDownOffset = nose.y - shouldersY;
        const headDownRatio  = headDownOffset / (shouldersWidth * 1.2);

        let suspicionScore = 0;

        if (headTurnRatio > 0.20) suspicionScore += 1;
        if (headTurnRatio > 0.30) suspicionScore += 1;
        if (headDownRatio > 0.15) suspicionScore += 1;
        if (headDownRatio > 0.25) suspicionScore += 1;

        if (lastAvgVolume > noiseThreshold) suspicionScore += 1;
        if (analyzeGesture()) suspicionScore += 2;

        const suspicious = suspicionScore >= 2;
        if (suspicious) {
            suspects++;
            cheatPoints.push({ x: nose.x, y: nose.y, time: Date.now() });
            if (suspicionScore >= 3) {
                saveEvidenceClip();
            }
        }

        const color = suspicious ? "red" : "#00ff88";
        const glow = suspicious ? 30 : 20;
        const label = suspicious ? "SUSPECT" : "OK";

        targetCtx.shadowColor = color;
        targetCtx.shadowBlur = glow;
        targetCtx.strokeStyle = color;
        targetCtx.lineWidth = 2;
        
        targetCtx.beginPath();
        targetCtx.arc(nose.x, nose.y, shouldersWidth * 0.9, 0, 2 * Math.PI);
        targetCtx.stroke();

        targetCtx.shadowBlur = 0; 

        targetCtx.fillStyle = color;
        targetCtx.font = "bold 12px Arial";
        targetCtx.fillText(label, nose.x - 20, nose.y - shouldersWidth);

        targetCtx.shadowColor = color;
        targetCtx.shadowBlur = glow;
        targetCtx.strokeStyle = color;
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.moveTo(ls.x, ls.y);
        targetCtx.lineTo(rs.x, rs.y);
        targetCtx.stroke();
        
        targetCtx.shadowBlur = 0; 
    });

    drawHeatmap(targetCtx);

    if (total === 0) total = 1;
    if (examTotalDisplay) examTotalDisplay.innerText   = total;
    if (examSuspectDisplay) examSuspectDisplay.innerText = suspects;

    if (Date.now() - lastRecordTime > 1000) {
        timelineData.push({
            time: new Date().toLocaleTimeString(),
            suspects: suspects
        });
        lastRecordTime = Date.now();
    }
}

async function detectCheatObjects(videoTarget, ctxTarget, viewName) {
    if (!phoneDetector || !videoTarget) return;

    const predictions = await phoneDetector.detect(videoTarget);
    const cheatClasses = ["cell phone", "book"]; 

    predictions.forEach(pred => {
        if (!cheatClasses.includes(pred.class)) return;
        if (pred.score < 0.50) return;

        const [x, y, w, h] = pred.bbox;
        const isPhone = pred.class === "cell phone";
        const label = isPhone ? `PHONE (${viewName}) 🚨` : `CHEAT SHEET (${viewName}) 🚨`;

        ctxTarget.shadowColor = "red";
        ctxTarget.shadowBlur = 30;
        ctxTarget.strokeStyle = "red";
        ctxTarget.lineWidth = 4;
        ctxTarget.strokeRect(x, y, w, h);
        
        ctxTarget.shadowBlur = 0; 

        ctxTarget.fillStyle = "red";
        ctxTarget.font = "bold 18px Arial";
        ctxTarget.fillText(label, x, y - 8);

        const now = Date.now();
        if (now - lastPhoneAlert > phoneAlertCooldown) {
            lastPhoneAlert = now;

            if(examStatusText) {
                examStatusText.innerText = `CHEATING: ${viewName} View - ${isPhone ? "Phone" : "Paper / Book"} Detected!`;
                examStatusText.style.color = "#dc2626";
            }

            if (alarmSound) alarmSound.play().catch(() => {});

            saveFullFrameCheatSnapshot(ctxTarget.canvas, viewName);

            setTimeout(() => {
                if(examStatusText) examStatusText.style.color = "#475569";
            }, 2000);
        }

        const currentSus = Number(examSuspectDisplay.innerText) || 0;
        if(examSuspectDisplay) examSuspectDisplay.innerText = currentSus + 1;
    });
}

function saveFullFrameCheatSnapshot(targetCanvas, viewName) {
    const now = Date.now();
    if (now - lastCheatSnapshotTime < cheatSnapshotCooldown) return;
    lastCheatSnapshotTime = now;

    const snapCanvas = document.createElement("canvas");
    const snapCtx = snapCanvas.getContext("2d");

    snapCanvas.width = targetCanvas.width;
    snapCanvas.height = targetCanvas.height;
    snapCtx.drawImage(targetCanvas, 0, 0);

    snapCanvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        const ts = new Date();
        const timestamp = [
            ts.getFullYear(),
            String(ts.getMonth() + 1).padStart(2, "0"),
            String(ts.getDate()).padStart(2, "0")
        ].join("-") + "_" +
        String(ts.getHours()).padStart(2, "0") + "-" +
        String(ts.getMinutes()).padStart(2, "0") + "-" +
        String(ts.getSeconds()).padStart(2, "0");

        a.href = url;
        a.download = `CheatEvidence_${viewName}_${timestamp}.png`;
        a.click();
    });
}

function stopExamSystem() {
    if (!examIsRunning) return;
    examIsRunning = false;
    stopExamRecording();

    if (examStreamFront) examStreamFront.getTracks().forEach(t => t.stop());
    if (examStreamCeiling) examStreamCeiling.getTracks().forEach(t => t.stop());
    
    examStreamFront = null;
    examStreamCeiling = null;

    generateExamReport();
    timelineData = [];
}

function generateExamReport() {
    if (timelineData.length === 0) {
        alert("No data recorded for this exam session.");
        return;
    }

    const doc  = new jsPDF();
    const date = new Date().toLocaleString();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("FOCUS AI - Exam Monitoring Report", 14, 20);

    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text(`Generated: ${date}`, 14, 28);
    doc.text("Summary:", 14, 36);

    const totalSnapshots = timelineData.length;
    const maxSuspects    = Math.max(...timelineData.map(d => d.suspects));
    const avgSuspects    = timelineData.reduce((a,b)=>a+b.suspects,0) / totalSnapshots;

    doc.text(`• Time monitored: ~${Math.round(totalSnapshots)} seconds`, 20, 44);
    doc.text(`• Max suspicious count: ${maxSuspects}`, 20, 50);
    doc.text(`• Avg suspicious count: ${avgSuspects.toFixed(2)}`, 20, 56);

    const rows = timelineData.map(d => [d.time, d.suspects]);

    doc.autoTable({
        startY: 64,
        head: [['Time', 'Suspicious Count']],
        body: rows,
        styles: { fontSize: 8 }
    });

    const filename = `FOCUSAI_Exam_Report_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

// =====================
// STUDENTS MANAGEMENT
// =====================
let activeStudent = null;

async function loadStudents() {
    const token = sessionStorage.getItem("focusai_token");
    
    try {
        // REAL DB FETCH
        const res = await fetch("http://localhost:5000/students", {
            headers: { "Authorization": "Bearer " + token }
        });
        
        if (res.ok) {
            const data = await res.json();
            students = data;
            renderStudentsList();
        } else {
            console.error("Failed to fetch students from DB.");
        }
    } catch(err) {
        console.error("Database connection error:", err);
    }
}

async function addStudent(event){
    event.preventDefault();
    const name = document.getElementById("studentName").value;
    const roll = document.getElementById("studentRoll").value;
    
    // Replace with real backend POST request if needed
    students.push({ name: name, roll: parseInt(roll) });
    alert("Student saved locally for demo");
    renderStudentsList();
    document.getElementById("studentForm").reset();
}

function renderStudentsList() {
    const container = document.getElementById('studentsList');
    const noMsg     = document.getElementById('noStudentsMessage');
    if (!container) return;

    container.innerHTML = '';

    if (students.length === 0) {
        if (noMsg) noMsg.style.display = 'block';
        return;
    } else {
        if (noMsg) noMsg.style.display = 'none';
    }

    students.forEach((s, index) => {
        const card = document.createElement('div');
        card.className = "border border-slate-200 rounded-xl bg-white px-3 py-2 flex gap-3 items-center";

        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = "w-12 h-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-xs text-slate-600";
        if (s.image) {
            const img = document.createElement('img');
            img.src = s.image;
            img.alt = s.name;
            img.className = "w-full h-full object-cover";
            avatarWrapper.appendChild(img);
        } else {
            avatarWrapper.textContent = "No Image";
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = "flex-1";
        const nameEl = document.createElement('div');
        nameEl.className = "text-sm font-semibold text-slate-800";
        nameEl.textContent = s.name;
        const rollEl = document.createElement('div');
        rollEl.className = "text-[11px] text-slate-500";
        rollEl.textContent = "Roll No: " + s.roll;
        infoDiv.appendChild(nameEl);
        infoDiv.appendChild(rollEl);

        const btnDiv = document.createElement('div');
        btnDiv.className = "flex flex-col items-end gap-1";
        const setBtn = document.createElement('button');
        setBtn.type = "button";
        setBtn.className = "px-3 py-1 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-500";
        setBtn.textContent = "Set Active";
        setBtn.onclick = () => setActiveStudent(index);

        btnDiv.appendChild(setBtn);

        card.appendChild(avatarWrapper);
        card.appendChild(infoDiv);
        card.appendChild(btnDiv);

        container.appendChild(card);
    });

    updateActiveStudentUI();
    // Update chart with initial load
    renderChart();
}

function setActiveStudent(index) {
    activeStudent = students[index];
    updateActiveStudentUI();
    alert("Active student set to: " + activeStudent.name + " (Roll " + activeStudent.roll + ")");
}

function updateActiveStudentUI() {
    const name = activeStudent ? activeStudent.name : '--';
    const roll = activeStudent ? activeStudent.roll : '--';

    const nameLabel      = document.getElementById('activeStudentNameLabel');
    const rollLabel      = document.getElementById('activeStudentRollLabel');
    const examNameLabel  = document.getElementById('examActiveStudentNameLabel');
    const examRollLabel  = document.getElementById('examActiveStudentRollLabel');
    const studentsActiveDisplay = document.getElementById('studentsActiveDisplay');

    if (nameLabel) nameLabel.innerText         = "Student: " + name;
    if (rollLabel) rollLabel.innerText         = "Roll No: " + roll;
    if (examNameLabel) examNameLabel.innerText = "Student: " + name;
    if (examRollLabel) examRollLabel.innerText = "Roll No: " + roll;
    if (studentsActiveDisplay) {
        if (activeStudent) {
            studentsActiveDisplay.innerText = name + " (Roll " + roll + ")";
        } else {
            studentsActiveDisplay.innerText = "None selected";
        }
    }
}