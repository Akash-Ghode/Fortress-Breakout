# Fortress Breakout

A browser-based Breakout variant with a mechanical twist: the entry gap **seals itself shut** the moment the ball passes through, trapping it inside the brick field. Built with vanilla JavaScript and HTML5 Canvas — no frameworks, no build tools.

> Personal project. Built as a hobby alongside a career in cybersecurity.

---

## Gameplay

The field is a 100 × 100 grid of 6 px bricks (10,000 total). At the bottom sits a two-row rock barrier with a single 3-cell gap. A 20-row vertical channel of indestructible rock walls rises above the gap, funnelling the ball into the open field.

**The challenge:** thread the ball through the narrow gap. If the *Door Closes* mode is enabled, the gap seals the instant the ball clears the barrier — the ball ricochets inside until every breakable brick is destroyed or all lives are lost.

### Power-ups

| Block | Effect | Duration |
|-------|--------|----------|
| Yellow — Extra Ball | Spawns an additional ball at the break point | Permanent (until lost) |
| Orange — Faster Ball | 1.7× ball speed | 10 s |
| Green — Paddle Extend | Widens the paddle | 12 s |
| Blue — Slow-Mo | 0.55× ball speed | 8 s |
| Pink — Magnet | Ball sticks to paddle; tap/Space to relaunch | 12 s |

### Cinematic effects

- **Door-slam:** white screen flash + screen shake + "SEALED" stamp + bass thud
- **Auto slow-mo:** speed drops to 0.35× for 0.5 s on thread-through
- **Ball trail:** 8-frame motion ghost on each ball
- **Score pops:** floating +10 at each brick break

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move paddle | Mouse drag / Arrow keys / A · D | Touch drag |
| Launch ball | Space / Click | Tap canvas |
| Toggle door mode | Click the button on the menu | Tap the button |
| Pause | P | — |
| Restart | R | Tap end screen |

---

## Running locally

ES modules require an HTTP server — the game **will not work** opened directly as a file.

**VS Code — Live Server extension** (recommended)  
Right-click `index.html` → *Open with Live Server*

**Python**
```bash
cd brick-fortress
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Hosting (free, no backend needed)

### Netlify Drop — fastest option
1. Visit [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `brick-fortress/` folder onto the page
3. Share the generated HTTPS URL — works on desktop and mobile

### GitHub Pages
1. Push this repo to GitHub
2. **Settings → Pages → Source:** `main` branch, root folder
3. URL: `https://<username>.github.io/brick-fortress/`

### Vercel
```bash
npm i -g vercel
cd brick-fortress
vercel
```

All three platforms serve static files over HTTPS, so ES modules work without any configuration changes.

---

## Project structure

```
brick-fortress/
├── index.html          canvas + DOM toggle button
├── styles.css          layout, responsive scaling, button styling
├── src/
│   ├── main.js         game loop, state machine, cinematic events
│   ├── config.js       all tunable constants
│   ├── level.js        procedural 100×100 map generator
│   ├── physics.js      sub-stepped circle-vs-AABB collision
│   ├── render.js       canvas drawing — bricks, trails, HUD, overlays
│   ├── powerups.js     power-up state and timers
│   ├── input.js        mouse, keyboard, and touch handlers
│   ├── audio.js        Web Audio API procedural sound effects
│   └── entities/
│       ├── ball.js
│       ├── paddle.js
│       └── brick.js
```

## Tuning

Every gameplay variable lives in `src/config.js` (grid size, ball speed, power-up durations).  
Cinematic timings are constants at the top of `src/main.js`.  
The brick layout is generated in `src/level.js` — edit probabilities there to change power-up density.

---

## Tech notes

- **Vanilla JS ES modules** — zero dependencies, instant load
- **Sub-stepped physics** — ball displacement is split into ≤ `BALL_R` px increments per frame to prevent tunnelling through thin walls at high speed
- **Responsive canvas** — CSS `min(600px, 100vw)` + `aspect-ratio` scales to any screen; coordinate scaling handled in `input.js`
- **Web Audio API** — all sounds are procedurally generated oscillators, no audio files required
- **Autoplay policy** — `AudioContext` is created lazily on the first user interaction
