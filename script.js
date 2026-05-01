const splash = document.getElementById('splash');
const modeSelection = document.getElementById('modeSelection');
const dashboard = document.getElementById('dashboard');
const classModeBtn = document.getElementById('classModeBtn');
const examModeBtn = document.getElementById('examModeBtn');
const homeBtn = document.getElementById('homeBtn');
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

setTimeout(() => splash.classList.add('hidden'), 1800);

classModeBtn.addEventListener('click', () => startMode('class'));
examModeBtn.addEventListener('click', () => startMode('exam'));
homeBtn.addEventListener('click', stopAndReturnHome);

async function startMode(selectedMode) {
  mode = selectedMode;
  modeLabel.textContent = mode === 'class' ? 'Class Mode' : 'Exam Mode';
  modeSelection.classList.add('hidden');
  dashboard.classList.remove('hidden');
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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

async function setupAudio() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);
  analyser.fftSize = 256;
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
  let sum = 0;
  for (const v of dataArray) sum += v;
  return sum / dataArray.length;
}

async function runMonitorLoop() {
  const poses = await detector.estimatePoses(video);
  const objects = await objectDetector.detect(video);
  const noise = getNoiseLevel();

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let score = 100;
  let alert = '';
  let status = 'Focused';

  const personCount = objects.filter((o) => o.class === 'person').length;
  const phoneDetected = objects.some((o) => o.class === 'cell phone');

  if (poses.length) {
    const nose = poses[0].keypoints.find((k) => k.name === 'nose');
    const leftEye = poses[0].keypoints.find((k) => k.name === 'left_eye');
    const rightEye = poses[0].keypoints.find((k) => k.name === 'right_eye');
    if (nose && leftEye && rightEye && nose.score > 0.3 && leftEye.score > 0.3 && rightEye.score > 0.3) {
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const lookOffset = Math.abs(nose.x - eyeCenterX);
      if (lookOffset > 24) score -= 30;
    } else {
      score -= 15;
    }
  } else {
    score -= 35;
  }

  if (mode === 'class') {
    if (noise > 28) score -= 15;
    if (phoneDetected) score -= 25;
    if (score < 65) {
      status = 'Distracted';
      alert = 'Distraction detected: check posture, gaze, or background noise.';
    }
  } else {
    if (phoneDetected) {
      score -= 60;
      alert = 'Violation: phone detected.';
    }
    if (personCount > 1) {
      score -= 60;
      alert = 'Violation: multiple faces/persons detected.';
    }
    if (score < 60) {
      status = 'Cheating';
      playAlarm();
      if (!alert) alert = 'Violation: repeated looking away detected.';
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  focusPercent.textContent = `${score}%`;
  statusLabel.textContent = status;

  if (alert) {
    alertBox.textContent = alert;
    alertBox.classList.remove('hidden');
  } else {
    alertBox.classList.add('hidden');
  }

  rafId = requestAnimationFrame(runMonitorLoop);
}

function playAlarm() {
  alarmSound.currentTime = 0;
  alarmSound.play().catch(() => {});
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
  mode = null;

  alertBox.classList.add('hidden');
  statusLabel.textContent = 'Idle';
  focusPercent.textContent = '0%';
  homeBtn.classList.add('hidden');
  dashboard.classList.add('hidden');
  modeSelection.classList.remove('hidden');
}
