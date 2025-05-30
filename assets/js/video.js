// 동영상 프레임 애니메이션 JS
const frameFilesInput = document.getElementById('frameFiles');
const frameThumbnails = document.getElementById('frameThumbnails');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const frameSpeed = document.getElementById('frameSpeed');
const frameSpeedValue = document.getElementById('frameSpeedValue');
const frameCanvas = document.getElementById('frameCanvas');
const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
const MAX_FRAMES = 50;

let frames = [];
let currentFrame = 0;
let isPlaying = false;
let animationId = null;

// 플레이어 초기화
function resetPlayer() {
  currentFrame = 0;
  isPlaying = false;
  clearInterval(animationId);
  playBtn.disabled = false;
  pauseBtn.disabled = true;
}

// 썸네일 업데이트
function updateThumbnails() {
  frameThumbnails.innerHTML = '';
  frames.forEach((img, idx) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.title = `프레임 ${idx + 1}`;
    frameThumbnails.appendChild(thumb);
  });
}

// 프레임 그리기
function drawFrame(idx) {
  ctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
  if (!frames[idx]) return;
  
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

// 애니메이션 재생
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

// 애니메이션 일시정지
function pauseAnimation() {
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  clearInterval(animationId);
}

// GIF 생성 및 저장
async function createAndSaveGIF() {
  if (frames.length === 0) return;
  
  const saveBtn = document.getElementById('saveBtn');
  const progressDiv = document.getElementById('gifProgress');
  const progressText = document.getElementById('progressText');
  const progressBar = document.getElementById('progressBar');
  
  try {
    console.log('🎬 GIF 생성 시작');
    console.log(`📊 설정: ${frames.length}개 프레임, ${frameSpeed.value}fps`);
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'GIF 생성 중...';
    progressDiv.style.display = 'block';
    progressText.textContent = 'GIF 생성 중... 0%';
    progressBar.style.width = '0%';
    
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: frameCanvas.width,
      height: frameCanvas.height,
      dither: false
    });
    
    // 진행 상황 업데이트 함수
    const updateProgress = (progress, stage) => {
      const percent = Math.round(progress * 100);
      console.log(`🔄 ${stage}: ${percent}% 완료`);
      progressText.textContent = `GIF 생성 중... ${percent}%`;
      progressBar.style.width = `${percent}%`;
    };
    
    console.log('📝 프레임 추가 시작');
    // 프레임 추가
    for (let i = 0; i < frames.length; i++) {
      drawFrame(i);
      gif.addFrame(ctx, {
        copy: true,
        delay: 1000 / parseInt(frameSpeed.value)
      });
      updateProgress((i + 1) / frames.length, `프레임 ${i + 1}/${frames.length} 처리`);
    }
    
    // GIF 생성 완료 이벤트
    gif.on('finished', (blob) => {
      console.log('✅ GIF 생성 완료');
      console.log(`📦 파일 크기: ${(blob.size / 1024).toFixed(2)}KB`);
      
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
      progressDiv.style.display = 'none';
    });
    
    // 렌더링 진행 상황 이벤트
    gif.on('progress', (p) => {
      const percent = Math.round(p * 100);
      console.log(`🎨 렌더링 진행 중: ${percent}%`);
      progressText.textContent = `GIF 렌더링 중... ${percent}%`;
      progressBar.style.width = `${percent}%`;
    });
    
    // GIF 렌더링 시작
    console.log('🎨 GIF 렌더링 시작');
    progressText.textContent = 'GIF 렌더링 중...';
    gif.render();
    
  } catch (error) {
    console.error('❌ GIF 생성 중 오류 발생:', error);
    console.error('상세 오류 정보:', {
      message: error.message,
      stack: error.stack,
      frames: frames.length,
      canvasSize: `${frameCanvas.width}x${frameCanvas.height}`
    });
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'GIF 저장';
    progressDiv.style.display = 'none';
  }
}

// 이벤트 리스너 설정
document.getElementById('saveBtn').addEventListener('click', createAndSaveGIF);

frameFilesInput.addEventListener('change', function(e) {
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
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'frame-thumbnail';
        thumbnail.innerHTML = `
          <img src="${e.target.result}" alt="Frame ${index + 1}" />
          <span>${index + 1}</span>
        `;
        thumbnails.appendChild(thumbnail);
        
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

// 초기화
resetPlayer(); 