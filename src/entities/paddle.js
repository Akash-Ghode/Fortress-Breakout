import { CANVAS_W, PADDLE_W, PADDLE_H, PADDLE_Y, PADDLE_KEY_SPEED, PADDLE_EXTEND_W } from '../config.js';

export function createPaddle() {
  return {
    x: (CANVAS_W - PADDLE_W) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
  };
}

export function updatePaddle(paddle, mouseX, keys, dt, extended) {
  if (mouseX !== null) {
    paddle.x = mouseX - paddle.w / 2;
  }
  if (keys.left)  paddle.x -= PADDLE_KEY_SPEED * dt;
  if (keys.right) paddle.x += PADDLE_KEY_SPEED * dt;

  paddle.w = extended ? PADDLE_EXTEND_W : PADDLE_W;
  paddle.x = Math.max(0, Math.min(CANVAS_W - paddle.w, paddle.x));
}
