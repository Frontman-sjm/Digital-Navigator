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

// 캔버스 크기 조정 함수 개선
function resizeCanvas(canvas) {
  if (!canvas) return;
  
  const container = canvas.parentElement;
  if (!container) return;
  
  // 컨테이너의 실제 크기 계산
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // 캔버스 크기 설정
  canvas.width = containerWidth;
  canvas.height = containerHeight;
  
  // 디스플레이 비율 조정
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${containerHeight}px`;
  canvas.width = containerWidth * dpr;
  canvas.height = containerHeight * dpr;
  
  // 컨텍스트 스케일 조정
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  
  return canvas;
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

// 이벤트 리스너 설정 함수 개선
function setupEventListeners() {
  // 파일 업로드 이벤트
  if (audioFileInput) {
    audioFileInput.addEventListener('change', handleAudioFile);
  }
  
  // 샘플링 레이트 조절 이벤트
  if (sampleRateInput && sampleRateNumInput) {
    const updateSampling = () => {
      const value = parseInt(sampleRateInput.value);
      sampleRate = value;
      sampleRateNumInput.value = value;
      
      if (originalBuffer) {
        processedBuffer = processAudio(originalBuffer);
        visualizeAll(originalBuffer);
        updateQualityMetrics(originalBuffer, processedBuffer);
      }
    };
    
    sampleRateInput.addEventListener('input', updateSampling);
    sampleRateNumInput.addEventListener('change', () => {
      const value = parseInt(sampleRateNumInput.value);
      if (value >= 100 && value <= 44100) {
        sampleRateInput.value = value;
        updateSampling();
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