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
    const thumb = document.createElement('div');
    thumb.className = 'frame-thumbnail';
    thumb.draggable = true;
    thumb.dataset.index = idx;
    
    thumb.innerHTML = `
      <img src="${img.src}" alt="Frame ${idx + 1}" />
      <span>${idx + 1}</span>
    `;
    
    // 드래그 시작 이벤트
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', idx);
      thumb.classList.add('dragging');
    });
    
    // 드래그 종료 이벤트
    thumb.addEventListener('dragend', () => {
      thumb.classList.remove('dragging');
    });
    
    // 드래그 오버 이벤트
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = frameThumbnails.querySelector('.dragging');
      if (dragging !== thumb) {
        const rect = thumb.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          thumb.parentNode.insertBefore(dragging, thumb);
        } else {
          thumb.parentNode.insertBefore(dragging, thumb.nextSibling);
        }
        // 드래그 중에도 프레임 순서 업데이트
        updateFrameOrder();
      }
    });
    
    frameThumbnails.appendChild(thumb);
  });
  
  // 프레임 순서 업데이트
  updateFrameOrder();
}

// 프레임 순서 업데이트
function updateFrameOrder() {
  const newFrames = [];
  const thumbnails = frameThumbnails.querySelectorAll('.frame-thumbnail');
  
  thumbnails.forEach((thumb, idx) => {
    const oldIndex = parseInt(thumb.dataset.index);
    newFrames.push(frames[oldIndex]);
    thumb.dataset.index = idx;
    thumb.querySelector('span').textContent = idx + 1;
  });
  
  frames = newFrames;
  
  // 현재 재생 중이었다면 재생 상태 유지
  if (isPlaying) {
    pauseAnimation();
    playAnimation();
  } else {
    // 현재 프레임 다시 그리기
    drawFrame(currentFrame);
  }
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
    
    // GIF 인코더 설정
    const gif = new GIF({
      workers: 0,
      quality: 10,
      width: frameCanvas.width,
      height: frameCanvas.height,
      dither: false,
      workerScript: null,
      background: '#ffffff',
      repeat: 0
    });
    
    // 프레임 추가
    console.log('📝 프레임 추가 시작');
    for (let i = 0; i < frames.length; i++) {
      drawFrame(i);
      gif.addFrame(ctx, {
        copy: true,
        delay: 1000 / parseInt(frameSpeed.value)
      });
      
      const percent = Math.round(((i + 1) / frames.length) * 100);
      console.log(`🔄 프레임 ${i + 1}/${frames.length} 처리 완료 (${percent}%)`);
      progressText.textContent = `GIF 생성 중... ${percent}%`;
      progressBar.style.width = `${percent}%`;
    }
    
    // GIF 생성 완료 이벤트
    gif.on('finished', (blob) => {
      console.log('✅ GIF 생성 완료');
      console.log(`📦 파일 크기: ${(blob.size / 1024).toFixed(2)}KB`);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animation_${new Date().getTime()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      saveBtn.disabled = false;
      saveBtn.textContent = 'GIF 저장';
      progressDiv.style.display = 'none';
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
    alert('GIF 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}

// 이벤트 리스너 설정
document.getElementById('saveBtn').addEventListener('click', createAndSaveGIF);

frameFilesInput.addEventListener('change', async function(e) {
  const files = Array.from(e.target.files).slice(0, MAX_FRAMES);
  frames = [];
  currentFrame = 0;
  
  const thumbnails = document.getElementById('frameThumbnails');
  thumbnails.innerHTML = '';
  
  // 파일 이름으로 정렬
  files.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    return nameA.localeCompare(nameB, undefined, {numeric: true});
  });
  
  // 순차적으로 파일 처리
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    
    // Promise로 FileReader 래핑
    const imageData = await new Promise((resolve) => {
      reader.onload = function(e) {
      const img = new Image();
        img.onload = function() {
          resolve(img);
      };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
    
    frames.push(imageData);
  }
  
  // 썸네일 업데이트
  updateThumbnails();
  
  // 모든 프레임이 로드되면 저장 버튼 활성화
  if (frames.length > 0) {
    document.getElementById('saveBtn').disabled = false;
  }
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