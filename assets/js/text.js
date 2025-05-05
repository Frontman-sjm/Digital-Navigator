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
  }

  // 전체 문자열의 이진수 표현 추가
  const binaryString = Array.from(input).map(char => 
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join(' ');

  asciiHTML += `
    </ul>
    <div class="binary-representation">
      <h4>이진수 표현</h4>
      <p>${binaryString}</p>
    </div>
  </div>`;

  unicodeHTML += "</ul></div>";

  asciiResult.innerHTML = asciiHTML;
  unicodeResult.innerHTML = unicodeHTML;
}

// ASCII 코드 표 생성
function generateASCIITable() {
  const table = document.getElementById('asciiTable');
  const controlChars = document.getElementById('controlChars');
  const printableChars = document.getElementById('printableChars');
  
  // 제어 문자 설명
  const controlCharDescriptions = {
    0: '널 문자 (Null)',
    1: '헤더 시작 (Start of Header)',
    2: '텍스트 시작 (Start of Text)',
    3: '텍스트 종료 (End of Text)',
    4: '전송 종료 (End of Transmission)',
    5: '조회 (Enquiry)',
    6: '확인 (Acknowledge)',
    7: '벨 (Bell)',
    8: '백스페이스 (Backspace)',
    9: '수평 탭 (Horizontal Tab)',
    10: '줄 바꿈 (Line Feed)',
    11: '수직 탭 (Vertical Tab)',
    12: '폼 피드 (Form Feed)',
    13: '캐리지 리턴 (Carriage Return)',
    14: '시프트 아웃 (Shift Out)',
    15: '시프트 인 (Shift In)',
    16: '데이터 링크 이스케이프 (Data Link Escape)',
    17: '장치 제어 1 (Device Control 1)',
    18: '장치 제어 2 (Device Control 2)',
    19: '장치 제어 3 (Device Control 3)',
    20: '장치 제어 4 (Device Control 4)',
    21: '부정 확인 (Negative Acknowledge)',
    22: '동기 유휴 (Synchronous Idle)',
    23: '전송 블록 종료 (End of Transmission Block)',
    24: '취소 (Cancel)',
    25: '매체 종료 (End of Medium)',
    26: '대체 (Substitute)',
    27: '이스케이프 (Escape)',
    28: '파일 구분자 (File Separator)',
    29: '그룹 구분자 (Group Separator)',
    30: '레코드 구분자 (Record Separator)',
    31: '단위 구분자 (Unit Separator)',
    127: '삭제 (Delete)'
  };

  // 출력 가능 문자 설명
  const printableCharDescriptions = {
    32: '공백 (Space)',
    33: '느낌표 (Exclamation Mark)',
    34: '큰따옴표 (Double Quote)',
    35: '샵 (Number Sign)',
    36: '달러 기호 (Dollar Sign)',
    37: '퍼센트 기호 (Percent Sign)',
    38: '앰퍼샌드 (Ampersand)',
    39: '작은따옴표 (Single Quote)',
    40: '여는 괄호 (Left Parenthesis)',
    41: '닫는 괄호 (Right Parenthesis)',
    42: '별표 (Asterisk)',
    43: '더하기 기호 (Plus Sign)',
    44: '쉼표 (Comma)',
    45: '하이픈 (Hyphen)',
    46: '마침표 (Period)',
    47: '슬래시 (Forward Slash)',
    48: '숫자 0',
    49: '숫자 1',
    50: '숫자 2',
    51: '숫자 3',
    52: '숫자 4',
    53: '숫자 5',
    54: '숫자 6',
    55: '숫자 7',
    56: '숫자 8',
    57: '숫자 9',
    58: '콜론 (Colon)',
    59: '세미콜론 (Semicolon)',
    60: '보다 작음 (Less Than)',
    61: '등호 (Equals)',
    62: '보다 큼 (Greater Than)',
    63: '물음표 (Question Mark)',
    64: '골뱅이 (At Sign)',
    65: '대문자 A',
    66: '대문자 B',
    67: '대문자 C',
    68: '대문자 D',
    69: '대문자 E',
    70: '대문자 F',
    71: '대문자 G',
    72: '대문자 H',
    73: '대문자 I',
    74: '대문자 J',
    75: '대문자 K',
    76: '대문자 L',
    77: '대문자 M',
    78: '대문자 N',
    79: '대문자 O',
    80: '대문자 P',
    81: '대문자 Q',
    82: '대문자 R',
    83: '대문자 S',
    84: '대문자 T',
    85: '대문자 U',
    86: '대문자 V',
    87: '대문자 W',
    88: '대문자 X',
    89: '대문자 Y',
    90: '대문자 Z',
    91: '대괄호 시작 (Left Square Bracket)',
    92: '백슬래시 (Backslash)',
    93: '대괄호 끝 (Right Square Bracket)',
    94: '캐럿 (Caret)',
    95: '밑줄 (Underscore)',
    96: '백틱 (Backtick)',
    97: '소문자 a',
    98: '소문자 b',
    99: '소문자 c',
    100: '소문자 d',
    101: '소문자 e',
    102: '소문자 f',
    103: '소문자 g',
    104: '소문자 h',
    105: '소문자 i',
    106: '소문자 j',
    107: '소문자 k',
    108: '소문자 l',
    109: '소문자 m',
    110: '소문자 n',
    111: '소문자 o',
    112: '소문자 p',
    113: '소문자 q',
    114: '소문자 r',
    115: '소문자 s',
    116: '소문자 t',
    117: '소문자 u',
    118: '소문자 v',
    119: '소문자 w',
    120: '소문자 x',
    121: '소문자 y',
    122: '소문자 z',
    123: '중괄호 시작 (Left Curly Brace)',
    124: '수직선 (Vertical Bar)',
    125: '중괄호 끝 (Right Curly Brace)',
    126: '틸드 (Tilde)'
  };

  // 제어 문자 테이블 생성
  for (let i = 0; i <= 31; i++) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i.toString(2).padStart(8, '0')}</td>
      <td>${i}</td>
      <td class="control-char">${String.fromCharCode(i)}</td>
      <td>${controlCharDescriptions[i] || '제어 문자'}</td>
    `;
    controlChars.appendChild(row);
  }

  // 출력 가능 문자 테이블 생성
  for (let i = 32; i <= 126; i++) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i.toString(2).padStart(8, '0')}</td>
      <td>${i}</td>
      <td class="printable-char">${String.fromCharCode(i)}</td>
      <td>${printableCharDescriptions[i] || '출력 가능 문자'}</td>
    `;
    printableChars.appendChild(row);
  }

  // DEL 문자 추가
  const delRow = document.createElement('tr');
  delRow.innerHTML = `
    <td>${(127).toString(2).padStart(8, '0')}</td>
    <td>127</td>
    <td class="control-char">DEL</td>
    <td>${controlCharDescriptions[127]}</td>
  `;
  controlChars.appendChild(delRow);
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
    resultDiv.innerHTML = '<p class="error">올바른 이진코드를 입력해주세요 (0과 1만 사용 가능).</p>';
    return;
  }

  // 공백으로 구분된 이진수들을 배열로 변환
  const binaryChunks = binaryInput.split(/\s+/).filter(chunk => chunk.length > 0);
  let result = '';
  let decimalValues = [];
  let hexValues = [];

  for (const chunk of binaryChunks) {
    // 8비트가 아닌 경우 처리
    if (chunk.length !== 8) {
      resultDiv.innerHTML = `
        <p class="error">
          각 이진수는 8비트(8자리)여야 합니다.<br>
          현재 입력: ${chunk} (${chunk.length}비트)
        </p>`;
      return;
    }

    const decimal = parseInt(chunk, 2);
    if (decimal <= 127) {
      result += String.fromCharCode(decimal);
      decimalValues.push(decimal);
      hexValues.push(decimal.toString(16).toUpperCase().padStart(2, '0'));
    }
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

// 페이지 로드 시 ASCII 코드 표 생성
window.onload = function() {
  generateASCIITable();
}; 