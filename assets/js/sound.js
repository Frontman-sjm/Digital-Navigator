const canvas = document.getElementById('soundWaveCanvas');
const ctx = canvas.getContext('2d');
const frequencyInput = document.getElementById('frequency');

// 캔버스 및 컨텍스트 설정
const samplingCanvas = document.getElementById('samplingCanvas');
const samplingCtx = samplingCanvas.getContext('2d');
const quantizationCanvas = document.getElementById('quantizationCanvas');
const quantizationCtx = quantizationCanvas.getContext('2d');
const encodingCanvas = document.getElementById('encodingCanvas');
const encodingCtx = encodingCanvas.getContext('2d');

// 컨트롤 요소
const samplingRateInput = document.getElementById('samplingRate');
const quantizationBitsInput = document.getElementById('quantizationBits');
const audioFileInput = document.getElementById('audioFile');
const playOriginalBtn = document.getElementById('playOriginal');
const playProcessedBtn = document.getElementById('playProcessed');

// 오디오 컨텍스트 및 관련 변수
let audioContext;
let originalBuffer;
let processedBuffer;
let audioSource;

function drawWave(samples = 50) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);

  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * canvas.width;
    const t = i / samples * 2 * Math.PI * 2; // 2Hz 사인파
    const y = canvas.height / 2 + Math.sin(t) * 80;
    ctx.lineTo(x, y);
  }

  ctx.strokeStyle = '#ff5500';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 샘플링 점 찍기
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * canvas.width;
    const t = i / samples * 2 * Math.PI * 2;
    const y = canvas.height / 2 + Math.sin(t) * 80;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#0055ff';
    ctx.fill();
  }
}

frequencyInput.addEventListener('input', () => {
  drawWave(frequencyInput.value);
});

drawWave(frequencyInput.value);

// 1단계: 표본화 시각화
function drawSampling(samples = 50) {
  samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
  samplingCtx.beginPath();
  samplingCtx.moveTo(0, samplingCanvas.height / 2);

  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * samplingCanvas.width;
    const t = i / samples * 2 * Math.PI * 2; // 2Hz 사인파
    const y = samplingCanvas.height / 2 + Math.sin(t) * 80;
    samplingCtx.lineTo(x, y);
  }

  samplingCtx.strokeStyle = '#ff5500';
  samplingCtx.lineWidth = 2;
  samplingCtx.stroke();

  // 샘플링 점 표시
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * samplingCanvas.width;
    const t = i / samples * 2 * Math.PI * 2;
    const y = samplingCanvas.height / 2 + Math.sin(t) * 80;
    samplingCtx.beginPath();
    samplingCtx.arc(x, y, 3, 0, 2 * Math.PI);
    samplingCtx.fillStyle = '#0055ff';
    samplingCtx.fill();
  }
}

// 2단계: 양자화 시각화
function drawQuantization(bits = 8) {
  quantizationCtx.clearRect(0, 0, quantizationCanvas.width, quantizationCanvas.height);
  const levels = Math.pow(2, bits);
  const step = quantizationCanvas.height / levels;

  // 양자화 레벨 표시
  for (let i = 0; i < levels; i++) {
    const y = i * step;
    quantizationCtx.beginPath();
    quantizationCtx.moveTo(0, y);
    quantizationCtx.lineTo(quantizationCanvas.width, y);
    quantizationCtx.strokeStyle = '#ddd';
    quantizationCtx.stroke();
  }

  // 파형 표시
  quantizationCtx.beginPath();
  for (let x = 0; x < quantizationCanvas.width; x++) {
    const t = x / quantizationCanvas.width * 2 * Math.PI * 2;
    const y = quantizationCanvas.height / 2 + Math.sin(t) * 80;
    const quantizedY = Math.round(y / step) * step;
    if (x === 0) {
      quantizationCtx.moveTo(x, quantizedY);
    } else {
      quantizationCtx.lineTo(x, quantizedY);
    }
  }
  quantizationCtx.strokeStyle = '#ff5500';
  quantizationCtx.lineWidth = 2;
  quantizationCtx.stroke();
}

// 3단계: 부호화 및 오디오 처리
async function handleAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 오디오 컨텍스트 초기화
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // 오디오 처리 및 시각화
    processAudio(originalBuffer);
    updateQualityMetrics();
  } catch (error) {
    console.error('오디오 파일 처리 중 오류 발생:', error);
  }
}

function processAudio(buffer) {
  const sampleRate = parseInt(samplingRateInput.value);
  const bits = parseInt(quantizationBitsInput.value);
  
  // 오디오 처리 로직
  const processedData = new Float32Array(buffer.length);
  const step = Math.pow(2, bits);
  
  for (let i = 0; i < buffer.length; i++) {
    // 양자화
    processedData[i] = Math.round(buffer.getChannelData(0)[i] * step) / step;
  }
  
  // 처리된 오디오 버퍼 생성
  processedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  processedBuffer.copyToChannel(processedData, 0);
  
  // 시각화 업데이트
  drawEncoding(processedData);
}

function drawEncoding(data) {
  encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
  const step = Math.ceil(data.length / encodingCanvas.width);
  
  encodingCtx.beginPath();
  for (let x = 0; x < encodingCanvas.width; x++) {
    const index = Math.min(x * step, data.length - 1);
    const y = (data[index] + 1) * encodingCanvas.height / 2;
    if (x === 0) {
      encodingCtx.moveTo(x, y);
    } else {
      encodingCtx.lineTo(x, y);
    }
  }
  encodingCtx.strokeStyle = '#ff5500';
  encodingCtx.lineWidth = 2;
  encodingCtx.stroke();
}

function updateQualityMetrics() {
  const metrics = document.getElementById('qualityMetrics');
  const sampleRate = parseInt(samplingRateInput.value);
  const bits = parseInt(quantizationBitsInput.value);
  
  const quality = (sampleRate / 100) * (bits / 16) * 100;
  const fileSize = originalBuffer ? (originalBuffer.length * bits / 8 / 1024).toFixed(2) : 0;
  
  metrics.innerHTML = `
    <p>샘플링 품질: ${sampleRate}%</p>
    <p>양자화 품질: ${bits}비트</p>
    <p>전체 품질 지수: ${quality.toFixed(1)}%</p>
    <p>예상 파일 크기: ${fileSize}KB</p>
  `;
}

// 이벤트 리스너
samplingRateInput.addEventListener('input', () => {
  drawSampling(samplingRateInput.value);
  if (originalBuffer) {
    processAudio(originalBuffer);
    updateQualityMetrics();
  }
});

quantizationBitsInput.addEventListener('input', () => {
  drawQuantization(quantizationBitsInput.value);
  if (originalBuffer) {
    processAudio(originalBuffer);
    updateQualityMetrics();
  }
});

audioFileInput.addEventListener('change', handleAudioFile);

playOriginalBtn.addEventListener('click', () => {
  if (originalBuffer) {
    playAudio(originalBuffer);
  }
});

playProcessedBtn.addEventListener('click', () => {
  if (processedBuffer) {
    playAudio(processedBuffer);
  }
});

function playAudio(buffer) {
  if (audioSource) {
    audioSource.stop();
  }
  audioSource = audioContext.createBufferSource();
  audioSource.buffer = buffer;
  audioSource.connect(audioContext.destination);
  audioSource.start();
}

// 초기화
drawSampling(samplingRateInput.value);
drawQuantization(quantizationBitsInput.value); 