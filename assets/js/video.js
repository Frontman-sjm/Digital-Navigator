// 동영상 프레임 애니메이션 JS
const frameFilesInput = document.getElementById('frameFiles');
const frameThumbnails = document.getElementById('frameThumbnails');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const frameSpeed = document.getElementById('frameSpeed');
const frameSpeedValue = document.getElementById('frameSpeedValue');
const frameCanvas = document.getElementById('frameCanvas');
const ctx = frameCanvas.getContext('2d');

let frameImages = [];
let frameIndex = 0;
let playing = false;
let timer = null;

function resetPlayer() {
  frameIndex = 0;
  playing = false;
  clearInterval(timer);
  playBtn.disabled = false;
  pauseBtn.disabled = true;
}

function updateThumbnails() {
  frameThumbnails.innerHTML = '';
  frameImages.forEach((img, idx) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.title = `프레임 ${idx + 1}`;
    frameThumbnails.appendChild(thumb);
  });
}

function drawFrame(idx) {
  ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
  if (!frameImages[idx]) return;
  // 이미지 비율 유지하여 중앙에 그림
  const img = frameImages[idx];
  const canvasW = frameCanvas.width;
  const canvasH = frameCanvas.height;
  const ratio = Math.min(canvasW / img.width, canvasH / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;
  const dx = (canvasW - drawW) / 2;
  const dy = (canvasH - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function playAnimation() {
  if (frameImages.length === 0) return;
  playing = true;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  timer = setInterval(() => {
    drawFrame(frameIndex);
    frameIndex = (frameIndex + 1) % frameImages.length;
  }, 1000 / parseInt(frameSpeed.value));
}

function pauseAnimation() {
  playing = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  clearInterval(timer);
}

frameFilesInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files).slice(0, 20); // 최대 20장
  frameImages = [];
  if (files.length === 0) {
    ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
    updateThumbnails();
    resetPlayer();
    return;
  }
  let loaded = 0;
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        frameImages[idx] = img;
        loaded++;
        if (loaded === files.length) {
          updateThumbnails();
          drawFrame(0);
          resetPlayer();
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
});

playBtn.addEventListener('click', () => {
  if (frameImages.length === 0) return;
  if (!playing) {
    playAnimation();
  }
});
pauseBtn.addEventListener('click', () => {
  pauseAnimation();
});
frameSpeed.addEventListener('input', () => {
  frameSpeedValue.textContent = frameSpeed.value;
  if (playing) {
    pauseAnimation();
    playAnimation();
  }
});

// 최초 진입 시 초기화
resetPlayer(); 