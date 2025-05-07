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

// 예시 사인파 데이터 생성 함수 개선
function generateExampleSineData(length = 44100, freq = 2) {
  if (!length || length < 2) length = 44100;
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // 기본 사인파에 고주파 성분 추가
    arr[i] = Math.sin(2 * Math.PI * freq * (i / length)) * 0.7 + 
             Math.sin(2 * Math.PI * freq * 3 * (i / length)) * 0.3;
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

// 캔버스 크기 조정 함수 개선
function resizeCanvas(canvas) {
  if (!canvas) return;
  
  const container = canvas.parentElement;
  if (!container) return;
  
  // 고정된 캔버스 높이 설정
  const FIXED_HEIGHT = 200;
  
  // 컨테이너의 실제 너비 계산
  const containerWidth = container.clientWidth;
  
  // 캔버스 크기 설정
  canvas.width = containerWidth;
  canvas.height = FIXED_HEIGHT;
  
  // 디스플레이 비율 조정
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${FIXED_HEIGHT}px`;
  canvas.width = containerWidth * dpr;
  canvas.height = FIXED_HEIGHT * dpr;
  
  // 컨텍스트 스케일 조정
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  
  return canvas;
}

// 시각화 함수 개선
function drawSampling(audioData = null, isExample = false) {
  if (!samplingCanvas || !samplingCtx) return;
  
  // 캔버스 크기 조정
  resizeCanvas(samplingCanvas);
  
  const MAX_DISPLAY_SAMPLES = 10;
  const PADDING = 20;
  const GRAPH_HEIGHT = samplingCanvas.height - (PADDING * 2);
  
  // 예시 데이터 보장
  if (!audioData || audioData.length < 2) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  
  samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
  
  // 그리드 그리기
  samplingCtx.strokeStyle = '#eee';
  samplingCtx.lineWidth = 1;
  samplingCtx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = PADDING + (i * GRAPH_HEIGHT / 4);
    samplingCtx.moveTo(0, y);
    samplingCtx.lineTo(samplingCanvas.width, y);
  }
  samplingCtx.stroke();
  
  // 곡선(아날로그 신호) 그리기
  samplingCtx.beginPath();
  const step = Math.max(1, Math.floor(audioData.length / samplingCanvas.width));
  for (let i = 0; i < audioData.length; i += step) {
    const x = (i / (audioData.length - 1)) * samplingCanvas.width;
    const value = audioData[i];
    const y = PADDING + ((1 - value) / 2) * GRAPH_HEIGHT;
    if (i === 0) samplingCtx.moveTo(x, y);
    else samplingCtx.lineTo(x, y);
  }
  samplingCtx.strokeStyle = '#444';
  samplingCtx.lineWidth = 2;
  samplingCtx.stroke();
  
  // 샘플링 포인트 계산
  const sampleInterval = Math.max(1, Math.floor(44100 / sampleRate));
  const totalSamples = Math.floor(audioData.length / sampleInterval);
  const displayStep = Math.max(1, Math.floor(totalSamples / MAX_DISPLAY_SAMPLES));
  
  // 샘플링 포인트 그리기
  for (let i = 0; i < totalSamples; i += displayStep) {
    const idx = i * sampleInterval;
    const x = (i / (totalSamples - 1)) * samplingCanvas.width;
    const value = audioData[idx];
    const y = PADDING + ((1 - value) / 2) * GRAPH_HEIGHT;
    
    // 수직선
    samplingCtx.beginPath();
    samplingCtx.moveTo(x, PADDING);
    samplingCtx.lineTo(x, samplingCanvas.height - PADDING);
    samplingCtx.strokeStyle = 'rgba(187, 187, 187, 0.5)';
    samplingCtx.lineWidth = 1;
    samplingCtx.stroke();
    
    // 점
    samplingCtx.beginPath();
    samplingCtx.arc(x, y, 5, 0, 2 * Math.PI);
    samplingCtx.fillStyle = '#ff5500';
    samplingCtx.fill();
    
    // 값 숫자
    samplingCtx.font = 'bold 12px Arial';
    samplingCtx.fillStyle = '#222';
    samplingCtx.textAlign = 'center';
    samplingCtx.fillText(value.toFixed(2), x, y - 10);
  }
  
  // 샘플링 주기 정보 표시
  samplingCtx.font = 'bold 14px Arial';
  samplingCtx.fillStyle = '#1976D2';
  samplingCtx.textAlign = 'left';
  samplingCtx.fillText(`샘플링 주기: ${sampleRate}Hz`, 10, 20);
}

// 양자화 시각화 함수 개선
function drawQuantization(audioData = null, isExample = false) {
  if (!quantizationCanvas || !quantizationCtx) return;
  
  // 캔버스 크기 조정
  resizeCanvas(quantizationCanvas);
  
  const PADDING = 20;
  const GRAPH_HEIGHT = quantizationCanvas.height - (PADDING * 2);
  
  if (!audioData) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  
  if (!audioData || audioData.length < 2) {
    drawGuideMessage(quantizationCtx, quantizationCanvas, '데이터 오류: 양자화 불가');
    return;
  }
  
  quantizationCtx.clearRect(0, 0, quantizationCanvas.width, quantizationCanvas.height);
  
  // 그리드 그리기
  quantizationCtx.strokeStyle = '#eee';
  quantizationCtx.lineWidth = 1;
  quantizationCtx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = PADDING + (i * GRAPH_HEIGHT / 4);
    quantizationCtx.moveTo(0, y);
    quantizationCtx.lineTo(quantizationCanvas.width, y);
  }
  quantizationCtx.stroke();
  
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
    const yBase = quantizationCanvas.height - PADDING;
    const yTop = PADDING + ((1 - quantized / (levels - 1)) * GRAPH_HEIGHT);
    
    // 막대
    quantizationCtx.fillStyle = '#2196F3';
    quantizationCtx.fillRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    
    // 테두리
    quantizationCtx.strokeStyle = '#1976D2';
    quantizationCtx.lineWidth = 1;
    quantizationCtx.strokeRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    
    // 숫자
    quantizationCtx.font = 'bold 12px Arial';
    quantizationCtx.fillStyle = '#222';
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText(quantized.toString(), x + barWidth / 2, yTop - 5);
  }
}

function drawEncoding(audioData = null, isExample = false) {
  const encodingCanvas = document.getElementById('encodingCanvas');
  if (!encodingCanvas) return;
  const encodingCtx = encodingCanvas.getContext('2d');
  if (!encodingCtx) return;
  
  // 캔버스 크기 조정
  resizeCanvas(encodingCanvas);
  
  const PADDING = 20;
  const ROW_HEIGHT = 40;
  const BINARY_WIDTH = 60;
  const MAX_DISPLAY_SAMPLES = 8; // 표시할 샘플 수 감소
  
  if (!audioData) {
    audioData = generateExampleSineData(44100, 1);
    isExample = true;
  }
  
  encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
  
  // 배경 그리드
  encodingCtx.strokeStyle = '#eee';
  encodingCtx.lineWidth = 1;
  for (let i = 0; i <= MAX_DISPLAY_SAMPLES; i++) {
    const x = PADDING + (i * (encodingCanvas.width - PADDING * 2) / MAX_DISPLAY_SAMPLES);
    encodingCtx.beginPath();
    encodingCtx.moveTo(x, PADDING);
    encodingCtx.lineTo(x, encodingCanvas.height - PADDING);
    encodingCtx.stroke();
  }
  
  // 샘플링 포인트 계산
  const sampleInterval = Math.max(1, Math.floor(44100 / sampleRate));
  const totalSamples = Math.floor(audioData.length / sampleInterval);
  const displayStep = Math.max(1, Math.floor(totalSamples / MAX_DISPLAY_SAMPLES));
  
  // 각 샘플의 부호화 정보 표시
  for (let i = 0; i < totalSamples && i < MAX_DISPLAY_SAMPLES; i += displayStep) {
    const idx = i * sampleInterval;
    const x = PADDING + (i * (encodingCanvas.width - PADDING * 2) / MAX_DISPLAY_SAMPLES);
    const value = audioData[idx];
    
    // 양자화 (8비트)
    const quantized = Math.round((value + 1) / 2 * 255);
    const binary = quantized.toString(2).padStart(8, '0');
    
    // 샘플 번호
    encodingCtx.font = 'bold 12px Arial';
    encodingCtx.fillStyle = '#666';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText(`샘플 ${i + 1}`, x, PADDING - 5);
    
    // 아날로그 값
    encodingCtx.font = 'bold 14px Arial';
    encodingCtx.fillStyle = '#1976D2';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText(value.toFixed(3), x, PADDING + 20);
    
    // 양자화된 값
    encodingCtx.font = 'bold 14px Arial';
    encodingCtx.fillStyle = '#2196F3';
    encodingCtx.fillText(quantized.toString(), x, PADDING + 40);
    
    // 이진수 표시
    encodingCtx.font = '14px Courier New';
    encodingCtx.fillStyle = '#333';
    for (let j = 0; j < 8; j++) {
      const bit = binary[j];
      const bitX = x - BINARY_WIDTH/2 + (j * BINARY_WIDTH/8);
      const bitY = PADDING + 60;
      
      // 비트 배경
      encodingCtx.fillStyle = bit === '1' ? '#E3F2FD' : '#F5F5F5';
      encodingCtx.fillRect(bitX - 2, bitY - 15, BINARY_WIDTH/8 - 2, 20);
      
      // 비트 값
      encodingCtx.fillStyle = bit === '1' ? '#1976D2' : '#666';
      encodingCtx.textAlign = 'center';
      encodingCtx.fillText(bit, bitX + BINARY_WIDTH/16 - 2, bitY);
    }
  }
  
  // 범례 추가
  const legendY = encodingCanvas.height - PADDING + 10;
  encodingCtx.font = '12px Arial';
  encodingCtx.fillStyle = '#666';
  encodingCtx.textAlign = 'left';
  encodingCtx.fillText('아날로그 값 → 양자화 → 이진수 변환', PADDING, legendY);
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

// 오디오 컨텍스트 초기화 함수 개선
async function initializeAudioContext() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive'
      });
    }
    
    // 오디오 컨텍스트가 일시 중지된 상태라면 재개
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    return audioContext;
  } catch (error) {
    console.error('오디오 컨텍스트 초기화 실패:', error);
    throw new Error('오디오 시스템을 초기화할 수 없습니다. 브라우저가 Web Audio API를 지원하는지 확인해주세요.');
  }
}

// 오디오 소스 정리 함수
function cleanupAudioSource() {
  if (audioSource) {
    try {
      audioSource.stop();
      audioSource.disconnect();
    } catch (error) {
      console.warn('오디오 소스 정리 중 오류:', error);
    }
    audioSource = null;
  }
  
  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch (error) {
      console.warn('게인 노드 정리 중 오류:', error);
    }
    gainNode = null;
  }
}

// 오디오 파일 처리 함수 개선
async function handleAudioFile(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;

    // 진행 상태 표시
    updateProgress(0);
    
    // 오디오 컨텍스트가 없거나 일시 중지된 상태라면 초기화
    if (!audioContext || audioContext.state === 'suspended') {
      await initializeAudioContext();
    }
    
    // 이전 오디오 소스 정리
    cleanupAudioSource();
    
    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    updateProgress(50);
    
    // 오디오 디코딩
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    updateProgress(100);
    
    // 처리된 오디오 생성
    processedBuffer = processAudio(originalBuffer);
    
    // 시각화 업데이트
    visualizeAll(originalBuffer);
    
    // 음질 지표 업데이트
    updateQualityMetrics(originalBuffer, processedBuffer);
    
    // 컨트롤 활성화
    enableControls(true);
    
  } catch (error) {
    console.error('오디오 파일 처리 중 오류:', error);
    alert('오디오 파일을 처리하는 중 오류가 발생했습니다. 다른 파일을 시도해주세요.');
    enableControls(false);
  }
}

// 오디오 처리 함수 개선
function processAudio(buffer) {
  if (!buffer || !audioContext) return null;
  
  try {
    // 새로운 오디오 버퍼 생성
    const processedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // 각 채널 처리
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // 샘플링 레이트에 따른 처리
      const sampleInterval = Math.max(1, Math.floor(buffer.sampleRate / sampleRate));
      
      // 워크렛 크기 계산 (성능 최적화)
      const workletSize = 4096;
      
      for (let i = 0; i < inputData.length; i += workletSize) {
        const end = Math.min(i + workletSize, inputData.length);
        
        for (let j = i; j < end; j++) {
          if (j % sampleInterval === 0) {
            // 양자화 (16비트)
            const quantized = Math.round(inputData[j] * 32767) / 32767;
            outputData[j] = quantized;
          } else {
            // 보간 처리
            const prevSample = Math.floor(j / sampleInterval) * sampleInterval;
            const nextSample = Math.min(prevSample + sampleInterval, inputData.length - 1);
            const fraction = (j - prevSample) / sampleInterval;
            
            outputData[j] = inputData[prevSample] * (1 - fraction) + 
                          inputData[nextSample] * fraction;
          }
        }
      }
    }
    
    return processedBuffer;
  } catch (error) {
    console.error('오디오 처리 중 오류:', error);
    return null;
  }
}

// 리사이즈 이벤트 핸들러 개선
function handleResize() {
  const canvases = [
    samplingCanvas,
    quantizationCanvas,
    document.getElementById('encodingCanvas')
  ];
  
  canvases.forEach(canvas => {
    if (canvas) {
      resizeCanvas(canvas);
      // 현재 데이터로 다시 그리기
      if (originalBuffer) {
        const channelData = originalBuffer.getChannelData(0);
        if (canvas.id === 'samplingCanvas') {
          drawSampling(channelData, false);
        } else if (canvas.id === 'quantizationCanvas') {
          drawQuantization(channelData, false);
        } else if (canvas.id === 'encodingCanvas') {
          drawEncoding(channelData, false);
        }
      }
    }
  });
}

// 디바운스 함수 추가
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 리사이즈 이벤트 리스너 설정
const debouncedResize = debounce(handleResize, 250);
window.addEventListener('resize', debouncedResize);

// 샘플링 레이트 업데이트 함수 개선
async function updateSamplingRate(newRate) {
  try {
    if (!originalBuffer) {
      // 예시 데이터로 시각화
      const exampleData = generateExampleSineData(44100, 1);
      drawSampling(exampleData, true);
      return;
    }
    
    // 샘플링 레이트 업데이트
    sampleRate = newRate;
    
    // 처리된 오디오 버퍼 재생성
    processedBuffer = processAudio(originalBuffer);
    
    // 시각화 업데이트
    requestAnimationFrame(() => {
      const channelData = originalBuffer.getChannelData(0);
      drawSampling(channelData, false);
      drawQuantization(channelData, false);
      drawEncoding(channelData, false);
      
      // 음질 지표 업데이트
      updateQualityMetrics(originalBuffer, processedBuffer);
    });
    
  } catch (error) {
    console.error('샘플링 레이트 업데이트 중 오류:', error);
  }
}

// 이벤트 리스너 설정 함수 개선
function setupEventListeners() {
  // 파일 업로드 이벤트
  if (audioFileInput) {
    audioFileInput.addEventListener('change', handleAudioFile);
  }
  
  // 샘플링 레이트 조절 이벤트
  if (sampleRateInput && sampleRateNumInput) {
    // 슬라이더 단위를 100으로 설정
    sampleRateInput.step = '100';
    sampleRateNumInput.step = '100';
    
    // 디바운스된 샘플링 레이트 업데이트 함수
    const debouncedUpdateSamplingRate = debounce((value) => {
      if (value >= 100 && value <= 44100) {
        updateSamplingRate(value);
      }
    }, 50); // 50ms로 디바운스 시간 단축
    
    // 슬라이더 이벤트
    sampleRateInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      sampleRateNumInput.value = value;
      debouncedUpdateSamplingRate(value);
    });
    
    // 숫자 입력 이벤트
    sampleRateNumInput.addEventListener('change', (e) => {
      const value = parseInt(e.target.value);
      if (value >= 100 && value <= 44100) {
        sampleRateInput.value = value;
        updateSamplingRate(value);
      } else {
        sampleRateNumInput.value = sampleRateInput.value;
      }
    });
  }
  
  // 재생 컨트롤 이벤트
  if (playOriginalBtn) {
    playOriginalBtn.addEventListener('click', () => {
      if (originalBuffer) playAudio(originalBuffer);
    });
  }
  
  if (playProcessedBtn) {
    playProcessedBtn.addEventListener('click', () => {
      if (processedBuffer) playAudio(processedBuffer);
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', pauseAudio);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', stopAudio);
  }
  
  // 볼륨 컨트롤 이벤트
  if (volumeControl) {
    volumeControl.addEventListener('input', () => {
      if (gainNode) {
        gainNode.gain.value = volumeControl.value / 100;
      }
    });
  }
  
  // 페이지 언로드 이벤트
  window.addEventListener('beforeunload', () => {
    cleanupAudioSource();
    if (audioContext) {
      audioContext.close();
    }
  });
}

// 초기화 함수 개선
async function initialize() {
  try {
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 시각화
    drawAllGuides();
    
    // 컨트롤 초기 상태 설정
    enableControls(false);
    
    // 사용자 상호작용 이벤트 리스너 추가
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    const initAudioContext = async () => {
      try {
        await initializeAudioContext();
        console.log('오디오 시스템이 성공적으로 초기화되었습니다.');
        // 이벤트 리스너 제거
        userInteractionEvents.forEach(event => {
          document.removeEventListener(event, initAudioContext);
        });
      } catch (error) {
        console.error('오디오 컨텍스트 초기화 실패:', error);
      }
    };

    // 사용자 상호작용 이벤트 리스너 등록
    userInteractionEvents.forEach(event => {
      document.addEventListener(event, initAudioContext, { once: true });
    });
    
  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
    alert('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  }
}

// 컨트롤 활성화/비활성화 함수
function enableControls(enabled) {
  const controls = [
    playOriginalBtn,
    playProcessedBtn,
    pauseBtn,
    stopBtn,
    volumeControl,
    sampleRateInput,
    sampleRateNumInput
  ];
  
  controls.forEach(control => {
    if (control) {
      control.disabled = !enabled;
    }
  });
}

// 진행 상태 업데이트 함수
function updateProgress(percent) {
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = `${percent}%`;
  }
}

// 오디오 재생 함수 개선
async function playAudio(buffer) {
  if (!buffer || !audioContext) return;
  
  try {
    // 이전 오디오 소스 정리
    cleanupAudioSource();
    
    // 새로운 오디오 소스 생성
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = buffer;
    
    // 게인 노드 생성 및 연결
    gainNode = audioContext.createGain();
    gainNode.gain.value = volumeControl.value / 100;
    
    // 노드 연결
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 재생 완료 이벤트 처리
    audioSource.onended = () => {
      isPlaying = false;
      updatePlaybackControls();
    };
    
    // 재생 시작
    audioSource.start(0);
    isPlaying = true;
    updatePlaybackControls();
    
  } catch (error) {
    console.error('오디오 재생 중 오류:', error);
    alert('오디오 재생 중 오류가 발생했습니다.');
    isPlaying = false;
    updatePlaybackControls();
  }
}

// 재생 컨트롤 업데이트 함수
function updatePlaybackControls() {
  if (playOriginalBtn) playOriginalBtn.disabled = isPlaying;
  if (playProcessedBtn) playProcessedBtn.disabled = isPlaying;
  if (pauseBtn) pauseBtn.disabled = !isPlaying;
  if (stopBtn) stopBtn.disabled = !isPlaying;
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
document.addEventListener('DOMContentLoaded', initialize); 