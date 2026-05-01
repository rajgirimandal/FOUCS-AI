const splash = document.getElementById('splash');
const modeSelection = document.getElementById('modeSelection');
const dashboard = document.getElementById('dashboard');
const classModeBtn = document.getElementById('classModeBtn');
const examModeBtn = document.getElementById('examModeBtn');
const backBtn = document.getElementById('backBtn');
const modeLabel = document.getElementById('modeLabel');
const focusPercent = document.getElementById('focusPercent');
const statusLabel = document.getElementById('statusLabel');
const alertBox = document.getElementById('alertBox');
const alarmSound = document.getElementById('alarmSound');
const loader = document.getElementById('loader');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let mode = null;
let detector = null;
let objectDetector = null;
let stream = null;
let micStream = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let rafId = null;

setTimeout(() => {
  splash.classList.add('fade');
}, 1400);

classModeBtn.addEventListener('click', () => startMode('class'));
examModeBtn.addEventListener('click', () => startMode('exam'));
backBtn.addEventListener('click', stopAndReturnHome);

async function startMode(selectedMode) {
  mode = selectedMode;
  modeLabel.textContent = mode === 'class' ? 'Class Mode' : 'Exam Mode';
  modeSelection.classList.add('hidden');
  dashboard.classList.remove('hidden');
  backBtn.classList.remove('hidden');
  homeBtn.classList.remove('hidden');

  loader.classList.remove('hidden');
  await setupCamera();
  await setupAudio();
  await loadModels();
  loader.classList.add('hidden');

  runMonitorLoop();
}

async function setupCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  video.srcObject = stream;
  await video.play();
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
}

async function setupAudio() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  audioContext.createMediaStreamSource(micStream).connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

async function loadModels() {
  if (!detector) {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    });
  }
  if (!objectDetector) {
    objectDetector = await cocoSsd.load();
  }
}

function getNoiseLevel() {
  analyser.getByteFrequencyData(dataArray);
  return dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
}

async function runMonitorLoop() {
  const poses = await detector.estimatePoses(video);
  const objects = await objectDetector.detect(video);
  const noise = getNoiseLevel();

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let score = 100;
  let status = 'Focused';
  let alert = '';

  const personCount = objects.filter((obj) => obj.class === 'person').length;
  const phoneDetected = objects.some((obj) => obj.class === 'cell phone');

  if (!poses.length) {
    score -= 35;
    alert = 'Face missing: possible distraction';
  } else {
    const kp = poses[0].keypoints;
    const nose = kp.find((k) => k.name === 'nose');
    const leftEye = kp.find((k) => k.name === 'left_eye');
    const rightEye = kp.find((k) => k.name === 'right_eye');
    const leftShoulder = kp.find((k) => k.name === 'left_shoulder');
    const rightShoulder = kp.find((k) => k.name === 'right_shoulder');

    if (nose && leftEye && rightEye && nose.score > 0.3 && leftEye.score > 0.3 && rightEye.score > 0.3) {
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const lookOffset = nose.x - eyeCenterX;
      const downwardTilt = nose.y - ((leftEye.y + rightEye.y) / 2);
      if (Math.abs(lookOffset) > 24) {
        score -= 30;
        alert = lookOffset > 0 ? 'Head direction: looking right' : 'Head direction: looking left';
      }
      if (downwardTilt > 20) {
        score -= 18;
        alert = 'Head direction: looking down';
      }
    } else {
      score -= 20;
    }

    if (leftShoulder && rightShoulder && leftShoulder.score > 0.25 && rightShoulder.score > 0.25) {
      const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderSlope > 35) score -= 12;
    }
  }

  if (mode === 'class') {
    if (noise > 28) {
      score -= 15;
      alert = alert || 'Loud noise/talking detected';
    }
    if (phoneDetected) {
      score -= 25;
      alert = 'Phone detected in class mode';
    }
    if (score < 65) status = 'Distracted';
  }

  if (mode === 'exam') {
    if (phoneDetected) {
      score -= 65;
      alert = 'EXAM ALERT: Phone detected';
    }
    if (personCount > 1) {
      score -= 65;
      alert = 'EXAM ALERT: Multiple persons detected';
    }
    if (score < 60) {
      status = 'Cheating';
      alarmSound.currentTime = 0;
      alarmSound.play().catch(() => {});
      if (!alert) alert = 'EXAM ALERT: Looking away repeatedly';
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  focusPercent.textContent = `${score}%`;
  statusLabel.textContent = status;

  alertBox.textContent = alert || 'No active alert';
  alertBox.classList.toggle('hidden', !alert);
  if (mode === 'exam' && alert) alertBox.style.borderColor = '#ef4444';

  rafId = requestAnimationFrame(runMonitorLoop);
}

function stopAndReturnHome() {
  cancelAnimationFrame(rafId);
  [stream, micStream].forEach((s) => s && s.getTracks().forEach((t) => t.stop()));
  if (audioContext) audioContext.close();

  stream = null;
  micStream = null;
  audioContext = null;
  analyser = null;
  dataArray = null;

  focusPercent.textContent = '0%';
  statusLabel.textContent = 'Idle';
  alertBox.classList.add('hidden');
  backBtn.classList.add('hidden');
  dashboard.classList.add('hidden');
  modeSelection.classList.remove('hidden');
}
