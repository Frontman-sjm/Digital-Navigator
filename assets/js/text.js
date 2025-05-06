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

// 페이지 로드 시 ASCII 코드 표 생성
window.onload = function() {
  // ASCII 코드 표 생성 코드 완전 삭제
}; 