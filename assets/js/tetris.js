(() => {
  // Canvasy
  const board = document.getElementById('board');
  const ncv = document.getElementById('next');
  const hcv = document.getElementById('hold');
  const ctx = board.getContext('2d');
  const nctx = ncv.getContext('2d');
  const hctx = hcv.getContext('2d');

  // UI
  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');

  // Ustawienia
  const COLS = 10, ROWS = 20, TILE = 30;
  const ARENA = createMatrix(COLS, ROWS);
  const COLORS = {
    'I': '#20c4ff', 'J': '#4e6cff', 'L': '#ff9f1c',
    'O': '#ffe600', 'S': '#3bd16f', 'T': '#bf7bff', 'Z': '#ff4d6d',
    '#': '#41516e'
  };

  const PIECES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
  };

  // Dźwięki
  const sounds = {
    music: new Audio("assets/sounds/music.mp3"),
    line: new Audio("assets/sounds/line.mp3"),
    levelup: new Audio("assets/sounds/levelup.mp3"),
    drop: new Audio("assets/sounds/drop.mp3"),
    rotate: new Audio("assets/sounds/rotate.mp3"),      
    gameover: new Audio("assets/sounds/gameover.mp3")
  };
  sounds.music.loop = true;
  sounds.music.volume = 0.3;

  // Stan gry
  let dropCounter = 0, dropInterval = 1000;
  let lastTime = 0;
  let score = 0, lines = 0, level = 1;
  let queue = shuffle(['I','J','L','O','S','T','Z']);
  let held = null, canHold = true;
  let paused = false, running = false, gameOver = false;

  const player = {
    pos: {x: 3, y: 0},
    matrix: createMatrix(4, 4).map(r => r.fill(0)),
    type: null
  };

  function draw() {
    ctx.fillStyle = '#0f1113';
    ctx.fillRect(0,0,board.width, board.height);
    drawMatrix(ARENA, {x:0,y:0}, true);
    if (player.type) drawMatrix(player.matrix, player.pos, false, player.type);
  }

  function drawMatrix(matrix, offset, ghost=false, type='') {
    for (let y=0; y<matrix.length; y++) {
      for (let x=0; x<matrix[y].length; x++) {
        if (matrix[y][x]) {
          ctx.fillStyle = ghost ? COLORS['#'] : COLORS[type] || '#9aa4b2';
          ctx.fillRect((x+offset.x)*TILE, (y+offset.y)*TILE, TILE-1, TILE-1);
        }
      }
    }
  }

  function drawMini(ctx2d, type){
    ctx2d.clearRect(0,0,ctx2d.canvas.width, ctx2d.canvas.height);
    if(!type) return;
    const m = PIECES[type];
    const size = Math.max(m.length, m[0].length);
    const scale = Math.floor(Math.min(ctx2d.canvas.width, ctx2d.canvas.height) / (size+1));
    const ox = Math.floor((ctx2d.canvas.width - m[0].length*scale)/2);
    const oy = Math.floor((ctx2d.canvas.height - m.length*scale)/2);
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          ctx2d.fillStyle = COLORS[type];
          ctx2d.fillRect(ox + x*scale, oy + y*scale, scale-1, scale-1);
        }
      }
    }
  }

  function merge(arena, player){
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const ay = y + player.pos.y;
          const ax = x + player.pos.x;
          if (arena[ay] && arena[ay][ax] !== undefined) {
            arena[ay][ax] = value;
          }
        }
      });
    });
  }

  function collide(arena, player){
    const m = player.matrix, o = player.pos;
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0){
          return true;
        }
      }
    }
    return false;
  }

  function rotate(matrix, dir){
    for(let y=0;y<matrix.length;y++){
      for(let x=0;x<y;x++){
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if(dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
    return matrix;
  }

  function playerRotate(dir){
    const pos = player.pos.x;
    const m = player.matrix;
    rotate(m, dir);
    let offset = 1;
    while (collide(ARENA, player)){
      player.pos.x += offset;
      offset = -(offset + (offset>0 ? 1 : -1));
      if(offset > m[0].length){
        rotate(m, -dir);
        player.pos.x = pos;
        return;
      }
    }
    sounds.rotate.play();
  }

  function playerDrop(){
    player.pos.y++;
    if(collide(ARENA, player)){
      player.pos.y--;
      merge(ARENA, player);
      const cleared = arenaSweep();
      if(cleared){
        score += [0,100,300,500,800][cleared] * Math.max(1, level);
        lines += cleared;
        if(cleared) sounds.line.play();
        if(lines >= level*10){
          level++;
          dropInterval = Math.max(120, 1000 - (level-1)*80);
          sounds.levelup.play();
        }
        updateStats();
      }
      playerReset();
    }
    dropCounter = 0;
  }

  function hardDrop(){
    if(gameOver) return;
    while(!collide(ARENA, player)) player.pos.y++;
    player.pos.y--;
    merge(ARENA, player);
    const cleared = arenaSweep();
    if(cleared){
      score += [0,100,300,500,800][cleared] * Math.max(1, level);
      lines += cleared;
      if(cleared) sounds.line.play();
      if(lines >= level*10){
        level++;
        dropInterval = Math.max(120, 1000 - (level-1)*80);
        sounds.levelup.play();
      }
      updateStats();
    }
    playerReset();
    dropCounter = 0;
  }

  function holdPiece(){
    if(!canHold) return;
    const curType = player.type;
    if(held == null){
      held = curType;
      playerReset(true);
    } else {
      [held, player.type] = [curType, held];
      player.matrix = pieceMatrix(player.type);
      player.pos = {x: Math.floor(COLS/2)-2, y: 0};
      if(collide(ARENA, player)) gameEnd();
    }
    canHold = false;
    drawMini(hctx, held);
  }

  function playerReset(fromHold=false){
    player.type = nextFromQueue();
    player.matrix = pieceMatrix(player.type);
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS/2) - Math.ceil(player.matrix[0].length/2);
    canHold = true;
    if(collide(ARENA, player)) gameEnd();
  }

  function nextFromQueue(){
    if(queue.length === 0) queue = shuffle(['I','J','L','O','S','T','Z']);
    const next = queue.shift();
    if(queue.length === 0) queue = shuffle(['I','J','L','O','S','T','Z']);
    drawMini(nctx, queue[0] || null);
    return next;
  }

  function arenaSweep(){
    let rowCount = 0;
    outer: for(let y = ARENA.length - 1; y >= 0; --y){
      for(let x=0;x<ARENA[y].length;x++){
        if(ARENA[y][x] === 0) continue outer;
      }
      const row = ARENA.splice(y,1)[0].fill(0);
      ARENA.unshift(row);
      ++rowCount;
      ++y;
    }
    return rowCount;
  }

  function update(time = 0){
    if(!running || paused || gameOver) return;
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    if(dropCounter > dropInterval) playerDrop();
    draw();
    requestAnimationFrame(update);
  }

  function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; }
  function pieceMatrix(type){ return PIECES[type].map(r => r.map(v => v?type:0)); }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function updateStats(){ scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level; }

  function gameStart(){
    ARENA.forEach(r=>r.fill(0));
    score=0; lines=0; level=1; dropInterval=1000;
    queue=shuffle(['I','J','L','O','S','T','Z']);
    held=null; canHold=true; paused=false; gameOver=false;

    drawMini(hctx,null);
    player.type = nextFromQueue();
    player.matrix = pieceMatrix(player.type);
    player.pos = {x: Math.floor(COLS/2)-2, y: 0};

    updateStats();
    running=true;
    overlay.classList.add('hidden');
    lastTime=0; dropCounter=0;
    try { sounds.music.play(); } catch(e) {}
    requestAnimationFrame(update);
  }

  function gameEnd(){
    running=false; gameOver=true;
    overlayTitle.textContent='Koniec gry';
    overlaySub.textContent='Enter – zagraj ponownie';
    overlay.classList.remove('hidden');
    sounds.gameover.play();
    try { sounds.music.pause(); sounds.music.currentTime=0; } catch(e) {}
  }

  function togglePause(){
    if(!running || gameOver) return;
    paused = !paused;
    overlayTitle.textContent = paused ? 'Pauza' : 'Tetris';
    overlaySub.textContent = paused ? 'P – wznów' : 'Enter – rozpocznij';
    overlay.classList.toggle('hidden', !paused);
    if(!paused) requestAnimationFrame(update);
  }

  window.addEventListener('keydown', (e)=>{
    if(e.code==='Enter'){ if(!running||gameOver) gameStart(); e.preventDefault(); }
    if(!running||paused||gameOver) { if(e.code==='KeyP') togglePause(); return; }

    switch(e.code){
      case 'ArrowLeft': player.pos.x--; if(collide(ARENA,player)) player.pos.x++; e.preventDefault(); break;
      case 'ArrowRight': player.pos.x++; if(collide(ARENA,player)) player.pos.x--; e.preventDefault(); break;
      case 'ArrowDown': playerDrop(); e.preventDefault(); break;
      case 'ArrowUp':
      case 'KeyX': playerRotate(1); e.preventDefault(); break;
      case 'KeyZ': playerRotate(-1); e.preventDefault(); break;
      case 'Space': hardDrop(); e.preventDefault(); break;
      case 'KeyC': holdPiece(); e.preventDefault(); break;
      case 'KeyP': togglePause(); e.preventDefault(); break;
    }
  });

  overlayTitle.textContent='Tetris';
  overlaySub.textContent='Enter – rozpocznij';
  overlay.classList.remove('hidden');
  draw();
  drawMini(nctx,null);
  drawMini(hctx,null);

   function gameLoop(time = 0) {
    if (!running || paused || gameOver) return;
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    if (dropCounter > dropInterval) playerDrop();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Obsługa przycisków dotykowych / mobilnych
  document.querySelectorAll(".mobile-controls button").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      switch(action){
        case "left":
          player.pos.x--;
          if(collide(ARENA, player)) player.pos.x++;
          break;
        case "right":
          player.pos.x++;
          if(collide(ARENA, player)) player.pos.x--;
          break;
        case "rotate":
          playerRotate(1);
          break;
        case "down":
          playerDrop();
          break;
        case "drop":
          hardDrop();
          break;
        case "hold":
          holdPiece();
          break;
        case "start":
          if(!running || gameOver) gameStart();
          break;
      }
    });
  });

  // Startowy rysunek
  draw();
  drawMini(nctx, null);
  drawMini(hctx, null);
  
  // Suwak głośności
  const volumeSlider = document.getElementById('volume');
	if (volumeSlider) {
	  volumeSlider.addEventListener('input', () => {
		sounds.music.volume = volumeSlider.value;
	  });
	}

})();