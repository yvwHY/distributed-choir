/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = []; // 存放所有已載入的聲音物件
let statusMsg = 'Tap to START Mic';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();

  // 接收初始清單
  socket.on("init-audio-list", (urls) => {
    urls.forEach(url => loadAndAddVoice(url));
  });

  // 接收新聲音
  socket.on("new-voice", (data) => {
    loadAndAddVoice(data.url);
  });

  socket.on('upload-success', () => {
    state = 0;
    statusMsg = 'Upload Success! Record another?';
  });
}

function loadAndAddVoice(url) {
  loadSound(url, (s) => {
    allVoices.push(s);
  });
}

function draw() {
  background(state === 1 ? [255, 0, 0] : 220); // 錄音時變紅

  // 顯示資訊
  fill(0);
  textSize(20);
  text(`Total Voices: ${allVoices.length}`, width / 2, 40);

  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // 繪製「播放全部」按鈕區域
  fill(0, 150, 255);
  rectMode(CENTER);
  rect(width / 2, height - 100, 200, 60, 10);
  fill(255);
  textSize(22);
  text("PLAY ALL", width / 2, height - 100);
}

function touchStarted() {
  userStartAudio();

  // 判斷是否點擊到下方的 PLAY ALL 按鈕
  if (mouseY > height - 130 && mouseY < height - 70 && mouseX > width / 2 - 100 && mouseX < width / 2 + 100) {
    allVoices.forEach(v => { if (v.isLoaded()) v.play(); });
    return false;
  }

  // 麥克風初始化
  if (!isChoirStarted) {
    mic.start(() => { isChoirStarted = true; statusMsg = 'Mic Ready!\nTap to RECORD'; });
    return false;
  }

  // 錄音邏輯
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
    socket.emit('upload-audio', { audio: soundFile.getBlob() });
  }
  return false;
}