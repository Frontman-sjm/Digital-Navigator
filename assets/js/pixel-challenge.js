const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const resolutionSelect = document.getElementById("resolution");
const nameInput = document.getElementById("nameInput");
const imgUpload = document.getElementById("imgUpload");

let sourceImageCanvas = document.createElement("canvas");
sourceImageCanvas.width = 800;
sourceImageCanvas.height = 600;
let sourceCtx = sourceImageCanvas.getContext("2d");

// 초기 빈 상태
resetSourceCanvas();

function resetSourceCanvas() {
  sourceCtx.fillStyle = "white";
  sourceCtx.fillRect(0, 0, 800, 600);
}

function renderName() {
  const name = nameInput.value.trim();
  if (!name) return alert("이름을 입력해주세요.");

  resetSourceCanvas();
  sourceCtx.fillStyle = "black";
  sourceCtx.font = "bold 100px sans-serif";
  sourceCtx.textAlign = "center";
  sourceCtx.textBaseline = "middle";
  sourceCtx.fillText(name, 400, 300);

  applyResolution();
}

imgUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = () => {
      resetSourceCanvas();
      const aspectRatio = img.width / img.height;
      const targetRatio = 800 / 600;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (aspectRatio > targetRatio) {
        drawWidth = 800;
        drawHeight = 800 / aspectRatio;
        offsetX = 0;
        offsetY = (600 - drawHeight) / 2;
      } else {
        drawHeight = 600;
        drawWidth = 600 * aspectRatio;
        offsetX = (800 - drawWidth) / 2;
        offsetY = 0;
      }

      sourceCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      applyResolution();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

function applyResolution() {
  const resWidth = parseInt(resolutionSelect.value);
  const resHeight = Math.round(resWidth * 0.75);
  const cellWidth = canvas.width / resWidth;
  const cellHeight = canvas.height / resHeight;

  const imageData = sourceCtx.getImageData(0, 0, 800, 600).data;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < resHeight; y++) {
    for (let x = 0; x < resWidth; x++) {
      const srcX = Math.floor(x * (800 / resWidth));
      const srcY = Math.floor(y * (600 / resHeight));
      const idx = (srcY * 800 + srcX) * 4;

      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }

  drawGrid(resWidth, resHeight);
}

function drawGrid(cols, rows) {
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += cellWidth) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += cellHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function downloadImage() {
  const link = document.createElement("a");
  const name = nameInput.value.trim() || "pixel_image";
  link.download = `${name}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

// 초기 해상도 반영
applyResolution(); 