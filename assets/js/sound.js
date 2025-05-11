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

// 컨트롤 요소 안전하게 재정의
const audioFileInput = document.getElementById('audioFile');
const playOriginalBtn = document.getElementById('playOriginal');
const playProcessedBtn = document.getElementById('playProcessed');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const volumeControl = document.getElementById('volume');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');
const samplingSlider = document.getElementById('samplingRateSlider');
const samplingValue = document.getElementById('samplingRateValue');

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

// 샘플링/양자화 시각화 고도화
const canvas = document.getElementById('samplingCanvas');
const ctx = canvas.getContext('2d');

// 파형 설정
const duration = 1; // 1초 구간
const freq = 2; // 2Hz 사인파 예시
const amplitude = 1; // 진폭
const quantizeBits = 3; // 3비트 양자화
const quantizeLevels = Math.pow(2, quantizeBits); // 8레벨

// drawSamplingGraph: sampleCount, audioData(옵션) 인자로 받아 실제 데이터로 표본화 점을 그림
function drawSamplingGraph(sampleCount, audioData = null) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const margin = 40;
  const w = canvas.width - margin * 2;
  const h = canvas.height - margin * 2;
  // 축
  ctx.save();
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin + h / 2);
  ctx.lineTo(margin + w, margin + h / 2);
  ctx.stroke();
  ctx.restore();
  // 아날로그 곡선(예시 데이터만)
  if (!audioData) {
    ctx.save();
    ctx.strokeStyle = '#1976D2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= w; px++) {
      const t = (px / w) * duration;
      const y = Math.sin(2 * Math.PI * freq * t) * amplitude;
      const cy = margin + h / 2 - y * (h / 2 * 0.85);
      if (px === 0) ctx.moveTo(margin + px, cy);
      else ctx.lineTo(margin + px, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 표본화(실수값) 점 및 주기 라벨
  ctx.save();
  ctx.strokeStyle = '#2196F3';
  ctx.fillStyle = '#2196F3';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < sampleCount; i++) {
    let y;
    if (audioData) {
      // 실제 오디오 데이터 사용
      const sampleInterval = Math.max(1, Math.floor(audioData.length / sampleCount));
      y = audioData[i * sampleInterval];
    } else {
      // 예시 사인파
      const t = (i / (sampleCount - 1)) * duration;
      y = Math.sin(2 * Math.PI * freq * t) * amplitude;
    }
    const cx = margin + (w * i) / (sampleCount - 1);
    const cy = margin + h / 2 - y * (h / 2 * 0.85);
    // 세로선
    ctx.beginPath();
    ctx.moveTo(cx, margin + h / 2);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    // 점
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fill();
    // 값 표시
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#1976D2';
    ctx.textAlign = 'center';
    ctx.fillText(y.toFixed(2), cx, cy - 14);
    ctx.fillStyle = '#2196F3';
    // 주기 라벨
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    let tLabel = (i === 0) ? 'T' : `${i + 1}T`;
    ctx.fillText(tLabel, cx, margin + h / 2 + 28);
  }
  ctx.restore();
}

function updateSamplingGraph() {
  const sampleCount = parseInt(samplingSlider.value);
  samplingValue.textContent = sampleCount;
  drawSamplingGraph(sampleCount);
}

samplingSlider.addEventListener('input', updateSamplingGraph);
window.addEventListener('DOMContentLoaded', updateSamplingGraph);

// 양자화 시각화 함수 개선
function drawQuantization(audioData = null, isExample = false) {
  if (!quantizationCanvas || !quantizationCtx) return;
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
  for (let i = 0; i <= 4; i++) {
    const y = PADDING + (i * GRAPH_HEIGHT / 4);
    quantizationCtx.moveTo(0, y);
    quantizationCtx.lineTo(quantizationCanvas.width, y);
  }
  quantizationCtx.stroke();
  // 막대 그래프 (표본화 주기만큼 모두 표시)
  const sampleCount = parseInt(samplingSlider.value);
  const sampleInterval = Math.max(1, Math.floor(audioData.length / sampleCount));
  const totalSamples = sampleCount;
  const barWidth = quantizationCanvas.width / totalSamples;
  // 정규화용 min/max 계산
  const N = 7; // 3비트(0~7)
  const sampleValues = Array.from({length: totalSamples}, (_, k) => audioData[k * sampleInterval]);
  const min = Math.min(...sampleValues);
  const max = Math.max(...sampleValues);
  for (let i = 0; i < totalSamples; i++) {
    const idx = i * sampleInterval;
    const value = audioData[idx];
    // 0~N 정규화 후 반올림
    const quantized = Math.round(((value - min) / (max - min)) * N);
    const x = i * barWidth;
    const yBase = quantizationCanvas.height - PADDING;
    const yTop = PADDING + ((N - quantized) / N) * GRAPH_HEIGHT;
    // 막대
    quantizationCtx.fillStyle = '#222';
    quantizationCtx.fillRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    // 테두리
    quantizationCtx.strokeStyle = '#000';
    quantizationCtx.lineWidth = 1;
    quantizationCtx.strokeRect(x + barWidth * 0.35, yTop, barWidth * 0.3, yBase - yTop);
    // 정수값(크게)
    quantizationCtx.font = 'bold 16px Arial';
    quantizationCtx.fillStyle = '#222';
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText(quantized.toString(), x + barWidth / 2, yTop - 5);
    // 실수값(작게)
    quantizationCtx.font = '12px Arial';
    quantizationCtx.fillStyle = '#888';
    quantizationCtx.fillText(value.toFixed(2), x + barWidth / 2, yTop - 22);
    // 주기 라벨
    quantizationCtx.font = '12px Arial';
    quantizationCtx.fillStyle = '#333';
    let tLabel = (i === 0) ? 'T' : `${i + 1}T`;
    quantizationCtx.textAlign = 'center';
    quantizationCtx.fillText(tLabel, x + barWidth / 2, yBase + 18);
  }
}

function drawEncoding(audioData = null, isExample = false) {
  const encodingCanvas = document.getElementById('encodingCanvas');
  if (!encodingCanvas) {
    console.warn('[부호화] encodingCanvas가 존재하지 않습니다.');
    return;
  }
  const encodingCtx = encodingCanvas.getContext('2d');
  if (!encodingCtx) {
    console.warn('[부호화] encodingCanvas 컨텍스트를 가져올 수 없습니다.');
    return;
  }
  resizeCanvas(encodingCanvas);
  const PADDING = 20;
  const BINARY_WIDTH = 60;
  const sampleCount = parseInt(samplingSlider?.value || '8');
  if (!audioData || audioData.length < 2) {
    encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
    encodingCtx.font = 'bold 20px Arial';
    encodingCtx.fillStyle = '#bbb';
    encodingCtx.textAlign = 'center';
    encodingCtx.textBaseline = 'middle';
    encodingCtx.fillText('부호화할 데이터가 없습니다.', encodingCanvas.width / 2, encodingCanvas.height / 2);
    return;
  }
  encodingCtx.clearRect(0, 0, encodingCanvas.width, encodingCanvas.height);
  // 샘플링 포인트 계산
  const sampleInterval = Math.max(1, Math.floor(audioData.length / sampleCount));
  // 정규화용 min/max 계산
  const N = 7; // 3비트(0~7)
  const sampleValues = Array.from({length: sampleCount}, (_, k) => audioData[k * sampleInterval]);
  const min = Math.min(...sampleValues);
  const max = Math.max(...sampleValues);
  // 양자화된 정수값 배열
  const quantizedArr = sampleValues.map(v => Math.round(((v - min) / (max - min)) * N));
  // 비트 수 자동 결정
  const bitLen = 3; // 0~7이므로 3비트 고정
  // 각 샘플의 부호화 정보 표시
  for (let i = 0; i < sampleCount; i++) {
    const idx = i * sampleInterval;
    const value = audioData[idx];
    const quantized = quantizedArr[i];
    const binary = (quantized >>> 0).toString(2).padStart(bitLen, '0');
    const x = PADDING + (i * (encodingCanvas.width - PADDING * 2) / (sampleCount - 1));
    // 샘플 번호
    encodingCtx.font = 'bold 12px Arial';
    encodingCtx.fillStyle = '#666';
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText(`샘플 ${i + 1}`, x, PADDING - 5);
    // 정수값
    encodingCtx.font = 'bold 16px Arial';
    encodingCtx.fillStyle = '#222';
    encodingCtx.fillText(quantized.toString(), x, PADDING + 20);
    // 이진수 표시
    encodingCtx.font = '14px Courier New';
    encodingCtx.fillStyle = '#333';
    for (let j = 0; j < bitLen; j++) {
      const bit = binary[j];
      const bitX = x - BINARY_WIDTH / 2 + (j * BINARY_WIDTH / bitLen);
      const bitY = PADDING + 50;
      // 비트 배경
      encodingCtx.fillStyle = bit === '1' ? '#E3F2FD' : '#F5F5F5';
      encodingCtx.fillRect(bitX - 2, bitY - 15, BINARY_WIDTH / bitLen - 2, 20);
      // 비트 값
      encodingCtx.fillStyle = bit === '1' ? '#1976D2' : '#666';
      encodingCtx.textAlign = 'center';
      encodingCtx.fillText(bit, bitX + BINARY_WIDTH / (2 * bitLen) - 2, bitY);
    }
    // 실수값(작게)
    encodingCtx.font = '12px Arial';
    encodingCtx.fillStyle = '#888';
    encodingCtx.fillText(value.toFixed(2), x, PADDING + 70);
    // 주기 라벨
    encodingCtx.font = '12px Arial';
    encodingCtx.fillStyle = '#333';
    let tLabel = (i === 0) ? 'T' : `${i + 1}T`;
    encodingCtx.textAlign = 'center';
    encodingCtx.fillText(tLabel, x, PADDING + 90);
  }
  // 범례
  const legendY = encodingCanvas.height - PADDING + 10;
  encodingCtx.font = '12px Arial';
  encodingCtx.fillStyle = '#666';
  encodingCtx.textAlign = 'left';
  encodingCtx.fillText('정수값(0~7) → 이진수 변환 (아래 작은 글씨: 원래 실수값)', PADDING, legendY);
}

// 파일 첨부 전 초기화
function drawAllGuides() {
  drawSampling(null, true);
  drawQuantization(null, true);
  drawEncoding(null, true);
}

// 음악 파일 업로드 시 실제 오디오 데이터로 표본화 그래프 그리기
function visualizeAll(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  drawSamplingGraph(parseInt(samplingSlider?.value || '44'), channelData);
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

    // 1. 파일 확장자 및 MIME 타입 체크
    const allowedTypes = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/x-m4a', 'audio/m4a'];
    const allowedExts = ['.wav', '.mp3', '.ogg', '.m4a'];
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedTypes.includes(fileType) || allowedExts.some(ext => fileName.endsWith(ext));
    if (!isAllowed) {
      alert('지원하지 않는 오디오 파일 형식입니다. WAV, MP3, OGG, M4A 파일만 업로드 가능합니다.');
      updateProgress(0);
      enableControls(false);
      return;
    }

    // 진행 상태 표시
    updateProgress(0);

    // 오디오 컨텍스트가 없거나 일시 중지된 상태라면 초기화
    if (!audioContext || audioContext.state === 'suspended') {
      await initializeAudioContext();
    }

    // 이전 오디오 소스 정리
    cleanupAudioSource();

    // 파일 읽기
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (readErr) {
      alert('오디오 파일을 읽는 중 오류가 발생했습니다. 다른 파일을 시도해주세요.');
      updateProgress(0);
      enableControls(false);
      console.error('파일 읽기 오류:', readErr);
      return;
    }
    updateProgress(50);

    // 오디오 디코딩
    try {
      originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeErr) {
      alert('오디오 파일을 디코딩할 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다. 다른 파일을 시도해주세요.');
      updateProgress(0);
      enableControls(false);
      console.error('decodeAudioData 오류:', decodeErr);
      return;
    }
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
    alert('오디오 파일을 처리하는 중 예기치 않은 오류가 발생했습니다. 다른 파일을 시도하거나, 파일이 정상적인지 확인해주세요.');
    updateProgress(0);
    enableControls(false);
    console.error('오디오 파일 처리 중 오류:', error);
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
          drawSamplingGraph(parseInt(samplingSlider?.value || '44'), channelData);
        } else if (canvas.id === 'quantizationCanvas') {
          drawQuantization(channelData, false);
        } else if (canvas.id === 'encodingCanvas') {
          drawEncoding(channelData, false);
        }
      } else {
        // 예시 데이터로 drawSamplingGraph 호출
        if (canvas.id === 'samplingCanvas') {
          drawSamplingGraph(parseInt(samplingSlider?.value || '44'));
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

// --- 엔터프라이즈 레벨: 안전한 컨트롤 관리 및 초기화 개선 ---

// 오디오 샘플링 주기(슬라이더)와 연동되는 샘플레이트(Hz) 계산
function getSampleRateFromSlider() {
  // 44 -> 44100, 1 -> 1000
  if (!samplingSlider) return 44100;
  return parseInt(samplingSlider.value) * 1000;
}

// 컨트롤 활성화/비활성화 함수 (존재하는 컨트롤만)
function enableControls(enabled) {
  [playOriginalBtn, playProcessedBtn, pauseBtn, stopBtn, volumeControl].forEach(control => {
    if (control) control.disabled = !enabled;
  });
}

// 샘플링 슬라이더와 오디오 처리 연동 시에도 실제 데이터로 표본화 그래프 그리기
function handleSamplingSliderChange() {
  if (!samplingSlider || !samplingValue) return;
  samplingValue.textContent = samplingSlider.value;
  sampleRate = getSampleRateFromSlider();
  // 오디오 처리 및 시각화 동기화
  if (originalBuffer) {
    processedBuffer = processAudio(originalBuffer);
    const channelData = originalBuffer.getChannelData(0);
    drawSamplingGraph(parseInt(samplingSlider.value), channelData);
    drawQuantization(channelData, false);
    drawEncoding(channelData, false);
    updateQualityMetrics(originalBuffer, processedBuffer);
  } else {
    // 예시 데이터로 시각화
    drawSamplingGraph(parseInt(samplingSlider.value));
  }
}

// 이벤트 리스너 안전하게 등록
function setupEventListeners() {
  if (audioFileInput) audioFileInput.addEventListener('change', handleAudioFile);
  if (samplingSlider) samplingSlider.addEventListener('input', handleSamplingSliderChange);
  if (playOriginalBtn) playOriginalBtn.addEventListener('click', () => { if (originalBuffer) playAudio(originalBuffer); });
  if (playProcessedBtn) playProcessedBtn.addEventListener('click', () => { if (processedBuffer) playAudio(processedBuffer); });
  if (pauseBtn) pauseBtn.addEventListener('click', pauseAudio);
  if (stopBtn) stopBtn.addEventListener('click', stopAudio);
  if (volumeControl) volumeControl.addEventListener('input', () => { if (gainNode) gainNode.gain.value = volumeControl.value / 100; });
  window.addEventListener('beforeunload', () => { cleanupAudioSource(); if (audioContext) audioContext.close(); });
}

// 초기화 함수 개선
async function initialize() {
  try {
    setupEventListeners();
    enableControls(false);
    // 샘플링 슬라이더 초기화
    handleSamplingSliderChange();
    // 사용자 상호작용 시 오디오 컨텍스트 초기화
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    const initAudioContext = async () => {
      try {
        await initializeAudioContext();
        userInteractionEvents.forEach(event => document.removeEventListener(event, initAudioContext));
      } catch (error) {
        console.error('오디오 컨텍스트 초기화 실패:', error);
      }
    };
    userInteractionEvents.forEach(event => document.addEventListener(event, initAudioContext, { once: true }));
  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
    alert('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  }
}

document.addEventListener('DOMContentLoaded', initialize);

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