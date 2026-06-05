let _ctx = null;

function ac() {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function beep(freq, type, vol, dur, freqEnd = null) {
  const ctx = ac();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
  }
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur + 0.02);
}

export function sfxPaddle()   { beep(280, 'sine',     0.30, 0.09); }
export function sfxWall()     { beep(340, 'sine',     0.18, 0.05); }
export function sfxRock()     { beep(190, 'square',   0.20, 0.07); }
export function sfxBreak()    { beep(480, 'sawtooth', 0.25, 0.12); }

export function sfxPowerup() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 'sine', 0.28, 0.14), i * 55));
}

export function sfxLifeLost() { beep(350, 'sawtooth', 0.35, 0.55, 90); }

export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 'sine', 0.30, 0.18), i * 80));
}

export function sfxFasterBall() {
  [400, 600, 900].forEach((f, i) => setTimeout(() => beep(f, 'sawtooth', 0.22, 0.10), i * 40));
}

export function sfxGameOver() {
  [380, 320, 260, 180].forEach((f, i) => setTimeout(() => beep(f, 'sawtooth', 0.28, 0.18), i * 90));
}

export function sfxSlam() {
  const ctx = ac();
  // Deep thud — drops from 90 Hz to 25 Hz
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o1.type = 'sine';
  o1.frequency.setValueAtTime(90, ctx.currentTime);
  o1.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.35);
  g1.gain.setValueAtTime(0.75, ctx.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.47);
  // Metallic clang layered on top
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = 'square';
  o2.frequency.setValueAtTime(340, ctx.currentTime);
  o2.frequency.exponentialRampToValueAtTime(85, ctx.currentTime + 0.14);
  g2.gain.setValueAtTime(0.28, ctx.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.20);
}
