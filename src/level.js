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
