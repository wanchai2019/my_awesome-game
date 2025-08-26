// ---------------- Visitor Counter ----------------
let count = localStorage.getItem("visitorCount")||0;
count++; localStorage.setItem("visitorCount",count);
document.getElementById("visitorCount").textContent = "Visitors: "+count;

// ---------------- Star Rating ----------------
const stars = document.querySelectorAll(".star");
const ratingText = document.getElementById("ratingText");
let savedRating = localStorage.getItem("gameRating")||0;
function highlightStars(rating){
  stars.forEach(star=>star.classList.remove("selected"));
  stars.forEach(star=>{if(star.dataset.value<=rating) star.classList.add("selected");});
  ratingText.textContent = rating>0? "Rate this Game: "+rating+" Stars" : "";
}
stars.forEach(star=>{
  star.addEventListener("click",()=>{
    localStorage.setItem("gameRating",star.dataset.value);
    highlightStars(star.dataset.value);
  });
});
if(savedRating>0) highlightStars(savedRating);

// ---------------- Game Variables ----------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreText = document.getElementById("score");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const homeBtn = document.getElementById("homeBtn");
const controls = {
  up:document.getElementById('arrow-up'),
  down:document.getElementById('arrow-down'),
  left:document.getElementById('arrow-left'),
  right:document.getElementById('arrow-right'),
  shoot:document.getElementById('shoot-btn')
};

const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const bgMusic = document.getElementById("bgMusic");
const pauseSound = document.getElementById("pauseSound");
const resumeSound = document.getElementById("resumeSound");
const scremSound = document.getElementById("scremSound");
const blinkSound = document.getElementById("blinkSound");

let arrows=[], birds=[], explosions=[], powerUps=[];
let score=0, lives=3, level=1, gameOver=false, isPaused=false;
let playerMove={up:false,down:false,left:false,right:false};
let highScore = localStorage.getItem("highScore")||0;
let nextArrowIsGolden=false, arrowSpeed=8, tripleArrow=false, playerShield=false;
let animationId; 
let activePowerUI={fast:0,triple:0,shield:0};
const powerTypes={FAST_ARROW:"fast",TRIPLE_ARROW:"triple",SHIELD:"shield"};
const player={x:50,y:canvas.height/2,width:45,height:80,speed:5};

// ---------------- Images ----------------
const birdImg=new Image(); birdImg.src="./img/bird.png";
const goldenBirdImg=new Image(); goldenBirdImg.src="./img/golden_bird.png";
const bossImg=new Image(); bossImg.src="./img/boss_bird.png";
const playerImg=new Image(); playerImg.src="./img/archer.png";
const arrowImg=new Image(); arrowImg.src="./img/arrow.png";
const shieldImg=new Image(); shieldImg.src="./img/shieldb.png";
const fastImg=new Image(); fastImg.src="./img/fast.png";
const tripleImg=new Image(); tripleImg.src="./img/threearrow.png";
const shieldPowerImg=new Image(); shieldPowerImg.src="./img/shieldb.png";
const birdExoImg=new Image(); birdExoImg.src="./img/birdexo.png";

// ---------------- Explosion Class ----------------
class Explosion{
  constructor(x,y,color="orange"){
    this.particles=[];
    for(let i=0;i<15;i++){
      this.particles.push({x,y,radius:Math.random()*3+2,color,speedX:(Math.random()-0.5)*6,speedY:(Math.random()-0.5)*6,alpha:1});
    }
  }
  update(){ this.particles.forEach(p=>{p.x+=p.speedX;p.y+=p.speedY;p.alpha-=0.03;}); this.particles=this.particles.filter(p=>p.alpha>0);}
  draw(){ this.particles.forEach(p=>{ ctx.globalAlpha=p.alpha; ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill(); ctx.globalAlpha=1; }); }
}

// ---------------- Input Handling ----------------
document.addEventListener("keydown", e=>{
  if(gameOver||isPaused) return;
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
  element.addEventListener('mouseup',()=>playerMove[direction]=false);
  element.addEventListener('mouseleave',()=>playerMove[direction]=false);
  element.addEventListener('touchstart',e=>{ e.preventDefault(); playerMove[direction]=true;});
  element.addEventListener('touchend',e=>{ e.preventDefault(); playerMove[direction]=false;});
  element.addEventListener('touchcancel',e=>{ e.preventDefault(); playerMove[direction]=false;});
}
addControlListeners(controls.up,'up');
addControlListeners(controls.down,'down');
addControlListeners(controls.left,'left');
addControlListeners(controls.right,'right');

controls.shoot.addEventListener('click',shoot);
controls.shoot.addEventListener('touchstart',e=>{ e.preventDefault(); shoot(); });

restartBtn.addEventListener("click",resetGame);
pauseBtn.addEventListener("click",()=>{
  if(!isPaused){ isPaused=true; pauseSound.play(); pauseBtn.textContent="Resume"; bgMusic.pause(); cancelAnimationFrame(animationId);}
  else{ isPaused=false; resumeSound.play(); pauseBtn.textContent="Pause"; bgMusic.play(); gameLoop();}
});
homeBtn.addEventListener("click",()=>{window.location.href="index.html";});

// ---------------- Game Functions ----------------
function shoot(){
  const shots = tripleArrow?[-10,0,10]:[0];
  shots.forEach(offset=>arrows.push({x:player.x+player.width, y:player.y+player.height/2+offset, speed:arrowSpeed, angle:0, isGolden:nextArrowIsGolden}));
  shootSound.currentTime=0; shootSound.play(); nextArrowIsGolden=false;
}

function updatePlayerPosition(){
  if(playerMove.up) player.y-=player.speed;
  if(playerMove.down) player.y+=player.speed;
  if(playerMove.left) player.x-=player.speed;
  if(playerMove.right) player.x+=player.speed;
  player.x=Math.max(0,Math.min(canvas.width-player.width,player.x));
  player.y=Math.max(0,Math.min(canvas.height-player.height,player.y));
}

// ---------------- Spawn Birds ----------------
function spawnBird(){
  if(gameOver) return;
  const y=Math.random()*(canvas.height-60);
  const baseSpeed=1+Math.random()*1.5+score*0.05;
  const speed=Math.min(baseSpeed,10);
  const isBoss=Math.random()<0.3 && birds.filter(b=>b.isBoss).length===0;
  if(isBoss){ birds.push({x:canvas.width,y,startY:y,width:120,height:100,speed:2,amplitude:40,frequency:0.02,time:0,isBoss:true,hp:5}); }
  else { const isGolden=Math.random()<0.1; birds.push({x:canvas.width,y,startY:y,width:40,height:30,speed,amplitude:20+Math.random()*20,frequency:0.02+Math.random()*0.03,time:0,isGolden,isBoss:false}); }
  setTimeout(spawnBird,1500);
}

// ---------------- Spawn PowerUps ----------------
function spawnPowerUp(){
  if(gameOver) return;
  const typeKeys=Object.keys(powerTypes);
  const type=powerTypes[typeKeys[Math.floor(Math.random()*typeKeys.length)]];
  const x=canvas.width;
  const y=Math.random()*(canvas.height-40);
  powerUps.push({x,y,width:40,height:40,type,speed:2,img:type===powerTypes.FAST_ARROW?fastImg:type===powerTypes.TRIPLE_ARROW?tripleImg:shieldPowerImg});
  setTimeout(spawnPowerUp,10000);
}

// ---------------- Update ----------------
// ---------------- Update ----------------
function update(){
  updatePlayerPosition();

  // Arrows
  for(let i=arrows.length-1;i>=0;i--){ arrows[i].x+=arrows[i].speed; if(arrows[i].x>canvas.width) arrows.splice(i,1); }

  // Birds
  for(let i=birds.length-1;i>=0;i--){
    let bird=birds[i];
    bird.x-=bird.speed; bird.time++; bird.y=bird.startY+Math.sin(bird.time*bird.frequency)*bird.amplitude;

    // Collision player vs bird
    if(player.x<bird.x+bird.width && player.x+player.width>bird.x && player.y<bird.y+bird.height && player.y+player.height>bird.y){
      if(!playerShield){ lives--; if(lives<=0){ gameOver=true; restartBtn.style.display="inline-block"; bgMusic.pause(); } }
      scremSound.currentTime=0; scremSound.play();
      explosions.push({img:birdExoImg,x:player.x-20,y:player.y-20,width:player.width+40,height:player.height+40,alpha:1, decay:0.03});
      birds.splice(i,1); continue;
    }
  }

  // Arrows vs Birds
  for(let ai=arrows.length-1;ai>=0;ai--){
    let arrow=arrows[ai];
    for(let bi=birds.length-1;bi>=0;bi--){
      let bird=birds[bi];
      if(arrow.x<bird.x+bird.width && arrow.x+25>bird.x && arrow.y<bird.y+bird.height && arrow.y+5>bird.y){
        arrows.splice(ai,1);
        if(bird.isBoss){ 
          bird.hp -= arrow.isGolden?2:1; 
          explosions.push(new Explosion(bird.x+bird.width/2,bird.y+bird.height/2,"red")); 
          if(bird.hp<=0){ birds.splice(bi,1); score += arrow.isGolden?20:10; } 
        }
        else{ 
          explosions.push(new Explosion(bird.x+bird.width/2,bird.y+bird.height/2,bird.isGolden?"gold":(arrow.isGolden?"yellow":"orange"))); 
          birds.splice(bi,1); 
          score+=bird.isGolden?5:(arrow.isGolden?2:1); 
          if(bird.isGolden) nextArrowIsGolden=true; 
        }
        level=Math.floor(score/10)+1;
        if(score>highScore){ highScore=score; localStorage.setItem("highScore",highScore); }
        scoreText.textContent=`Score: ${score} | Level: ${level} | High Score: ${highScore}`;
        hitSound.currentTime=0; hitSound.play(); 
        break;
      }
    }
  }

  // PowerUps
  for(let i=powerUps.length-1;i>=0;i--){
    let pu=powerUps[i]; pu.x-=pu.speed;
    if(pu.x+pu.width<0){ powerUps.splice(i,1); continue; }
    if(player.x<pu.x+pu.width && player.x+player.width>pu.x && player.y<pu.y+pu.height && player.y+player.height>pu.y){
      powerUps.splice(i,1); blinkSound.currentTime=0; blinkSound.play();
      if(pu.type===powerTypes.FAST_ARROW){ arrowSpeed=12; activePowerUI.fast=5; setTimeout(()=>{arrowSpeed=8; activePowerUI.fast=0;},5000);}
      if(pu.type===powerTypes.TRIPLE_ARROW){ tripleArrow=true; activePowerUI.triple=5; setTimeout(()=>{tripleArrow=false; activePowerUI.triple=0;},5000);}
      if(pu.type===powerTypes.SHIELD){ playerShield=true; activePowerUI.shield=5; setTimeout(()=>{playerShield=false; activePowerUI.shield=0;},5000);}
    }
  }

  // Update explosions & remove finished ones
  for(let i=explosions.length-1;i>=0;i--){
    let ex = explosions[i];
    if(ex instanceof Explosion){
      ex.update();
      if(ex.particles.length===0) explosions.splice(i,1);
    } else { 
      ex.alpha -= ex.decay || 0.03; 
      if(ex.alpha <=0) explosions.splice(i,1); 
    }
  }

  Object.keys(activePowerUI).forEach(key=>{ if(activePowerUI[key]>0) activePowerUI[key]-=1/60; });
}

// ---------------- Draw ----------------
let glowTime=0;
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(playerImg,player.x,player.y,player.width,player.height);
  if(playerShield) ctx.drawImage(shieldImg,player.x-5,player.y-5,player.width+10,player.height+10);
  glowTime+=0.1;

  arrows.forEach(arrow=>{
    ctx.save(); ctx.translate(arrow.x,arrow.y);
    if(arrow.isGolden){ ctx.shadowBlur=20+10*Math.sin(glowTime*5); ctx.shadowColor="gold"; }
    else{ ctx.shadowBlur=15; ctx.shadowColor="red"; }
    ctx.drawImage(arrowImg,-12.5,-5,25,10); ctx.restore();
  });

  birds.forEach(bird=>{
    if(bird.isBoss){ ctx.drawImage(bossImg,bird.x,bird.y,bird.width,bird.height); ctx.fillStyle="gray"; ctx.fillRect(bird.x,bird.y-10,bird.width,6); ctx.fillStyle="lime"; ctx.fillRect(bird.x,bird.y-10,(bird.hp/5)*bird.width,6); ctx.strokeStyle="black"; ctx.strokeRect(bird.x,bird.y-10,bird.width,6);}
    else ctx.drawImage(bird.isGolden?goldenBirdImg:birdImg,bird.x,bird.y,bird.width,bird.height);
  });

  powerUps.forEach(pu=>ctx.drawImage(pu.img,pu.x,pu.y,pu.width,pu.height));
  explosions.forEach(ex=>{ if(ex instanceof Explosion) ex.draw(); else {ctx.globalAlpha=ex.alpha; ctx.drawImage(ex.img,ex.x,ex.y,ex.width,ex.height); ctx.globalAlpha=1;} });

  ctx.fillStyle="yellow";
  ctx.font="20px Arial";
  if(activePowerUI.fast>0) ctx.fillText("⚡",10,30);
  if(activePowerUI.triple>0) ctx.fillText("🎯",10,60);
  if(activePowerUI.shield>0) ctx.fillText("🛡️",10,90);
}

// ---------------- Game Loop ----------------
function gameLoop(){
  if(!gameOver && !isPaused){ update(); draw(); animationId=requestAnimationFrame(gameLoop);}
}

// ---------------- Reset Game ----------------
function resetGame(){
  arrows=[]; birds=[]; powerUps=[]; explosions=[]; score=0; level=1; lives=3; gameOver=false; nextArrowIsGolden=false; playerShield=false; tripleArrow=false; arrowSpeed=8;
  restartBtn.style.display="none"; scoreText.textContent=`Score: ${score} | Level: ${level} | High Score: ${highScore}`;
  bgMusic.currentTime=0; bgMusic.play();
  spawnBird(); spawnPowerUp(); gameLoop();
}

// ---------------- Start ----------------
bgMusic.play(); spawnBird(); spawnPowerUp(); gameLoop();

// ---------------- Responsive Canvas ----------------
function resizeCanvas(){ canvas.width=canvas.parentElement.clientWidth; canvas.height=600; }
window.addEventListener("resize",resizeCanvas); resizeCanvas();
