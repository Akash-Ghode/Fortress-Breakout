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
    touchDeltaX:    0,    // relative drag delta since last frame (touch only)
  };

  // ── Mouse (desktop) — absolute position teleport ───────────────────────
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

  // ── Touch (mobile) — relative drag, works anywhere on screen ──────────
  let lastTouchClientX = null;

  // Listen on document so touches below the canvas also move the paddle
  document.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return; // let the DOM button handle its own taps
    e.preventDefault();
    lastTouchClientX = e.touches[0].clientX;
    // launchPressed fires on touchend so the player can adjust paddle before releasing
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    if (lastTouchClientX === null) return;
    const rect  = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;   // canvas logical px per CSS px
    const currentX = e.touches[0].clientX;
    state.touchDeltaX += (currentX - lastTouchClientX) * scale;
    lastTouchClientX = currentX;
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    lastTouchClientX    = null;
    state.launchPressed = true; // finger lifted = launch / relaunch
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
