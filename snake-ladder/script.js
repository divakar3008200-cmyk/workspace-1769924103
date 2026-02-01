// Snake & Ladder - simple implementation
// Board is 8x8 (64 squares). Squares numbered 1..64 left-to-right, bottom-to-top with alternating directions.

const SIZE = 8;
const boardEl = document.getElementById('board');
const overlay = document.getElementById('overlay');
const rollBtn = document.getElementById('rollBtn');
const resetBtn = document.getElementById('resetBtn');
const diceEl = document.getElementById('dice');
const logEl = document.getElementById('log');
const playersUI = [document.getElementById('player-0'), document.getElementById('player-1')];

let squares = []; // {x,y,el}
let players = [ {pos:0}, {pos:0} ];
let current = 0;
let busy = false;

// Define snakes & ladders map (start -> end). Using within 1..64
const jumps = {
  3:22,  // ladder
  11:26, // ladder
  17:4,  // snake
  19:38, // ladder
  24:16, // snake
  27:45, // ladder
  34:12, // snake
  41:58, // ladder
  47:30, // snake
  52:39, // snake
  57:63, // ladder
  62:48  // snake
};

function log(text){
  const t = document.createElement('div');
  t.textContent = text;
  logEl.prepend(t);
}

function createBoard(){
  boardEl.querySelectorAll('.square').forEach(el=>el.remove());
  squares = [];
  const step = 100 / SIZE;
  // Build coordinates starting bottom-left
  let num = 1;
  for(let row=0; row<SIZE; row++){
    const y = 100 - (row+1)*step;
    const leftToRight = row % 2 === 0; // bottom row left->right
    for(let col=0; col<SIZE; col++){
      const actualCol = leftToRight ? col : (SIZE-1-col);
      const x = actualCol*step;
      const el = document.createElement('div');
      el.className = 'square' + ((row+col)%2? ' dark':'');
      el.style.left = x + '%';
      el.style.top = y + '%';
      el.style.width = step + '%';
      el.style.height = step + '%';
      const n = document.createElement('div');
      n.className = 'num';
      n.textContent = num;
      el.appendChild(n);
      boardEl.appendChild(el);
      squares[num] = {x: x + step/2, y: y + step/2, el};
      num++;
    }
  }
}

function drawJumps(){
  overlay.innerHTML = '';
  const w = overlay.clientWidth;
  const h = overlay.clientHeight;
  function coord(p){
    const s = squares[p];
    return {x: (s.x/100)*w, y: (s.y/100)*h};
  }
  for(const from in jumps){
    const to = jumps[from];
    const a = coord(from), b = coord(to);
    if(from < to){
      // ladder - straight line with green stroke
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);
      line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
      line.setAttribute('stroke','rgba(16,185,129,0.9)');
      line.setAttribute('stroke-width','6');
      line.setAttribute('stroke-linecap','round');
      overlay.appendChild(line);
    } else {
      // snake - bezier curve red
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      const dx = (b.x - a.x);
      const dy = (b.y - a.y);
      const cx1 = a.x - dy*0.2;
      const cy1 = a.y + dx*0.2;
      const cx2 = b.x + dy*0.2;
      const cy2 = b.y - dx*0.2;
      const d = `M ${a.x} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
      path.setAttribute('d',d);
      path.setAttribute('stroke','rgba(239,68,68,0.95)');
      path.setAttribute('stroke-width','7');
      path.setAttribute('fill','none');
      path.setAttribute('stroke-linecap','round');
      overlay.appendChild(path);
    }
  }
}

function placeTokens(){
  // remove old tokens
  boardEl.querySelectorAll('.pawn').forEach(p=>p.remove());
  players.forEach((pl,i)=>{
    const pos = pl.pos || 0;
    if(pos===0) return; // off-board
    const s = squares[pos];
    const pawn = document.createElement('div');
    pawn.className = 'pawn';
    pawn.style.position = 'absolute';
    pawn.style.width = '22px';
    pawn.style.height = '22px';
    pawn.style.borderRadius = '50%';
    pawn.style.left = `calc(${s.x}% - 11px)`;
    pawn.style.top = `calc(${s.y}% - 11px)`;
    pawn.style.zIndex = 5;
    pawn.style.border = '2px solid #071028';
    pawn.style.background = i===0 ? 'linear-gradient(180deg,#60a5fa,#2563eb)' : 'linear-gradient(180deg,#fca5a5,#ef4444)';
    boardEl.appendChild(pawn);
  });
}

function resizeHandler(){
  // redraw jumps to scale
  drawJumps();
  placeTokens();
}
window.addEventListener('resize', resizeHandler);

createBoard();
drawJumps();
placeTokens();

rollBtn.addEventListener('click', async ()=>{
  if(busy) return;
  busy = true;
  const die = Math.floor(Math.random()*6)+1;
  diceEl.textContent = die;
  log(`Player ${current+1} rolled ${die}`);
  await animateDice(die);
  // move
  let newPos = players[current].pos + die;
  if(newPos>64) {
    log('Roll too high to move. Turn ends.');
  } else {
    await movePlayer(current, newPos);
    // check jumps
    if(jumps[players[current].pos]){
      const dest = jumps[players[current].pos];
      if(dest>players[current].pos) log(`Ladder! Up to ${dest}`); else log(`Oh no! Snake -> ${dest}`);
      await movePlayer(current, dest);
    }
    if(players[current].pos===64){
      log(`Player ${current+1} wins!`);
      alert(`Player ${current+1} wins!`);
      busy=false;return;
    }
  }
  // next player
  playersUI[current].classList.remove('active');
  current = (current+1)%players.length;
  playersUI[current].classList.add('active');
  log(`Player ${current+1} to play.`);
  busy=false;
});

resetBtn.addEventListener('click', ()=>{
  players = [ {pos:0}, {pos:0} ];
  current = 0; playersUI.forEach((p,i)=>p.classList.toggle('active', i===0));
  diceEl.textContent = '-';
  log('Game reset.');
  placeTokens();
});

function animateDice(val){
  return new Promise(res=>{
    let t=0;const iv = setInterval(()=>{
      diceEl.textContent = Math.floor(Math.random()*6)+1;
      t++;
      if(t>12){ clearInterval(iv); diceEl.textContent = val; setTimeout(res,220); }
    },60);
  });
}

function movePlayer(playerIndex, to){
  return new Promise(async res=>{
    const start = players[playerIndex].pos || 0;
    const path = [];
    for(let p=start+1;p<=to;p++) path.push(p);
    for(const p of path){
      players[playerIndex].pos = p;
      placeTokens();
      await new Promise(r=>setTimeout(r, 240));
    }
    res();
  });
}
