/* ===============================
   Archery Game - gameshoot.js
   =============================== */

// ===== Game Variables =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;
let level = 1;
let highScore = localStorage.getItem("highScore") || 0;
let isPaused = false;
let gameOver = false;

// Player
const player = {
  x: 100,
  y: canvas.height / 2 - 50,
  width: 50,
  height: 50,
  speed: 5
};

// Arrows
let arrows = [];

// Targets
let targets = [];
let targetSpawnInterval = 2000;
let lastTargetSpawn = Date.now();

// Power-up
let powerUpActive = false;
let powerUpTimer = 0;

// ===== Load Sounds =====
const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const pauseSound = document.getElementById("pauseSound");
const resumeSound = document.getElementById("resumeSound");

// ===== DOM Elements =====
const scoreDisplay = document.getElementById("score");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const homeBtn = document.getElementById("homeBtn");
const shootBtn = document.getElementById("shoot-btn");
const visitorCount = document.getElementById("visitorCount");
const ratingStars = document.querySelectorAll(".star");
const ratingText = document.getElementById("ratingText");

// UI Overlay for Pause
let overlay = document.createElement("div");
overlay.id = "pauseOverlay";
overlay.style.position = "absolute";
overlay.style.top = "0";
overlay.style.left = "0";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.background = "rgba(0,0,0,0.4)";
overlay.style.display = "none";
overlay.style.alignItems = "center";
overlay.style.justifyContent = "center";
overlay.style.color = "white";
overlay.style.fontSize = "3em";
overlay.style.zIndex = "10";
overlay.innerText = "Paused";
document.getElementById("game-container").appendChild(overlay);

// Power-up UI
let powerUpUI = document.createElement("div");
powerUpUI.id = "powerUpUI";
powerUpUI.style.position = "absolute";
powerUpUI.style.top = "60px";
powerUpUI.style.right = "20px";
powerUpUI.style.padding = "10px 20px";
powerUpUI.style.borderRadius = "12px";
powerUpUI.style.background = "rgba(255,255,255,0.2)";
powerUpUI.style.backdropFilter = "blur(10px)";
powerUpUI.style.boxShadow = "0 0 10px rgba(255,255,255,0.6)";
powerUpUI.style.color = "white";
powerUpUI.style.fontWeight = "bold";
powerUpUI.style.display = "none";
document.getElementById("game-container").appendChild(powerUpUI);

// ===== Controls =====
document.getElementById("arrow-up").addEventListener("touchstart", () => (player.y -= player.speed * 10));
document.getElementById("arrow-down").addEventListener("touchstart", () => (player.y += player.speed * 10));
document.getElementById("arrow-left").addEventListener("touchstart", () => (player.x -= player.speed * 10));
document.getElementById("arrow-right").addEventListener("touchstart", () => (player.x += player.speed * 10));
shootBtn.addEventListener("touchstart", shoot);

// ===== Functions =====
function shoot() {
  if (isPaused || gameOver) return;
  arrows.push({ x: player.x + player.width, y: player.y + player.height / 2, width: 20, height: 5, speed: 10 });
  shootSound.currentTime = 0;
  shootSound.play();
}

function spawnTarget() {
  targets.push({
    x: canvas.width,
    y: Math.random() * (canvas.height - 50),
    width: 40,
    height: 40,
    speed: 2 + level
  });
}

function update() {
  if (isPaused || gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Update arrows
  arrows.forEach((arrow, index) => {
    arrow.x += arrow.speed;
    ctx.fillStyle = "yellow";
    ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height);

    if (arrow.x > canvas.width) arrows.splice(index, 1);
  });

  // Spawn targets
  if (Date.now() - lastTargetSpawn > targetSpawnInterval) {
    spawnTarget();
    lastTargetSpawn = Date.now();
  }

  // Update targets
  targets.forEach((target, tIndex) => {
    target.x -= target.speed;
    ctx.fillStyle = "red";
    ctx.fillRect(target.x, target.y, target.width, target.height);

    if (target.x + target.width < 0) {
      gameOver = true;
    }

    // Collision detection
    arrows.forEach((arrow, aIndex) => {
      if (
        arrow.x < target.x + target.width &&
        arrow.x + arrow.width > target.x &&
        arrow.y < target.y + target.height &&
        arrow.y + arrow.height > target.y
      ) {
        targets.splice(tIndex, 1);
        arrows.splice(aIndex, 1);
        score += 10;
        hitSound.currentTime = 0;
        hitSound.play();
      }
    });
  });

  // Power-up Timer
  if (powerUpActive) {
    powerUpTimer -= 1;
    powerUpUI.style.display = "block";
    powerUpUI.innerText = `⚡ Power Up: ${Math.ceil(powerUpTimer / 60)}s`;
    if (powerUpTimer <= 0) {
      powerUpActive = false;
      powerUpUI.style.display = "none";
    }
  }

  // Update score
  scoreDisplay.textContent = `Score: ${score} | Level: ${level} | High Score: ${highScore}`;

  requestAnimationFrame(update);
}

// ===== Pause/Resume =====
pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  if (isPaused) {
    pauseSound.play();
    overlay.style.display = "flex";
  } else {
    resumeSound.play();
    overlay.style.display = "none";
    update();
  }
});

// ===== Restart =====
restartBtn.addEventListener("click", () => {
  score = 0;
  level = 1;
  arrows = [];
  targets = [];
  gameOver = false;
  update();
});

// ===== Home (reset score + reload) =====
homeBtn.addEventListener("click", () => {
  localStorage.setItem("highScore", highScore);
  window.location.reload();
});

// ===== Visitor Counter =====
function updateVisitorCount() {
  let count = localStorage.getItem("visitorCount") || 0;
  count++;
  localStorage.setItem("visitorCount", count);
  visitorCount.textContent = `👥 Visitors: ${count}`;
}
updateVisitorCount();

// ===== Rating System =====
ratingStars.forEach(star => {
  star.addEventListener("click", function () {
    let value = this.getAttribute("data-value");
    ratingText.textContent = `You rated: ${value} ★`;
    ratingStars.forEach(s => {
      s.style.color = s.getAttribute("data-value") <= value ? "gold" : "white";
      s.style.transform = s.getAttribute("data-value") <= value ? "scale(1.2)" : "scale(1)";
      s.style.transition = "0.3s ease";
    });
  });
});

// ===== Start Game =====
update();
