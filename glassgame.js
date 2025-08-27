/* =========================================================
   Glass Shooter - Vanilla JS Canvas Game
   Features:
   - Player movement (keyboard + D-Pad)
   - Shooting, enemies, collisions, particle explosions
   - Pause/Resume overlay
   - Power-up: Rapid Fire (with glass timer)
   - Visitor counter, High Score, Rating stars
   - Auto-create Restart & Home buttons on Game Over
   ========================================================= */

(() => {
  // ---------- DOM ----------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("bestScore");
  const livesEl = document.getElementById("lives");
  const visitorCountEl = document.getElementById("visitorCount");

  const powerupBadge = document.getElementById("powerupBadge");
  const powerupProgress = document.getElementById("powerupProgress");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayDesc = document.getElementById("overlayDesc");
  const resumeBtn = document.getElementById("resumeBtn");

  const pauseBtn = document.getElementById("pauseBtn");
  const fireBtn = document.getElementById("fireBtn");

  // D-Pad
  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");

  // ---------- State ----------
  const W = () => canvas.width;
  const H = () => canvas.height;

  const state = {
    running: true,
    gameOver: false,
    score: 0,
    lives: 3,
    best: Number(localStorage.getItem("glass_shooter_best") || 0),
    rapidFire: { active: false, endAt: 0, duration: 10000 }, // ms
    shootCooldown: 220, // ms
    lastShotAt: 0,
    enemies: [],
    bullets: [],
    particles: [],
    keys: { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false, Space:false },
    touch: { up:false, down:false, left:false, right:false, fire:false }
  };

  bestScoreEl.textContent = state.best;

  // Visitor Counter (per device)
  {
    const key = "glass_shooter_visits";
    const count = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(count));
    visitorCountEl.textContent = count;
  }

  // ---------- Resize (keep crisp canvas) ----------
  function fitCanvas() {
    // Keep fixed internal resolution for consistent speed/feel
    const targetW = 900, targetH = 550;
    const scale = Math.min(window.innerWidth * 0.96 / targetW, 1);
    canvas.style.width = `${Math.floor(targetW * scale)}px`;
    canvas.style.height = `${Math.floor(targetH * scale)}px`;
    canvas.width = targetW;
    canvas.height = targetH;
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  // ---------- Audio (WebAudio minimal beeps) ----------
  let audioCtx;
  function beep(freq=600, dur=0.06, type="square", gain=.06){
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch(e) { /* ignore */ }
  }

  // ---------- Entities ----------
  const player = {
    x:  W()/2, y: H()-70, r: 16, speed: 4.0,
    color: "#fff",
  };

  function spawnEnemy(){
    const r = 14 + Math.random()*12;
    const x = r + Math.random() * (W() - r*2);
    const y = -r - 10;
    const vy = 1.2 + Math.random()*1.8;
    const vx = (Math.random()*2 - 1) * 0.6;
    const hp = Math.random() < 0.15 ? 2 : 1; // some are tougher
    const color = hp>1 ? "#ffd166" : "#ff6b6b";
    state.enemies.push({x,y,r,vy,vx,hp,color, t:0});
  }

  function shoot(){
    const now = performance.now();
    const cooldown = state.rapidFire.active ? 90 : state.shootCooldown;
    if (now - state.lastShotAt < cooldown) return;
    state.lastShotAt = now;

    const spread = state.rapidFire.active ? 0.12 : 0.08;
    const count  = state.rapidFire.active ? 2 : 1;

    for (let i=0;i<count;i++){
      const angle = -Math.PI/2 + (i-(count-1)/2)*spread;
      const speed = 7;
      state.bullets.push({
        x: player.x, y: player.y- player.r - 2,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        r: 4, color: "#e2e8f0"
      });
    }
    beep(720, .04, "square", .045);
  }

  function addParticles(x,y, base="#fff"){
    for (let i=0;i<16;i++){
      const a = Math.random()*Math.PI*2;
      const s = 1.5 + Math.random()*3;
      state.particles.push({
        x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
        life: 30 + Math.random()*20, color: base
      });
    }
  }

  // ---------- Power-up ----------
  function activateRapidFire(){
    const now = performance.now();
    state.rapidFire.active = true;
    state.rapidFire.endAt = now + state.rapidFire.duration;
    powerupBadge.classList.remove("hidden");
    beep(980, .12, "sawtooth", .06);
  }

  function updatePowerupUI(){
    if (!state.rapidFire.active){
      powerupBadge.classList.add("hidden");
      return;
    }
    const now = performance.now();
    const remain = Math.max(0, state.rapidFire.endAt - now);
    const ratio = remain / state.rapidFire.duration;
    powerupProgress.style.transform = `scaleX(${ratio})`;
    if (remain <= 0){
      state.rapidFire.active = false;
      powerupBadge.classList.add("hidden");
      beep(240, .12, "triangle", .05);
    }
  }

  // ---------- Input ----------
  window.addEventListener("keydown", (e)=>{
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Spacebar","Space"].includes(e.key)) e.preventDefault();
    if (e.key === "p" || e.key === "P") togglePause();
    if (e.key === " ") state.keys.Space = true;
    if (e.key === "ArrowUp") state.keys.ArrowUp = true;
    if (e.key === "ArrowDown") state.keys.ArrowDown = true;
    if (e.key === "ArrowLeft") state.keys.ArrowLeft = true;
    if (e.key === "ArrowRight") state.keys.ArrowRight = true;
  });
  window.addEventListener("keyup", (e)=>{
    if (e.key === " ") state.keys.Space = false;
    if (e.key === "ArrowUp") state.keys.ArrowUp = false;
    if (e.key === "ArrowDown") state.keys.ArrowDown = false;
    if (e.key === "ArrowLeft") state.keys.ArrowLeft = false;
    if (e.key === "ArrowRight") state.keys.ArrowRight = false;
  });

  function bindHold(el, setFlag){
    const on = (e)=>{ e.preventDefault(); setFlag(true); };
    const off = (e)=>{ e.preventDefault(); setFlag(false); };
    el.addEventListener("pointerdown", on);
    window.addEventListener("pointerup", off);
    el.addEventListener("touchstart", on, {passive:false});
    el.addEventListener("touchend", off);
    el.addEventListener("mousedown", on);
    el.addEventListener("mouseup", off);
    el.addEventListener("mouseleave", off);
  }
  bindHold(upBtn,    v=>state.touch.up=v);
  bindHold(downBtn,  v=>state.touch.down=v);
  bindHold(leftBtn,  v=>state.touch.left=v);
  bindHold(rightBtn, v=>state.touch.right=v);

  bindHold(fireBtn,  v=>state.touch.fire=v);
  pauseBtn.addEventListener("click", ()=> togglePause());
  resumeBtn.addEventListener("click", ()=> togglePause());

  // ---------- Pause / Overlay ----------
  function togglePause(){
    if (state.gameOver) return;
    state.running = !state.running;
    if (!state.running){
      overlayTitle.textContent = "Paused";
      overlayDesc.textContent = "กด Resume เพื่อเล่นต่อ";
      ensureButtons(false); // hide restart/home if any
      overlay.classList.remove("hidden");
      canvas.classList.add("dimmed");
      pauseBtn.textContent = "▶ Resume";
    } else {
      overlay.classList.add("hidden");
      canvas.classList.remove("dimmed");
      pauseBtn.textContent = "⏸ Pause";
      lastFrame = performance.now();
      loop(); // continue immediately
    }
  }

  function gameOver(){
    state.gameOver = true;
    state.running = false;
    overlayTitle.textContent = "Game Over";
    overlayDesc.innerHTML = `ได้คะแนน <strong>${state.score}</strong>`;
    overlay.classList.remove("hidden");
    canvas.classList.add("dimmed");
    ensureButtons(true);
    pauseBtn.textContent = "⏸ Pause";
  }

  // Create/Toggle Restart & Home buttons when needed
  function ensureButtons(showEndButtons){
    const actions = overlay.querySelector(".overlay-actions");
    // remove old dynamic buttons
    actions.querySelectorAll(".dyn").forEach(n=>n.remove());
    if (!showEndButtons) return;

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "↻ Restart";
    restartBtn.className = "dyn";
    restartBtn.addEventListener("click", resetGame);

    const homeBtn = document.createElement("button");
    homeBtn.textContent = "⌂ Home";
    homeBtn.className = "dyn";
    homeBtn.addEventListener("click", ()=> {
      // หน้า Home แบบง่าย ๆ: รีโหลดเพจ
      window.location.href = "index.html";
    });

    actions.appendChild(restartBtn);
    actions.appendChild(homeBtn);
  }

  function resetGame(){
    state.gameOver = false;
    state.running = true;
    state.score = 0;
    state.lives = 3;
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    livesEl.textContent = state.lives;
    scoreEl.textContent = state.score;
    overlay.classList.add("hidden");
    canvas.classList.remove("dimmed");
    lastFrame = performance.now();
    loop();
  }

  // ---------- Rating Stars ----------
  const stars = Array.from(document.querySelectorAll(".star"));
  const ratingKey = "glass_shooter_rating";
  function loadRating(){
    const r = Number(localStorage.getItem(ratingKey) || 0);
    setStars(r);
  }
  function setStars(n){
    stars.forEach(s=>{
      const val = Number(s.dataset.value);
      s.classList.toggle("selected", val<=n);
    });
  }
  stars.forEach(s=>{
    s.addEventListener("click", ()=>{
      const n = Number(s.dataset.value);
      localStorage.setItem(ratingKey, String(n));
      setStars(n);
    });
  });
  loadRating();

  // ---------- Spawning ----------
  let enemyTimer = 0;
  let enemyInterval = 900; // ms

  // Randomly drop power-ups
  function maybeDropPowerup(x,y){
    if (Math.random() < 0.14){
      // instantly activate for simplicity
      activateRapidFire();
      // visual burst to indicate pickup
      addParticles(x,y,"#22d3ee");
    }
  }

  // ---------- Loop ----------
  let lastFrame = performance.now();

  function loop(){
    if (!state.running) return;
    const now = performance.now();
    const dt = Math.min(33, now - lastFrame); // ms cap
    lastFrame = now;

    update(dt);
    render();

    if (state.running) requestAnimationFrame(loop);
  }

  function update(dt){
    // Input mixing
    const up    = state.keys.ArrowUp    || state.touch.up;
    const down  = state.keys.ArrowDown  || state.touch.down;
    const left  = state.keys.ArrowLeft  || state.touch.left;
    const right = state.keys.ArrowRight || state.touch.right;
    const shootHeld = state.keys.Space || state.touch.fire;

    // Move player
    let dx = 0, dy = 0;
    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;
    const len = Math.hypot(dx,dy) || 1;
    const speed = player.speed * (state.rapidFire.active ? 1.1 : 1.0);
    player.x += (dx/len) * speed;
    player.y += (dy/len) * speed;
    // clamp
    player.x = Math.max(player.r+6, Math.min(W()-player.r-6, player.x));
    player.y = Math.max(player.r+6, Math.min(H()-player.r-6, player.y));

    if (shootHeld) shoot();

    // Enemies spawn
    enemyTimer += dt;
    if (enemyTimer > enemyInterval){
      enemyTimer = 0;
      // spawn more when score increases
      const extra = Math.min(3, Math.floor(state.score/12));
      for (let i=0;i<1+extra;i++) spawnEnemy();
      // speed up spawn a bit
      enemyInterval = Math.max(420, 900 - state.score*4);
    }

    // Update enemies
    state.enemies.forEach(e=>{
      e.t += dt;
      e.x += e.vx;
      e.y += e.vy;
      // gentle sway
      e.x += Math.sin(e.t*0.004)*(e.hp>1?0.5:0.8);
    });

    // Update bullets
    state.bullets.forEach(b=>{
      b.x += b.vx; b.y += b.vy;
    });

    // Particles
    state.particles.forEach(p=>{
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.985; p.vy *= 0.985;
      p.life -= 1;
    });

    // Collisions bullets <-> enemies
    for (let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      for (let j=state.bullets.length-1;j>=0;j--){
        const b = state.bullets[j];
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx*dx + dy*dy <= (e.r + b.r)*(e.r + b.r)){
          state.bullets.splice(j,1);
          e.hp -= 1;
          addParticles(b.x,b.y,"#e2e8f0");
          if (e.hp<=0){
            state.enemies.splice(i,1);
            state.score += 2;
            scoreEl.textContent = state.score;
            bestScoreMaybeUpdate();
            addParticles(e.x, e.y, e.color);
            beep(520,.06,"triangle", .06);
            maybeDropPowerup(e.x,e.y);
          } else {
            // hit but not dead
            beep(400,.04,"square", .035);
          }
          break;
        }
      }
    }

    // Enemy hits player or out of bounds
    for (let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      // out bottom -> lose life
      if (e.y - e.r > H()){
        state.enemies.splice(i,1);
        //loseLife();enemy ออกหน้าจอตาย
        continue;
      }
      // collide with player
      const dx = e.x - player.x, dy = e.y - player.y;
      if (dx*dx + dy*dy <= (e.r + player.r)*(e.r + player.r)){
        state.enemies.splice(i,1);
        addParticles(player.x, player.y, "#fff");
        beep(180,.08,"sawtooth", .08);
        loseLife();
      }
    }

    // Cleanup bullets/particles
    state.bullets = state.bullets.filter(b=> b.y + b.r >= -10 && b.x>=-10 && b.x<=W()+10);
    state.particles = state.particles.filter(p=> p.life>0);

    // Power-up UI update
    updatePowerupUI();
  }

  function loseLife(){
    state.lives -= 1;
    livesEl.textContent = state.lives;
    if (state.lives<=0) {
      bestScoreMaybeUpdate();
      gameOver();
    }
  }

  function bestScoreMaybeUpdate(){
    if (state.score > state.best){
      state.best = state.score;
      localStorage.setItem("glass_shooter_best", String(state.best));
      bestScoreEl.textContent = state.best;
    }
  }

  // ---------- Render ----------
  function render(){
    // sky gradient already from CSS; we draw extras
    ctx.clearRect(0,0,W(),H());

    // background subtle mountains
    drawBackdrop();

    // player
    drawPlayer();

    // bullets
    for (const b of state.bullets){
      ctx.beginPath();
      ctx.fillStyle = b.color;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
    }

    // enemies
    for (const e of state.enemies){
      // soft shadow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,.15)";
      ctx.arc(e.x+2, e.y+3, e.r, 0, Math.PI*2);
      ctx.fill();

      // body
      ctx.beginPath();
      const grd = ctx.createRadialGradient(e.x-4,e.y-6,4, e.x,e.y,e.r);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(1, e.color);
      ctx.fillStyle = grd;
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();

      // eyes (cute)
      ctx.fillStyle = "rgba(0,0,0,.65)";
      ctx.fillRect(e.x-3, e.y-3, 2, 4);
      ctx.fillRect(e.x+1, e.y-3, 2, 4);
    }

    // particles
    for (const p of state.particles){
      ctx.globalAlpha = Math.max(0, p.life/40);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(){
    // glow
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.arc(player.x, player.y+8, player.r+6, 0, Math.PI*2);
    ctx.fill();

    // body
    ctx.beginPath();
    const grd = ctx.createRadialGradient(player.x-6, player.y-8, 4, player.x, player.y, player.r+2);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(1, "#60a5fa");
    ctx.fillStyle = grd;
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();

    // cannon tip indicator
    ctx.beginPath();
    ctx.fillStyle = "#e2e8f0";
    ctx.arc(player.x, player.y - player.r, 3, 0, Math.PI*2);
    ctx.fill();
  }

  function drawBackdrop(){
    // horizon line
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H()-90);
    ctx.lineTo(W(), H()-90);
    ctx.stroke();

    // parallax hills
    drawHill(H()-100, 0.8);
    drawHill(H()-60,  0.5);
  }

  function drawHill(y, alpha){
    ctx.fillStyle = `rgba(0,0,0,${0.15*alpha})`;
    ctx.beginPath();
    ctx.moveTo(0,y);
    for (let x=0; x<=W(); x+=30){
      const h = Math.sin((x+performance.now()*0.0004)*0.8)*8*alpha;
      ctx.lineTo(x, y - 20*alpha + h);
    }
    ctx.lineTo(W(),H()); ctx.lineTo(0,H()); ctx.closePath();
    ctx.fill();
  }

  // ---------- Start ----------
  // Start with a free Rapid Fire for 5s as a taste
  state.rapidFire.duration = 5000;
  activateRapidFire();
  state.rapidFire.duration = 10000; // normal for later pickups

  lastFrame = performance.now();
  loop();

  // Fallback: auto-fire on mobile when pressing Fire
  setInterval(()=>{ if(state.touch.fire) shoot(); }, 50);

})();
