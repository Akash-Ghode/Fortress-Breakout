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
//   Rows  0-24  dense breakable field
//   Rows 25-39  15×15 empty clearing (cols 43-57); breakable outside clearing cols
//   Rows 40-79  tunnel — cols 48-50 empty corridor, rest breakable
//               bottom of clearing (row 39) connects directly to tunnel top (row 40)
//   Rows 80-99  staircase — 5 SQUARE steps (4 rows × 4 cells each, shift 2 cols left
//               per step going down); top step cols 47-50 → tunnel; each adjacent
//               step overlaps by 2 cells so the path is continuous
export function generateLevel2Map() {
  // Tunnel corridor
  const TUNNEL_LEFT  = 48;
  const TUNNEL_RIGHT = 52; // cols 48,49,50,51 — 4 cells (aligns with top stair step)

  // 15×15 clearing — tunnel exits directly into its bottom edge
  const CLEAR_R0 = 25, CLEAR_R1 = 40; // rows 25-39 (15 rows)
  const CLEAR_C0 = 43, CLEAR_C1 = 58; // cols 43-57 (15 cols)

  // 5 square steps: 4 rows tall × 4 cells wide, each step shifts 2 cols left
  // Adjacent steps share a 2-cell overlap → 12px > ball diameter 8px → passable
  const GAP_W = 4;
  const STEPS = [
    { rowStart: 80, rowEnd: 84, gapLeft: 47 }, // top  — cols 47-50, overlaps tunnel 48-51 by 4 cells
    { rowStart: 84, rowEnd: 88, gapLeft: 45 }, //       cols 45-48, overlaps above by 47-48 (2 cells)
    { rowStart: 88, rowEnd: 92, gapLeft: 43 }, //       cols 43-46, overlaps by 45-46
    { rowStart: 92, rowEnd: 96, gapLeft: 41 }, //       cols 41-44, overlaps by 43-44
    { rowStart: 96, rowEnd:100, gapLeft: 39 }, // bottom cols 39-42, overlaps by 41-42
  ];

  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let row = '';

    if (r < CLEAR_R0) {
      // Dense breakable field
      for (let c = 0; c < COLS; c++) row += randomBlock();

    } else if (r < 40) {
      // Clearing zone: 15×15 empty rectangle, breakable outside it
      for (let c = 0; c < COLS; c++) {
        row += (c >= CLEAR_C0 && c < CLEAR_C1) ? '.' : randomBlock();
      }

    } else if (r < 80) {
      // Tunnel zone: open corridor leads straight up into clearing
      for (let c = 0; c < COLS; c++) {
        row += (c >= TUNNEL_LEFT && c < TUNNEL_RIGHT) ? '.' : randomBlock();
      }

    } else {
      // Staircase rows 80-99:
      // Only the bottom 2 rows (98-99) are solid rock — rest use breakable blocks
      const step = STEPS.find(s => r >= s.rowStart && r < s.rowEnd);
      const gL = step ? step.gapLeft : TUNNEL_LEFT;
      const gR = gL + GAP_W;
      for (let c = 0; c < COLS; c++) {
        if (c >= gL && c < gR) row += '.';
        else row += r >= 98 ? 'R' : randomBlock();
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
