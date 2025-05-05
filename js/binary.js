function convertToBinary() {
  const input = document.getElementById("decimalInput").value;
  const resultDiv = document.getElementById("binaryResult");
  const bitBox = document.getElementById("bitBox");

  if (input === "" || isNaN(input)) {
    resultDiv.innerHTML = "<p>숫자를 정확히 입력해주세요.</p>";
    bitBox.innerHTML = "";
    return;
  }

  const decimal = parseInt(input, 10);
  const binaryStr = decimal.toString(2);
  const bitCount = binaryStr.length;

  resultDiv.innerHTML = `<p><strong>${decimal}</strong>는 이진수로 <strong>${binaryStr}</strong> 입니다. (${bitCount}비트)</p>`;

  // 시각화
  bitBox.innerHTML = "";
  for (let bit of binaryStr.padStart(8, '0')) {
    const bitDiv = document.createElement("div");
    bitDiv.className = "bit";
    bitDiv.textContent = bit;
    bitBox.appendChild(bitDiv);
  }
}

// 퀴즈 관련 변수
let currentBinary = '';
let currentDecimal = 0;

function generateQuiz() {
  // 0부터 255 사이의 랜덤 숫자 생성
  currentDecimal = Math.floor(Math.random() * 256);
  currentBinary = currentDecimal.toString(2).padStart(8, '0');
  
  const questionDiv = document.getElementById('quizQuestion');
  questionDiv.innerHTML = `<p>이진수 <strong>${currentBinary}</strong>를 십진수로 변환하면?</p>`;
  
  // 입력 필드 초기화
  document.getElementById('quizAnswer').value = '';
  document.getElementById('quizResult').innerHTML = '';
}

function checkAnswer() {
  const userAnswer = parseInt(document.getElementById('quizAnswer').value);
  const resultDiv = document.getElementById('quizResult');
  
  if (isNaN(userAnswer)) {
    resultDiv.innerHTML = '<p class="warning">숫자를 입력해주세요.</p>';
    return;
  }
  
  if (userAnswer === currentDecimal) {
    resultDiv.innerHTML = '<p class="success">정답입니다! 🎉</p>';
    setTimeout(generateQuiz, 2000); // 2초 후 다음 문제
  } else {
    resultDiv.innerHTML = `<p class="error">틀렸습니다. 다시 한번 생각해보세요.</p>`;
  }
}

// 페이지 로드 시 퀴즈 생성
window.onload = function() {
  generateQuiz();
}; 