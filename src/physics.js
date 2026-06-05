import { CANVAS_W, CELL, COLS, ROWS, BALL_MIN_VERT, DEATH_Y, MAX_SUBSTEP } from './config.js';

export function updateBalls(balls, paddle, brickGrid, puState, speed, dt, onBrickHit, sfx = {}) {
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];

    if (ball.stuck) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 1;
      continue;
    }

    // Keep ball travelling at current speed
    const s = Math.hypot(ball.vx, ball.vy);
    if (s > 0.01) { ball.vx = (ball.vx / s) * speed; ball.vy = (ball.vy / s) * speed; }

    const dist = speed * dt;
    const numSteps = Math.max(1, Math.ceil(dist / MAX_SUBSTEP));
    const stepDt   = dt / numSteps;

    let dead = false;
    for (let step = 0; step < numSteps && !dead && !ball.stuck; step++) {
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;

      resolveWalls(ball, sfx);
      resolveBricks(ball, brickGrid, onBrickHit, sfx);
      resolvePaddle(ball, paddle, puState, sfx);

      if (ball.y - ball.r > DEATH_Y) dead = true;
    }

    if (dead) balls.splice(i, 1);
  }
}

function resolveWalls(ball, sfx) {
  let hit = false;
  if (ball.x - ball.r < 0)        { ball.x = ball.r;            ball.vx =  Math.abs(ball.vx); hit = true; sfx.wall?.(); }
  if (ball.x + ball.r > CANVAS_W) { ball.x = CANVAS_W - ball.r; ball.vx = -Math.abs(ball.vx); hit = true; sfx.wall?.(); }
  if (ball.y - ball.r < 0)        { ball.y = ball.r;            ball.vy =  Math.abs(ball.vy); hit = true; sfx.wall?.(); }
  if (hit) enforceMinVert(ball);
}

function resolveBricks(ball, brickGrid, onBrickHit, sfx) {
  const minCol = Math.max(0, Math.floor((ball.x - ball.r) / CELL));
  const maxCol = Math.min(COLS - 1, Math.floor((ball.x + ball.r) / CELL));
  const minRow = Math.max(0, Math.floor((ball.y - ball.r) / CELL));
  const maxRow = Math.min(ROWS - 1, Math.floor((ball.y + ball.r) / CELL));

  let bestDist = Infinity;
  let bestBrick = null;

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const brick = brickGrid[row][col];
      if (!brick) continue;
      const d = circleAABBDist(ball, brick);
      if (d < ball.r && d < bestDist) { bestDist = d; bestBrick = brick; }
    }
  }

  if (!bestBrick) return;

  resolveCircleAABB(ball, bestBrick);

  if (bestBrick.type !== 'R') {
    brickGrid[bestBrick.row][bestBrick.col] = null;
    bestBrick.alive = false;
    onBrickHit(bestBrick); // brick-break sound called from main.js onBrickHit
  } else {
    sfx.rock?.();
  }
}

function circleAABBDist(ball, rect) {
  const nx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  return Math.hypot(ball.x - nx, ball.y - ny);
}

function resolveCircleAABB(ball, rect) {
  const nx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  const dx = ball.x - nx;
  const dy = ball.y - ny;
  const dist = Math.hypot(dx, dy);

  if (dist >= ball.r) return;

  if (dist < 0.001) {
    // Ball center inside brick — reverse and nudge out
    ball.vx = -ball.vx; ball.vy = -ball.vy;
    ball.x += ball.vx * 0.05; ball.y += ball.vy * 0.05;
    return;
  }

  const pen  = ball.r - dist;
  const ndx  = dx / dist;
  const ndy  = dy / dist;

  if (Math.abs(ndx) >= Math.abs(ndy)) {
    ball.vx = ndx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
    ball.x += ndx * pen;
  } else {
    ball.vy = ndy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
    ball.y += ndy * pen;
  }

  enforceMinVert(ball);
}

function resolvePaddle(ball, paddle, puState, sfx) {
  if (ball.vy <= 0) return;

  const { x, y, w, h } = paddle;
  if (ball.x + ball.r < x || ball.x - ball.r > x + w) return;
  if (ball.y + ball.r < y || ball.y - ball.r > y + h) return;

  ball.y = y - ball.r;
  sfx.paddle?.();

  if (puState.magnet > 0) {
    ball.stuck = true;
    ball.vx = 0; ball.vy = 0;
    return;
  }

  const normalized = Math.max(-1, Math.min(1, (ball.x - (x + w / 2)) / (w / 2)));
  const angle = normalized * (Math.PI / 3); // ±60° from vertical
  const speed = Math.hypot(ball.vx, ball.vy);
  ball.vx =  Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;

  enforceMinVert(ball);
}

function enforceMinVert(ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 0.01) return;
  const minVy = speed * BALL_MIN_VERT;
  if (Math.abs(ball.vy) < minVy) {
    ball.vy = ball.vy < 0 ? -minVy : minVy;
    const newSpeed = Math.hypot(ball.vx, ball.vy);
    ball.vx = (ball.vx / newSpeed) * speed;
    ball.vy = (ball.vy / newSpeed) * speed;
  }
}
