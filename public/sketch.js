/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = []; // 存放所有從伺服器載入的 SoundFile 物件
let statusMsg = 'Tap to START Mic';

// 【新增】用於物理模擬的球體陣列
let voiceBubbles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();

  // A. 接收伺服器上現有的所有聲音清單
  socket.on("init-audio-list", (urls) => {
    urls.forEach(url => loadAndAddVoice(url));
  });

  // B. 監聽其他使用者新上傳的聲音
  socket.on("new-voice", (data) => {
    loadAndAddVoice(data.url);
  });

  // C. 自身上傳成功回饋
  socket.on('upload-success', () => {
    state = 0;
    statusMsg = 'Upload Success!\nRecord another?';
  });

  // 【新增】設定物理世界重力
  world.gravity.y = 0.2; // 輕微的重力，讓球體慢慢落下
}

// 輔助函式：載入聲音並進行音量強化
function loadAndAddVoice(url) {
  loadSound(url, (s) => {
    s.setVolume(3.0);
    allVoices.push(s);
    console.log("Loaded and amplified voice:", url);

    // 【新增】每載入一個聲音，就新增一個球體
    addVoiceBubble();
  });
}

// 【新增】新增一個隨機顏色的球體
function addVoiceBubble() {
  let x = random(50, width - 50); // 隨機 X 座標
  let y = random(50, height / 3); // 在畫面上半部隨機 Y 座標
  let r = random(20, 40); // 隨機半徑

  let bubble = createSprite(x, y, r * 2, r * 2); // p5.play 的 createSprite
  bubble.shapeColor = color(random(255), random(255), random(255)); // 隨機顏色
  bubble.setCollider("circle", 0, 0, r); // 設定圓形碰撞器
  bubble.restitution = 0.8; // 彈性
  bubble.friction = 0.01; // 摩擦力
  bubble.mass = 1; // 質量

  voiceBubbles.push(bubble);

  // 【新增】創建邊界讓球體不會跑出畫面
  createEdgeSprites();
}

function draw() {
  background(state === 1 ? [255, 0, 0] : 220);

  // 顯示合唱團資訊
  fill(0);
  textSize(20);
  text(`Total Voices in Choir: ${allVoices.length}`, width / 2, 40);

  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // 繪製「PLAY CHOIR」按鈕區域
  push();
  fill(0, 150, 255);
  rectMode(CENTER);
  noStroke();
  rect(width / 2, height - 100, 240, 70, 15);
  fill(255);
  textStyle(BOLD);
  textSize(24);
  text("PLAY CHOIR", width / 2, height - 100);
  pop();

  // 【新增】更新並繪製所有球體
  drawSprites(); // p5.play 繪製所有 sprite
}

function touchStarted() {
  userStartAudio();

  // 1. 檢查是否點擊到「PLAY CHOIR」按鈕
  if (mouseY > height - 135 && mouseY < height - 65 && mouseX > width / 2 - 120 && mouseX < width / 2 + 120) {
    allVoices.forEach(v => {
      if (v.isLoaded()) {
        v.setVolume(3.0);
        v.play();
      }
    });
    return false;
  }

  // 2. 麥克風啟動階段
  if (!isChoirStarted) {
    mic.start(() => {
      isChoirStarted = true;
      mic.amp(1.0);
      statusMsg = 'Mic Active!\nTap to RECORD';
    }, () => {
      statusMsg = 'Mic Denied!\nPlease allow mic access';
    });
    statusMsg = 'Connecting Mic...';
    return false;
  }

  // 3. 錄音狀態機邏輯
  if (isChoirStarted) {
    if (state === 0) {
      soundFile = new p5.SoundFile();
      recorder.record(soundFile);
      state = 1;
      statusMsg = 'RECORDING...';
    } else if (state === 1) {
      recorder.stop();
      state = 2;
      statusMsg = 'DONE!\nTap to UPLOAD';
    } else if (state === 2) {
      statusMsg = 'UPLOADING...';
      handleUpload();
    }
  }
  return false;
}

function handleUpload() {
  let soundBlob = soundFile.getBlob();
  socket.emit('upload-audio', {
    audio: soundBlob
  });
}