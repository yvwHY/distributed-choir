/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = [];
let balls = [];
let statusMsg = 'Tap to START Mic';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // 初始化音訊組件
  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();

  // 同步邏輯：接收初始與即時聲音
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

// --- 播放端強化：載入聲音並強制放大音量 ---
function loadAndAddVoice(url) {
  loadSound(url, (s) => {
    // 【修改點】將播放音量拉高到 4.0 到 5.0 倍。
    // 這是在手機端小聲錄音下，最有效的「軟體放大」手段。
    s.setVolume(5.0);
    allVoices.push(s);

    // 每增加一個聲音，產生一顆物理球
    balls.push(new Ball(random(width), -50, random(15, 30)));
  });
}

function draw() {
  background(state === 1 ? [255, 0, 0] : 220);

  // 更新與顯示物理球體
  for (let b of balls) {
    b.update();
    b.checkEdges();
    b.checkCollision(balls);
    b.display();
  }

  // --- 錄音端視覺化：顯示即時輸入音量 ---
  if (state === 1) {
    let level = mic.getLevel();
    let h = map(level, 0, 0.5, 0, height);
    fill(255, 255, 0, 150);
    noStroke();
    rect(0, height, 30, -h); // 左側黃色能量條
  }

  // UI 介面
  fill(0);
  noStroke();
  textSize(20);
  text(`Voices in Choir: ${allVoices.length}`, width / 2, 40);
  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // PLAY ALL 按鈕
  fill(0, 150, 255);
  rectMode(CENTER);
  rect(width / 2, height - 100, 240, 70, 15);
  fill(255);
  text("PLAY CHOIR", width / 2, height - 100);
}

// --- 互動邏輯 ---
function touchStarted() {
  userStartAudio();

  // 1. 點擊播放按鈕
  if (mouseY > height - 135 && mouseY < height - 65 && mouseX > width / 2 - 120 && mouseX < width / 2 + 120) {
    allVoices.forEach(v => {
      if (v.isLoaded()) {
        v.setVolume(5.0); // 確保播放時音量是極大化的
        v.play();
      }
    });
    // 視覺回饋：播放時讓球體向上跳動
    for (let b of balls) { b.vel.y -= random(5, 10); }
    return false;
  }

  // 2. 麥克風初始化
  if (!isChoirStarted) {
    mic.start(() => {
      isChoirStarted = true;
      // 【修改點】確保麥克風捕捉增益為最大值 1.0
      mic.amp(1.0);
      statusMsg = 'Mic Active!\nTap to RECORD';
    }, () => {
      statusMsg = 'Mic Denied!';
    });
    statusMsg = 'Connecting Mic...';
    return false;
  }

  // 3. 錄音狀態機
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
      socket.emit('upload-audio', { audio: soundFile.getBlob() });
    }
  }
  return false;
}

// --- Nature of Code: 物理球體類別 ---
class Ball {
  constructor(x, y, r) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(2, 5));
    this.acc = createVector(0, 0.25); // 重力
    this.r = r;
    this.color = color(random(255), random(255), random(255), 180);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
  }

  display() {
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }

  checkEdges() {
    if (this.pos.y > height - this.r) {
      this.pos.y = height - this.r;
      this.vel.y *= -0.6; // 彈跳衰減
    }
    if (this.pos.x > width - this.r || this.pos.x < this.r) {
      this.vel.x *= -0.8;
    }
  }

  checkCollision(others) {
    for (let other of others) {
      if (other === this) continue;
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.r + other.r) {
        let pushForce = p5.Vector.sub(this.pos, other.pos);
        pushForce.setMag(0.1);
        this.vel.add(pushForce);
      }
    }
  }
}