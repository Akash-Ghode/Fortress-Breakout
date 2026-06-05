export function createInput(canvas) {
  const state = {
    mouseX:         null,
    mouseY:         null,
    lastClickX:     null,
    lastClickY:     null,
    keys:           { left: false, right: false },
    launchPressed:  false,
    restartPressed: false,
    pausePressed:   false,
  };

  // ── Mouse ──────────────────────────────────────────────────────────────
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (e.clientX - rect.left) * (canvas.width  / rect.width);
    state.mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);
  });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    state.lastClickX = (e.clientX - rect.left) * (canvas.width  / rect.width);
    state.lastClickY = (e.clientY - rect.top)  * (canvas.height / rect.height);
    state.launchPressed = true;
  });

  // ── Touch ──────────────────────────────────────────────────────────────
  function touchCoords(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (canvas.width  / rect.width),
      y: (touch.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  // touchstart: move paddle + fire launch (same as a click)
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const { x, y } = touchCoords(e.touches[0]);
    state.mouseX     = x;
    state.mouseY     = y;
    state.lastClickX = x;
    state.lastClickY = y;
    state.launchPressed = true;
  }, { passive: false });

  // touchmove: steer the paddle
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const { x, y } = touchCoords(e.touches[0]);
    state.mouseX = x;
    state.mouseY = y;
  }, { passive: false });

  // touchend: nothing extra needed — launch was already set on touchstart
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
  }, { passive: false });

  // ── Keyboard ───────────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') state.keys.left  = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.right = true;
    if (e.key === ' ')  { e.preventDefault(); state.launchPressed  = true; }
    if (e.key === 'r' || e.key === 'R') state.restartPressed = true;
    if (e.key === 'p' || e.key === 'P') state.pausePressed   = true;
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') state.keys.left  = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.keys.right = false;
  });

  return state;
}

export function consumeLaunch(input)  { const v = input.launchPressed;  input.launchPressed  = false; return v; }
export function consumeRestart(input) { const v = input.restartPressed; input.restartPressed = false; return v; }
export function consumePause(input)   { const v = input.pausePressed;   input.pausePressed   = false; return v; }
