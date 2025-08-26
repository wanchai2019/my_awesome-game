//--------------------- Game Variables ---------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");
const homeBtn = document.getElementById("homeBtn"); 
const scoreText = document.getElementById("score");

const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const bgMusic = document.getElementById("bgMusic");
const pauseSound = document.getElementById("pauseSound");
const resumeSound = document.getElementById("resumeSound");
const pauseBtn = document.getElementById("pauseBtn");
const scremSound = document.getElementById("scremSound");
const blinkSound = new Audio("./sound/blink.mp3");
const bossShootSound = new Audio("./sound/boss_shoot.mp3");
const playerHitSound = new Audio("./sound/player_hit.mp3");

const controls = {
  up: document.getElementById('arrow-up'),
  down: document.getElementById('arrow-down'),
  left: document.getElementById('arrow-left'),
  right: document.getElementById('arrow-right'),
  shoot: document.getElementById('shoot-btn')
};

let arrows = [], birds = [], explosions = [], powerUps = [], enemyArrows = [], goldParticles = [];
let score = 0, lives = 3, gameOver = false, level = 1;
let highScore = localStorage.getItem("highScore") || 0;
let playerMove = { up:false, down:false, left:false, right:false };
let isPaused = false;
let animationId;
let nextArrowIsGolden = false;
let glowTime = 0;
let arrowSpeed = 8;
let tripleArrow = false;
let playerShield = false;

// Power-up timers
let powerTimers = { fast:0, triple:0, shield:0 };
const POWER_DURATION = 5000;

// Active power UI
let activePowerUI = { fast:0, triple:0, shield:0 };

// Power-up types
const powerTypes = { FAST_ARROW:"fast", TRIPLE_ARROW:"triple", SHIELD:"shield" };

// Player object
const player = { x:50, y:50, width:45, height:80, speed:5 };

// Images
const bgImg = new Image();
bgImg.src = "./img/forest.png";

const birdImg = new Image(); birdImg.src = "./img/bird.png";
const goldenBirdImg = new Image(); goldenBirdImg.src = "./img/golden_bird.png";
const bossImg = new Image(); bossImg.src = "./img/boss_bird.png";
const playerImg = new Image(); playerImg.src = "./img/archer.png";
const arrowImg = new Image(); arrowImg.src = "./img/arrow.png";
const shieldImg = new Image(); shieldImg.src = "./img/shieldb.png";

const fastImg = new Image(); fastImg.src="./img/fast.png";
const tripleImg = new Image(); tripleImg.src="./img/threearrow.png";
const shieldPowerImg = new Image(); shieldPowerImg.src="./img/shieldb.png";

const birdExoImg = new Image(); birdExoImg.src = "./img/birdexo.png";

//--------------------- Explosion Class ---------------------
class Explosion {
  constructor(x,y,color="orange"){
    this.particles = [];
    for(let i=0;i<15;i++){
      this.particles.push({
        x,y,
        radius:Math.random()*3+2,
        color,
        speedX:(Math.random()-0.5)*6,
        speedY:(Math.random()-0.5)*6,
        alpha:1
      });
    }
  }
  update(){ 
    this.particles.forEach(p=>{ p.x+=p.speedX; p.y+=p.speedY; p.alpha-=0.03; });
    this.particles = this.particles.filter(p=>p.alpha>0);
  }
  draw(){ 
    this.particles.forEach(p=>{
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
}

//--------------------- Spawn Timers ---------------------
let lastBirdSpawn = 0;
let birdSpawnInterval = 1500; // ms
let lastPowerUpSpawn = 0;
let powerUpSpawnInterval = 10000; // ms
const bossShootInterval = 2000; // ms

//--------------------- Internal Spawn Functions ---------------------
function spawnBirdInternal(){
  if(gameOver) return;
  const y=Math.random()*(canvas.height-60);
  const baseSpeed = 1+Math.random()*1.5+score*0.05;
  const speed = Math.min(baseSpeed,10);
  const isBoss = Math.random() < 0.3; 
  if(isBoss && birds.filter(b=>b.isBoss).length===0){
    birds.push({ 
      x:canvas.width, y, startY:y, width:120, height:100, speed:2, amplitude:40, frequency:0.02, 
      time:0, isBoss:true, hp:5, lastShoot: Date.now() 
    });
  } else {
    const isGolden = Math.random()<0.1;
    birds.push({ 
      x:canvas.width, y, startY:y, width:40, height:30, speed, amplitude:20+Math.random()*20, frequency:0.02+Math.random()*0.03, 
      time:0, isGolden, isBoss:false 
    });
  }
}

function spawnPowerUpInternal(){
  if(gameOver) return;
  const typeKeys = Object.keys(powerTypes);
  const type = powerTypes[typeKeys[Math.floor(Math.random()*typeKeys.length)]];
  const x = canvas.width; 
  const y = Math.random()*(canvas.height-40);
  powerUps.push({
    x,y,width:40,height:40,type,speed:2,
    img: type===powerTypes.FAST_ARROW?fastImg:type===powerTypes.TRIPLE_ARROW?tripleImg:shieldPowerImg
  });
}

//--------------------- Input ---------------------
document.addEventListener("keydown", e=>{
  if(gameOver || isPaused) return;
  if(e.key==="ArrowUp") playerMove.up=true;
  if(e.key==="ArrowDown") playerMove.down=true;
  if(e.key==="ArrowLeft") playerMove.left=true;
  if(e.key==="ArrowRight") playerMove.right=true;
  if(e.key==='s'||e.key===' ') shoot();
});
document.addEventListener("keyup", e=>{
  if(e.key==="ArrowUp") playerMove.up=false;
  if(e.key==="ArrowDown") playerMove.down=false;
  if(e.key==="ArrowLeft") playerMove.left=false;
  if(e.key==="ArrowRight") playerMove.right=false;
});

function addControlListeners(element,direction){
  element.addEventListener('mousedown',()=>playerMove[direction]=true);
  element.addEventListener('touchstart',e=>{ e.preventDefault(); playerMove[direction]=true;});
  element.addEventListener('mouseup',()=>playerMove[direction]=false);
  element.addEventListener('mouseleave',()=>playerMove[direction]=false);
  element.addEventListener('touchend',()=>playerMove[direction]=false);
  element.addEventListener('touchcancel',()=>playerMove[direction]=false);
}
addControlListeners(controls.up,'up');
addControlListeners(controls.down,'down');
addControlListeners(controls.left,'left');
addControlListeners(controls.right,'right');
controls.shoot.addEventListener('click',shoot);
controls.shoot.addEventListener('touchstart',e=>{ e.preventDefault(); shoot(); });

restartBtn.addEventListener("click",resetGame);

// Event listener ของปุ่ม Home
homeBtn.addEventListener("click", ()=>{
  gameOver = true;                  // หยุดเกม
  cancelAnimationFrame(animationId); // ยกเลิก loop
  bgMusic.pause();                   // หยุดเพลง
  window.location.href = "index.html"; // ไปหน้า Home
});

pauseBtn.addEventListener("click",()=>{
  if(!isPaused){ 
    isPaused=true; 
    pauseSound.play(); 
    pauseBtn.textContent="Resume"; 
    bgMusic.pause();
    cancelAnimationFrame(animationId);
  } else { 
    isPaused=false; 
    resumeSound.play(); 
    pauseBtn.textContent="Pause"; 
    bgMusic.play(); 
    lastBirdSpawn = Date.now();
    lastPowerUpSpawn = Date.now();
    Object.keys(powerTimers).forEach(key=>{ if(powerTimers[key]>0) powerTimers[key]=Date.now()+POWER_DURATION; });
    gameLoop();
  }
});

//--------------------- Shoot ---------------------
function shoot(){
  const shots = tripleArrow ? [-10,0,10] : [0];
  shots.forEach((offset,index)=>{
    arrows.push({
      x: player.x + player.width,
      y: player.y + player.height/2 + offset,
      speed: arrowSpeed,
      angle: 0,
      isGolden: nextArrowIsGolden && index===1
    });
  });
  shootSound.currentTime = 0;
  shootSound.play();
  nextArrowIsGolden = false; 
}

function updatePlayerPosition(){
  if(playerMove.up) player.y-=player.speed;
  if(playerMove.down) player.y+=player.speed;
  if(playerMove.left) player.x-=player.speed;
  if(playerMove.right) player.x+=player.speed;
  if(player.x<0) player.x=0;
  if(player.x+player.width>canvas.width) player.x=canvas.width-player.width;
  if(player.y<0) player.y=0;
  if(player.y+player.height>canvas.height) player.y=canvas.height-player.height;
}

//--------------------- Boss Shooting ---------------------
function updateBossShooting(){
  const now = Date.now();
  birds.forEach((bird,i)=>{
    if(bird.isBoss){
      // เช็คว่าบอสยังอยู่ใน canvas
      if(bird.x + bird.width < 0){
        // ลบ enemyArrows ของบอสนี้
        enemyArrows = enemyArrows.filter(a=>a.bossId !== bird.id);
        return;
      }
      if(!bird.lastShoot) bird.lastShoot = now;
      if(now - bird.lastShoot > bossShootInterval){
        const dx = player.x - bird.x;
        const dy = player.y - bird.y;
        const angle = Math.atan2(dy, dx);
        enemyArrows.push({ x: bird.x, y: bird.y, speed:6, angle, bossId: bird.id });
        bird.lastShoot = now;
        bossShootSound.currentTime=0; 
        bossShootSound.play();
      }
    }
  });
}

//--------------------- Enemy Arrows ---------------------
function updateEnemyArrows(){
  for(let i=enemyArrows.length-1;i>=0;i--){
    const arrow = enemyArrows[i];
    arrow.x += arrow.speed * Math.cos(arrow.angle);
    arrow.y += arrow.speed * Math.sin(arrow.angle);

    if(player.x < arrow.x+10 && player.x+player.width > arrow.x && player.y < arrow.y+5 && player.y+player.height > arrow.y){
      if(!playerShield){ 
        lives--; 
        if(lives<=0){  
            endGame(); } 
      }
      scremSound.currentTime=0; scremSound.play();
      playerHitSound.currentTime=0; playerHitSound.play();
      explosions.push(new Explosion(player.x+player.width/2, player.y+player.height/2,"red"));
      enemyArrows.splice(i,1);
      continue;
    }

    if(arrow.x<0 || arrow.x>canvas.width || arrow.y<0 || arrow.y>canvas.height) enemyArrows.splice(i,1);
  }
}

function drawEnemyArrows(){
  enemyArrows.forEach(arrow=>{
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.fillStyle="purple";
    ctx.fillRect(-10,-2,10,4);
    ctx.restore();
  });
}

//--------------------- Golden Arrow Trail ---------------------
function updateGoldenArrowTrail(){
  arrows.forEach(arrow=>{
    if(arrow.isGolden){
      goldParticles.push({ x: arrow.x, y: arrow.y, radius: Math.random()*2+1, alpha:1 });
    }
  });

  goldParticles.forEach(p=>{
    p.alpha -= 0.03;
    p.y += 0.1*Math.random();
  });
  goldParticles = goldParticles.filter(p=>p.alpha>0);
}

function drawGoldenArrowTrail(){
  goldParticles.forEach(p=>{
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle="gold";
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

//--------------------- Update ---------------------
function update(){
  updatePlayerPosition();
  updateBossShooting();
  updateEnemyArrows();
  updateGoldenArrowTrail();

  const now = Date.now();

  if(now - lastBirdSpawn > birdSpawnInterval){ spawnBirdInternal(); lastBirdSpawn = now; }
  if(now - lastPowerUpSpawn > powerUpSpawnInterval){ spawnPowerUpInternal(); lastPowerUpSpawn = now; }

  arrows.forEach((arrow,i)=>{ arrow.x+=arrow.speed; if(arrow.x>canvas.width) arrows.splice(i,1); });

  birds.forEach((bird,i)=>{
    bird.x -= bird.speed;
    bird.time++;
    bird.y = bird.startY + Math.sin(bird.time*bird.frequency)*bird.amplitude;

    if(player.x < bird.x + bird.width && player.x + player.width > bird.x &&
       player.y < bird.y + bird.height && player.y + player.height > bird.y){
      if(!playerShield){ lives--; if(lives<=0){ gameOver=true; restartBtn.style.display="inline-block"; bgMusic.pause(); } }
      scremSound.currentTime=0; scremSound.play();
      explosions.push({ img: birdExoImg, x:player.x-20, y:player.y-20, width:player.width+40, height:player.height+40, alpha:1 });
      birds.splice(i,1); 
    }
  });

  for(let ai=arrows.length-1; ai>=0; ai--){
    let arrow = arrows[ai];
    for(let bi=birds.length-1; bi>=0; bi--){
      let bird = birds[bi];
      if(arrow.x < bird.x+bird.width && arrow.x+25>bird.x && arrow.y<bird.y+bird.height && arrow.y+5>bird.y){
        arrows.splice(ai,1);
        if(bird.isBoss){
          bird.hp -= arrow.isGolden?2:1;
          explosions.push(new Explosion(bird.x+bird.width/2,bird.y+bird.height/2,"red"));
          if(bird.hp<=0){ 
            birds.splice(bi,1); 
            score += arrow.isGolden?20:10; 
            // ลบลูกศรของบอสที่ตาย
            enemyArrows = enemyArrows.filter(a=>a.bossId !== bird.id);
          }
        } else {
          explosions.push(new Explosion(bird.x+bird.width/2,bird.y+bird.height/2,bird.isGolden?"gold":(arrow.isGolden?"yellow":"orange")));
          birds.splice(bi,1); score += bird.isGolden?5:(arrow.isGolden?2:1);
          if(bird.isGolden) nextArrowIsGolden = true;
        }
        level=Math.floor(score/10)+1;
        if(score>highScore){ highScore=score; localStorage.setItem("highScore",highScore);}
        scoreText.textContent=`Score: ${score} | Level: ${level} | High Score: ${highScore}`;
        hitSound.currentTime=0; hitSound.play();
        break;
      }
    }
  }

  powerUps.forEach((pu,i)=>{
    pu.x -= pu.speed;
    if(pu.x+pu.width<0){ powerUps.splice(i,1); return; }

    if(player.x < pu.x+pu.width && player.x+player.width>pu.x && player.y < pu.y+pu.height && player.y+player.height>pu.y){
      powerUps.splice(i,1);
      blinkSound.currentTime=0; blinkSound.play();
      if(pu.type===powerTypes.FAST_ARROW){ arrowSpeed=12; activePowerUI.fast=5; setTimeout(()=>{arrowSpeed=8; activePowerUI.fast=0;},POWER_DURATION);}
      if(pu.type===powerTypes.TRIPLE_ARROW){ tripleArrow=true; activePowerUI.triple=5; setTimeout(()=>{tripleArrow=false; activePowerUI.triple=0;},POWER_DURATION);}
      if(pu.type===powerTypes.SHIELD){ playerShield=true; activePowerUI.shield=5; setTimeout(()=>{playerShield=false; activePowerUI.shield=0;},POWER_DURATION);}
    }
  });

  explosions.forEach(ex=>{ if(ex instanceof Explosion) ex.update(); });

  Object.keys(activePowerUI).forEach(key=>{ if(activePowerUI[key]>0) activePowerUI[key]-=1/60; });
}

//--------------------- Draw ---------------------
function draw(){
  // วาด background
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // วาด trail ลูกศรทอง
  drawGoldenArrowTrail();

  // วาดลูกศรศัตรู
  drawEnemyArrows();

  // วาดผู้เล่น
  ctx.drawImage(playerImg,player.x,player.y,player.width,player.height);
  if(playerShield) ctx.drawImage(shieldImg,player.x-5,player.y-5,player.width+10,player.height+10);

  glowTime += 0.1;

  // วาดลูกศรปกติ / ทอง
  arrows.forEach(arrow=>{
    ctx.save();
    ctx.translate(arrow.x,arrow.y);
    if(arrow.isGolden){
      let glow=20+10*Math.sin(glowTime*5);
      ctx.shadowBlur=glow; ctx.shadowColor="gold";
    } else {
      ctx.shadowBlur=15; ctx.shadowColor="red";
    }
    ctx.drawImage(arrowImg,-12.5,-5,25,10);
    ctx.restore();
  });

  // วาดนก
  birds.forEach(bird=>{
    if(bird.isBoss){
      ctx.drawImage(bossImg,bird.x,bird.y,bird.width,bird.height);
      ctx.fillStyle="gray"; ctx.fillRect(bird.x,bird.y-10,bird.width,6);
      ctx.fillStyle="lime"; ctx.fillRect(bird.x,bird.y-10,(bird.hp/5)*bird.width,6);
      ctx.strokeStyle="black"; ctx.strokeRect(bird.x,bird.y-10,bird.width,6);
    } else if(bird.isGolden){
      ctx.drawImage(goldenBirdImg,bird.x,bird.y,bird.width,bird.height);
    } else {
      ctx.drawImage(birdImg,bird.x,bird.y,bird.width,bird.height);
    }
  });

  // วาด powerUps
  powerUps.forEach(pu=>{ ctx.drawImage(pu.img, pu.x, pu.y, pu.width, pu.height); });

  // วาด explosions
  explosions.forEach((ex,index)=>{
    if(ex instanceof Explosion) ex.draw();
    else{
      ctx.globalAlpha=ex.alpha;
      ctx.drawImage(ex.img, ex.x, ex.y, ex.width, ex.height);
      ctx.globalAlpha=1;
      ex.alpha-=0.05; if(ex.alpha<=0) explosions.splice(index,1);
    }
  });

  // วาด UI
  ctx.fillStyle="white"; ctx.strokeStyle="black"; ctx.lineWidth=2;
  ctx.font="20px sans-serif";
  ctx.strokeText("life: "+"❤️".repeat(lives),canvas.width-160,30);
  ctx.fillText("life: "+"❤️".repeat(lives),canvas.width-160,30);

  ctx.font="16px sans-serif";
  let xStart = 20;
  if(activePowerUI.fast>0){ ctx.drawImage(fastImg,xStart,canvas.height-50,30,30); ctx.fillText(Math.ceil(activePowerUI.fast),xStart+10,canvas.height-55); xStart+=50; }
  if(activePowerUI.triple>0){ ctx.drawImage(tripleImg,xStart,canvas.height-50,30,30); ctx.fillText(Math.ceil(activePowerUI.triple),xStart+10,canvas.height-55); xStart+=50; }
  if(activePowerUI.shield>0){ ctx.drawImage(shieldPowerImg,xStart,canvas.height-50,30,30); ctx.fillText(Math.ceil(activePowerUI.shield),xStart+10,canvas.height-55); xStart+=50; }
}


//--------------------- Game Loop ---------------------
function gameLoop(){
  if(gameOver || isPaused) return;
  update(); draw();
  animationId=requestAnimationFrame(gameLoop);
}

//--------------------- Reset Game ---------------------
function resetGame(){
  arrows = []; birds = []; explosions = []; powerUps = []; enemyArrows = []; goldParticles = [];
    score = 0; lives = 3; level = 1; gameOver = false; isPaused = false; nextArrowIsGolden = false;
    arrowSpeed = 8; tripleArrow = false; playerShield = false;
    activePowerUI = { fast:0, triple:0, shield:0 };
    
    restartBtn.style.display = "none"; // ซ่อนปุ่ม Play Again
    homeBtn.style.display = "none";    // ซ่อนปุ่ม Home

    player.x = 50; 
    player.y = canvas.height/2;
    scoreText.textContent = `Score: 0 | Level: 1 | High Score: ${highScore}`;

    bgMusic.currentTime = 0; 
    bgMusic.play().catch(()=>{});

    lastBirdSpawn = Date.now();
    lastPowerUpSpawn = Date.now();

    cancelAnimationFrame(animationId);
    gameLoop();
}  
  //--------------------- End Game ---------------------
function endGame(){
  gameOver = true;
  cancelAnimationFrame(animationId);
  bgMusic.pause();

  // อัปเดต high score
  if(score > highScore){
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  // แสดงปุ่ม Restart & Home
  restartBtn.style.display = "inline-block";
  homeBtn.style.display = "inline-block";
}
    

//--------------------- Responsive Canvas ---------------------
function resizeCanvas(){
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = 9/16;
  if(windowRatio > gameRatio){
    canvas.height = window.innerHeight;
    canvas.width = canvas.height * gameRatio;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = canvas.width / gameRatio;
  }
  player.y = canvas.height/2 - player.height/2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

//--------------------- Start Game ---------------------
resetGame();
