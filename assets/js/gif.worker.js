importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js');

self.onmessage = function(e) {
  const { frames, width, height, fps, quality } = e.data;
  
  const gif = new GIF({
    workers: 0,
    quality: quality,
    width: width,
    height: height,
    dither: false
  });

  gif.on('progress', function(p) {
    self.postMessage({ type: 'progress', progress: p });
  });

  gif.on('finished', function(blob) {
    self.postMessage({ type: 'finished', blob: blob });
  });

  frames.forEach(frame => {
    gif.addFrame(frame, { delay: 1000 / fps });
  });

  gif.render();
}; 