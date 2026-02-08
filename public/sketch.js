/*eslint no-undef: 0*/
const socket = io();
let mic, recorder, soundFile;
let state = 0;
let isChoirStarted = false;
let allVoices = [];
let balls = []; // 存放物理物件
let statusMsg = 'Tap to START Mic';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  mic = new p5.AudioIn();
  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);
  soundFile = new p5.SoundFile();

  // 同步邏輯：進入時抓取歷史
  socket.on("init-audio-list", (urls) => {
    urls.forEach(url => loadAndAddVoice(url));
  });

  // 同步邏輯：即時接收他人聲音
  socket.on("new-voice", (data) => {
    // 檢查是否已存在，避免重複加載
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
    // Nature of Code: 產生新球體
    balls.push(new Ball(random(width), -50, random(15, 30)));
  });
}

function draw() {
  background(state === 1 ? [255, 0, 0] : 220);

  // 更新與顯示物理球體
  for (let i = 0; i < balls.length; i++) {
    balls[i].update();
    balls[i].checkEdges();
    balls[i].checkCollision(balls);
    balls[i].display();
  }

  // UI
  fill(0);
  noStroke();
  textSize(20);
  text(`Voices: ${allVoices.length}`, width / 2, 40);
  textSize(28);
  text(statusMsg, width / 2, height / 2 - 50);

  // Play All Button
  fill(0, 150, 255);
  rect(width / 2 - 120, height - 130, 240, 70, 15);
  fill(255);
  text("PLAY ALL", width / 2, height - 95);
}

// --- Nature of Code Ball Class ---
class Ball {
  constructor(x, y, r) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(2, 5));
    this.acc = createVector(0, 0.2); // 重力
    this.r = r;
    this.color = color(random(255), random(255), random(255), 150);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
  }

  display() {
    fill(this.color);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }

  checkEdges() {
    if (this.pos.y > height - this.r) {
      this.pos.y = height - this.r;
      this.vel.y *= -0.7; // 彈力
    }
    if (this.pos.x > width - this.r || this.pos.x < this.r) {
      this.vel.x *= -0.9;
    }
  }

  checkCollision(others) {
    for (let other of others) {
      if (other === this) continue;
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.r + other.r) {
        // 簡單的碰撞反彈邏輯
        let force = p5.Vector.sub(this.pos, other.pos);
        force.setMag(0.5);
        this.vel.add(force);
      }
    }
  }
}

function touchStarted() {
  userStartAudio();
  if (mouseY > height - 130 && mouseY < height - 60 && mouseX > width / 2 - 120 && mouseX < width / 2 + 120) {
    allVoices.forEach(v => { if (v.isLoaded()) v.play(); });
    return false;
  }
  // ... 錄音邏輯維持不變 ...
  if (!isChoirStarted) {
    mic.start(() => { isChoirStarted = true; statusMsg = 'Mic Ready!\nTap to RECORD'; });
    return false;
  }
  if (state === 0) { soundFile = new p5.SoundFile(); recorder.record(soundFile); state = 1; statusMsg = 'RECORDING...'; }
  else if (state === 1) { recorder.stop(); state = 2; statusMsg = 'DONE!\nTap to UPLOAD'; }
  else if (state === 2) { statusMsg = 'UPLOADING...'; socket.emit('upload-audio', { audio: soundFile.getBlob() }); }
  return false;
}