// 안전한 캔버스 및 컨텍스트 접근 함수
function safeGetCanvasAndCtx(id) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.error(`[오류] 캔버스 요소 #${id}가 존재하지 않습니다.`);
    return [null, null];
  }
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('getContext 실패');
  } catch (e) {
    console.error(`[오류] 캔버스 컨텍스트 초기화 실패: #${id}`, e);
    return [canvas, null];
  }
  return [canvas, ctx];
}

// 캔버스 및 컨텍스트 재정의
const [samplingCanvas, samplingCtx] = safeGetCanvasAndCtx('samplingCanvas');
const [quantizationCanvas, quantizationCtx] = safeGetCanvasAndCtx('quantizationCanvas');

// 컨트롤 요소
const sampleRateInput = document.getElementById('samplingRate');
const sampleRateNumInput = document.getElementById('samplingRateNum');
const audioFileInput = document.getElementById('audioFile');
const playOriginalBtn = document.getElementById('playOriginal');
const playProcessedBtn = document.getElementById('playProcessed');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const volumeControl = document.getElementById('volume');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');

// 전역 변수
let sampleRate = 1;  // 샘플링/양자화 주기 (Hz)
let audioContext;
let originalBuffer;
let processedBuffer;
let audioSource;
let isPlaying = false;
let gainNode;

// 예시 사인파 데이터 생성 함수
function generateExampleSineData(length = 44100, freq = 2) {
  if (!length || length < 2) length = 44100;
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.sin(2 * Math.PI * freq * (i / length));
  }
  return arr;
}

// 안내 메시지 표시 함수
function drawGuideMessage(ctx, canvas, message, example = false) {
  if (!ctx || !canvas) return;
  
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

// 샘플링 시각화
function drawSampling(audioData = null, isExample = false) {
  if (!samplingCanvas || !samplingCtx) return;
  samplingCanvas.width = 400;
  samplingCanvas.height = 200;
  const MAX_DISPLAY_SAMPLES = 10;
  // 예시 데이터 보장
  if (!audioData || audioData.length < 2) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
  // 곡선(아날로그 신호) 그리기
  samplingCtx.beginPath();
  for (let i = 0; i < audioData.length; i++) {
    const x = (i / (audioData.length - 1)) * samplingCanvas.width;
    const value = audioData[i];
    const y = samplingCanvas.height - ((value + 1) / 2) * (samplingCanvas.height - 40) - 20;
    if (i === 0) samplingCtx.moveTo(x, y);
    else samplingCtx.lineTo(x, y);
  }
  samplingCtx.strokeStyle = '#444';
  samplingCtx.lineWidth = 2;
  samplingCtx.stroke();
  // 무조건 10개 점을 고르게 분포시켜 찍기
  for (let i = 0; i < MAX_DISPLAY_SAMPLES; i++) {
    // 데이터가 부족하면 가장 가까운 인덱스 값 사용
    const idx = Math.round(i * (audioData.length - 1) / (MAX_DISPLAY_SAMPLES - 1));
    const x = (i / (MAX_DISPLAY_SAMPLES - 1)) * samplingCanvas.width;
    const value = audioData[idx];
    const y = samplingCanvas.height - ((value + 1) / 2) * (samplingCanvas.height - 40) - 20;
    // 수직선
    samplingCtx.beginPath();
    samplingCtx.moveTo(x, samplingCanvas.height - 20);
    samplingCtx.lineTo(x, y);
    samplingCtx.strokeStyle = '#bbb';
    samplingCtx.lineWidth = 1;
    samplingCtx.stroke();
    // 점
    samplingCtx.beginPath();
    samplingCtx.arc(x, y, 5, 0, 2 * Math.PI);
    samplingCtx.fillStyle = '#ff5500';
    samplingCtx.fill();
    // 값 숫자
    samplingCtx.font = 'bold 15px Arial';
    samplingCtx.fillStyle = '#222';
    samplingCtx.textAlign = 'center';
    samplingCtx.fillText((value * 4 + 4).toFixed(1), x, y - 10);
  }
}

// 양자화 시각화
function drawQuantization(audioData = null, isExample = false) {
  if (!quantizationCanvas || !quantizationCtx) return;
  if (quantizationCanvas.width === 0 || quantizationCanvas.height === 0) {
    resizeCanvas(quantizationCanvas);
  }
  if (!audioData) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  if (!audioData || audioData.length < 2) {
    drawGuideMessage(quantizationCtx, quantizationCanvas, '데이터 오류: 양자화 불가');
    return;
  }
  quantizationCtx.clearRect(0, 0, quantizationCanvas.width, quantizationCanvas.height);
  // 막대 그래프 (최대 10개)
  const levels = 8;
  const sampleInterval = Math.max(1, Math.floor(44100 / sampleRate));
  const totalSamples = Math.max(2, Math.floor(audioData.length / sampleInterval));
  const MAX_DISPLAY_SAMPLES = 10;
  const displayStep = Math.max(1, Math.floor(totalSamples / MAX_DISPLAY_SAMPLES));
  let displayCount = 0;
  const barWidth = quantizationCanvas.width / Math.min(totalSamples, MAX_DISPLAY_SAMPLES);
  for (let i = 0; i < totalSamples && displayCount < MAX_DISPLAY_SAMPLES; i += displayStep, displayCount++) {
    const x = displayCount * barWidth;
    const idx = i * sampleInterval;
    const value = audioData[idx];
    const quantized = Math.round((value + 1) / 2 * (levels - 1));
    const yBase = quantizationCanvas.height - 20;
    const yTop = yBase - (quantized / (levels - 1)) * (quantizationCanvas.height - 40);
    // 막대
    quantizationCtx.fillStyle = '#2196F3';
    quantizationCtx.fillRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    // 테두리
    quantizationCtx.strokeStyle = '#1976D2';
    quantizationCtx.lineWidth = 1;
    quantizationCtx.strokeRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    // 숫자
    quantizationCtx.font = 'bold 16px Arial';
    quantizationCtx.fillStyle = '#222';
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText(quantized, x + barWidth / 2, yTop - 8);
  }
}

function drawEncoding(audioData = null, isExample = false) {
  const encodingCanvas = document.getElementById('encodingCanvas');
  if (!encodingCanvas) return;
  const encodingCtx = encodingCanvas.getContext('2d');
  if (!encodingCtx) return;
  if (encodingCanvas.width === 0 || encodingCanvas.height === 0) {
    encodingCanvas.width = encodingCanvas.parentElement.clientWidth;
    encodingCanvas.height = 80;
  }
  if (!audioData) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
  const levels = 8;
  const sampleInterval = Math.max(1, Math.floor(44100 / sampleRate));
  const totalSamples = Math.max(2, Math.floor(audioData.length / sampleInterval));
  const MAX_DISPLAY_SAMPLES = 10;
  const displayStep = Math.max(1, Math.floor(totalSamples / MAX_DISPLAY_SAMPLES));
  let displayCount = 0;
  const barWidth = encodingCanvas.width / Math.min(totalSamples, MAX_DISPLAY_SAMPLES);
  for (let i = 0; i < totalSamples && displayCount < MAX_DISPLAY_SAMPLES; i += displayStep, displayCount++) {
    const x = displayCount * barWidth;
    const idx = i * sampleInterval;
    const value = audioData[idx];
    const quantized = Math.round((value + 1) / 2 * (levels - 1));
    const binary = quantized.toString(2).padStart(4, '0');
    // 정수값
    encodingCtx.font = 'bold 16px Arial';
    encodingCtx.fillStyle = '#222';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText(quantized, x + barWidth / 2, 25);
    // 이진수
    encodingCtx.font = '14px Courier New';
    encodingCtx.fillStyle = '#1976D2';
    encodingCtx.fillText(binary, x + barWidth / 2, 55);
  }
}

// 파일 첨부 전 초기화
function drawAllGuides() {
  drawSampling(null, true);
  drawQuantization(null, true);
  drawEncoding(null, true);
}

// 파일 첨부 시 단계별 시각화
function visualizeAll(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  drawSampling(channelData, false);
  drawQuantization(channelData, false);
  drawEncoding(channelData, false);
}

// 음질 지표 계산
function calculateQualityMetrics(originalData, processedData) {
  if (!originalData || !processedData) return null;
  
  // 신호 대 잡음비 (SNR) 계산
  let signalPower = 0;
  let noisePower = 0;
  
  for (let i = 0; i < originalData.length; i++) {
    signalPower += originalData[i] * originalData[i];
    const noise = originalData[i] - processedData[i];
    noisePower += noise * noise;
  }
  
  const snr = 10 * Math.log10(signalPower / noisePower);
  
  // 샘플링 주기에 따른 품질 점수 계산
  const qualityScore = Math.min(100, Math.max(0, (sampleRate / 10) * 100));
  
  return {
    snr: snr.toFixed(2),
    qualityScore: qualityScore.toFixed(0),
    sampleRate: sampleRate.toFixed(1)
  };
}

// 음질 지표 표시
function updateQualityMetrics(originalBuffer, processedBuffer) {
  const qualityMetrics = document.getElementById('qualityMetrics');
  if (!qualityMetrics) return;
  
  if (!originalBuffer || !processedBuffer) {
    qualityMetrics.innerHTML = '<p>오디오 파일을 업로드하여 음질 지표를 확인하세요.</p>';
    return;
  }
  
  const originalData = originalBuffer.getChannelData(0);
  const processedData = processedBuffer.getChannelData(0);
  const metrics = calculateQualityMetrics(originalData, processedData);
  
  if (!metrics) {
    qualityMetrics.innerHTML = '<p>음질 지표를 계산할 수 없습니다.</p>';
    
    return;
  }
  
  qualityMetrics.innerHTML = `
    <p>샘플링 주기: ${metrics.sampleRate} Hz</p>
    <p>신호 대 잡음비 (SNR): ${metrics.snr} dB</p>
    <p>품질 점수: ${metrics.qualityScore}%</p>
  `;
}

// 파일 첨부 이벤트 핸들러
async function handleAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const validTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
  const validExts = ['.wav', '.mp3', '.ogg', '.m4a'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = validExts.some(ext => fileName.endsWith(ext));
  
  if (!validTypes.includes(file.type) && !hasValidExt) {
    alert('지원하지 않는 파일 형식입니다. WAV, MP3, OGG 파일만 업로드 가능합니다.');
    return;
  }

  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = '0%';

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    } catch (error) {
      console.error('오디오 컨텍스트 초기화 실패:', error);
      alert('오디오 컨텍스트 초기화에 실패했습니다. 브라우저를 확인해주세요.');
      return;
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (progressBar) progressBar.style.width = '50%';
    if (progressText) progressText.textContent = '50%';
    
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    
    processAudio(originalBuffer);
    visualizeAll(originalBuffer);
    
    if (playOriginalBtn) playOriginalBtn.disabled = false;
    if (playProcessedBtn) playProcessedBtn.disabled = false;
  } catch (error) {
    console.error('오디오 파일 처리 중 오류 발생:', error);
    alert('오디오 파일 처리 중 오류가 발생했습니다. 다른 파일을 시도해주세요.');
  }
}

// 오디오 처리
function processAudio(buffer) {
  if (!buffer) return;
  
  const processedData = new Float32Array(buffer.length);
  const levels = 16; // 4비트 양자화
  const sampleInterval = Math.floor(44100 / sampleRate);
  
  for (let i = 0; i < buffer.length; i += sampleInterval) {
    const value = buffer.getChannelData(0)[i];
    const quantized = Math.round((value + 1) / 2 * (levels - 1));
    processedData[i] = (quantized / (levels - 1)) * 2 - 1;
  }
  
  if (audioContext) {
    processedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    processedBuffer.copyToChannel(processedData, 0);
    updateQualityMetrics(buffer, processedBuffer);
  }
}

// 캔버스 크기 조정
function resizeCanvas(canvas) {
  if (!canvas) return;
  
  const container = canvas.parentElement;
  if (!container) return;
  
  const containerWidth = container.clientWidth;
  const padding = 30;
  const scrollbarWidth = 8;
  const availableWidth = containerWidth - (padding * 2) - scrollbarWidth;
  
  canvas.width = Math.max(availableWidth, 300);
  canvas.height = 200;
}

// 윈도우 리사이즈 핸들러
function handleResize() {
  resizeCanvas(samplingCanvas);
  resizeCanvas(quantizationCanvas);
  
  if (originalBuffer) {
    visualizeAll(originalBuffer);
  } else {
    drawAllGuides();
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  if (sampleRateInput && sampleRateNumInput) {
    const updateSampling = () => {
      const newRate = parseFloat(sampleRateInput.value);
      if (!isNaN(newRate) && newRate >= 100 && newRate <= 44100) {
        sampleRate = newRate;
        sampleRateNumInput.value = sampleRate;
        if (originalBuffer) {
          visualizeAll(originalBuffer);
          processAudio(originalBuffer);
        } else {
          drawAllGuides();
        }
      }
    };

    sampleRateInput.addEventListener('input', updateSampling);
    sampleRateNumInput.addEventListener('input', () => {
      const newRate = parseFloat(sampleRateNumInput.value);
      if (!isNaN(newRate) && newRate >= 100 && newRate <= 44100) {
        sampleRate = newRate;
        sampleRateInput.value = sampleRate;
        if (originalBuffer) {
          visualizeAll(originalBuffer);
          processAudio(originalBuffer);
        } else {
          drawAllGuides();
        }
      }
    });
  }
  
  if (audioFileInput) {
    audioFileInput.addEventListener('change', handleAudioFile);
  }
  
  if (playOriginalBtn) {
    playOriginalBtn.addEventListener('click', () => {
      if (originalBuffer) {
        playAudio(originalBuffer);
      }
    });
  }
  
  if (playProcessedBtn) {
    playProcessedBtn.addEventListener('click', () => {
      if (processedBuffer) {
        playAudio(processedBuffer);
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', pauseAudio);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', stopAudio);
  }
  
  if (volumeControl) {
    volumeControl.addEventListener('input', () => {
      if (gainNode) {
        gainNode.gain.value = volumeControl.value / 100;
      }
    });
  }
  
  window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(handleResize, 250);
  });
}

// 초기화
function initialize() {
  handleResize();
  drawAllGuides();
  setupEventListeners();
  
  if (sampleRateInput && sampleRateNumInput) {
    sampleRate = parseFloat(sampleRateInput.value);
    sampleRateNumInput.value = sampleRate;
  }
}

// 오디오 재생
function playAudio(buffer) {
  if (audioSource) {
    audioSource.stop();
  }
  
  audioSource = audioContext.createBufferSource();
  audioSource.buffer = buffer;
  audioSource.connect(gainNode);
  
  if (gainNode) {
    gainNode.gain.value = volumeControl ? volumeControl.value / 100 : 1;
  }
  
  audioSource.start();
  isPlaying = true;
  
  if (pauseBtn) pauseBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = false;
  if (playOriginalBtn) playOriginalBtn.disabled = true;
  if (playProcessedBtn) playProcessedBtn.disabled = true;
}

// 오디오 일시정지
function pauseAudio() {
  if (!audioContext) return;
  
  if (audioContext.state === 'running') {
    audioContext.suspend();
    isPlaying = false;
    if (pauseBtn) pauseBtn.textContent = '재생';
  } else {
    audioContext.resume();
    isPlaying = true;
    if (pauseBtn) pauseBtn.textContent = '일시정지';
  }
}

// 오디오 정지
function stopAudio() {
  if (audioSource) {
    audioSource.stop();
    isPlaying = false;
    if (audioContext) audioContext.resume();
    if (pauseBtn) {
      pauseBtn.textContent = '일시정지';
      pauseBtn.disabled = true;
    }
    if (stopBtn) stopBtn.disabled = true;
    if (playOriginalBtn) playOriginalBtn.disabled = false;
    if (playProcessedBtn) playProcessedBtn.disabled = false;
  }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 