import { CANVAS_W, CANVAS_H, START_LIVES, PADDLE_Y, BALL_R, CELL, ROWS } from './config.js';
import { LEVEL_MAP, parseLevel, GAP_LEFT, GAP_RIGHT } from './level.js';
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
let state = 'MENU';
let gs    = null;

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
  const { bricks, brickGrid, breakableCount } = parseLevel(LEVEL_MAP);
  const paddle = createPaddle();
  const ball   = createBall(paddle.x + paddle.w / 2, PADDLE_Y - BALL_R - 1);

  gs = {
    bricks,
    brickGrid,
    breakableCount,
    paddle,
    balls:      [ball],
    lives:      START_LIVES,
    score:      0,
    puState:    createPowerupState(),
    paused:     false,
    gapClosed:  false,
    doorCloses,           // read from module-level toggle
    cinematic:  makeCinematic(),
    scorePops:  [],
  };
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

  // Show DOM toggle on MENU + end screens so player can change before restarting
  const showToggle = (state === 'MENU' || state === 'WON' || state === 'LOST');
  menuUI.classList.toggle('visible', showToggle);
  menuUI.classList.toggle('end-screen', state === 'WON' || state === 'LOST');

  if (consumeRestart(input)) { initGame(); state = 'PLAYING'; }

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
      if (cinematic.threadSlowmo > 0) speed *= THREAD_SLOWMO_F;

      updateBalls(balls, paddle, brickGrid, puState, speed, dt, onBrickHit, SFX);
      checkCloseGap();

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
        if (gs.lives <= 0) {
          state = 'LOST';
          sfxGameOver();
        } else {
          gs.balls.push(createBall(paddle.x + paddle.w / 2, paddle.y - BALL_R - 1));
        }
      }

      // Launch check is AFTER ball creation so a touchend during death frame still works
      if (consumeLaunch(input)) tryLaunch();

      if (gs.breakableCount <= 0) { state = 'WON'; sfxWin(); }
    }

  } else if (state === 'WON' || state === 'LOST') {
    if (consumeLaunch(input)) { initGame(); state = 'PLAYING'; }
  }

  render(ctx, gs, state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTs = ts; requestAnimationFrame(loop); });
