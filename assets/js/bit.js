function calculateBitInfo() {
    const bitInput = document.getElementById('bitInput');
    const bitResult = document.getElementById('bitResult');
    
    // 입력값 검증
    const bits = parseInt(bitInput.value);
    if (isNaN(bits) || bits < 1 || bits > 32) {
        bitResult.innerHTML = '1부터 32 사이의 숫자를 입력해주세요.';
        return;
    }

    // 2의 거듭제곱 계산
    const infoCount = Math.pow(2, bits);
    
    // 결과 표시
    let resultText = `${bits}비트로는 ${infoCount.toLocaleString()}개의 정보를 표현할 수 있습니다.<br>`;
    resultText += `이는 2^${bits} = ${infoCount.toLocaleString()}입니다.`;
    
    bitResult.innerHTML = resultText;
} 