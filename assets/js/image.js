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

document.getElementById('imageLoader').addEventListener('change', handleImage, false);

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