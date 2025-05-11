// 양자화 함수 (4비트: 0-15)
function quantize(value) {
  // -1 ~ 1 범위의 값을 0 ~ 15 범위로 변환
  const scaled = Math.round((value + 1) * 7.5);
  return Math.max(0, Math.min(15, scaled));
}

// 부호화 함수 (4비트)
function encode(value) {
  return value.toString(2).padStart(4, '0');
} 