/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = []; // 存放所有從伺服器載入的 SoundFile 物件
let statusMsg = 'Tap to START Mic';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // 初始化錄音組件
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
}

// 輔助函式：載入聲音並進行音量強化
function loadAndAddVoice(url) {
  loadSound(url, (s) => {
    // 【核心修正】針對手機音量小，手動將播放音量設定為 3.0 倍 (可視情況調整 2.0~4.0)
    s.setVolume(3.0);
    allVoices.push(s);
    console.log("Loaded and amplified voice:", url);
  });
}

function draw() {
  // 錄音時背景變紅，平時為灰色
  background(state === 1 ? [255, 0, 0] : 220);

  // 顯示合唱團資訊
  fill(0);
  textSize(20);
  text(`Total Voices in Choir: ${allVoices.length}`, width / 2, 40);

  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // 繪製「PLAY ALL」按鈕區域
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
}

function touchStarted() {
  // 必須在使用者手勢內啟動 AudioContext
  userStartAudio();

  // 1. 檢查是否點擊到「PLAY CHOIR」按鈕
  if (mouseY > height - 135 && mouseY < height - 65 && mouseX > width / 2 - 120 && mouseX < width / 2 + 120) {
    allVoices.forEach(v => {
      if (v.isLoaded()) {
        // 播放前再次確保音量
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
      mic.amp(1.0); // 確保麥克風輸入增益全開
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
      // 開始錄音：建立新物件避免覆蓋
      soundFile = new p5.SoundFile();
      recorder.record(soundFile);
      state = 1;
      statusMsg = 'RECORDING...';
    } else if (state === 1) {
      // 停止錄音
      recorder.stop();
      state = 2;
      statusMsg = 'DONE!\nTap to UPLOAD';
    } else if (state === 2) {
      // 上傳錄音
      statusMsg = 'UPLOADING...';
      handleUpload();
    }
  }
  return false;
}

function handleUpload() {
  // 取得 Blob 並透過 Socket 發送
  let soundBlob = soundFile.getBlob();
  socket.emit('upload-audio', {
    audio: soundBlob
  });
}