// 동영상 프레임 애니메이션 JS
const frameFilesInput = document.getElementById('frameFiles');
const frameThumbnails = document.getElementById('frameThumbnails');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const frameSpeed = document.getElementById('frameSpeed');
const frameSpeedValue = document.getElementById('frameSpeedValue');
const frameCanvas = document.getElementById('frameCanvas');
const ctx = frameCanvas.getContext('2d');
const MAX_FRAMES = 50; // 최대 프레임 수를 50으로 증가

let frames = [];
let currentFrame = 0;
let isPlaying = false;
let animationId = null;
let gif = null;

function resetPlayer() {
  currentFrame = 0;
  isPlaying = false;
  clearInterval(animationId);
  playBtn.disabled = false;
  pauseBtn.disabled = true;
}

function updateThumbnails() {
  frameThumbnails.innerHTML = '';
  frames.forEach((img, idx) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.title = `프레임 ${idx + 1}`;
    frameThumbnails.appendChild(thumb);
  });
}

function drawFrame(idx) {
  ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
  if (!frames[idx]) return;
  // 이미지 비율 유지하여 중앙에 그림
  const img = frames[idx];
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
  if (frames.length === 0) return;
  isPlaying = true;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  animationId = setInterval(() => {
    drawFrame(currentFrame);
    currentFrame = (currentFrame + 1) % frames.length;
  }, 1000 / parseInt(frameSpeed.value));
}

function pauseAnimation() {
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  clearInterval(animationId);
}

// GIF 저장 기능 수정
document.getElementById('saveBtn').addEventListener('click', async () => {
  if (frames.length === 0) return;
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'GIF 생성 중...';
  
  try {
    const canvas = document.getElementById('frameCanvas');
    const ctx = canvas.getContext('2d');
    
    // GIF 생성
    gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
      dither: false
    });
    
    // 각 프레임을 GIF에 추가
    for (let i = 0; i < frames.length; i++) {
      const img = frames[i];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 이미지 비율 유지하여 중앙에 그림
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const ratio = Math.min(canvasW / img.width, canvasH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const dx = (canvasW - drawW) / 2;
      const dy = (canvasH - drawH) / 2;
      
      ctx.drawImage(img, dx, dy, drawW, drawH);
      
      // 프레임 추가
      gif.addFrame(ctx, {
        copy: true,
        delay: 1000 / parseInt(frameSpeed.value)
      });
    }
    
    // GIF 렌더링
    gif.on('finished', function(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      saveBtn.disabled = false;
      saveBtn.textContent = 'GIF 저장';
    });
    
    gif.render();
  } catch (error) {
    console.error('GIF 생성 중 오류 발생:', error);
    saveBtn.disabled = false;
    saveBtn.textContent = 'GIF 저장';
  }
});

// 프레임 업로드 핸들러 수정
document.getElementById('frameFiles').addEventListener('change', function(e) {
  const files = Array.from(e.target.files).slice(0, MAX_FRAMES);
  frames = [];
  currentFrame = 0;
  
  const thumbnails = document.getElementById('frameThumbnails');
  thumbnails.innerHTML = '';
  
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        frames.push(img);
        
        // 썸네일 생성
        const thumbnail = document.createElement('div');
        thumbnail.className = 'frame-thumbnail';
        thumbnail.innerHTML = `
          <img src="${e.target.result}" alt="Frame ${index + 1}" />
          <span>${index + 1}</span>
        `;
        thumbnails.appendChild(thumbnail);
        
        // 모든 프레임이 로드되면 저장 버튼 활성화
        if (frames.length === files.length) {
          document.getElementById('saveBtn').disabled = false;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
});

playBtn.addEventListener('click', () => {
  if (frames.length === 0) return;
  if (!isPlaying) {
    playAnimation();
  }
});
pauseBtn.addEventListener('click', () => {
  pauseAnimation();
});
frameSpeed.addEventListener('input', () => {
  frameSpeedValue.textContent = frameSpeed.value;
  if (isPlaying) {
    pauseAnimation();
    playAnimation();
  }
});

// 최초 진입 시 초기화
resetPlayer(); 