import { CANVAS_W, CANVAS_H, BRICK_INSET } from './config.js';


const C = {
  bg:          '#11131a',
  rock:        '#ffffff',          // white — visible on dark background
  rockBorder:  '#cccccc',
  plain:       '#8d99ae',
  extraBall:   '#ffd166',
  extend:      '#06d6a0',
  slowmo:      '#4cc9f0',
  magnet:      '#ef476f',
  fasterBall:  '#ff7c2a',
  paddle:      '#edf2f4',
  ball:        '#ffffff',
  hud:         '#edf2f4',
};

const PU_COLOR = { '1': C.extraBall, '2': C.extend, '3': C.slowmo, '4': C.magnet, '5': C.fasterBall };
const PU_LABEL = { '1': '+B', '2': 'EX', '3': 'SL', '4': 'MG', '5': 'FT' };

export function render(ctx, gs, state) {
  const cin = gs.cinematic ?? {};

  // --- Screen shake: translate all gameplay drawing ---
  let shaking = cin.shakeTimer > 0;
  if (shaking) {
    const mag = cin.shakeTimer * 26; // max ~7.8px at shakeTimer=0.3
    ctx.save();
    ctx.translate(
      (Math.random() * 2 - 1) * mag,
      (Math.random() * 2 - 1) * mag
    );
  }

  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Bricks
  for (const brick of gs.bricks) {
    if (brick.alive) drawBrick(ctx, brick);
  }

  // Ball trails (drawn before balls so trail is behind)
  for (const ball of gs.balls) drawBallTrail(ctx, ball);

  // Balls
  for (const ball of gs.balls) drawBall(ctx, ball);

  // Score pops
  if (gs.scorePops?.length) drawScorePops(ctx, gs.scorePops);

  // Paddle
  drawPaddle(ctx, gs.paddle, gs.puState);

  // HUD
  drawHUD(ctx, gs.lives, gs.score, gs.breakableCount, gs.puState, gs.currentLevel ?? 1);

  // Restore shake translation
  if (shaking) ctx.restore();

  // --- Post-shake stable overlays ---

  // White flash (fades over SLAM_FLASH_DUR)
  if (cin.flashLife > 0) {
    ctx.fillStyle = `rgba(255,255,255,${cin.flashLife})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // "SEALED" stamp — scales in then fades out
  if (cin.sealedLife > 0) {
    const a = cin.sealedLife;
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(1 + a * 0.28, 1 + a * 0.28);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = `rgba(255,60,60,${a})`;
    ctx.shadowBlur   = 44;
    ctx.fillStyle    = `rgba(255,255,255,${a})`;
    ctx.font         = 'bold 72px sans-serif';
    ctx.fillText('SEALED', 0, 0);
    ctx.shadowBlur   = 0;
    ctx.restore();
  }

  // Corner watermark — always visible
  drawWatermark(ctx);

  // State overlays
  if (state === 'MENU') {
    drawMenuOverlay(ctx);
  } else if (state === 'TRANSITIONING') {
    drawTransitionOverlay(ctx, gs.transitionTimer ?? 0);
  } else if (state === 'WON') {
    drawEndOverlay(ctx, 'YOU WIN!', gs.score, C.extend);
  } else if (state === 'LOST') {
    drawEndOverlay(ctx, 'GAME OVER', gs.score, C.magnet);
  } else if (gs.paused) {
    drawOverlay(ctx, 'PAUSED', '', 'Press P to resume', C.hud);
  }
}

// ---------------------------------------------------------------------------
// Brick
// ---------------------------------------------------------------------------
function drawBrick(ctx, { x, y, w, h, type }) {
  const bx = x + BRICK_INSET, by = y + BRICK_INSET;
  const bw = w - BRICK_INSET * 2, bh = h - BRICK_INSET * 2;

  if (type === 'R') {
    ctx.fillStyle = C.rock;
    ctx.fillRect(bx, by, bw, bh);
    if (bw > 8) {
      ctx.strokeStyle = C.rockBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    }
  } else {
    ctx.fillStyle = type === 'B' ? C.plain : PU_COLOR[type];
    ctx.fillRect(bx, by, bw, bh);
    if (bw > 12) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      if (type !== 'B') {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PU_LABEL[type], bx + bw / 2, by + bh / 2);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ball trail
// ---------------------------------------------------------------------------
function drawBallTrail(ctx, ball) {
  const trail = ball.trail;
  if (!trail || trail.length === 0) return;
  const len = trail.length;
  for (let i = 0; i < len; i++) {
    const t     = (i + 1) / len;           // 0→1 newest at end
    const alpha = t * 0.45;
    const r     = ball.r * t * 0.8;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------
function drawBall(ctx, ball) {
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = C.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------------------
// Score pops
// ---------------------------------------------------------------------------
function drawScorePops(ctx, pops) {
  ctx.font         = 'bold 8px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const pop of pops) {
    const rise = (1 - pop.life) * 14;
    ctx.fillStyle = `rgba(255,255,255,${pop.life * 0.9})`;
    ctx.fillText(`+${pop.val}`, pop.x, pop.y - rise);
  }
}

// ---------------------------------------------------------------------------
// Paddle
// ---------------------------------------------------------------------------
function drawPaddle(ctx, { x, y, w, h }, puState) {
  const col = puState.magnet  > 0 ? C.magnet
            : puState.faster  > 0 ? C.fasterBall
            : puState.extend  > 0 ? C.extend
            : C.paddle;
  ctx.shadowColor = col;
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = col;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function drawHUD(ctx, lives, score, breakableCount, puState, level) {
  const y0 = 606;
  ctx.font         = '13px monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = C.hud;
  ctx.fillText(`♥ ${lives}   SCORE ${score}   BRICKS ${breakableCount}`, 10, y0);

  // Level badge (top-right)
  ctx.textAlign  = 'right';
  ctx.fillStyle  = level === 2 ? C.magnet : C.slowmo;
  ctx.font       = 'bold 13px monospace';
  ctx.fillText(`LVL ${level}`, CANVAS_W - 10, y0);
  ctx.textAlign  = 'left';

  const badges = [
    { key: 'extend', label: 'WIDE PAD', color: C.extend },
    { key: 'slowmo', label: 'SLOW-MO',  color: C.slowmo },
    { key: 'magnet', label: 'MAGNET',   color: C.magnet },
    { key: 'faster', label: 'TURBO',    color: C.fasterBall },
  ];

  let bx = 10;
  ctx.font = 'bold 11px monospace';
  for (const { key, label, color } of badges) {
    if (puState[key] > 0) {
      const txt = `[${label} ${Math.ceil(puState[key])}s]`;
      ctx.fillStyle = color;
      ctx.fillText(txt, bx, y0 + 18);
      bx += ctx.measureText(txt).width + 8;
    }
  }
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------
function drawOverlay(ctx, title, sub1, sub2, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle   = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 28;
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 44);
  ctx.shadowBlur = 0;

  if (sub1) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px monospace';
    ctx.fillText(sub1, CANVAS_W / 2, CANVAS_H / 2 + 4);
  }
  if (sub2) {
    ctx.fillStyle = '#666666';
    ctx.font = '13px monospace';
    ctx.fillText(sub2, CANVAS_W / 2, CANVAS_H / 2 + 38);
  }
}

// Level transition overlay — shown for ~2.5s between level 1 and level 2
function drawTransitionOverlay(ctx, timeLeft) {
  const alpha = Math.min(1, timeLeft * 1.2);
  ctx.fillStyle = `rgba(0,0,0,${0.82 * alpha})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle   = C.magnet;
  ctx.shadowColor = C.magnet;
  ctx.shadowBlur  = 36;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('LEVEL 2', CANVAS_W / 2, CANVAS_H / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '15px monospace';
  ctx.fillText('Navigate the staircase. Break the core.', CANVAS_W / 2, CANVAS_H / 2 + 18);

  ctx.fillStyle = '#555555';
  ctx.font = '12px monospace';
  ctx.fillText('Lives and score carry over.', CANVAS_W / 2, CANVAS_H / 2 + 46);
}

// Menu overlay — DOM button (#door-toggle) floats above at matching position
function drawMenuOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.fillStyle   = '#edf2f4';
  ctx.shadowColor = '#edf2f4';
  ctx.shadowBlur  = 28;
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('FORTRESS BREAKOUT', CANVAS_W / 2, 240);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px monospace';
  ctx.fillText('Break all 10,000 bricks. Collect power-ups.', CANVAS_W / 2, 298);

  // Start hint — below where the DOM toggle button sits (~y 358–398)
  ctx.fillStyle = '#555555';
  ctx.font = '13px monospace';
  ctx.fillText('Tap  /  Click  /  Space  to start', CANVAS_W / 2, 440);
}

// Freeze-frame end state — score is the hero element
function drawEndOverlay(ctx, title, score, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.fillStyle   = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 32;
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 72);
  ctx.shadowBlur = 0;

  // SCORE — large, glowing white
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 24;
  ctx.font = 'bold 92px sans-serif';
  ctx.fillText(score.toLocaleString(), CANVAS_W / 2, CANVAS_H / 2 + 14);
  ctx.shadowBlur = 0;

  // Label above the number
  ctx.fillStyle = '#888888';
  ctx.font = '15px monospace';
  ctx.fillText('FINAL SCORE', CANVAS_W / 2, CANVAS_H / 2 - 28);

  // Subtle restart hint
  ctx.fillStyle = '#444444';
  ctx.font = '12px monospace';
  ctx.fillText('Press R or click to play again', CANVAS_W / 2, CANVAS_H / 2 + 84);
}

// ---------------------------------------------------------------------------
// Watermark
// ---------------------------------------------------------------------------
function drawWatermark(ctx) {
  ctx.save();
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font         = 'bold 11px monospace';
  ctx.fillStyle    = 'rgba(237,242,244,0.18)';
  ctx.fillText('by Akash', CANVAS_W - 8, CANVAS_H - 6);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);     ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);     ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);         ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}
