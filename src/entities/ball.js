import { BALL_R, BALL_SPEED, LAUNCH_ANGLE_DEG, CANVAS_W } from '../config.js';

export function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, r: BALL_R, stuck: true };
}

export function launchBall(ball, paddleX, paddleW) {
  const paddleCenter = paddleX + paddleW / 2;
  const normalized = (paddleCenter - CANVAS_W / 2) / (CANVAS_W / 2);

  // Base: LAUNCH_ANGLE_DEG degrees from horizontal, upward
  const base = LAUNCH_ANGLE_DEG * Math.PI / 180;
  // Bias up to ±30° based on paddle position
  const biasRad = normalized * (Math.PI / 6);

  // Rotate base direction vector by bias
  const bx = Math.cos(base);      // slight rightward component
  const by = -Math.sin(base);     // mostly upward

  const cos = Math.cos(biasRad);
  const sin = Math.sin(biasRad);
  ball.vx = (bx * cos - by * sin) * BALL_SPEED;
  ball.vy = (bx * sin + by * cos) * BALL_SPEED;
  ball.stuck = false;
}
