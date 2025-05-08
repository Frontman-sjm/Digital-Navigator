function convertToASCIIAndUnicode() {
  const input = document.getElementById("asciiInput").value.trim();
  const asciiResult = document.getElementById("asciiResult");
  const unicodeResult = document.getElementById("unicodeResult");

  if (input === "") {
    asciiResult.innerHTML = "<p class='warning'>문자를 입력해주세요.</p>";
    unicodeResult.innerHTML = "";
    return;
  }

  let asciiHTML = "<div class='card'><h3>ASCII 코드</h3><ul>";
  let unicodeHTML = "<div class='card'><h3>유니코드</h3><ul>";
  let hasASCII = false;

  // 각 문자별로 ASCII와 유니코드 값 표시
  for (const char of input) {
    const code = char.charCodeAt(0);
    const asciiValue = code <= 127 ? code : '지원 안 함';
    const unicodeValue = 'U+' + code.toString(16).toUpperCase().padStart(4, '0');

    asciiHTML += `
      <li>
        <strong>${char}</strong>: ${asciiValue}
        ${code > 127 ? '<span class="warning">(ASCII는 영문자, 숫자, 특수문자만 지원)</span>' : ''}
      </li>`;
    unicodeHTML += `<li><strong>${char}</strong>: ${unicodeValue}</li>`;

    if (code <= 127) {
      hasASCII = true;
    }
  }

  // ASCII 범위 내의 문자에 대해서만 이진수 표현 추가
  if (hasASCII) {
    const binaryString = Array.from(input)
      .filter(char => char.charCodeAt(0) <= 127)
      .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
      .join(' ');

    asciiHTML += `
      </ul>
      <div class="binary-representation">
        <h4>이진수 표현 (ASCII 문자만)</h4>
        <p>${binaryString}</p>
      </div>
    </div>`;
  } else {
    asciiHTML += `
      </ul>
      <div class="binary-representation">
        <p class="warning">ASCII 범위를 벗어나는 문자만 있어 이진수 표현이 없습니다.</p>
      </div>
    </div>`;
  }

  unicodeHTML += "</ul></div>";

  asciiResult.innerHTML = asciiHTML;
  unicodeResult.innerHTML = unicodeHTML;
}

// 이진코드를 문자로 변환
function convertBinaryToChar() {
  const binaryInput = document.getElementById('binaryInput').value.trim();
  const resultDiv = document.getElementById('binaryResult');

  if (binaryInput === '') {
    resultDiv.innerHTML = '<p class="warning">이진코드를 입력해주세요.</p>';
    return;
  }

  // 이진코드 유효성 검사
  if (!/^[01\s]+$/.test(binaryInput)) {
    const invalidChars = binaryInput.replace(/[01\s]/g, '');
    resultDiv.innerHTML = `
      <p class="error">
        올바른 이진코드를 입력해주세요.<br>
        잘못된 문자: ${invalidChars.split('').join(', ')}<br>
        이진코드는 0과 1만 사용 가능합니다.
      </p>`;
    return;
  }

  // 공백으로 구분된 이진수들을 배열로 변환
  const binaryChunks = binaryInput.split(/\s+/).filter(chunk => chunk.length > 0);

  // 띄어쓰기 검사
  if (binaryChunks.length === 1 && binaryInput.length > 8) {
    resultDiv.innerHTML = `
      <p class="error">
        이진코드 사이에 띄어쓰기가 필요합니다.<br>
        예시: 01001000 01101001 (Hi)
      </p>`;
    return;
  }

  let result = '';
  let decimalValues = [];
  let hexValues = [];
  let invalidChunks = [];

  for (const chunk of binaryChunks) {
    // 8비트가 아닌 경우 처리
    if (chunk.length !== 8) {
      invalidChunks.push(chunk);
    } else {
      const decimal = parseInt(chunk, 2);
      if (decimal <= 127) {
        result += String.fromCharCode(decimal);
        decimalValues.push(decimal);
        hexValues.push(decimal.toString(16).toUpperCase().padStart(2, '0'));
      } else {
        invalidChunks.push(chunk);
      }
    }
  }

  if (invalidChunks.length > 0) {
    resultDiv.innerHTML = `
      <p class="error">
        잘못된 이진코드가 있습니다:<br>
        ${invalidChunks.map(chunk =>
      `${chunk} (${chunk.length}비트${chunk.length === 8 ? ', ASCII 범위 초과' : ''})`
    ).join('<br>')}
      </p>`;
    return;
  }

  if (result === '') {
    resultDiv.innerHTML = '<p class="warning">변환 가능한 이진코드가 없습니다.</p>';
    return;
  }

  resultDiv.innerHTML = `
    <div class="card">
      <h3>변환 결과</h3>
      <div class="result-content">
        <p>문자열: <strong>${result}</strong></p>
        <p>십진수: ${decimalValues.join(', ')}</p>
        <p>16진수: ${hexValues.join(', ')}</p>
        <p>ASCII 코드: ${result.split('').map(char => char.charCodeAt(0)).join(', ')}</p>
      </div>
    </div>
  `;
}

// 빙고 게임 클래스 정의
class BingoGame {
  constructor() {
    this.bingoCount = 0;
    this.selectedCells = new Set();
    this.currentBoard = [];
    this.isInitialized = false;
    this.boardCount = 0;

    // DOM 요소 캐싱
    this.elements = {
      board: document.getElementById('bingoBoard'),
      bingoCount: document.getElementById('bingoCount'),
      boardCount: document.getElementById('boardCount'),
      createButton: document.getElementById('createBoardBtn'),
      rowsInput: document.getElementById('bingoRows'),
      colsInput: document.getElementById('bingoCols'),
      resultDiv: document.getElementById('bingoResult')
    };

    // 이벤트 바인딩
    this.boundCreateEmptyBoard = this.createEmptyBoard.bind(this);
    this.boundResetGame = this.resetGame.bind(this);
  }

  initialize() {
    if (this.isInitialized) return;

    // 저장된 빙고판 생성 횟수 불러오기
    const savedCount = localStorage.getItem('bingoBoardCount');
    if (savedCount) {
      this.boardCount = parseInt(savedCount);
      if (this.boardCount >= 5) {
        alert('이전 게임에서 빙고판 생성 횟수가 5회를 초과했습니다. 게임을 재시작합니다.');
        this.resetGame();
        return;
      }
    }

    // 이벤트 리스너 등록
    this.elements.createButton.addEventListener('click', this.boundCreateEmptyBoard);
    document.getElementById('resetGameBtn')?.addEventListener('click', this.boundResetGame);

    this.isInitialized = true;
  }

  createEmptyBoard() {
    const rows = parseInt(this.elements.rowsInput.value);
    const cols = parseInt(this.elements.colsInput.value);

    if (!this.validateBoardSize(rows, cols)) {
      return;
    }

    this.boardCount++;  // 빙고판 생성 시 카운트 증가
    this.resetBoard();
    this.generateEmptyBoard(rows, cols);
    this.updateBoardCount();  // 생성 횟수 표시 업데이트
  }

  validateBoardSize(rows, cols) {
    if (rows < 3 || rows > 10 || cols < 3 || cols > 10) {
      alert('행과 열은 3에서 10 사이의 값이어야 합니다.');
      return false;
    }
    return true;
  }

  resetBoard() {
    this.elements.board.innerHTML = '';
    this.selectedCells.clear();
    this.bingoCount = 0;
    this.elements.bingoCount.textContent = this.bingoCount;
    this.currentBoard = [];
  }

  generateEmptyBoard(rows, cols) {
    this.elements.board.style.gridTemplateColumns = `repeat(${cols}, 80px)`;

    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push(null);
        this.createEmptyCell(i, j);
      }
      this.currentBoard.push(row);
    }
  }

  createEmptyCell(row, col) {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell empty';
    cell.innerHTML = `
      <input type="text" maxlength="1" class="char-input" placeholder="문자">
      <div class="ascii"></div>
    `;

    const input = cell.querySelector('.char-input');
    input.addEventListener('input', (e) => this.updateCellContent(e, cell, row, col));
    input.addEventListener('click', (e) => e.stopPropagation());

    cell.addEventListener('click', () => this.toggleCell(cell, row, col));
    this.elements.board.appendChild(cell);
  }

  updateCellContent(event, cell, row, col) {
    const input = event.target;
    const char = input.value;
    const asciiDiv = cell.querySelector('.ascii');

    if (char) {
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) {
        asciiDiv.textContent = code;
        this.currentBoard[row][col] = char;
        cell.classList.remove('empty');
      } else {
        input.value = '';
        asciiDiv.textContent = '';
        this.currentBoard[row][col] = null;
        cell.classList.add('empty');
        alert('ASCII 문자만 입력 가능합니다 (32-126).');
      }
    } else {
      asciiDiv.textContent = '';
      this.currentBoard[row][col] = null;
      cell.classList.add('empty');
    }
  }

  toggleCell(cell, row, col) {
    if (this.currentBoard[row][col] === null) {
      alert('먼저 문자를 입력해주세요.');
      return;
    }

    const cellKey = `${row},${col}`;
    if (this.selectedCells.has(cellKey)) {
      cell.classList.remove('selected');
      this.selectedCells.delete(cellKey);
    } else {
      cell.classList.add('selected');
      this.selectedCells.add(cellKey);
    }
    this.checkBingo();
  }

  checkBingo() {
    const rows = this.currentBoard.length;
    const cols = this.currentBoard[0].length;
    let newBingoCount = 0;

    // 가로 빙고 체크
    for (let i = 0; i < rows; i++) {
      if (this.isLineComplete(i, 0, 0, 1)) newBingoCount++;
    }

    // 세로 빙고 체크
    for (let j = 0; j < cols; j++) {
      if (this.isLineComplete(0, j, 1, 0)) newBingoCount++;
    }

    // 대각선 빙고 체크 (정사각형인 경우에만)
    if (rows === cols) {
      if (this.isLineComplete(0, 0, 1, 1)) newBingoCount++;
      if (this.isLineComplete(0, cols - 1, 1, -1)) newBingoCount++;
    }

    this.updateBingoCount(newBingoCount);
  }

  isLineComplete(startRow, startCol, rowStep, colStep) {
    const rows = this.currentBoard.length;
    const cols = this.currentBoard[0].length;

    for (let i = 0; i < rows; i++) {
      const row = startRow + i * rowStep;
      const col = startCol + i * colStep;

      if (row >= rows || col >= cols || row < 0 || col < 0) return false;
      if (!this.selectedCells.has(`${row},${col}`)) return false;
    }
    return true;
  }

  updateBingoCount(newCount) {
    this.bingoCount = newCount;
    this.elements.bingoCount.textContent = this.bingoCount;

    if (this.bingoCount >= 3) {
      this.showGameResult();
    }
  }

  showGameResult() {
    this.elements.resultDiv.style.display = 'flex';
  }

  updateBoardCount() {
    // 빙고판 생성 횟수를 로컬 스토리지에 저장
    localStorage.setItem('bingoBoardCount', this.boardCount);

    // 화면에 생성 횟수 표시
    this.elements.boardCount.textContent = this.boardCount;

    // 생성 횟수가 5회 이상이면 경고 메시지 표시
    if (this.boardCount >= 5) {
      alert('빙고판 생성 횟수가 5회를 초과했습니다. 게임을 재시작해주세요.');
      this.resetGame();
    }
  }

  resetGame() {
    this.elements.resultDiv.style.display = 'none';
    this.boardCount = 0;  // 게임 재시작 시 카운트 초기화
    localStorage.removeItem('bingoBoardCount');  // 로컬 스토리지에서도 제거
    this.createEmptyBoard();
  }
}

// 페이지 로드 시 게임 초기화
window.onload = function () {
  const game = new BingoGame();
  game.initialize();
}; 