import { CELL, GRID_TOP, COLS, ROWS } from './config.js';

// Gap position and channel geometry (all in column indices)
export const GAP_LEFT    = 48; // opening starts at col 48
export const GAP_RIGHT   = 51; // opening ends before col 51  (cols 48,49,50 = 3 cells = 18px)
const WALL_LEFT   = GAP_LEFT  - 1; // col 47 — left channel wall
const WALL_RIGHT  = GAP_RIGHT;     // col 51 — right channel wall
const CHANNEL_H   = 20;            // rows of vertical rock channel above the barrier

function randomBlock() {
  const rng = Math.random();
  if      (rng < 0.09) return '1';
  else if (rng < 0.14) return '5';
  else if (rng < 0.17) return '2';
  else if (rng < 0.20) return '3';
  else if (rng < 0.23) return '4';
  else                 return 'B';
}

function generateMap() {
  const rows = [];
  const barrierTop  = ROWS - 2;              // row 98 — top barrier row
  const channelTop  = ROWS - 2 - CHANNEL_H; // row 78 — channel opens into main field

  for (let r = 0; r < ROWS; r++) {
    if (r >= barrierTop) {
      // Bottom 2 solid-rock rows with aligned 3-cell gap (cols 48-50).
      // Ball diameter 8px < gap width 18px — fits with clearance.
      let row = '';
      for (let c = 0; c < COLS; c++) {
        row += (c >= GAP_LEFT && c < GAP_RIGHT) ? '.' : 'R';
      }
      rows.push(row);

    } else if (r >= channelTop) {
      // Channel rows: rock walls at cols 47 and 51, empty corridor cols 48-50.
      let row = '';
      for (let c = 0; c < COLS; c++) {
        if (c === WALL_LEFT || c === WALL_RIGHT) row += 'R';
        else if (c >= GAP_LEFT && c < GAP_RIGHT) row += '.';
        else row += randomBlock();
      }
      rows.push(row);

    } else {
      // Normal breakable field
      let row = '';
      for (let c = 0; c < COLS; c++) row += randomBlock();
      rows.push(row);
    }
  }
  return rows;
}

export const LEVEL_MAP = generateMap();

// ── Level 2 map ────────────────────────────────────────────────────────────
// Layout (100×100):
//   Rows  0-59  breakable field, 8×8 empty clearing at rows 26-33, cols 46-53
//   Rows 60-79  tunnel zone — cols 48-50 empty passage, rest breakable
//   Rows 80-99  staircase — 5 rock steps (4 rows each), gap shifts 1 col right
//               per step; bottom gap cols 44-46, top gap cols 48-50 (= tunnel entry)
export function generateLevel2Map() {
  const TUNNEL_LEFT  = 48;
  const TUNNEL_RIGHT = 51; // cols 48, 49, 50

  // Staircase: each entry = { rowStart (inclusive), rowEnd (exclusive), gapLeft }
  // gap is always 3 cells wide (18px > ball diameter 8px)
  const STEPS = [
    { rowStart: 96, rowEnd: 100, gapLeft: 44 },
    { rowStart: 92, rowEnd:  96, gapLeft: 45 },
    { rowStart: 88, rowEnd:  92, gapLeft: 46 },
    { rowStart: 84, rowEnd:  88, gapLeft: 47 },
    { rowStart: 80, rowEnd:  84, gapLeft: 48 }, // aligns with tunnel
  ];

  const CLEAR_R0 = 26, CLEAR_R1 = 34; // 8-row clearing
  const CLEAR_C0 = 46, CLEAR_C1 = 54; // 8-col clearing

  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let row = '';

    if (r < 60) {
      // Breakable field with 8×8 empty clearing
      for (let c = 0; c < COLS; c++) {
        row += (r >= CLEAR_R0 && r < CLEAR_R1 && c >= CLEAR_C0 && c < CLEAR_C1)
          ? '.' : randomBlock();
      }

    } else if (r < 80) {
      // Tunnel zone: open corridor at cols 48-50, breakable everywhere else
      for (let c = 0; c < COLS; c++) {
        row += (c >= TUNNEL_LEFT && c < TUNNEL_RIGHT) ? '.' : randomBlock();
      }

    } else {
      // Staircase zone: rock walls, zigzag gap
      const step = STEPS.find(s => r >= s.rowStart && r < s.rowEnd);
      const gL = step ? step.gapLeft : TUNNEL_LEFT;
      const gR = gL + 3;
      for (let c = 0; c < COLS; c++) {
        row += (c >= gL && c < gR) ? '.' : 'R';
      }
    }

    rows.push(row);
  }
  return rows;
}

export function parseLevel(map) {
  const brickGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  const bricks = [];
  let breakableCount = 0;

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      if (ch === '.') continue;

      const brick = {
        col, row,
        x: col * CELL,
        y: GRID_TOP + row * CELL,
        w: CELL,
        h: CELL,
        type: ch,
        alive: true,
      };

      brickGrid[row][col] = brick;
      bricks.push(brick);
      if (ch !== 'R') breakableCount++;
    }
  }

  return { bricks, brickGrid, breakableCount };
}
