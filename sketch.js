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
let italicSlider; // 이탤릭 기울기 슬라이더
let verticalShiftSlider; // 세로 확장 슬라이더
let fileInput; // 파일 입력
let displayText = "A"; // 표시할 텍스트 (기본값 A)
let textSizeValue = 400; // 텍스트 크기 (기본값 400)
let textShiftValue = 40; // 텍스트 이동량 (기본값 40px)
let italicValue = 0; // 이탤릭 기울기 값 (기본값 0)
let verticalShiftValue = 0; // 세로 확장 값 (기본값 0)
let uploadedImage = null; // 업로드된 이미지
let useImage = false; // 이미지 사용 여부

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
  // 화면 바깥이면 스킵 (클리핑/드로우 비용 절감)
  if (boxX >= width || boxX + BOX_WIDTH <= 0 || boxY >= height || boxY + BOX_HEIGHT <= 0) {
    return;
  }
  
  // 현재 박스의 행 인덱스 계산 (중앙행이 0)
  const centerY = height / 2;
  const centerBoxY = centerY - BOX_HEIGHT / 2;
  const rowIndex = Math.round((boxY - centerBoxY) / BOX_SPACING);
  
  // Vertical Shift: 행별 차등 세로 스케일링 (중앙이 가장 많이, 점차 약해짐)
  // rowIndex가 0에 가까울수록 더 많이 늘어남
  const maxStretch = Math.abs(verticalShiftValue) * 0.02; // 스케일링 강도 조절
  const distanceFromCenter = Math.abs(rowIndex);
  const stretchFactor = Math.max(0, maxStretch * (6 - distanceFromCenter) / 6); // 6행까지 점차 약해짐
  const scaleY = 1 + (verticalShiftValue > 0 ? stretchFactor : -stretchFactor);
  
  // glyph 중심을 박스 중심에 맞추기
  const gx = boxX + (BOX_WIDTH / 2 + dx + extraX) - glyphBuffer.width / 2;
  const gy = boxY + (BOX_HEIGHT / 2 + extraY) - glyphBuffer.height / 2;

  // 캔버스 클리핑: 박스 영역에만 그리기
  push();
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX, boxY, BOX_WIDTH, BOX_HEIGHT);
  ctx.clip();
  
  // 세로 스케일링 적용
  push();
  translate(boxX + BOX_WIDTH/2, boxY + BOX_HEIGHT/2); // 박스 중심으로 이동
  scale(1, scaleY); // Y축만 스케일링
  translate(-BOX_WIDTH/2, -BOX_HEIGHT/2); // 원래 위치로 복원
  image(glyphBuffer, gx - boxX, gy - boxY);
  pop();
  
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
  
  // 이탤릭 기울기 슬라이더 생성
  italicSlider = createSlider(-50, 50, 0, 1); // 최소 -50, 최대 50, 기본값 0, 단계 1
  italicSlider.position(20, 170);
  italicSlider.size(200);
  italicSlider.style('width', '200px');
  
  // 세로 확장 슬라이더 생성
  verticalShiftSlider = createSlider(-50, 50, 0, 1); // 최소 -50, 최대 50, 기본값 0, 단계 1
  verticalShiftSlider.position(20, 220);
  verticalShiftSlider.size(200);
  verticalShiftSlider.style('width', '200px');
  
  // 파일 입력 생성
  fileInput = createFileInput(handleFile);
  fileInput.position(20, 270);
  fileInput.size(200);
  fileInput.style('font-size', '14px');
  
  // 텍스트/이미지 전환 버튼
  let toggleButton = createButton('Use Text');
  toggleButton.position(20, 310);
  toggleButton.size(100);
  toggleButton.style('font-size', '14px');
  toggleButton.mousePressed(() => {
    if (uploadedImage) {
      useImage = !useImage;
      toggleButton.html(useImage ? 'Use Text' : 'Use Image');
      needsUpdate = true;
    }
  });
  
  // 슬라이더 라벨들 추가
  let sizeLabel = createP('Size');
  sizeLabel.position(20, 45);
  sizeLabel.style('margin', '0');
  sizeLabel.style('font-family', 'Arial, sans-serif');
  sizeLabel.style('font-size', '14px');
  sizeLabel.style('color', '#333');
  
  let shiftLabel = createP('Horizontal Shift');
  shiftLabel.position(20, 95);
  shiftLabel.style('margin', '0');
  shiftLabel.style('font-family', 'Arial, sans-serif');
  shiftLabel.style('font-size', '14px');
  shiftLabel.style('color', '#333');
  
  let italicLabel = createP('Italic Angle');
  italicLabel.position(20, 145);
  italicLabel.style('margin', '0');
  italicLabel.style('font-family', 'Arial, sans-serif');
  italicLabel.style('font-size', '14px');
  italicLabel.style('color', '#333');
  
  let verticalLabel = createP('Vertical Shift');
  verticalLabel.position(20, 195);
  verticalLabel.style('margin', '0');
  verticalLabel.style('font-family', 'Arial, sans-serif');
  verticalLabel.style('font-size', '14px');
  verticalLabel.style('color', '#333');
  
  let fileLabel = createP('Upload Image');
  fileLabel.position(20, 245);
  fileLabel.style('margin', '0');
  fileLabel.style('font-family', 'Arial, sans-serif');
  fileLabel.style('font-size', '14px');
  fileLabel.style('color', '#333');
  
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
  
  italicSlider.input(() => {
    italicValue = italicSlider.value();
    needsUpdate = true; // 업데이트 필요 표시
  });
  
  verticalShiftSlider.input(() => {
    verticalShiftValue = verticalShiftSlider.value();
    needsUpdate = true; // 업데이트 필요 표시
  });
  
  // 그래픽 버퍼들 미리 생성
  const totalBoxes = NUM_SIDE_BOXES * 2 + 1;
  for (let i = 0; i < totalBoxes; i++) {
    buffers[i] = createGraphics(BOX_WIDTH, BOX_HEIGHT);
  }
}

// 파일 업로드 처리 함수
function handleFile(file) {
  console.log('파일 업로드됨:', file);
  if (file.type === 'image') {
    uploadedImage = loadImage(file.data, () => {
      useImage = true;
      needsUpdate = true;
      console.log('이미지 로드 완료');
    });
  } else {
    console.log('이미지 파일만 업로드 가능합니다.');
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
      
      // Shear 변환 적용 (이탤릭 효과)
      pg.push();
      pg.translate(BOX_WIDTH / 2, BOX_HEIGHT / 2); // 중심으로 이동
      
      // Shear 매트릭스 적용 (X축 방향으로 기울이기)
      const shearAmount = italicValue * 0.01; // 슬라이더 값을 적절히 스케일링
      pg.applyMatrix(1, 0, shearAmount, 1, 0, 0);
      
      if (useImage && uploadedImage) {
        // 이미지 사용
        const imgSize = textSizeValue * 0.8; // 텍스트 크기에 비례한 이미지 크기
        const imgW = imgSize;
        const imgH = imgSize * (uploadedImage.height / uploadedImage.width); // 비율 유지
        pg.image(uploadedImage, dx - imgW/2, -imgH/2, imgW, imgH);
      } else {
        // 텍스트 사용
        pg.textFont('Helvetica');
        pg.textStyle(BOLD);
        pg.textAlign(CENTER, CENTER);
        pg.fill(0);
        pg.textSize(textSizeValue);
        // 가로 이동(dx)만 적용 (세로 이동은 각 박스에서 개별적으로 적용)
        pg.text(displayText, dx, 0);
      }
      pg.pop();
      
      bufferIndex++;
    }

    // glyphBuffer(텍스트/이미지 단일 이미지) 업데이트
    let tw, th;
    if (useImage && uploadedImage) {
      // 이미지 사용시 크기 계산
      const imgSize = textSizeValue * 0.8;
      tw = Math.ceil(imgSize) + 20;
      th = Math.ceil(imgSize * (uploadedImage.height / uploadedImage.width)) + 20;
    } else {
      // 텍스트 사용시 크기 계산
      textFont('Helvetica');
      textStyle(BOLD);
      textSize(textSizeValue);
      tw = max(1, Math.ceil(textWidth(displayText)));
      // 높이는 여유를 두어 ascent+descent 기준으로 확보
      th = Math.ceil(textAscent() + textDescent()) + 20;
    }
    glyphBuffer = createGraphics(tw + 20, th);
    glyphBuffer.clear();
    
    // Shear 변환 적용 (이탤릭 효과)
    glyphBuffer.push();
    glyphBuffer.translate(glyphBuffer.width / 2, glyphBuffer.height / 2);
    
    // Shear 매트릭스 적용 (X축 방향으로 기울이기)
    const shearAmount = italicValue * 0.01; // 슬라이더 값을 적절히 스케일링
    glyphBuffer.applyMatrix(1, 0, shearAmount, 1, 0, 0);
    
    if (useImage && uploadedImage) {
      // 이미지 사용
      const imgSize = textSizeValue * 0.8; // 텍스트 크기에 비례한 이미지 크기
      const imgW = imgSize;
      const imgH = imgSize * (uploadedImage.height / uploadedImage.width); // 비율 유지
      glyphBuffer.image(uploadedImage, -imgW/2, -imgH/2, imgW, imgH);
    } else {
      // 텍스트 사용
      glyphBuffer.textFont('Helvetica');
      glyphBuffer.textStyle(BOLD);
      glyphBuffer.textAlign(CENTER, CENTER);
      glyphBuffer.fill(0);
      glyphBuffer.textSize(textSizeValue);
      // 세로 이동은 각 박스에서 개별적으로 적용
      glyphBuffer.text(displayText, 0, 0);
    }
    glyphBuffer.pop();
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
  
  // 특정 박스 번호 범위만 그리기
  function shouldDrawBox(boxNumber) {
    // 161~181, 192~212, 223~243, 254~274, 285~305, 316~336, 347~367, 378~398, 409~429, 440~460, 471~491, 502~522
    const ranges = [
      [161, 181], [192, 212], [223, 243], [254, 274], [285, 305], 
      [316, 336], [347, 367], [378, 398], [409, 429], [440, 460], 
      [471, 491], [502, 522]
    ];
    
    return ranges.some(([start, end]) => boxNumber >= start && boxNumber <= end);
  }
  
  // 고정된 격자로 박스 테두리 그리기 (특정 범위만)
  for (let row = -10; row <= 10; row++) {
    for (let col = -15; col <= 15; col++) {
      const currentBoxX = centerBoxX + col * BOX_SPACING;
      const currentBoxY = centerBoxY + row * BOX_SPACING;
      
      // 박스 번호 계산
      const boxNumber = (row + 10) * 31 + (col + 15) + 1;
      
      // 박스 테두리는 그리지 않음 (숨김)
    }
  }

  // 미리 생성된 버퍼들을 화면에 그리기만 함 (텍스트가 있는 박스들)
  let bufferIndex = 0;
  for (let i = -NUM_SIDE_BOXES; i <= NUM_SIDE_BOXES; i++) {
    const boxX = centerX - BOX_WIDTH / 2 + i * BOX_SPACING; // 박스 위치
    const dx = -i * textShiftValue; // 해당 열의 기본 텍스트 이동
    
    // 중앙 행 (rowIndex = 0)에 세로 스케일링 적용 - 가장 많이 늘어남
    const maxStretch = Math.abs(verticalShiftValue) * 0.02;
    const scaleY = 1 + (verticalShiftValue > 0 ? maxStretch : -maxStretch);
    
    push();
    translate(boxX + BOX_WIDTH/2, boxY + BOX_HEIGHT/2); // 박스 중심으로 이동
    scale(1, scaleY); // Y축만 스케일링
    translate(-BOX_WIDTH/2, -BOX_HEIGHT/2); // 원래 위치로 복원
    image(buffers[bufferIndex], 0, 0);
    pop();
    
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
  
  // 고정된 31x21 격자로 번호 그리기 (특정 범위만)
  for (let row = -10; row <= 10; row++) {
    for (let col = -15; col <= 15; col++) {
      const currentBoxX = labelCenterX + col * BOX_SPACING;
      const currentBoxY = labelCenterY + row * BOX_SPACING;
      
      // 고정된 번호 계산 (윈도우 크기와 무관)
      const boxNumber = (row + 10) * 31 + (col + 15) + 1;
      
      // 박스 번호는 표시하지 않음 (숨김)
    }
  }

  // 특별 복사: 박스 번호를 직접 계산해서 텍스트 복사
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

  // (row, col) -> boxNumber (유효 범위 밖이면 null)
  function rowColToBoxNumber(row, col) {
    if (row < -10 || row > 10 || col < -15 || col > 15) return null;
    const totalCols = 31;
    return (row + 10) * totalCols + (col + 15) + 1;
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
  
  // 타겟 박스 번호의 왼쪽 위(-1 col, -1 row)에서 복사하여
  // 텍스트만 왼쪽 위로 40px 이동해 그리는 헬퍼
  function copyFromTopLeftShift(targetNumber, delta = 40) {
    const sourceNumber = targetNumber - 32; // 위로 한 행(31) + 왼쪽 한 칸(1)
    const src = getBoxPosition(sourceNumber);
    const dst = getBoxPosition(targetNumber);
    if (!src || !dst) return;
    const cfg = getGlyphConfigForBox(src.row, src.col);
    drawGlyphInBox(dst.x, dst.y, cfg.dx, cfg.extraX - delta, cfg.extraY - delta);
  }

  // 일반화: 임의의 소스/타겟 박스 번호와 텍스트 델타로 복사
  function drawCopy(srcNumber, dstNumber, deltaX = 0, deltaY = 0) {
    const src = getBoxPosition(srcNumber);
    const dst = getBoxPosition(dstNumber);
    if (!src || !dst) return;
    const cfg = getGlyphConfigForBox(src.row, src.col);
    drawGlyphInBox(dst.x, dst.y, cfg.dx, cfg.extraX + deltaX, cfg.extraY + deltaY);
  }

  // 규칙 배열로 일괄 적용
  function applyCopyRules(rules) {
    for (const r of rules) {
      drawCopy(r.src, r.dst, r.dx || 0, r.dy || 0);
    }
  }

  // 타겟 박스 번호의 오른쪽 위(+1 col, -1 row)에서 복사하여
  // 텍스트만 오른쪽 위로 40px 이동해 그리는 헬퍼
  function copyFromTopRightShift(targetNumber, delta = 40) {
    const sourceNumber = targetNumber - 30; // 위로 한 행(31) + 오른쪽 한 칸(-1 + 1 = -30)
    const src = getBoxPosition(sourceNumber);
    const dst = getBoxPosition(targetNumber);
    if (!src || !dst) return;
    const cfg = getGlyphConfigForBox(src.row, src.col);
    drawGlyphInBox(dst.x, dst.y, cfg.dx, cfg.extraX + delta, cfg.extraY - delta);
  }
  
  // 72번 → 62번 복사
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
  
  // 326번 → 294번 복사
  const box326_294 = getBoxPosition(326);
  const box294 = getBoxPosition(294);
  if (box326_294 && box294) {
    const cfg326_294 = getGlyphConfigForBox(box326_294.row, box326_294.col);
    drawGlyphInBox(box294.x, box294.y, cfg326_294.dx, cfg326_294.extraX + 40, cfg326_294.extraY + 40);
  }
  
  // 294번 → 262번 복사 (우측아래에서 복사)
  const box294_262 = getBoxPosition(294);
  const box262 = getBoxPosition(262);
  if (box294_262 && box262) {
    const cfg294_262 = getGlyphConfigForBox(box294_262.row, box294_262.col);
    drawGlyphInBox(box262.x, box262.y, cfg294_262.dx, cfg294_262.extraX + 40, cfg294_262.extraY + 40);
  }
  
  // 295번 → 263번 복사
  const box295_263 = getBoxPosition(295);
  const box263 = getBoxPosition(263);
  if (box295_263 && box263) {
    const cfg295_263 = getGlyphConfigForBox(box295_263.row, box295_263.col);
    drawGlyphInBox(box263.x, box263.y, cfg295_263.dx, cfg295_263.extraX + 40, cfg295_263.extraY + 40);
  }
  
  // 262번 → 230번 복사
  const box262_230 = getBoxPosition(262);
  const box230 = getBoxPosition(230);
  if (box262_230 && box230) {
    const cfg262_230 = getGlyphConfigForBox(box262_230.row, box262_230.col);
    drawGlyphInBox(box230.x, box230.y, cfg262_230.dx, cfg262_230.extraX + 40, cfg262_230.extraY + 40);
  }
  
  // 263번 → 231번 복사
  const box263_231 = getBoxPosition(263);
  const box231 = getBoxPosition(231);
  if (box263_231 && box231) {
    const cfg263_231 = getGlyphConfigForBox(box263_231.row, box263_231.col);
    drawGlyphInBox(box231.x, box231.y, cfg263_231.dx, cfg263_231.extraX + 40, cfg263_231.extraY + 40);
  }
  
  // 264번 → 232번 복사
  const box264_232 = getBoxPosition(264);
  const box232 = getBoxPosition(232);
  if (box264_232 && box232) {
    const cfg264_232 = getGlyphConfigForBox(box264_232.row, box264_232.col);
    drawGlyphInBox(box232.x, box232.y, cfg264_232.dx, cfg264_232.extraX + 40, cfg264_232.extraY + 40);
  }
  
  // 230번 → 198번 복사
  const box230_198 = getBoxPosition(230);
  const box198 = getBoxPosition(198);
  if (box230_198 && box198) {
    const cfg230_198 = getGlyphConfigForBox(box230_198.row, box230_198.col);
    drawGlyphInBox(box198.x, box198.y, cfg230_198.dx, cfg230_198.extraX + 40, cfg230_198.extraY + 40);
  }
  
  // 231번 → 199번 복사
  const box231_199 = getBoxPosition(231);
  const box199 = getBoxPosition(199);
  if (box231_199 && box199) {
    const cfg231_199 = getGlyphConfigForBox(box231_199.row, box231_199.col);
    drawGlyphInBox(box199.x, box199.y, cfg231_199.dx, cfg231_199.extraX + 40, cfg231_199.extraY + 40);
  }
  
  // 232번 → 200번 복사
  const box232_200 = getBoxPosition(232);
  const box200 = getBoxPosition(200);
  if (box232_200 && box200) {
    const cfg232_200 = getGlyphConfigForBox(box232_200.row, box232_200.col);
    drawGlyphInBox(box200.x, box200.y, cfg232_200.dx, cfg232_200.extraX + 40, cfg232_200.extraY + 40);
  }
  
  // 233번 → 201번 복사
  const box233_201 = getBoxPosition(233);
  const box201 = getBoxPosition(201);
  if (box233_201 && box201) {
    const cfg233_201 = getGlyphConfigForBox(box233_201.row, box233_201.col);
    drawGlyphInBox(box201.x, box201.y, cfg233_201.dx, cfg233_201.extraX + 40, cfg233_201.extraY + 40);
  }
  
  // 198번 → 166번 복사
  const box198_166 = getBoxPosition(198);
  const box166 = getBoxPosition(166);
  if (box198_166 && box166) {
    const cfg198_166 = getGlyphConfigForBox(box198_166.row, box198_166.col);
    drawGlyphInBox(box166.x, box166.y, cfg198_166.dx, cfg198_166.extraX + 40, cfg198_166.extraY + 40);
  }
  
  // 199번 → 167번 복사
  const box199_167 = getBoxPosition(199);
  const box167 = getBoxPosition(167);
  if (box199_167 && box167) {
    const cfg199_167 = getGlyphConfigForBox(box199_167.row, box199_167.col);
    drawGlyphInBox(box167.x, box167.y, cfg199_167.dx, cfg199_167.extraX + 40, cfg199_167.extraY + 40);
  }
  
  // 200번 → 168번 복사
  const box200_168 = getBoxPosition(200);
  const box168 = getBoxPosition(168);
  if (box200_168 && box168) {
    const cfg200_168 = getGlyphConfigForBox(box200_168.row, box200_168.col);
    drawGlyphInBox(box168.x, box168.y, cfg200_168.dx, cfg200_168.extraX + 40, cfg200_168.extraY + 40);
  }
  
  // 201번 → 169번 복사
  const box201_169 = getBoxPosition(201);
  const box169 = getBoxPosition(169);
  if (box201_169 && box169) {
    const cfg201_169 = getGlyphConfigForBox(box201_169.row, box201_169.col);
    drawGlyphInBox(box169.x, box169.y, cfg201_169.dx, cfg201_169.extraX + 40, cfg201_169.extraY + 40);
  }
  
  // 202번 → 170번 복사
  const box202_170 = getBoxPosition(202);
  const box170 = getBoxPosition(170);
  if (box202_170 && box170) {
    const cfg202_170 = getGlyphConfigForBox(box202_170.row, box202_170.col);
    drawGlyphInBox(box170.x, box170.y, cfg202_170.dx, cfg202_170.extraX + 40, cfg202_170.extraY + 40);
  }
  
  // 166번 → 134번 복사
  const box166_134 = getBoxPosition(166);
  const box134 = getBoxPosition(134);
  if (box166_134 && box134) {
    const cfg166_134 = getGlyphConfigForBox(box166_134.row, box166_134.col);
    drawGlyphInBox(box134.x, box134.y, cfg166_134.dx, cfg166_134.extraX + 40, cfg166_134.extraY + 40);
  }
  
  // 167번 → 135번 복사
  const box167_135 = getBoxPosition(167);
  const box135 = getBoxPosition(135);
  if (box167_135 && box135) {
    const cfg167_135 = getGlyphConfigForBox(box167_135.row, box167_135.col);
    drawGlyphInBox(box135.x, box135.y, cfg167_135.dx, cfg167_135.extraX + 40, cfg167_135.extraY + 40);
  }
  
  // 168번 → 136번 복사
  const box168_136 = getBoxPosition(168);
  const box136 = getBoxPosition(136);
  if (box168_136 && box136) {
    const cfg168_136 = getGlyphConfigForBox(box168_136.row, box168_136.col);
    drawGlyphInBox(box136.x, box136.y, cfg168_136.dx, cfg168_136.extraX + 40, cfg168_136.extraY + 40);
  }
  
  // 169번 → 137번 복사
  const box169_137 = getBoxPosition(169);
  const box137 = getBoxPosition(137);
  if (box169_137 && box137) {
    const cfg169_137 = getGlyphConfigForBox(box169_137.row, box169_137.col);
    drawGlyphInBox(box137.x, box137.y, cfg169_137.dx, cfg169_137.extraX + 40, cfg169_137.extraY + 40);
  }
  
  // 170번 → 138번 복사
  const box170_138 = getBoxPosition(170);
  const box138 = getBoxPosition(138);
  if (box170_138 && box138) {
    const cfg170_138 = getGlyphConfigForBox(box170_138.row, box170_138.col);
    drawGlyphInBox(box138.x, box138.y, cfg170_138.dx, cfg170_138.extraX + 40, cfg170_138.extraY + 40);
  }
  
  // 171번 → 139번 복사
  const box171_139 = getBoxPosition(171);
  const box139 = getBoxPosition(139);
  if (box171_139 && box139) {
    const cfg171_139 = getGlyphConfigForBox(box171_139.row, box171_139.col);
    drawGlyphInBox(box139.x, box139.y, cfg171_139.dx, cfg171_139.extraX + 40, cfg171_139.extraY + 40);
  }
  
  // 커스텀 복사 규칙(기존 수동 블록들을 선언형으로 정리)
  applyCopyRules([
    { src: 326, dst: 296, dx: -40, dy: 40 },
    { src: 326, dst: 358, dx: -40, dy: -40 },
    { src: 295, dst: 265, dx: -40, dy: 40 },
    { src: 233, dst: 203, dx: -40, dy: 40 },
    { src: 202, dst: 172, dx: -40, dy: 40 },
    { src: 171, dst: 141, dx: -40, dy: 40 },
    { src: 296, dst: 266, dx: -40, dy: 40 },
    { src: 265, dst: 235, dx: -40, dy: 40 },
    { src: 234, dst: 204, dx: -40, dy: 40 },
    { src: 203, dst: 173, dx: -40, dy: 40 },
    { src: 172, dst: 142, dx: -40, dy: 40 },
    { src: 173, dst: 143, dx: -40, dy: 40 },
    { src: 174, dst: 144, dx: -40, dy: 40 },
    { src: 175, dst: 145, dx: -40, dy: 40 },
    { src: 204, dst: 174, dx: -40, dy: 40 },
    { src: 205, dst: 175, dx: -40, dy: 40 },
    { src: 206, dst: 176, dx: -40, dy: 40 },
    { src: 235, dst: 205, dx: -40, dy: 40 },
    { src: 236, dst: 206, dx: -40, dy: 40 },
    { src: 266, dst: 236, dx: -40, dy: 40 },
    { src: 264, dst: 234, dx: -40, dy: 40 },
  ]);

  // 요청한 타겟들: 왼쪽 위에서 복사, 텍스트만 왼쪽 위로 40px 이동
  // 단일 호출로 동일 패턴 적용
  [
    389, 390,
    420, 421, 422,
    451, 452, 453, 454,
    482, 483, 484, 485, 486,
    513, 514, 515, 516, 517, 518
  ].forEach(n => copyFromTopLeftShift(n, 40));

  // 요청한 타겟들: 오른쪽 위에서 복사, 텍스트만 오른쪽 위로 40px 이동
  [
    356,
    386, 387,
    416, 417, 418,
    446, 447, 448, 449,
    476, 477, 478, 479, 480,
    506, 507, 508, 509, 510, 511
  ].forEach(n => copyFromTopRightShift(n, 40));

  // 격자 라인은 표시하지 않음 (숨김)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
