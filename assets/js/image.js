document.addEventListener('DOMContentLoaded', function() {
let canvasRows = 10;
let canvasCols = 10;

// 비트 수에 따라 색상 개수 제한
const bitCountSelect = document.getElementById('bitCount');
const numColorsInput = document.getElementById('numColors');

function updateNumColorsMax() {
  const bits = parseInt(bitCountSelect.value);
  const maxColors = Math.pow(2, bits);
  numColorsInput.max = maxColors;
  if (parseInt(numColorsInput.value) > maxColors) {
    numColorsInput.value = maxColors;
  }
}

bitCountSelect.addEventListener('change', updateNumColorsMax);
numColorsInput.addEventListener('input', updateNumColorsMax);

// 페이지 로드시 초기화
updateNumColorsMax();

function generatePalette() {
  const bits = parseInt(bitCountSelect.value);
  const maxColors = Math.pow(2, bits);
  let num = parseInt(numColorsInput.value);
  if (num > maxColors) num = maxColors;
  numColorsInput.value = num;
  const area = document.getElementById("paletteArea");
  area.innerHTML = '';

  for (let i = 0; i < num; i++) {
    const row = document.createElement('div');
    row.className = 'color-row';

    const label = document.createElement('span');
    label.textContent = `색상 ${i + 1}:`;

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';

    const binaryInput = document.createElement('input');
    binaryInput.type = 'text';
    binaryInput.className = 'binary-input';
    binaryInput.placeholder = '예: 0101';

    row.appendChild(label);
    row.appendChild(colorPicker);
    row.appendChild(document.createTextNode(" 이진수: "));
    row.appendChild(binaryInput);

    area.appendChild(row);
  }
}
window.generatePalette = generatePalette;

function generateCanvas() {
  canvasCols = parseInt(document.getElementById("canvasCols").value);
  canvasRows = parseInt(document.getElementById("canvasRows").value);

  const grid = document.getElementById("canvasGrid");
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${canvasCols}, 30px)`;
  grid.style.gridTemplateRows = `repeat(${canvasRows}, 30px)`;

  for (let i = 0; i < canvasCols * canvasRows; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 8;
    input.className = 'pixel';

    input.addEventListener('input', () => {
      applyColor(input);
      updatePreview();
    });

    grid.appendChild(input);
  }

  const preview = document.getElementById("previewGrid");
  preview.style.gridTemplateColumns = `repeat(${canvasCols}, 30px)`;
  preview.style.gridTemplateRows = `repeat(${canvasRows}, 30px)`;
  
  updatePreview();
}
window.generateCanvas = generateCanvas;

function getPaletteMap() {
  const rows = document.querySelectorAll(".color-row");
  const map = {};

  rows.forEach(row => {
    const color = row.querySelector('input[type="color"]').value;
    const code = row.querySelector('.binary-input').value.trim();
    if (code !== '') {
      map[code] = color;
    }
  });

  return map;
}

function applyColor(input) {
  const map = getPaletteMap();
  const inputCode = input.value.trim();
  if (map[inputCode]) {
    input.style.backgroundColor = map[inputCode];
    input.style.color = "#fff";
  } else {
    input.style.backgroundColor = "#fff";
    input.style.color = "#000";
  }
}

function updatePreview() {
  const map = getPaletteMap();
  const preview = document.getElementById("previewGrid");
  const inputs = document.querySelectorAll(".pixel");

  preview.innerHTML = '';
  preview.style.gridTemplateColumns = `repeat(${canvasCols}, 30px)`;
  preview.style.gridTemplateRows = `repeat(${canvasRows}, 30px)`;

  inputs.forEach(input => {
    const code = input.value.trim();
    const color = map[code] || "#fff";

    const dot = document.createElement("div");
    dot.className = "preview-pixel";
    dot.style.backgroundColor = color;

    preview.appendChild(dot);
  });
}

const imageLoader = document.getElementById('imageLoader');
if (imageLoader) {
  imageLoader.addEventListener('change', handleImage, false);
}

function handleImage(e) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const rows = parseInt(document.getElementById("canvasRows").value);
      const cols = parseInt(document.getElementById("canvasCols").value);
      canvas.width = cols;
      canvas.height = rows;

      ctx.drawImage(img, 0, 0, cols, rows);

      const imageData = ctx.getImageData(0, 0, cols, rows);
      const data = imageData.data;

      const paletteMap = getPaletteMap();
      const colorToBinary = {};
      for (let bin in paletteMap) {
        colorToBinary[paletteMap[bin]] = bin;
      }

      const inputs = document.querySelectorAll(".pixel");
      for (let i = 0; i < cols * rows; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        const closestColor = getClosestColor(`rgb(${r},${g},${b})`, paletteMap);
        const binaryCode = colorToBinary[closestColor] || '';

        inputs[i].value = binaryCode;
        applyColor(inputs[i]);
      }

      updatePreview();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
}

function getClosestColor(targetRgb, paletteMap) {
  const rgb = targetRgb.match(/\d+/g).map(Number);
  let closest = null;
  let minDist = Infinity;

  for (let code in paletteMap) {
    const hex = paletteMap[code];
    const pr = parseInt(hex.substr(1, 2), 16);
    const pg = parseInt(hex.substr(3, 2), 16);
    const pb = parseInt(hex.substr(5, 2), 16);

    const dist = Math.sqrt((rgb[0]-pr)**2 + (rgb[1]-pg)**2 + (rgb[2]-pb)**2);
    if (dist < minDist) {
      minDist = dist;
      closest = hex;
    }
  }

  return closest;
}

// 픽셀 복원 챌린지 관련 변수
let currentTool = 'pencil';
let isDrawing = false;
let challengeTimer = null;
let timeLeft = 180; // 3분
let attempts = 0;
let originalImage = null;
let blurredImage = null;

// 도구 설정
function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

// 챌린지 시작
function startChallenge() {
  const level = document.getElementById('challengeLevel').value;
  const size = {
    'easy': 8,
    'medium': 16,
    'hard': 32
  }[level];

  // 캔버스 초기화
  const originalCanvas = document.getElementById('originalCanvas');
  const blurredCanvas = document.getElementById('blurredCanvas');
  const restoredCanvas = document.getElementById('restoredCanvas');

  originalCanvas.width = size;
  originalCanvas.height = size;
  blurredCanvas.width = size;
  blurredCanvas.height = size;
  restoredCanvas.width = size;
  restoredCanvas.height = size;

  // 랜덤 이미지 생성
  generateRandomImage(originalCanvas, size);
  createBlurredImage(originalCanvas, blurredCanvas);
  clearCanvas(restoredCanvas);

  // 타이머 시작
  startTimer();
  attempts = 0;
  updateStats();
}

// 랜덤 이미지 생성
function generateRandomImage(canvas, size) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.random() > 0.5 ? 255 : 0;     // R
    data[i + 1] = Math.random() > 0.5 ? 255 : 0; // G
    data[i + 2] = Math.random() > 0.5 ? 255 : 0; // B
    data[i + 3] = 255;                           // A
  }

  ctx.putImageData(imageData, 0, 0);
  originalImage = imageData;
}

// 흐릿한 이미지 생성
function createBlurredImage(originalCanvas, blurredCanvas) {
  const ctx = blurredCanvas.getContext('2d');
  ctx.filter = 'blur(2px)';
  ctx.drawImage(originalCanvas, 0, 0);
  ctx.filter = 'none';
  blurredImage = ctx.getImageData(0, 0, blurredCanvas.width, blurredCanvas.height);
}

// 캔버스 초기화
function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 타이머 시작
function startTimer() {
  if (challengeTimer) clearInterval(challengeTimer);
  timeLeft = 180;
  updateTimer();
  
  challengeTimer = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      clearInterval(challengeTimer);
      checkRestoration();
    }
  }, 1000);
}

// 타이머 업데이트
function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('timeLeft').textContent = 
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 통계 업데이트
function updateStats() {
  document.getElementById('attempts').textContent = attempts;
}

// 정답 확인
function checkRestoration() {
  const restoredCanvas = document.getElementById('restoredCanvas');
  const ctx = restoredCanvas.getContext('2d');
  const restoredImage = ctx.getImageData(0, 0, restoredCanvas.width, restoredCanvas.height);
  
  let correctPixels = 0;
  const totalPixels = restoredImage.data.length / 4;
  
  for (let i = 0; i < restoredImage.data.length; i += 4) {
    if (restoredImage.data[i] === originalImage.data[i] &&
        restoredImage.data[i + 1] === originalImage.data[i + 1] &&
        restoredImage.data[i + 2] === originalImage.data[i + 2]) {
      correctPixels++;
    }
  }
  
  const accuracy = (correctPixels / totalPixels) * 100;
  document.getElementById('accuracy').textContent = `${accuracy.toFixed(1)}%`;
  attempts++;
  updateStats();
  
  if (accuracy === 100) {
    alert('축하합니다! 완벽하게 복원했습니다!');
    clearInterval(challengeTimer);
  }
}

// 다시 시작
function resetRestoration() {
  const restoredCanvas = document.getElementById('restoredCanvas');
  clearCanvas(restoredCanvas);
  startTimer();
  attempts = 0;
  updateStats();
}

// 캔버스 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
  const restoredCanvas = document.getElementById('restoredCanvas');
  const ctx = restoredCanvas.getContext('2d');
  
  restoredCanvas.addEventListener('mousedown', startDrawing);
  restoredCanvas.addEventListener('mousemove', draw);
  restoredCanvas.addEventListener('mouseup', stopDrawing);
  restoredCanvas.addEventListener('mouseout', stopDrawing);
});

// 그리기 시작
function startDrawing(e) {
  isDrawing = true;
  draw(e);
}

// 그리기
function draw(e) {
  if (!isDrawing) return;
  
  const canvas = e.target;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
  
  const color = document.getElementById('colorPicker').value;
  ctx.fillStyle = color;
  
  switch (currentTool) {
    case 'pencil':
      ctx.fillRect(x, y, 1, 1);
      break;
    case 'eraser':
      ctx.clearRect(x, y, 1, 1);
      break;
    case 'fill':
      floodFill(ctx, x, y, color);
      break;
  }
}

// 그리기 중지
function stopDrawing() {
  isDrawing = false;
}

// 플러드 필 알고리즘
function floodFill(ctx, x, y, fillColor) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  const startPos = (y * width + x) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  
  const fillR = parseInt(fillColor.slice(1, 3), 16);
  const fillG = parseInt(fillColor.slice(3, 5), 16);
  const fillB = parseInt(fillColor.slice(5, 7), 16);
  
  if (startR === fillR && startG === fillG && startB === fillB) return;
  
  const stack = [[x, y]];
  
  while (stack.length) {
    const [x, y] = stack.pop();
    const pos = (y * width + x) * 4;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (data[pos] !== startR || data[pos + 1] !== startG || data[pos + 2] !== startB) continue;
    
    data[pos] = fillR;
    data[pos + 1] = fillG;
    data[pos + 2] = fillB;
    
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  ctx.putImageData(imageData, 0, 0);
}
}); 