/* ============================================================
   LUDO GAME — script.js
   Full game logic: board rendering, path arrays, dice,
   token movement, captures, safe zones, home stretch, winning.
   ============================================================ */

'use strict';

// ──────────────────────────────────────────────
// CONSTANTS & CONFIGURATION
// ──────────────────────────────────────────────

const PLAYERS = ['green', 'red', 'yellow', 'blue'];
const TOKENS_PER_PLAYER = 4;
const BOARD_SIZE = 15; // 15×15 grid

/**
 * The 52-cell main track as [row, col] coordinates, going CLOCKWISE.
 * Index 0 = Green's entry cell [6,1].
 *
 * Board layout (15×15):
 *   Cols:  0  1  2  3  4  5 | 6  7  8 | 9 10 11 12 13 14
 * Row 0-5: [GREEN BASE]     | path    | [RED BASE]
 * Row 6-8: path             | CENTER  | path
 * Row 9-14:[YELLOW BASE]    | path    | [BLUE BASE]
 */
const PATH = [
  /* 0- 4 */ [6,1],[6,2],[6,3],[6,4],[6,5],        // Left arm → right along row 6
  /* 5-10 */ [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],   // Top arm ↑ along col 6
  /*11-12 */ [0,7],[0,8],                            // Top edge → right
  /*13-17 */ [1,8],[2,8],[3,8],[4,8],[5,8],          // Top arm ↓ along col 8
  /*18-22 */ [6,9],[6,10],[6,11],[6,12],[6,13],      // Right arm → right along row 6
  /*23-25 */ [6,14],[7,14],[8,14],                   // Right edge ↓
  /*26-30 */ [8,13],[8,12],[8,11],[8,10],[8,9],      // Right arm ← left along row 8
  /*31-36 */ [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],// Bottom arm ↓ along col 8
  /*37-38 */ [14,7],[14,6],                          // Bottom edge ← left
  /*39-43 */ [13,6],[12,6],[11,6],[10,6],[9,6],      // Bottom arm ↑ along col 6
  /*44-48 */ [8,5],[8,4],[8,3],[8,2],[8,1],          // Left arm ← left along row 8
  /*49-51 */ [8,0],[7,0],[6,0],                      // Left edge ↑
]; // Total: 52 cells ✓

/**
 * Where each player enters the main track after rolling a 6.
 * Player-relative position 0 maps to PATH[START_INDEX[player]].
 */
const START_INDEX = {
  green: 0,   // PATH[0]  = [6,1]
  red:   13,  // PATH[13] = [1,8]
  yellow:26,  // PATH[26] = [8,13]
  blue:  39,  // PATH[39] = [13,6]
};

/**
 * Home columns — the 5 cells each player travels before reaching center.
 * Ordered from entrance → deepest (closest to center).
 *
 * Each player walks 51 cells on the main track (indices 0-50 relative),
 * then 5 home-column cells, then 1 final step into center = 57 total.
 *
 * Green: row 7, cols 1→5   (enters from [7,0] = relative pos 50)
 * Red:   col 7, rows 1→5   (enters from [0,7] = relative pos 50)
 * Yellow: row 7, cols 13→9  (enters from [7,14] = relative pos 50)
 * Blue:  col 7, rows 13→9  (enters from [14,7] = relative pos 50)
 */
const HOME_COLS = {
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

// Token position constants (player-relative)
const POS_BASE       = -1;  // In home base, not on board
const POS_HOME       = 56;  // Reached center (completed)
const MAIN_TRACK_LAST= 50;  // Last cell on main track before home column
const HOME_COL_START = 51;  // First home-column cell
const HOME_COL_END   = 55;  // Last home-column cell (next step = center)

/**
 * Safe (star) positions — absolute PATH indices where captures cannot happen.
 * Includes all 4 start cells + 4 additional star cells.
 */
const SAFE_ABSOLUTE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Where tokens sit inside each player's 6×6 home base. */
const HOME_BASE_POSITIONS = {
  green:  [[2,2],[2,3],[3,2],[3,3]],
  red:    [[2,11],[2,12],[3,11],[3,12]],
  yellow: [[11,2],[11,3],[12,2],[12,3]],
  blue:   [[11,11],[11,12],[12,11],[12,12]],
};

/**
 * Dice face dot patterns on a 3×3 grid.
 * Positions: 1 2 3 / 4 5 6 / 7 8 9
 */
const DICE_FACES = {
  1: [5],
  2: [3,7],
  3: [3,5,7],
  4: [1,3,7,9],
  5: [1,3,5,7,9],
  6: [1,3,4,6,7,9],
};

// ──────────────────────────────────────────────
// GAME STATE
// ──────────────────────────────────────────────

let state = {
  numPlayers: 4,
  players: [],        // e.g. ['green','red','yellow','blue']
  tokens: {},         // { green: [pos, pos, pos, pos], red: [...], … }
  currentPlayerIdx: 0,
  diceValue: null,
  phase: 'roll',      // 'roll' | 'move' | 'gameover'
  consecutiveSixes: 0,
  finished: new Set(),
  messages: [],
};

// Animation lock — prevents input during token animation
let animating = false;

// ──────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────

const $board          = document.getElementById('board');
const $setupScreen    = document.getElementById('setupScreen');
const $gameContainer  = document.getElementById('gameContainer');
const $btnStart       = document.getElementById('btnStart');
const $btnRoll        = document.getElementById('btnRoll');
const $btnRestart     = document.getElementById('btnRestart');
const $btnRestartWinner = document.getElementById('btnRestartWinner');
const $dice           = document.getElementById('dice');
const $currentPlayer  = document.getElementById('currentPlayer');
const $diceResult     = document.getElementById('diceResult');
const $statusMsg      = document.getElementById('statusMsg');
const $playerScores   = document.getElementById('playerScores');
const $msgList        = document.getElementById('msgList');
const $winnerOverlay  = document.getElementById('winnerOverlay');
const $winnerText     = document.getElementById('winnerText');
const $playerCount    = document.getElementById('playerCount');
const $turnIndicator  = document.getElementById('turnIndicator');
const $diceValueDisplay = document.getElementById('diceValueDisplay');
const $confetti       = document.getElementById('confetti');

// ──────────────────────────────────────────────
// BOARD RENDERING
// ──────────────────────────────────────────────

const cellElements = {}; // Map "row-col" → DOM element

function buildBoard() {
  $board.innerHTML = '';

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      classifyCell(cell, r, c);
      $board.appendChild(cell);
      cellElements[`${r}-${c}`] = cell;
    }
  }
}

/** Assign CSS classes to a cell based on its board position. */
function classifyCell(cell, r, c) {
  // ── Home bases (6×6 corners) ──
  if (r < 6 && c < 6) cell.classList.add('home-green');
  if (r < 6 && c > 8) cell.classList.add('home-red');
  if (r > 8 && c < 6) cell.classList.add('home-yellow');
  if (r > 8 && c > 8) cell.classList.add('home-blue');

  // ── Center 3×3 ──
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
    cell.classList.add('center');
    // Triangular colour segments
    if (r === 6 && c === 6) cell.classList.add('center-green');
    if (r === 6 && c === 7) cell.classList.add('center-green');
    if (r === 6 && c === 8) cell.classList.add('center-red');
    if (r === 7 && c === 6) cell.classList.add('center-yellow');
    if (r === 7 && c === 7) cell.classList.add('center-white');
    if (r === 7 && c === 8) cell.classList.add('center-blue');
    if (r === 8 && c === 6) cell.classList.add('center-yellow');
    if (r === 8 && c === 7) cell.classList.add('center-blue');
    if (r === 8 && c === 8) cell.classList.add('center-blue');
  }

  // ── Coloured start cells ──
  if (r === 6  && c === 1)  cell.classList.add('path-green');
  if (r === 1  && c === 8)  cell.classList.add('path-red');
  if (r === 8  && c === 13) cell.classList.add('path-yellow');
  if (r === 13 && c === 6)  cell.classList.add('path-blue');

  // ── Home columns (final stretch) ──
  for (const [player, cols] of Object.entries(HOME_COLS)) {
    for (const [hr, hc] of cols) {
      if (r === hr && c === hc) cell.classList.add('home-col-' + player);
    }
  }

  // ── Safe / star cells ──
  for (const idx of SAFE_ABSOLUTE_INDICES) {
    const [sr, sc] = PATH[idx];
    if (r === sr && c === sc) cell.classList.add('safe');
  }
}

// ──────────────────────────────────────────────
// TOKEN RENDERING
// ──────────────────────────────────────────────

const tokenElements = {}; // { green: [el, el, el, el], … }

function createTokenElements() {
  document.querySelectorAll('.token').forEach(el => el.remove());

  state.players.forEach(player => {
    tokenElements[player] = [];
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      const tok = document.createElement('div');
      tok.classList.add('token', player);
      tok.dataset.player = player;
      tok.dataset.index = i;
      tok.title = `${capitalize(player)} Token ${i + 1}`;
      tok.addEventListener('click', () => onTokenClick(player, i));
      $board.appendChild(tok);
      tokenElements[player].push(tok);
    }
  });
}

/** Re-render every token's position on the board. */
function renderTokens() {
  // Build occupancy map for stacking
  const cellOccupancy = {}; // "row-col" → [{player, index}, …]

  state.players.forEach(player => {
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      const coords = getTokenCoords(player, i);
      if (!coords) continue;
      const key = `${coords[0]}-${coords[1]}`;
      if (!cellOccupancy[key]) cellOccupancy[key] = [];
      cellOccupancy[key].push({ player, index: i });
    }
  });

  state.players.forEach(player => {
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      const tok = tokenElements[player][i];
      const pos = state.tokens[player][i];
      const coords = getTokenCoords(player, i);

      if (pos === POS_HOME) {
        tok.classList.add('completed');
        positionTokenOnCell(tok, [7, 7], 0, 1);
        tok.style.display = '';
        continue;
      }
      tok.classList.remove('completed');

      if (!coords) {
        tok.style.display = 'none';
        continue;
      }
      tok.style.display = '';

      const key = `${coords[0]}-${coords[1]}`;
      const occupants = cellOccupancy[key];
      const myIdx = occupants.findIndex(o => o.player === player && o.index === i);
      positionTokenOnCell(tok, coords, myIdx, occupants.length);
    }
  });
}

/**
 * Convert a token's logical position to board [row, col].
 * Returns null if position is invalid.
 */
function getTokenCoords(player, tokenIdx) {
  const pos = state.tokens[player][tokenIdx];

  if (pos === POS_BASE) {
    return HOME_BASE_POSITIONS[player][tokenIdx];
  }
  if (pos >= 0 && pos <= MAIN_TRACK_LAST) {
    const absIdx = (START_INDEX[player] + pos) % 52;
    return PATH[absIdx];
  }
  if (pos >= HOME_COL_START && pos <= HOME_COL_END) {
    return HOME_COLS[player][pos - HOME_COL_START];
  }
  if (pos === POS_HOME) {
    return [7, 7];
  }
  return null;
}

/** Place a token DOM element over a board cell, with stacking offset. */
function positionTokenOnCell(tok, [row, col], stackIdx, stackTotal) {
  const cellEl = cellElements[`${row}-${col}`];
  if (!cellEl) return;

  const boardRect = $board.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  const cx = cellRect.left - boardRect.left + cellRect.width / 2;
  const cy = cellRect.top  - boardRect.top  + cellRect.height / 2;

  const tokW = tok.offsetWidth  || 28;
  const tokH = tok.offsetHeight || 28;

  let ox = 0, oy = 0;
  if (stackTotal > 1) {
    const offsets = [[-5,-5],[5,-5],[-5,5],[5,5],[-8,0],[8,0],[0,-8],[0,8]];
    if (stackIdx < offsets.length) {
      ox = offsets[stackIdx][0];
      oy = offsets[stackIdx][1];
    }
  }

  tok.style.position = 'absolute';
  tok.style.left = (cx - tokW / 2 + ox) + 'px';
  tok.style.top  = (cy - tokH / 2 + oy) + 'px';
}

// ──────────────────────────────────────────────
// SMOOTH TOKEN ANIMATION
// ──────────────────────────────────────────────

/**
 * Build an array of [row, col] for each step of a move.
 * Used to animate the token cell-by-cell along the path.
 */
function getMovePath(player, fromPos, toPos) {
  const steps = [];
  for (let p = fromPos + 1; p <= toPos; p++) {
    if (p >= 0 && p <= MAIN_TRACK_LAST) {
      const absIdx = (START_INDEX[player] + p) % 52;
      steps.push(PATH[absIdx]);
    } else if (p >= HOME_COL_START && p <= HOME_COL_END) {
      steps.push(HOME_COLS[player][p - HOME_COL_START]);
    } else if (p === POS_HOME) {
      steps.push([7, 7]);
    }
  }
  return steps;
}

/**
 * Animate a token element moving step-by-step along intermediate cells.
 * Returns a Promise that resolves when the animation completes.
 */
function animateTokenMove(tok, steps) {
  return new Promise(resolve => {
    if (steps.length === 0) {
      resolve();
      return;
    }

    tok.classList.add('animating');
    let i = 0;
    const stepDelay = Math.max(60, 180 - steps.length * 12); // faster for longer moves

    function nextStep() {
      if (i >= steps.length) {
        tok.classList.remove('animating');
        resolve();
        return;
      }
      positionTokenOnCell(tok, steps[i], 0, 1);
      i++;
      setTimeout(nextStep, stepDelay);
    }

    nextStep();
  });
}

// ──────────────────────────────────────────────
// GAME LOGIC
// ──────────────────────────────────────────────

function initGame(numPlayers) {
  const configs = {
    2: ['green', 'blue'],
    3: ['green', 'red', 'blue'],
    4: ['green', 'red', 'yellow', 'blue'],
  };

  state.numPlayers = numPlayers;
  state.players = configs[numPlayers];
  state.tokens = {};
  state.players.forEach(p => {
    state.tokens[p] = [POS_BASE, POS_BASE, POS_BASE, POS_BASE];
  });
  state.currentPlayerIdx = 0;
  state.diceValue = null;
  state.phase = 'roll';
  state.consecutiveSixes = 0;
  state.finished = new Set();
  state.messages = [];
  animating = false;

  // Clear UI
  $diceValueDisplay.textContent = '';
  $diceValueDisplay.classList.remove('pop');

  buildBoard();
  createTokenElements();
  renderTokens();
  updateUI();
  addMessage('🎮 Game started! ' + capitalize(currentPlayer()) + ' goes first.');
}

function currentPlayer() {
  return state.players[state.currentPlayerIdx];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ──────────────────────────────────────────────
// DICE
// ──────────────────────────────────────────────

function rollDice() {
  if (state.phase !== 'roll' || animating) return;

  $btnRoll.disabled = true;
  $dice.classList.remove('landed');
  $dice.classList.add('rolling');
  $diceValueDisplay.textContent = '';
  $diceValueDisplay.classList.remove('pop');

  let ticks = 0;
  const maxTicks = 12;
  const interval = setInterval(() => {
    showDiceFace(Math.floor(Math.random() * 6) + 1);
    ticks++;
    if (ticks >= maxTicks) {
      clearInterval(interval);
      const value = Math.floor(Math.random() * 6) + 1;
      state.diceValue = value;
      showDiceFace(value);
      $dice.classList.remove('rolling');

      // Bounce landing
      $dice.classList.add('landed');
      setTimeout(() => $dice.classList.remove('landed'), 350);

      // Show big value
      $diceValueDisplay.textContent = value;
      $diceValueDisplay.classList.add('pop');

      onDiceRolled(value);
    }
  }, 70);
}

function showDiceFace(value) {
  const dots = $dice.querySelectorAll('.dot');
  dots.forEach(d => d.classList.remove('filled'));
  (DICE_FACES[value] || []).forEach(pos => {
    const dot = $dice.querySelector(`.dot[data-pos="${pos}"]`);
    if (dot) dot.classList.add('filled');
  });
}

function onDiceRolled(value) {
  const player = currentPlayer();
  addMessage(`🎲 ${capitalize(player)} rolled a ${value}`);
  $diceResult.textContent = value;

  // Three consecutive 6s → turn forfeited
  if (value === 6) {
    state.consecutiveSixes++;
    if (state.consecutiveSixes >= 3) {
      addMessage(`⚠️ ${capitalize(player)} rolled three 6's — turn forfeited!`);
      state.consecutiveSixes = 0;
      nextTurn();
      return;
    }
  }

  const movable = getMovableTokens(player, value);

  if (movable.length === 0) {
    addMessage(`${capitalize(player)} has no valid moves.`);
    if (value !== 6) state.consecutiveSixes = 0;
    nextTurn();
    return;
  }

  // Auto-move if only one option
  if (movable.length === 1) {
    moveToken(player, movable[0], value);
    return;
  }

  // Multiple options → player must choose
  state.phase = 'move';
  highlightMovableTokens(player, movable);
  $statusMsg.textContent = 'Select a token to move';
  $btnRoll.disabled = true;
}

/**
 * Return array of token indices that can legally move with this dice value.
 */
function getMovableTokens(player, diceValue) {
  const movable = [];
  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    const pos = state.tokens[player][i];

    if (pos === POS_HOME) continue;             // Already finished
    if (pos === POS_BASE) {                     // In base — need 6
      if (diceValue === 6) movable.push(i);
      continue;
    }

    const newPos = pos + diceValue;
    if (newPos > POS_HOME) continue;            // Would overshoot
    movable.push(i);
  }
  return movable;
}

function highlightMovableTokens(player, indices) {
  clearHighlights();
  indices.forEach(i => {
    tokenElements[player][i].classList.add('clickable');
  });
}

function clearHighlights() {
  document.querySelectorAll('.token.clickable').forEach(t => t.classList.remove('clickable'));
}

function onTokenClick(player, tokenIdx) {
  if (state.phase !== 'move' || animating) return;
  if (player !== currentPlayer()) return;

  const movable = getMovableTokens(player, state.diceValue);
  if (!movable.includes(tokenIdx)) return;

  moveToken(player, tokenIdx, state.diceValue);
}

/**
 * Execute a token move. Handles base→board, main track, home column, and center.
 * Now includes smooth step-by-step animation.
 */
async function moveToken(player, tokenIdx, diceValue) {
  clearHighlights();
  animating = true;
  $btnRoll.disabled = true;

  const pos = state.tokens[player][tokenIdx];
  const tok = tokenElements[player][tokenIdx];

  if (pos === POS_BASE) {
    // Enter the board at position 0 (the player's start cell)
    state.tokens[player][tokenIdx] = 0;
    addMessage(`${capitalize(player)} token ${tokenIdx + 1} entered the board!`);
    renderTokens();
    checkCapture(player, tokenIdx);
  } else {
    const newPos = pos + diceValue;

    // Build animation path from current to new position
    const steps = getMovePath(player, pos, newPos);

    // Animate step by step
    if (steps.length > 0) {
      await animateTokenMove(tok, steps);
    }

    // Set the actual state after animation
    state.tokens[player][tokenIdx] = newPos;

    if (newPos === POS_HOME) {
      addMessage(`🏠 ${capitalize(player)} token ${tokenIdx + 1} reached HOME!`);
      // Celebration animation
      tok.classList.add('home-celebrate');
      setTimeout(() => tok.classList.remove('home-celebrate'), 700);
    } else if (newPos >= HOME_COL_START) {
      addMessage(`${capitalize(player)} token ${tokenIdx + 1} is on the home stretch!`);
    } else {
      checkCapture(player, tokenIdx);
    }
  }

  renderTokens();
  updateUI();
  animating = false;

  // Check if player has all 4 tokens home
  if (checkPlayerFinished(player)) {
    state.finished.add(player);
    addMessage(`🏆 ${capitalize(player)} finished! All 4 tokens home!`);
    endGame(player);
    return;
  }

  // Extra turn for rolling 6
  if (diceValue === 6) {
    addMessage(`${capitalize(player)} gets another turn! (rolled 6)`);
    state.phase = 'roll';
    $btnRoll.disabled = false;
    $statusMsg.textContent = 'Roll again!';
    $diceValueDisplay.textContent = '';
    updateUI();
    return;
  }

  state.consecutiveSixes = 0;
  nextTurn();
}

/**
 * If the token landed on a non-safe main-track cell, send any opponent
 * tokens on that cell back to their base.
 */
function checkCapture(player, tokenIdx) {
  const pos = state.tokens[player][tokenIdx];
  if (pos < 0 || pos > MAIN_TRACK_LAST) return;

  const absIdx = (START_INDEX[player] + pos) % 52;
  if (SAFE_ABSOLUTE_INDICES.has(absIdx)) return;

  // Get the board coordinates for the flash animation
  const coords = PATH[absIdx];

  state.players.forEach(other => {
    if (other === player) return;
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      const otherPos = state.tokens[other][i];
      if (otherPos < 0 || otherPos > MAIN_TRACK_LAST) continue;
      const otherAbs = (START_INDEX[other] + otherPos) % 52;
      if (otherAbs === absIdx) {
        state.tokens[other][i] = POS_BASE;
        addMessage(`💥 ${capitalize(player)} captured ${capitalize(other)}'s token ${i + 1}!`);

        // Flash the cell
        flashCell(coords);
      }
    }
  });
}

/** Briefly flash a cell red to indicate a capture. */
function flashCell(coords) {
  if (!coords) return;
  const cellEl = cellElements[`${coords[0]}-${coords[1]}`];
  if (!cellEl) return;
  cellEl.classList.add('capture-flash');
  setTimeout(() => cellEl.classList.remove('capture-flash'), 500);
}

function checkPlayerFinished(player) {
  return state.tokens[player].every(p => p === POS_HOME);
}

function nextTurn() {
  state.phase = 'roll';
  let attempts = 0;
  do {
    state.currentPlayerIdx = (state.currentPlayerIdx + 1) % state.players.length;
    attempts++;
  } while (state.finished.has(currentPlayer()) && attempts < state.players.length);

  state.consecutiveSixes = 0;
  $btnRoll.disabled = false;
  $diceValueDisplay.textContent = '';
  $diceValueDisplay.classList.remove('pop');
  updateUI();
}

function endGame(winner) {
  state.phase = 'gameover';
  $btnRoll.disabled = true;
  $winnerText.textContent = `${capitalize(winner)} Wins!`;
  $winnerText.className = winner;
  $winnerOverlay.classList.add('active');
  addMessage(`🎉 Game Over! ${capitalize(winner)} wins!`);
  updateUI();

  // Confetti burst
  spawnConfetti();
}

// ──────────────────────────────────────────────
// CONFETTI EFFECT
// ──────────────────────────────────────────────

function spawnConfetti() {
  $confetti.innerHTML = '';
  const colors = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#6c5ce7', '#a29bfe', '#ff6b6b', '#ffd93d'];

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-5%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 10 + 6) + 'px';
    piece.style.height = (Math.random() * 10 + 6) + 'px';
    piece.style.animationDelay = (Math.random() * 1.5) + 's';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    $confetti.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => { $confetti.innerHTML = ''; }, 5000);
}

// ──────────────────────────────────────────────
// UI UPDATES
// ──────────────────────────────────────────────

function updateUI() {
  const player = currentPlayer();

  // Set data attribute for CSS color-matching
  $gameContainer.dataset.currentPlayer = player;

  // Update turn display (keep the indicator span)
  $currentPlayer.innerHTML = '';
  $currentPlayer.appendChild($turnIndicator);
  $currentPlayer.appendChild(document.createTextNode(' ' + capitalize(player)));
  $currentPlayer.className = 'value ' + player;

  if (state.phase === 'gameover') {
    $statusMsg.textContent = 'Game Over!';
  } else {
    $statusMsg.textContent = state.phase === 'roll' ? 'Roll the dice!' : 'Select a token';
  }

  renderPlayerScores();
}

function renderPlayerScores() {
  $playerScores.innerHTML = '<h3>Players</h3>';
  state.players.forEach(p => {
    const completed = state.tokens[p].filter(pos => pos === POS_HOME).length;
    const row = document.createElement('div');
    row.classList.add('score-row');
    if (p === currentPlayer()) {
      row.classList.add('active-player', p + '-active');
    }
    if (state.finished.has(p)) row.classList.add('finished');
    row.innerHTML = `
      <span class="score-dot ${p}"></span>
      <span class="score-name">${capitalize(p)}</span>
      <span class="score-val">${completed}/4</span>
    `;
    $playerScores.appendChild(row);
  });
}

/** Classify message type for color-coding. */
function getMessageClass(msg) {
  if (msg.includes('💥') || msg.includes('captured')) return 'msg-capture';
  if (msg.includes('🏠') || msg.includes('reached HOME')) return 'msg-home';
  if (msg.includes('🏆') || msg.includes('finished')) return 'msg-winner';
  if (msg.includes('🎉') || msg.includes('Game Over')) return 'msg-winner';
  if (msg.includes('another turn') || msg.includes('rolled 6')) return 'msg-six';
  if (msg.includes('entered the board')) return 'msg-enter';
  if (msg.includes('🎮') || msg.includes('Game started')) return 'msg-start';
  if (msg.includes('⚠️') || msg.includes('forfeited')) return 'msg-forfeit';
  return '';
}

function addMessage(msg) {
  state.messages.unshift(msg);
  if (state.messages.length > 40) state.messages.pop();
  renderMessages();
}

function renderMessages() {
  $msgList.innerHTML = '';
  state.messages.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    const msgClass = getMessageClass(msg);
    if (msgClass) li.classList.add(msgClass);
    $msgList.appendChild(li);
  });
}

// ──────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────

$btnStart.addEventListener('click', () => {
  const num = parseInt($playerCount.value, 10);
  $setupScreen.style.display = 'none';
  $gameContainer.classList.add('active');
  initGame(num);
});

$btnRoll.addEventListener('click', rollDice);
$dice.addEventListener('click', () => {
  if (state.phase === 'roll' && !$btnRoll.disabled && !animating) rollDice();
});

$btnRestart.addEventListener('click', restartGame);
$btnRestartWinner.addEventListener('click', restartGame);

function restartGame() {
  $winnerOverlay.classList.remove('active');
  $gameContainer.classList.remove('active');
  $setupScreen.style.display = '';
  $diceResult.textContent = '—';
  $diceValueDisplay.textContent = '';
  $diceValueDisplay.classList.remove('pop');
  $confetti.innerHTML = '';
  animating = false;
  showDiceFace(1);
}

// Re-layout tokens on resize
window.addEventListener('resize', () => {
  if (!animating) renderTokens();
});

// Show initial dice face
showDiceFace(1);
