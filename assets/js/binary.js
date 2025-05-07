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
let currentBits = 3; // 기본 난이도: 3비트
let score = 0;
let consecutiveCorrect = 0;

// 난이도 선택 이벤트 리스너
document.addEventListener('DOMContentLoaded', function () {
  const difficultyButtons = document.querySelectorAll('.difficulty-btn');
  difficultyButtons.forEach(button => {
    button.addEventListener('click', function () {
      // 이전 선택 제거
      difficultyButtons.forEach(btn => btn.classList.remove('active'));
      // 현재 선택 활성화
      this.classList.add('active');
      // 난이도 설정
      currentBits = parseInt(this.dataset.bits);
      // 난이도 표시 업데이트
      document.getElementById('currentDifficulty').textContent = `현재 난이도: ${currentBits}비트`;
    });
  });

  // 기본 난이도 버튼 활성화
  difficultyButtons[0].classList.add('active');
});

// 모달 열기
function startQuiz() {
  generateQuiz();
  const modal = document.getElementById('quizModal');
  modal.classList.add('show');
  document.getElementById('quizAnswer').value = '';
  document.getElementById('quizResult').textContent = '';
  document.getElementById('quizResult').className = 'quiz-result';
  document.getElementById('quizScore').textContent = `점수: ${score}`;
}

// 모달 닫기
function closeQuizModal() {
  const modal = document.getElementById('quizModal');
  modal.classList.remove('show');
}

// 퀴즈 생성
function generateQuiz() {
  const maxValue = Math.pow(2, currentBits) - 1;
  currentDecimal = Math.floor(Math.random() * (maxValue + 1));
  currentBinary = currentDecimal.toString(2).padStart(currentBits, '0');
  document.getElementById('quizQuestion').textContent = `이진수 ${currentBinary}를 십진수로 변환하면?`;
}

// 정답 확인
function checkAnswer() {
  const userAnswer = parseInt(document.getElementById('quizAnswer').value);
  const resultDiv = document.getElementById('quizResult');

  if (isNaN(userAnswer)) {
    resultDiv.textContent = '숫자를 입력해주세요.';
    resultDiv.className = 'quiz-result incorrect';
    return;
  }

  if (userAnswer === currentDecimal) {
    // 연속 정답 카운트 증가
    consecutiveCorrect++;
    // 점수 계산 (난이도에 따라 가중치 부여)
    const points = currentBits * consecutiveCorrect;
    score += points;

    resultDiv.textContent = `정답입니다! 🎉 (+${points}점)`;
    resultDiv.className = 'quiz-result correct';

    // 점수 업데이트
    document.getElementById('quizScore').textContent = `점수: ${score}`;

    setTimeout(() => {
      generateQuiz();
      document.getElementById('quizAnswer').value = '';
      resultDiv.textContent = '';
      resultDiv.className = 'quiz-result';
    }, 2000);
  } else {
    // 연속 정답 카운트 초기화
    consecutiveCorrect = 0;
    resultDiv.textContent = `틀렸습니다. 정답은 ${currentDecimal}입니다.`;
    resultDiv.className = 'quiz-result incorrect';
  }
}

// Enter 키로 정답 확인
document.getElementById('quizAnswer').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    checkAnswer();
  }
});

// 모달 외부 클릭 시 닫기
window.onclick = function (event) {
  const modal = document.getElementById('quizModal');
  if (event.target === modal) {
    closeQuizModal();
  }
}

// 페이지 로드 시 퀴즈 생성
window.onload = function () {
  generateQuiz();
}; 