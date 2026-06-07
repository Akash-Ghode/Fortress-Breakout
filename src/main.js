import { CANVAS_W, CANVAS_H, START_LIVES, PADDLE_Y, BALL_R, CELL, ROWS } from './config.js';
import { LEVEL_MAP, parseLevel, generateLevel2Map, GAP_LEFT, GAP_RIGHT } from './level.js';
import { createPaddle, updatePaddle } from './entities/paddle.js';
import { createBall, launchBall } from './entities/ball.js';
import { getPowerup } from './entities/brick.js';
import { createInput, consumeLaunch, consumeRestart, consumePause } from './input.js';
import { createPowerupState, activatePowerup, tickPowerups, resetPowerups,
         getCurrentSpeed, isExtendActive } from './powerups.js';
import { updateBalls } from './physics.js';
import { render } from './render.js';
import { sfxPaddle, sfxWall, sfxRock, sfxBreak, sfxPowerup, sfxFasterBall,
         sfxLifeLost, sfxWin, sfxGameOver, sfxSlam } from './audio.js';

// ─── Cinematic timing constants (seconds unless noted) ────────────────────
const SLAM_FLASH_DUR    = 0.20;  // white-flash fade duration
const SLAM_SHAKE_DUR    = 0.30;  // screen-shake duration
const SEALED_TEXT_DUR   = 0.80;  // "SEALED" stamp fade duration
const THREAD_SLOWMO_F   = 0.35;  // auto-slowmo multiplier on thread-through
const THREAD_SLOWMO_DUR = 0.50;  // auto-slowmo duration
const TRAIL_LEN         = 8;     // ball trail history length
const POP_DUR           = 0.70;  // score-pop lifetime
const MAX_POPS          = 20;    // max concurrent score pops
// ──────────────────────────────────────────────────────────────────────────

const SFX = { paddle: sfxPaddle, wall: sfxWall, rock: sfxRock };

// ── DOM refs ───────────────────────────────────────────────────────────────
const canvas       = document.getElementById('canvas');
const menuUI       = document.getElementById('menu-ui');
const doorToggleEl = document.getElementById('door-toggle');

canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const input = createInput(canvas);

// ── Door toggle state — default OFF (gate stays open) ─────────────────────
let doorCloses = false;

function applyToggleStyle() {
  doorToggleEl.textContent = doorCloses ? 'DOOR: CLOSES ON ENTRY' : 'DOOR: STAYS OPEN';
  doorToggleEl.className   = doorCloses ? 'door-on' : 'door-off';
}

// DOM button handles its own click/touch — no canvas coordinate math needed
doorToggleEl.addEventListener('click', e => {
  e.stopPropagation();       // don't let click bubble to canvas / trigger launch
  doorCloses = !doorCloses;
  if (gs) gs.doorCloses = doorCloses;
  applyToggleStyle();
});

applyToggleStyle(); // set initial label + class

// ── Game state ─────────────────────────────────────────────────────────────
let state        = 'MENU';
let gs           = null;
let currentLevel = 1;
let transitionTimer = 0; // counts down during TRANSITIONING state

// Highest level reached this session — game-over restarts resume here.
// A page refresh resets this back to 1 (no persistence by design).
let highestLevelReached = 1;

const LEVEL2_SPEED_MUL = 0.7; // ball moves 30% slower in level 2

// "Trapped" detection (level 2 only): counts failed staircase attempts —
// the ball rises into the staircase, peaks without meaningfully improving on
// its best height, and falls back. STAIR_FAIL_LIMIT consecutive non-progress
// peaks ends the run with a TRAPPED message.
const STAIR_FAIL_LIMIT = 5;

function makeCinematic() {
  return {
    flashLife:    0,     // 1 → 0 over SLAM_FLASH_DUR
    shakeTimer:   0,     // seconds remaining (raw)
    sealedLife:   0,     // 1 → 0 over SEALED_TEXT_DUR
    threadSlowmo: 0,     // seconds remaining (raw)
    threadFired:  false, // one-shot per life
  };
}

function initGame() {
  currentLevel = 1;
  transitionTimer = 0;
  highestLevelReached = 1; // fresh game — forget any prior progress
  const { bricks, brickGrid, breakableCount } = parseLevel(LEVEL_MAP);
  const paddle = createPaddle();
  const ball   = createBall(paddle.x + paddle.w / 2, PADDLE_Y - BALL_R - 1);

  gs = {
    bricks,
    brickGrid,
    breakableCount,
    paddle,
    balls:        [ball],
    lives:        START_LIVES,
    score:        0,
    puState:      createPowerupState(),
    paused:       false,
    gapClosed:    false,
    doorCloses,
    currentLevel: 1,
    cinematic:    makeCinematic(),
    scorePops:    [],
    stairFailStreak: 0,
  };
}

function initLevel2() {
  currentLevel = 2;
  transitionTimer = 0;
  highestLevelReached = 2;
  const { bricks, brickGrid, breakableCount } = parseLevel(generateLevel2Map());

  // Carry lives + score + paddle; reset ball, powerups, cinematic
  gs.bricks        = bricks;
  gs.brickGrid     = brickGrid;
  gs.breakableCount = breakableCount;
  gs.gapClosed     = false;
  gs.doorCloses    = false; // level 2 has no door mechanic
  gs.currentLevel  = 2;
  gs.cinematic     = makeCinematic();
  gs.scorePops     = [];
  gs.stairFailStreak = 0;
  resetPowerups(gs.puState);
  gs.balls = [createBall(gs.paddle.x + gs.paddle.w / 2, PADDLE_Y - BALL_R - 1)];
}

// Game-over restart: resume at the highest level reached this session
// (a page refresh resets highestLevelReached to 1, so refresh = start over)
function initGameAtLevel(level) {
  if (level >= 2) {
    currentLevel = 2;
    transitionTimer = 0;
    const { bricks, brickGrid, breakableCount } = parseLevel(generateLevel2Map());
    const paddle = createPaddle();
    const ball   = createBall(paddle.x + paddle.w / 2, PADDLE_Y - BALL_R - 1);

    gs = {
      bricks, brickGrid, breakableCount, paddle,
      balls:           [ball],
      lives:           START_LIVES,
      score:           0,
      puState:         createPowerupState(),
      paused:          false,
      gapClosed:       false,
      doorCloses:      false,
      currentLevel:    2,
      cinematic:       makeCinematic(),
      scorePops:       [],
      stairFailStreak: 0,
    };
  } else {
    initGame();
  }
}

// Seal the gap the instant a ball clears the barrier rows
function checkCloseGap() {
  if (gs.gapClosed || !gs.doorCloses) return;
  const barrierTopY = (ROWS - 2) * CELL;
  for (const ball of gs.balls) {
    if (!ball.stuck && ball.y < barrierTopY) {
      if (!gs.cinematic.threadFired) {
        gs.cinematic.threadFired  = true;
        gs.cinematic.threadSlowmo = THREAD_SLOWMO_DUR;
      }
      gs.gapClosed = true;
      for (let r = ROWS - 2; r < ROWS; r++) {
        for (let c = GAP_LEFT; c < GAP_RIGHT; c++) {
          const brick = { col: c, row: r, x: c * CELL, y: r * CELL,
                          w: CELL, h: CELL, type: 'R', alive: true };
          gs.brickGrid[r][c] = brick;
          gs.bricks.push(brick);
        }
      }
      gs.cinematic.flashLife  = 1.0;
      gs.cinematic.shakeTimer = SLAM_SHAKE_DUR;
      gs.cinematic.sealedLife = 1.0;
      sfxSlam();
      break;
    }
  }
}

// Level 2: detect a ball oscillating in the staircase without making progress.
// Tracks each ball's best (lowest) y reached since its last "attempt" began.
// Each time the ball peaks (rises then falls) below the staircase/tunnel
// boundary without beating its best y by a meaningful margin, count a failed
// attempt. STAIR_FAIL_LIMIT consecutive failures ends the run as TRAPPED.
const STAIR_TOP_Y      = 80 * CELL;     // y=480 — staircase/tunnel boundary
const STAIR_PROGRESS   = CELL * 2;      // must improve by ≥2 cells to count as progress

function checkTrapped(balls) {
  for (const ball of balls) {
    if (ball.stuck) { ball.bestY = undefined; ball.prevVy = undefined; continue; }

    if (ball.y < STAIR_TOP_Y) {
      // Cleared into the tunnel — wipe the slate clean
      gs.stairFailStreak = 0;
      ball.bestY  = ball.y;
      ball.prevVy = ball.vy;
      continue;
    }

    if (ball.bestY  === undefined) ball.bestY  = ball.y;
    if (ball.prevVy === undefined) ball.prevVy = ball.vy;

    // Peak detected: was rising (vy<0), now falling (vy>=0)
    if (ball.prevVy < 0 && ball.vy >= 0) {
      if (ball.y < ball.bestY - STAIR_PROGRESS) {
        gs.stairFailStreak = 0;
        ball.bestY = ball.y;
      } else {
        gs.stairFailStreak = (gs.stairFailStreak || 0) + 1;
        if (gs.stairFailStreak >= STAIR_FAIL_LIMIT) {
          state = 'TRAPPED';
          sfxGameOver();
          return;
        }
      }
    }

    ball.prevVy = ball.vy;
  }
}

function reopenGap() {
  gs.gapClosed = false;
  gs.cinematic.threadFired = false;
  for (let r = ROWS - 2; r < ROWS; r++) {
    for (let c = GAP_LEFT; c < GAP_RIGHT; c++) {
      gs.brickGrid[r][c] = null;
    }
  }
  gs.bricks = gs.bricks.filter(
    b => !(b.type === 'R' && b.row >= ROWS - 2 && b.col >= GAP_LEFT && b.col < GAP_RIGHT)
  );
}

function tryLaunch() {
  for (const ball of gs.balls) {
    if (ball.stuck) launchBall(ball, gs.paddle.x, gs.paddle.w);
  }
}

function onBrickHit(brick) {
  gs.score += 10;
  gs.breakableCount--;

  if (gs.scorePops.length >= MAX_POPS) gs.scorePops.shift();
  gs.scorePops.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
                      val: 10, life: 1.0 });

  const puType = getPowerup(brick.type);
  sfxBreak();
  if (!puType) return;

  if (puType === 'EXTRA_BALL') {
    sfxPowerup();
    const nb    = createBall(brick.x + brick.w / 2, brick.y + brick.h / 2);
    const angle = (Math.random() - 0.5) * (Math.PI * 2 / 3);
    const spd   = getCurrentSpeed(gs.puState);
    nb.vx = Math.sin(angle) * spd;
    nb.vy = -Math.cos(angle) * spd;
    nb.stuck = false;
    gs.balls.push(nb);
  } else if (puType === 'FASTER_BALL') {
    sfxFasterBall();
    activatePowerup(gs.puState, puType);
  } else {
    sfxPowerup();
    activatePowerup(gs.puState, puType);
  }
}

initGame();

// ── Main loop ──────────────────────────────────────────────────────────────
let lastTs = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 1 / 30);
  lastTs = ts;

  // Show toggle on MENU + end screens; hide during level 2 (no door mechanic there)
  const isEndScreen = (state === 'WON' || state === 'LOST' || state === 'TRAPPED');
  menuUI.classList.toggle('visible', state === 'MENU' || isEndScreen);
  menuUI.classList.toggle('end-screen', isEndScreen);

  if (consumeRestart(input)) { initGameAtLevel(highestLevelReached); state = 'PLAYING'; }

  if (state === 'MENU') {
    if (consumeLaunch(input)) { initGame(); state = 'PLAYING'; }

  } else if (state === 'PLAYING') {
    if (consumePause(input)) gs.paused = !gs.paused;

    if (!gs.paused) {
      const { paddle, balls, puState, brickGrid, cinematic, scorePops } = gs;

      // Snapshot trail positions before physics moves the balls
      for (const ball of balls) {
        if (ball.stuck) { ball.trail = []; continue; }
        ball.trail = ball.trail ?? [];
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > TRAIL_LEN) ball.trail.shift();
      }

      updatePaddle(paddle, input.mouseX, input.touchDeltaX, input.keys, dt, isExtendActive(puState));
      input.touchDeltaX = 0; // consume delta — don't carry it into the next frame
      tickPowerups(puState, dt);

      let speed = getCurrentSpeed(puState);
      if (currentLevel === 2) speed *= LEVEL2_SPEED_MUL; // 30% slower in level 2
      if (cinematic.threadSlowmo > 0) speed *= THREAD_SLOWMO_F;

      updateBalls(balls, paddle, brickGrid, puState, speed, dt, onBrickHit, SFX);
      checkCloseGap();
      if (currentLevel === 2) checkTrapped(balls);

      // Tick cinematic timers
      if (cinematic.flashLife    > 0) cinematic.flashLife    = Math.max(0, cinematic.flashLife    - dt / SLAM_FLASH_DUR);
      if (cinematic.shakeTimer   > 0) cinematic.shakeTimer   = Math.max(0, cinematic.shakeTimer   - dt);
      if (cinematic.sealedLife   > 0) cinematic.sealedLife   = Math.max(0, cinematic.sealedLife   - dt / SEALED_TEXT_DUR);
      if (cinematic.threadSlowmo > 0) cinematic.threadSlowmo = Math.max(0, cinematic.threadSlowmo - dt);

      // Tick score pops
      for (let i = scorePops.length - 1; i >= 0; i--) {
        scorePops[i].life -= dt / POP_DUR;
        if (scorePops[i].life <= 0) scorePops.splice(i, 1);
      }

      // Life loss
      if (balls.length === 0) {
        gs.lives--;
        resetPowerups(puState);
        sfxLifeLost();
        reopenGap();
        gs.stairFailStreak = 0; // fresh ball gets a clean slate
        if (gs.lives <= 0) {
          state = 'LOST';
          sfxGameOver();
        } else {
          gs.balls.push(createBall(paddle.x + paddle.w / 2, paddle.y - BALL_R - 1));
        }
      }

      // Launch check is AFTER ball creation so a touchend during death frame still works
      if (consumeLaunch(input)) tryLaunch();

      if (gs.breakableCount <= 0) {
        sfxWin();
        if (currentLevel === 1) {
          state = 'TRANSITIONING';
          transitionTimer = 2.5;
          gs.transitionTimer = transitionTimer;
        } else {
          state = 'WON';
        }
      }
    }

  } else if (state === 'TRANSITIONING') {
    transitionTimer -= dt;
    gs.transitionTimer = transitionTimer;
    if (transitionTimer <= 0) { initLevel2(); state = 'PLAYING'; }

  } else if (state === 'WON') {
    // Completing the whole game restarts a fresh run from level 1
    if (consumeLaunch(input)) { initGame(); state = 'PLAYING'; }

  } else if (state === 'LOST' || state === 'TRAPPED') {
    // Game-over resumes at the highest level reached this session
    if (consumeLaunch(input)) { initGameAtLevel(highestLevelReached); state = 'PLAYING'; }
  }

  render(ctx, gs, state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTs = ts; requestAnimationFrame(loop); });
