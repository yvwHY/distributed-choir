/*eslint no-undef: 0*/

const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(200);
  textAlign(CENTER, CENTER);
  textSize(24);
  text('iPhone Test:\nTap to START Mic', width / 2, height / 2);

  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();
}

function touchStarted() {
  // 1. 每次點擊都強制 resume，解決 Chrome/Safari 的鎖定
  userStartAudio();

  // 2. 第一階段：啟動麥克風
  if (!isChoirStarted) {
    mic.start(() => {
      // 成功回調：這在 iOS 很重要，確保權限拿到了才改狀態
      isChoirStarted = true;
      state = 0; // 重置到準備錄音狀態
      background(0, 255, 0);
      text('Mic Ready!\nTap to RECORD', width / 2, height / 2);
    }, () => {
      // 失敗回調
      background(255, 0, 0);
      text('Mic Denied!\nCheck browser settings', width / 2, height / 2);
    });

    background(100);
    text('Requesting Mic...', width / 2, height / 2);
    return false;
  }

  // 3. 錄音狀態機 (只有在 mic 成功啟動後才執行)
  if (isChoirStarted) {
    if (state === 0) {
      // 開始錄音
      recorder.record(soundFile);
      state = 1;
      background(255, 0, 0);
      fill(255);
      text('RECORDING...', width / 2, height / 2);
    }
    else if (state === 1) {
      // 停止錄音
      recorder.stop();
      state = 2;
      background(255, 255, 0);
      fill(0);
      text('DONE!\nTap to UPLOAD', width / 2, height / 2);
    }
    else if (state === 2) {
      // 執行上傳邏輯
      handleUpload();
    }
  }

  return false;
}

function handleUpload() {
  background(100);
  fill(255);
  text('UPLOADING...', width / 2, height / 2);

  // 這裡放你原本的 socket.emit 或 fetch 邏輯
  console.log("Uploading sound file...");
}