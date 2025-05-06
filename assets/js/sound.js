// 안전한 캔버스 및 컨텍스트 접근 함수 (엔터프라이즈 예외 처리)
function safeGetCanvasAndCtx(id) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    const msg = `[오류] 캔버스 요소 #${id}가 존재하지 않습니다.`;
    console.error(msg);
    alert(msg + ' 관리자에게 문의하세요.');
    return [null, null];
  }
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('getContext 실패');
  } catch (e) {
    const msg = `[오류] 캔버스 컨텍스트 초기화 실패: #${id}`;
    console.error(msg, e);
    alert(msg + ' 관리자에게 문의하세요.');
    return [canvas, null];
  }
  return [canvas, ctx];
}

// 캔버스 및 컨텍스트 재정의 (기존 getCanvasAndCtx → safeGetCanvasAndCtx)
const [samplingCanvas, samplingCtx] = safeGetCanvasAndCtx('samplingCanvas');
const [quantizationCanvas, quantizationCtx] = safeGetCanvasAndCtx('quantizationCanvas');
const [encodingCanvas, encodingCtx] = safeGetCanvasAndCtx('encodingCanvas');

// 컨트롤 요소
const samplingRateInput = document.getElementById('samplingRate');
const quantizationBitsInput = document.getElementById('quantizationBits');
const audioFileInput = document.getElementById('audioFile');
const playOriginalBtn = document.getElementById('playOriginal');
const playProcessedBtn = document.getElementById('playProcessed');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const volumeControl = document.getElementById('volume');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');

// 오디오 컨텍스트 및 관련 변수
let audioContext;
let originalBuffer;
let processedBuffer;
let audioSource;
let isPlaying = false;
let gainNode;

// 예시 사인파 데이터 생성 함수 (방어 코드 포함)
function generateExampleSineData(length = 44100, freq = 2) {
  if (!length || length < 2) length = 44100;
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.sin(2 * Math.PI * freq * (i / length));
  }
  return arr;
}

// 안내 메시지 + 예시 안내 표시 함수
function drawGuideMessage(ctx, canvas, message, example = false) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#bbb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  if (example) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#1976D2';
    ctx.fillText('예시 파형입니다. 오디오 파일을 첨부하면 실제 데이터로 바뀝니다.', canvas.width / 2, 30);
  }
}

// 1단계: 샘플링 시각화 (오디오 데이터 기반)
function drawSampling(samples = 50, audioData = null, isExample = false) {
  if (!samplingCanvas || !samplingCtx) {
    // 사용자 안내 메시지
    if (samplingCanvas) {
      samplingCanvas.width = samplingCanvas.width; // clear
      const ctx = samplingCanvas.getContext('2d');
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#e74c3c';
      ctx.textAlign = 'center';
      ctx.fillText('샘플링 캔버스 오류', samplingCanvas.width / 2, samplingCanvas.height / 2);
    }
    return;
  }
  if (!audioData) {
    audioData = generateExampleSineData(44100, 2);
    isExample = true;
  }
  if (!audioData || audioData.length < 2) {
    samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
    samplingCtx.font = 'bold 20px Arial';
    samplingCtx.fillStyle = '#e74c3c';
    samplingCtx.textAlign = 'center';
    samplingCtx.fillText('데이터 오류: 샘플링 불가', samplingCanvas.width / 2, samplingCanvas.height / 2);
    return;
  }
  samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
  if (isExample) {
    samplingCtx.font = 'bold 14px Arial';
    samplingCtx.fillStyle = '#1976D2';
    samplingCtx.textAlign = 'center';
    samplingCtx.fillText('예시 파형입니다. 오디오 파일을 첨부하면 실제 데이터로 바뀝니다.', samplingCanvas.width / 2, 30);
  }
  samplingCtx.beginPath();
  const sampleCount = Math.max(2, parseInt(samples));
  const step = Math.max(1, Math.floor(audioData.length / (sampleCount - 1)));
  let sampleValues = [];
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * samplingCanvas.width;
    const idx = Math.min(i * step, audioData.length - 1);
    const value = audioData[idx];
    const y = samplingCanvas.height / 2 - value * (samplingCanvas.height / 2 - 20);
    if (i === 0) {
      samplingCtx.moveTo(x, y);
    } else {
      samplingCtx.lineTo(x, y);
    }
    sampleValues.push({ x, y, value: value.toFixed(1) });
  }
  samplingCtx.strokeStyle = '#ff5500';
  samplingCtx.lineWidth = 2;
  samplingCtx.stroke();
  samplingCtx.font = 'bold 14px Arial';
  samplingCtx.textAlign = 'center';
  samplingCtx.textBaseline = 'bottom';
  for (let i = 0; i < sampleValues.length; i++) {
    const { x, y, value } = sampleValues[i];
    samplingCtx.beginPath();
    samplingCtx.arc(x, y, 4, 0, 2 * Math.PI);
    samplingCtx.fillStyle = '#0055ff';
    samplingCtx.fill();
    samplingCtx.fillStyle = '#333';
    samplingCtx.fillText(value, x, y - 8);
  }
}

// 2단계: 양자화 시각화 (오디오 데이터 기반)
function drawQuantization(bits = 8, audioData = null, isExample = false) {
  if (!quantizationCanvas || !quantizationCtx) return;
  if (!audioData) {
    audioData = generateExampleSineData(44100, 2);
    isExample = true;
  }
  if (!audioData || audioData.length < 2) {
    quantizationCtx.clearRect(0, 0, quantizationCanvas.width, quantizationCanvas.height);
    quantizationCtx.font = 'bold 20px Arial';
    quantizationCtx.fillStyle = '#e74c3c';
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText('데이터 오류: 양자화 불가', quantizationCanvas.width / 2, quantizationCanvas.height / 2);
    return;
  }
  quantizationCtx.clearRect(0, 0, quantizationCanvas.width, quantizationCanvas.height);
  if (isExample) {
    quantizationCtx.font = 'bold 14px Arial';
    quantizationCtx.fillStyle = '#1976D2';
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText('예시 파형입니다. 오디오 파일을 첨부하면 실제 데이터로 바뀝니다.', quantizationCanvas.width / 2, 30);
  }
  const samples = 50;
  const step = Math.max(1, Math.floor(audioData.length / samples));
  const levels = Math.pow(2, bits);
  const quantStep = 2 / (levels - 1);
  for (let i = 0; i < levels; i++) {
    const y = quantizationCanvas.height / 2 - (1 - i * quantStep) * 80;
    quantizationCtx.beginPath();
    quantizationCtx.moveTo(0, y);
    quantizationCtx.lineTo(quantizationCanvas.width, y);
    quantizationCtx.strokeStyle = '#ddd';
    quantizationCtx.stroke();
  }
  quantizationCtx.font = 'bold 14px Arial';
  quantizationCtx.textAlign = 'center';
  quantizationCtx.textBaseline = 'bottom';
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * quantizationCanvas.width;
    const idx = Math.min(i * step, audioData.length - 1);
    const value = audioData[idx];
    const quantized = Math.round((value + 1) / 2 * (levels - 1));
    const y = quantizationCanvas.height / 2 - ((quantized / (levels - 1)) * 2 - 1) * 80;
    quantizationCtx.beginPath();
    quantizationCtx.moveTo(x, quantizationCanvas.height / 2);
    quantizationCtx.lineTo(x, y);
    quantizationCtx.strokeStyle = '#2196F3';
    quantizationCtx.lineWidth = 6;
    quantizationCtx.stroke();
    quantizationCtx.fillStyle = '#333';
    quantizationCtx.fillText(quantized, x, y - 8);
  }
}

// 3단계: 부호화 시각화 (오디오 데이터 기반)
function drawEncoding(bits = 8, audioData = null, isExample = false) {
  if (!encodingCanvas || !encodingCtx) return;
  if (!audioData) {
    audioData = generateExampleSineData(44100, 2);
    isExample = true;
  }
  if (!audioData || audioData.length < 2) {
    encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
    encodingCtx.font = 'bold 20px Arial';
    encodingCtx.fillStyle = '#e74c3c';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText('데이터 오류: 부호화 불가', encodingCanvas.width / 2, encodingCanvas.height / 2);
    return;
  }
  encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
  if (isExample) {
    encodingCtx.font = 'bold 14px Arial';
    encodingCtx.fillStyle = '#1976D2';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText('예시 파형입니다. 오디오 파일을 첨부하면 실제 데이터로 바뀝니다.', encodingCanvas.width / 2, 30);
  }
  const samples = 16;
  const step = Math.max(1, Math.floor(audioData.length / samples));
  const levels = Math.pow(2, bits);
  let binaryArr = [];
  for (let i = 0; i < samples; i++) {
    const idx = Math.min(i * step, audioData.length - 1);
    const value = audioData[idx];
    const quantized = Math.round((value + 1) / 2 * (levels - 1));
    const bin = quantized.toString(2).padStart(bits, '0');
    binaryArr.push(bin);
  }
  // 이진수 나열 시각화
  encodingCtx.font = 'bold 18px Consolas, monospace';
  encodingCtx.textAlign = 'center';
  encodingCtx.textBaseline = 'middle';
  for (let i = 0; i < binaryArr.length; i++) {
    const x = ((i + 0.5) / binaryArr.length) * encodingCanvas.width;
    const y = encodingCanvas.height / 2;
    encodingCtx.fillStyle = '#1976D2';
    encodingCtx.fillText(binaryArr[i], x, y);
  }
}

// 파일 첨부 전 초기화(예시 데이터로 시각화)
function drawAllGuides() {
  drawSampling(samplingRateInput.value, null, true);
  drawQuantization(quantizationBitsInput.value, null, true);
  drawEncoding(quantizationBitsInput.value, null, true);
}

// 파일 첨부 시 단계별 시각화
function visualizeAll(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  drawSampling(samplingRateInput.value, channelData, false);
  drawQuantization(quantizationBitsInput.value, channelData, false);
  drawEncoding(quantizationBitsInput.value, channelData, false);
}

// 파일 첨부 이벤트 핸들러 수정
async function handleAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 파일 형식 검사 (MIME + 확장자)
  const validTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'];
  const validExts = ['.wav', '.mp3', '.ogg'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = validExts.some(ext => fileName.endsWith(ext));
  if (!validTypes.includes(file.type) && !hasValidExt) {
    alert('지원하지 않는 파일 형식입니다. WAV, MP3, OGG 파일만 업로드 가능합니다.');
    return;
  }

  // 진행 상태 초기화
  progressBar.style.width = '0%';
  progressText.textContent = '0%';

  // 오디오 컨텍스트 초기화
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    progressBar.style.width = '50%';
    progressText.textContent = '50%';
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    processAudio(originalBuffer);
    updateQualityMetrics();
    playOriginalBtn.disabled = false;
    playProcessedBtn.disabled = false;
    // 단계별 시각화
    visualizeAll(originalBuffer);
  } catch (error) {
    console.error('오디오 파일 처리 중 오류 발생:', error);
    alert('오디오 파일 처리 중 오류가 발생했습니다. 다른 파일을 시도해주세요.');
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
  drawEncoding(bits, processedData);
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

// 샘플링/양자화 슬라이더 변경 시에도 단계별 시각화
samplingRateInput.addEventListener('input', () => {
  if (originalBuffer) {
    visualizeAll(originalBuffer);
    processAudio(originalBuffer);
    updateQualityMetrics();
  } else {
    drawAllGuides();
  }
});
quantizationBitsInput.addEventListener('input', () => {
  if (originalBuffer) {
    visualizeAll(originalBuffer);
    processAudio(originalBuffer);
    updateQualityMetrics();
  } else {
    drawAllGuides();
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
  audioSource.connect(gainNode);
  
  // 볼륨 설정
  gainNode.gain.value = volumeControl.value / 100;
  
  audioSource.start();
  isPlaying = true;
  
  // 컨트롤 상태 업데이트
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  playOriginalBtn.disabled = true;
  playProcessedBtn.disabled = true;
}

function pauseAudio() {
  if (audioContext.state === 'running') {
    audioContext.suspend();
    isPlaying = false;
    pauseBtn.textContent = '재생';
  } else {
    audioContext.resume();
    isPlaying = true;
    pauseBtn.textContent = '일시정지';
  }
}

function stopAudio() {
  if (audioSource) {
    audioSource.stop();
    isPlaying = false;
    audioContext.resume();
    pauseBtn.textContent = '일시정지';
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    playOriginalBtn.disabled = false;
    playProcessedBtn.disabled = false;
  }
}

// 이벤트 리스너 추가
pauseBtn.addEventListener('click', pauseAudio);
stopBtn.addEventListener('click', stopAudio);
volumeControl.addEventListener('input', () => {
  if (gainNode) {
    gainNode.gain.value = volumeControl.value / 100;
  }
});

// window.onload에서 drawAllGuides 호출 (엔터프라이즈 신뢰성)
window.onload = function() {
  drawAllGuides();
}; 