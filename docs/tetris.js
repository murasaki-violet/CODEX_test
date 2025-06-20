const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
context.scale(20, 20);

const ROWS = 20;
const COLS = 12;

let holdPiece = null;
let hasHeld = false;
let nextQueue = [];

function arenaSweep() {
  outer: for (let y = ROWS - 1; y >= 0; --y) {
    for (let x = 0; x < COLS; ++x) {
      if (!arena[y][x]) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    score += 10;
  }
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function randomPiece() {
  const pieces = 'ILJOTSZ';
  return pieces[(pieces.length * Math.random()) | 0];
}

function refillQueue() {
  while (nextQueue.length < 5) {
    nextQueue.push(randomPiece());
  }
  updateQueueDisplay();
}

function createPiece(type) {
  switch (type) {
    case 'T':
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2]
      ];
    case 'L':
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3]
      ];
    case 'J':
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0]
      ];
    case 'I':
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0]
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
      ];
  }
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawMatrix(arena, { x: 0, y: 0 });
  drawGhost();
  drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function calculateGhostPosition() {
  const ghost = {
    pos: { x: player.pos.x, y: player.pos.y },
    matrix: player.matrix
  };
  while (!collide(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;
  return ghost.pos;
}

function drawGhost() {
  const pos = calculateGhostPosition();
  context.save();
  context.globalAlpha = 0.3;
  drawMatrix(player.matrix, pos);
  context.restore();
}

function drawGrid() {
  context.strokeStyle = '#333';
  context.lineWidth = 0.05;
  for (let x = 0; x <= COLS; ++x) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; ++y) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function playerHold() {
  if (hasHeld) return;
  if (holdPiece === null) {
    holdPiece = player.type;
    playerReset();
  } else {
    const temp = player.type;
    player.type = holdPiece;
    player.matrix = createPiece(player.type);
    holdPiece = temp;
  }
  player.pos.y = 0;
  player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  hasHeld = true;
  updateHoldDisplay();
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    hasHeld = false;
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  hasHeld = false;
  playerReset();
  arenaSweep();
  updateScore();
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) {
    player.pos.x -= offset;
  }
}

function playerReset() {
  refillQueue();
  player.type = nextQueue.shift();
  player.matrix = createPiece(player.type);
  refillQueue();
  player.pos.y = 0;
  player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  document.getElementById('score').innerText = score;
}

function updateHoldDisplay() {
  document.getElementById('hold').innerText = holdPiece || 'None';
}

function updateQueueDisplay() {
  document.getElementById('queue').innerText = nextQueue.join(' ');
}

const colors = [
  null,
  '#FF0D72',
  '#0DC2FF',
  '#0DFF72',
  '#F538FF',
  '#FF8E0D',
  '#FFE138',
  '#3877FF'
];

const arena = createMatrix(COLS, ROWS);

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  type: null
};

playerReset();
updateScore();
updateHoldDisplay();
updateQueueDisplay();
update();

document.addEventListener('keydown', event => {
  if (event.keyCode === 37) {
    playerMove(-1);
  } else if (event.keyCode === 39) {
    playerMove(1);
  } else if (event.keyCode === 40) {
    playerDrop();
  } else if (event.keyCode === 38) {
    playerHardDrop();
  } else if (event.keyCode === 81) {
    playerRotate(-1);
  } else if (event.keyCode === 87) {
    playerRotate(1);
  } else if (event.keyCode === 67) {
    playerHold();
  }
});
