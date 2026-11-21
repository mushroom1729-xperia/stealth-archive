// Boot and game loop for LAMPLIGHT ARCHIVE: keyboard input, the
// title/playing/caught/cleared state machine, the detection meter, scoring and
// the HUD. Everything the game is, one requestAnimationFrame at a time.

import { LEVELS, WORLD_W, WORLD_H } from './levels.js';
import { Player, circleOverlaps } from './player.js';
import { Guard } from './guard.js';
import { SoundKit } from './audio.js';
import { Renderer, INTRO_TIME } from './render.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new SoundKit();

const hud = {
  level: document.getElementById('hud-level'),
  meterFill: document.getElementById('hud-meter-fill'),
  score: document.getElementById('hud-score'),
};

const overlay = document.getElementById('overlay');
const panels = {
  title: document.getElementById('panel-title'),
  caught: document.getElementById('panel-caught'),
  cleared: document.getElementById('panel-cleared'),
};
const clearTitle = document.getElementById('clear-title');
const clearLines = document.getElementById('clear-lines');
const clearGo = document.getElementById('clear-go');

const game = {
  state: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  rings: [],
  noises: [],
  time: 0,
  introT: 0,
  flash: 0,
  levelTime: 0,
  spotted: false,
  score: 0,
  scoreBase: 0,
  pendingCaught: null,
  pendingClear: false,
};

// ---- effects the actors call back into -------------------------------------

const fx = {
  noises: game.noises,
  makeNoise(x, y) {
    game.noises.push({ x, y });
    game.rings.push({ x, y, r: 12, life: 0.7, life0: 0.7 });
  },
  playerStep(gain) {
    sound.step(gain, 1.45);
  },
  guardStep(gain) {
    sound.step(gain, 0.9);
  },
  spotted(guard) {
    game.spotted = true;
    sound.sting();
  },
  caught(guard) {
    if (!game.pendingCaught) game.pendingCaught = guard;
  },
};

// ---- level and state plumbing ----------------------------------------------

function loadLevel(index, state) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  game.world = { walls: level.walls, crates: level.crates };
  game.lamps = level.lamps;
  game.player = new Player(level.player);
  game.guards = level.guards.map((spec) => new Guard(spec));
  game.rings.length = 0;
  game.noises.length = 0;
  game.introT = INTRO_TIME;
  game.flash = 0;
  game.levelTime = 0;
  game.spotted = false;
  game.pendingCaught = null;
  game.pendingClear = false;
  game.state = state;
  showPanel(null);
}

function showPanel(name) {
  overlay.classList.toggle('hidden', name === null);
  for (const key of Object.keys(panels)) {
    panels[key].classList.toggle('hidden', key !== name);
  }
}

function doCaught() {
  game.state = 'caught';
  game.score = game.scoreBase;
  game.flash = 1;
  sound.caught();
  sound.alarmSet(0);
  showPanel('caught');
}

function doClear() {
  game.state = 'cleared';
  const par = game.level.par;
  const timeBonus = Math.max(0, Math.round((par - game.levelTime) * 20));
  const unseenBonus = game.spotted ? 0 : 500;
  const levelScore = 200 + timeBonus + unseenBonus;
  game.scoreBase += levelScore;
  game.score = game.scoreBase;
  sound.cleared();
  sound.alarmSet(0);
  const last = game.levelIndex === LEVELS.length - 1;
  clearTitle.textContent = last ? 'ARCHIVE CLEARED' : 'LEVEL CLEAR';
  clearLines.innerHTML =
    `Time ${game.levelTime.toFixed(1)}s (par ${par}s) — bonus <b>+${timeBonus}</b><br>` +
    (game.spotted
      ? 'You were seen — no unseen bonus<br>'
      : 'Unseen — <b>+500</b><br>') +
    `Level score <b>+${levelScore}</b> &middot; Total <b>${game.score}</b>`;
  clearGo.textContent = last ? 'Press Enter for the title screen' : 'Press Enter for the next level';
  showPanel('cleared');
}

function toTitle() {
  game.state = 'title';
  game.score = game.scoreBase;
  loadLevel(game.levelIndex, 'title');
  showPanel('title');
}

function advance() {
  if (game.state === 'title') {
    loadLevel(game.levelIndex, 'playing');
  } else if (game.state === 'caught') {
    loadLevel(game.levelIndex, 'playing');
  } else if (game.state === 'cleared') {
    if (game.levelIndex < LEVELS.length - 1) {
      loadLevel(game.levelIndex + 1, 'playing');
    } else {
      toTitle();
    }
  }
}

function restartLevel() {
  if (game.state === 'title') return;
  loadLevel(game.levelIndex, 'playing');
}

function jumpTo(index) {
  if (index < 0 || index >= LEVELS.length) return;
  loadLevel(index, 'playing');
}

// ---- input -------------------------------------------------------------------

const input = { left: false, right: false, up: false, down: false, sneak: false };

const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  Shift: 'sneak',
};

window.addEventListener('keydown', (e) => {
  sound.ensure();
  if (e.key in KEYMAP) {
    input[KEYMAP[e.key]] = true;
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    advance();
  } else if (e.key === 'r' || e.key === 'R') {
    restartLevel();
  } else if (e.key === '1') {
    jumpTo(0);
  } else if (e.key === '2') {
    jumpTo(1);
  } else if (e.key === '3') {
    jumpTo(2);
  } else if (e.key === 'm' || e.key === 'M') {
    sound.toggleMute();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in KEYMAP) input[KEYMAP[e.key]] = false;
});

window.addEventListener('blur', () => {
  for (const key of Object.keys(input)) input[key] = false;
});

window.addEventListener('pointerdown', () => {
  sound.ensure();
  if (game.state !== 'playing') advance();
});

// ---- update ------------------------------------------------------------------

function updatePlaying(dt) {
  game.noises.length = 0;
  game.player.update(dt, input, game.level.walls.concat(game.level.crates), fx);

  game.levelTime += dt;
  game.introT = Math.max(0, game.introT - dt);
  game.flash = Math.max(0, game.flash - dt * 2.2);

  for (const gu of game.guards) gu.update(dt, game.world, game.lamps, game.player, fx, true);

  if (game.pendingCaught) {
    doCaught();
    return;
  }
  const e = game.level.exit;
  if (circleOverlaps(game.player.x, game.player.y, game.player.r, { x: e.x - 6, y: e.y - 6, w: e.w + 12, h: e.h + 12 })) {
    doClear();
    return;
  }

  for (const ring of game.rings) {
    ring.life -= dt;
    ring.r += (130 - ring.r) * dt * 2.4;
  }
  for (let i = game.rings.length - 1; i >= 0; i--) {
    if (game.rings[i].life <= 0) game.rings.splice(i, 1);
  }

  let detection = 0;
  for (const gu of game.guards) detection = Math.max(detection, gu.meter);
  sound.alarmSet((detection - 0.25) / 0.75);
}

function updateIdle(dt) {
  // The wardens make their rounds behind the title, caught and clear panels.
  game.time += dt;
  game.introT = Math.max(0, game.introT - dt);
  game.flash = Math.max(0, game.flash - dt * 2.2);
  for (const gu of game.guards) gu.update(dt, game.world, game.lamps, game.player, fx, false);
}

function syncHud() {
  let detection = 0;
  for (const gu of game.guards) detection = Math.max(detection, gu.meter);
  hud.level.textContent = `LEVEL ${game.levelIndex + 1} · ${game.level.name}`;
  hud.score.textContent = `SCORE ${game.score}`;
  hud.meterFill.style.width = `${Math.round(detection * 100)}%`;
  const hue = Math.round(120 - 120 * detection);
  hud.meterFill.style.background = detection > 0.01 ? `hsl(${hue} 70% 55%)` : '#67d98b';
}

// ---- boot and loop -----------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const requested = Number(params.get('level'));
if (Number.isInteger(requested) && requested >= 1 && requested <= LEVELS.length) {
  loadLevel(requested - 1, 'playing');
} else {
  toTitle();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing') {
    game.time += dt;
    updatePlaying(dt);
  } else {
    updateIdle(dt);
  }
  renderer.draw(game);
  syncHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
