// 박스 사이즈 설정 (여기서 조절하세요!)
let BOX_WIDTH = 80;   // 박스 너비
let BOX_HEIGHT = 80;  // 박스 높이

// 레이아웃/이동 상수
const NUM_SIDE_BOXES = 11;  // 좌우 박스 개수 (각 방향으로 11개씩)
const BOX_SPACING = 80;     // 박스 간 간격(px)
const SHIFT_PER_BOX = 40;   // 박스 당 텍스트 이동(px)

let textInput; // 텍스트 입력창
let sizeSlider; // 텍스트 크기 슬라이더
let shiftSlider; // 텍스트 이동량 슬라이더
let displayText = "A"; // 표시할 텍스트 (기본값 A)
let textSizeValue = 400; // 텍스트 크기 (기본값 400)
let textShiftValue = 40; // 텍스트 이동량 (기본값 40px)

let buffers = []; // 재사용할 그래픽 버퍼들
let needsUpdate = true; // 텍스트/크기가 변경되었는지 확인
let glyphBuffer = null; // 텍스트를 미리 렌더링한 버퍼 (모든 박스에서 재사용)
let boxCounter = 0; // 프레임 내 박스 라벨 번호

// 박스 외곽선과 번호 라벨을 그리는 헬퍼
function drawBoxOutlineAndLabel(x, y) {
  stroke(0);
  noFill();
  rect(x, y, BOX_WIDTH, BOX_HEIGHT);
  // 라벨 텍스트 (작게)
  push();
  textFont('Helvetica');
  textStyle(NORMAL);
  textSize(11);
  textAlign(LEFT, TOP);
  // 흰색 스트로크 5px
  stroke(255);
  strokeWeight(5);
  fill(0);
  text(String(++boxCounter), x + 3, y + 2);
  pop();
}

// 클리핑 후 glyphBuffer를 박스 내부에 그리는 헬퍼
function drawGlyphInBox(boxX, boxY, dx, extraX = 0, extraY = 0) {
  if (!glyphBuffer) return;
  // glyph 중심을 박스의 (BOX_WIDTH/2 + dx + extraX, BOX_HEIGHT/2 + extraY)에 맞추기
  const gx = boxX + (BOX_WIDTH / 2 + dx + extraX) - glyphBuffer.width / 2;
  const gy = boxY + (BOX_HEIGHT / 2 + extraY) - glyphBuffer.height / 2;

  // 캔버스 클리핑: 박스 영역에만 그리기
  push();
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX, boxY, BOX_WIDTH, BOX_HEIGHT);
  ctx.clip();
  image(glyphBuffer, gx, gy);
  ctx.restore();
  pop();
}

function setup() {
  createCanvas(windowWidth, windowHeight); // 윈도우 전체 크기
  
  // 텍스트 입력창 생성
  textInput = createInput('A');
  textInput.position(20, 20);
  textInput.size(200, 30);
  textInput.style('font-size', '16px');
  textInput.style('padding', '5px');
  
  // 텍스트 크기 슬라이더 생성
  sizeSlider = createSlider(10, 1500, 400, 10);
  sizeSlider.position(20, 70);
  sizeSlider.size(200);
  sizeSlider.style('width', '200px');
  
  // 텍스트 이동량 슬라이더 생성
  shiftSlider = createSlider(-100, 140, 40, 5); // 최소 -100, 최대 140, 기본값 40, 단계 5
  shiftSlider.position(20, 120);
  shiftSlider.size(200);
  shiftSlider.style('width', '200px');
  
  // 슬라이더 라벨들 추가
  let sizeLabel = createP('텍스트 크기');
  sizeLabel.position(20, 45);
  sizeLabel.style('margin', '0');
  sizeLabel.style('font-family', 'Arial, sans-serif');
  sizeLabel.style('font-size', '14px');
  sizeLabel.style('color', '#333');
  
  let shiftLabel = createP('텍스트 이동량');
  shiftLabel.position(20, 95);
  shiftLabel.style('margin', '0');
  shiftLabel.style('font-family', 'Arial, sans-serif');
  shiftLabel.style('font-size', '14px');
  shiftLabel.style('color', '#333');
  
  // 입력값이 변경될 때마다 호출되는 함수
  textInput.input(() => {
    displayText = textInput.value() || "A"; // 빈 값이면 A로 기본값
    needsUpdate = true; // 업데이트 필요 표시
  });
  
  // 슬라이더 값이 변경될 때마다 호출되는 함수들
  sizeSlider.input(() => {
    textSizeValue = sizeSlider.value();
    needsUpdate = true; // 업데이트 필요 표시
  });
  
  shiftSlider.input(() => {
    textShiftValue = shiftSlider.value();
    needsUpdate = true; // 업데이트 필요 표시
  });
  
  // 그래픽 버퍼들 미리 생성
  const totalBoxes = NUM_SIDE_BOXES * 2 + 1;
  for (let i = 0; i < totalBoxes; i++) {
    buffers[i] = createGraphics(BOX_WIDTH, BOX_HEIGHT);
  }
}

function draw() {
  background(255); // 흰색 배경

  const centerX = width / 2;
  const centerY = height / 2;
  const boxY = centerY - BOX_HEIGHT / 2;
  boxCounter = 0; // 프레임마다 라벨 번호 초기화

  // 텍스트나 크기가 변경되었을 때만 버퍼 업데이트
  if (needsUpdate) {
    let bufferIndex = 0;
    for (let i = -NUM_SIDE_BOXES; i <= NUM_SIDE_BOXES; i++) {
      const dx = -i * textShiftValue; // 슬라이더로 조절 가능한 텍스트 이동량
      const pg = buffers[bufferIndex];
      
      pg.clear(); // 이전 내용 지우기
      pg.background(255);
      pg.textFont('Helvetica');
      pg.textStyle(BOLD);
      pg.textAlign(CENTER, CENTER);
      pg.fill(0);
      pg.textSize(textSizeValue);
      pg.text(displayText, BOX_WIDTH / 2 + dx, BOX_HEIGHT / 2);
      
      bufferIndex++;
    }

    // glyphBuffer(텍스트 단일 이미지) 업데이트
    // 메인 캔버스 상태를 사용해 텍스트 폭을 계산
    textFont('Helvetica');
    textStyle(BOLD);
    textSize(textSizeValue);
    const tw = max(1, Math.ceil(textWidth(displayText)));
    // 높이는 여유를 두어 ascent+descent 기준으로 확보
    const th = Math.ceil(textAscent() + textDescent()) + 20;
    glyphBuffer = createGraphics(tw + 20, th);
    glyphBuffer.clear();
    glyphBuffer.textFont('Helvetica');
    glyphBuffer.textStyle(BOLD);
    glyphBuffer.textAlign(CENTER, CENTER);
    glyphBuffer.fill(0);
    glyphBuffer.textSize(textSizeValue);
    glyphBuffer.text(displayText, glyphBuffer.width / 2, glyphBuffer.height / 2);
    needsUpdate = false; // 업데이트 완료
  }

  // 기존 박스 위치를 기준으로 전체 격자에 박스들 그리기 (고정 크기)
  const centerBoxX = centerX - BOX_WIDTH / 2; // 중앙 박스의 X 위치
  const centerBoxY = boxY; // 중앙 박스의 Y 위치
  
  // 고정된 격자 범위 (윈도우 크기와 무관)
  const leftCols = 15;  // 고정값
  const rightCols = 15; // 고정값
  const topRows = 10;   // 고정값
  const bottomRows = 10; // 고정값
  
  // 고정된 격자로 박스 테두리 그리기
  for (let row = -10; row <= 10; row++) {
    for (let col = -15; col <= 15; col++) {
      const currentBoxX = centerBoxX + col * BOX_SPACING;
      const currentBoxY = centerBoxY + row * BOX_SPACING;
      
      // 화면 범위 내의 박스만 그리기
      if (currentBoxX + BOX_WIDTH > 0 && currentBoxX < width && 
          currentBoxY + BOX_HEIGHT > 0 && currentBoxY < height) {
        // 박스 테두리만 그리기 (번호는 나중에 최상위 레이어에서)
        stroke(0);
        noFill();
        rect(currentBoxX, currentBoxY, BOX_WIDTH, BOX_HEIGHT);
      }
    }
  }

  // 미리 생성된 버퍼들을 화면에 그리기만 함 (텍스트가 있는 박스들)
  let bufferIndex = 0;
  for (let i = -NUM_SIDE_BOXES; i <= NUM_SIDE_BOXES; i++) {
    const boxX = centerX - BOX_WIDTH / 2 + i * BOX_SPACING; // 박스 위치
    const dx = -i * textShiftValue; // 해당 열의 기본 텍스트 이동
    
    image(buffers[bufferIndex], boxX, boxY);
    
    // 가운데 박스(i===0)의 수직 복사들: 위로(+diag), 아래로(-diag)
    if (i === 0) {
      for (let diag = 1; diag <= 6; diag++) {
        // 위쪽: 박스는 -80*diag, 텍스트는 +40*diag
        const upY = boxY - 80 * diag;
        drawGlyphInBox(boxX, upY, dx, 0, 40 * diag);

        // 아래쪽: 박스는 +80*diag, 텍스트는 -40*diag
        const downY = boxY + 80 * diag;
        drawGlyphInBox(boxX, downY, dx, 0, -40 * diag);
      }
    }
    
    // 오른쪽 박스들: 대각선 복사 (i >= 1)
    if (i >= 1 && i <= NUM_SIDE_BOXES) {
      for (let diag = 1; diag <= 6; diag++) {
        // 오른쪽 위 대각선: 박스 +80*diag, -80*diag / 텍스트 -40*diag, +40*diag
        drawGlyphInBox(boxX + 80 * diag, boxY - 80 * diag, dx, -40 * diag, 40 * diag);

        // 오른쪽 아래 대각선: 박스 +80*diag, +80*diag / 텍스트 -40*diag, -40*diag
        drawGlyphInBox(boxX + 80 * diag, boxY + 80 * diag, dx, -40 * diag, -40 * diag);
      }
    }
    
    // 왼쪽 박스들: 대각선 복사 (i <= -1)
    if (i <= -1 && i >= -NUM_SIDE_BOXES) {
      for (let diag = 1; diag <= 6; diag++) {
        // 왼쪽 위 대각선: 박스 -80*diag, -80*diag / 텍스트 +40*diag, +40*diag
        drawGlyphInBox(boxX - 80 * diag, boxY - 80 * diag, dx, 40 * diag, 40 * diag);

        // 왼쪽 아래 대각선: 박스 -80*diag, +80*diag / 텍스트 +40*diag, -40*diag
        drawGlyphInBox(boxX - 80 * diag, boxY + 80 * diag, dx, 40 * diag, -40 * diag);
      }
    }
    
    bufferIndex++;
  }

  // 모든 박스 번호를 최상위 레이어에 다시 그리기 (모든 텍스트 위에 표시)
  boxCounter = 0; // 번호 카운터 다시 초기화
  
  // 격자의 모든 박스 번호를 다시 그리기 (고정 크기)
  const labelCenterX = centerX - BOX_WIDTH / 2;
  const labelCenterY = boxY;
  const labelLeftCols = 15;  // 고정값
  const labelRightCols = 15; // 고정값
  const labelTopRows = 10;   // 고정값
  const labelBottomRows = 10; // 고정값
  
  // 고정된 31x21 격자로 번호 그리기
  for (let row = -10; row <= 10; row++) {
    for (let col = -15; col <= 15; col++) {
      const currentBoxX = labelCenterX + col * BOX_SPACING;
      const currentBoxY = labelCenterY + row * BOX_SPACING;
      
      // 화면 범위 내의 박스만 처리
      if (currentBoxX + BOX_WIDTH > 0 && currentBoxX < width && 
          currentBoxY + BOX_HEIGHT > 0 && currentBoxY < height) {
        
        // 고정된 번호 계산 (윈도우 크기와 무관)
        const boxNumber = (row + 10) * 31 + (col + 15) + 1;
        
        // 번호만 다시 그리기 (최상위 레이어)
        push();
        textFont('Helvetica');
        textStyle(NORMAL);
        textSize(11);
        textAlign(LEFT, TOP);
        stroke(255);
        strokeWeight(5);
        fill(0);
        text(String(boxNumber), currentBoxX + 3, currentBoxY + 2);
        pop();
      }
    }
  }

  // 박스 번호에 해당하는 위치 찾기 함수 (완전 고정)
  function getBoxPosition(boxNumber) {
    // 고정된 31x21 격자에서 번호 계산 (윈도우 크기 무관)
    const totalCols = 31; // -15 to +15
    const totalRows = 21; // -10 to +10
    
    // 번호는 1부터 시작, 0-based로 변환
    const index = boxNumber - 1;
    const row = Math.floor(index / totalCols) - 10; // -10 to +10
    const col = (index % totalCols) - 15; // -15 to +15
    
    const boxX = labelCenterX + col * BOX_SPACING;
    const boxY = labelCenterY + row * BOX_SPACING;
    
    return { x: boxX, y: boxY, col: col, row: row };
  }
  
  // 주어진 (row, col)의 박스가 일반 렌더링 루프에서 어떤 설정으로 그려졌는지 계산
  // 동일한 형태로 다른 위치에 복사할 때 사용
  function getGlyphConfigForBox(row, col) {
    const diag = Math.abs(row);
    // 중앙 행: 버퍼 이미지가 그려짐. 동일 형태를 위해서는 dx만 적용, 추가 오프셋은 없음
    if (row === 0) {
      return { dx: -col * textShiftValue, extraX: 0, extraY: 0 };
    }
    // 중앙 열에서 수직 대칭 복사된 경우
    if (col === 0) {
      return { dx: 0, extraX: 0, extraY: -40 * row }; // row<0면 +, row>0면 -
    }
    // 오른쪽 영역에서 대각선 복사된 경우
    if (col > 0) {
      const i = col - diag; // 소스 열
      const extraX = -40 * diag;
      const extraY = row < 0 ? 40 * diag : -40 * diag;
      return { dx: -i * textShiftValue, extraX, extraY };
    }
    // 왼쪽 영역에서 대각선 복사된 경우 (col < 0)
    {
      const i = col + diag; // 소스 열(음수)
      const extraX = 40 * diag;
      const extraY = row < 0 ? 40 * diag : -40 * diag;
      return { dx: -i * textShiftValue, extraX, extraY };
    }
  }
  
  // 특별 복사들은 여기에 추가
  // 예시: 72번 → 62번 복사
  const box72 = getBoxPosition(72);
  const box62 = getBoxPosition(62);
  if (box72 && box62) {
    const dx72 = -box72.col * textShiftValue;
    drawGlyphInBox(box62.x, box62.y, dx72, -40, 40);
  }
  
  // 61번 → 51번 복사
  const box61 = getBoxPosition(61);
  const box51 = getBoxPosition(51);
  if (box61 && box51) {
    const dx61 = -box61.col * textShiftValue;
    drawGlyphInBox(box51.x, box51.y, dx61, -40, 40);
  }

  // 최상단 레이어: 80px 격자 라인 오버레이 (고정 범위)
  push();
  stroke(0, 60); // 살짝 옅은 라인
  strokeWeight(1);
  // 고정된 격자 라인 (윈도우 크기와 무관)
  for (let col = -15; col <= 15; col++) {
    const x = labelCenterX + col * BOX_SPACING;
    line(x, 0, x, height);
  }
  for (let row = -10; row <= 10; row++) {
    const y = labelCenterY + row * BOX_SPACING;
    line(0, y, width, y);
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}