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

  for (const char of input) {
    const code = char.charCodeAt(0);
    asciiHTML += `<li><strong>${char}</strong>: ${code <= 127 ? code : '지원 안 함'}</li>`;
    unicodeHTML += `<li><strong>${char}</strong>: U+${code.toString(16).toUpperCase().padStart(4, '0')}</li>`;
  }

  asciiHTML += "</ul></div>";
  unicodeHTML += "</ul></div>";

  asciiResult.innerHTML = asciiHTML;
  unicodeResult.innerHTML = unicodeHTML;
}

// ASCII 코드 표 생성
function generateASCIITable() {
  const controlCharsTable = document.getElementById('controlCharsTable');
  const printableCharsTable = document.getElementById('printableCharsTable');
  
  const controlCharDescriptions = {
    0: '널 문자 (NUL)',
    7: '벨 (BEL)',
    8: '백스페이스 (BS)',
    9: '수평 탭 (HT)',
    10: '줄 바꿈 (LF)',
    13: '캐리지 리턴 (CR)',
    27: '이스케이프 (ESC)',
    32: '공백 (SP)'
  };

  const printableCharDescriptions = {
    33: '느낌표',
    34: '큰따옴표',
    35: '샵',
    36: '달러',
    37: '퍼센트',
    38: '앰퍼샌드',
    39: '작은따옴표',
    40: '여는 괄호',
    41: '닫는 괄호',
    42: '별표',
    43: '더하기',
    44: '쉼표',
    45: '빼기',
    46: '마침표',
    47: '슬래시',
    48: '숫자 0',
    57: '숫자 9',
    65: '대문자 A',
    90: '대문자 Z',
    97: '소문자 a',
    122: '소문자 z'
  };

  // 제어 문자 표 생성 (0-31)
  for (let i = 0; i <= 31; i++) {
    const row = document.createElement('tr');
    const binary = i.toString(2).padStart(8, '0');
    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const description = controlCharDescriptions[i] || '제어 문자';
    
    row.innerHTML = `
      <td>${binary}</td>
      <td>${i}</td>
      <td>0x${hex}</td>
      <td class="control-char">${i < 32 ? 'CTRL' : String.fromCharCode(i)}</td>
      <td>${description}</td>
    `;
    controlCharsTable.appendChild(row);
  }

  // 인쇄 가능 문자 표 생성 (32-127)
  for (let i = 32; i <= 127; i++) {
    const row = document.createElement('tr');
    const binary = i.toString(2).padStart(8, '0');
    const hex = i.toString(16).toUpperCase().padStart(2, '0');
    const char = String.fromCharCode(i);
    const description = printableCharDescriptions[i] || '';
    
    row.innerHTML = `
      <td>${binary}</td>
      <td>${i}</td>
      <td>0x${hex}</td>
      <td class="printable-char">${char}</td>
      <td>${description}</td>
    `;
    printableCharsTable.appendChild(row);
  }
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
  if (!/^[01]+$/.test(binaryInput)) {
    resultDiv.innerHTML = '<p class="error">올바른 이진코드를 입력해주세요 (0과 1만 사용 가능).</p>';
    return;
  }

  // 8비트 단위로 분리
  const binaryChunks = binaryInput.match(/.{1,8}/g);
  let result = '';
  let decimalValues = [];

  for (const chunk of binaryChunks) {
    const decimal = parseInt(chunk, 2);
    if (decimal <= 127) {
      result += String.fromCharCode(decimal);
      decimalValues.push(decimal);
    }
  }

  resultDiv.innerHTML = `
    <div class="card">
      <h3>변환 결과</h3>
      <p>문자: <strong>${result}</strong></p>
      <p>십진수: ${decimalValues.join(', ')}</p>
      <p>ASCII 코드: ${result.split('').map(char => char.charCodeAt(0)).join(', ')}</p>
    </div>
  `;
}

// 페이지 로드 시 ASCII 코드 표 생성
window.onload = function() {
  generateASCIITable();
}; 