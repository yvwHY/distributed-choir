/*eslint no-undef: 0*/

const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;

function setup() {
  // 讓畫布佔滿全螢幕
  createCanvas(windowWidth, windowHeight);

  background(200);
  textAlign(CENTER, CENTER);
  textSize(24);
  text('iPhone Test:\nTap to START', width / 2, height / 2);

  // 初始化錄音組件
  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();
}

function draw() {
  // 暫時不寫任何東西，確保 draw 迴圈不卡死
}

function touchStarted() {
  userStartAudio();

  if (!isChoirStarted) {
    mic.start();
    isChoirStarted = true;
    background(0, 255, 0); // 變綠色
    text('Mic Initializing...\nWait 1 sec then Tap again', width / 2, height / 2);
    return false;
  }

  // 關鍵修正：加入一個檢查，如果 mic 還沒準備好，強制再啟動一次
  if (!mic.enabled) {
    mic.start();
    background(255, 165, 0); // 變成橘色代表還在嘗試啟動麥克風
    text('Mic not ready yet\nCheck if you allowed Mic access', width / 2, height / 2);
    return false;
  }

  // 錄音狀態機
  if (state === 0) { // 移除 mic.enabled 判斷，因為上面已經檢查過了
    recorder.record(soundFile);
    state = 1;
    background(255, 0, 0);
    text('RECORDING...', width / 2, height / 2);
  }
  else if (state === 1) {
    recorder.stop();
    state = 2;
    background(255, 255, 0);
    text('DONE!\nTap to UPLOAD', width / 2, height / 2);
  }
  // ... 後續上傳邏輯不變
  return false;
}

async function startExperience() {
  // iPhone 需要在 HTTPS 下執行這個
  await userStartAudio();

  mic.start(() => {
    // 成功回調
    isChoirStarted = true;
    startBtn.remove();
    background(0, 255, 0);
    text('Mic Active! Tap to Record', width / 2, height / 2);
  }, () => {
    // 失敗回調
    alert("請確保已在瀏覽器設定中允許麥克風存取");
  });
}