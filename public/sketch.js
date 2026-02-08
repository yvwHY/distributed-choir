/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = [];
let statusMsg = 'Tap to START Mic';

// 物理球體群組
let balls;

function setup() {
  new Canvas(windowWidth, windowHeight); // p5.play v3 的畫布寫法
  textAlign(CENTER, CENTER);

  // 設定物理世界邊界
  world.gravity.y = 5; // 設定重力

  // 建立球體群組
  balls = new Group();
  balls.diameter = 30;
  balls.bounciness = 0.8;

  // 建立地板防止球掉下去
  let floor = new Sprite(width / 2, height, width, 20, 'static');
  floor.color = 'gray';

  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();

  socket.on("init-audio-list", (urls) => {
    urls.forEach(url => loadAndAddVoice(url));
  });

  socket.on("new-voice", (data) => {
    loadAndAddVoice(data.url);
  });

  socket.on('upload-success', () => {
    state = 0;
    statusMsg = 'Upload Success!\nRecord another?';
  });
}

function loadAndAddVoice(url) {
  loadSound(url, (s) => {
    s.setVolume(3.0);
    allVoices.push(s);

    // 每增加一個聲音，產生一顆隨機顏色的球
    let b = new balls.Sprite();
    b.x = random(width);
    b.y = 50;
    b.color = color(random(255), random(255), random(255));
  });
}

function draw() {
  background(state === 1 ? [255, 0, 0] : 220);

  fill(0);
  textSize(20);
  text(`Voices: ${allVoices.length}`, width / 2, 40);
  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // 繪製播放按鈕 (使用文字和矩形)
  fill(0, 150, 255);
  rect(width / 2 - 120, height - 135, 240, 70, 15);
  fill(255);
  text("PLAY CHOIR", width / 2, height - 100);
}

function touchStarted() {
  userStartAudio();

  // 播放按鈕判定
  if (mouseY > height - 135 && mouseY < height - 65 && mouseX > width / 2 - 120 && mouseX < width / 2 + 120) {
    allVoices.forEach(v => { if (v.isLoaded()) v.play(); });
    return false;
  }

  if (!isChoirStarted) {
    mic.start(() => { isChoirStarted = true; statusMsg = 'Mic Ready!\nTap to RECORD'; });
    return false;
  }

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