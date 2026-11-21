// Shadow Step — bootstrap, game loop, state machine, collisions, pickups,
// pebble throws, alarms, scoring, progress save. `?shot=` stages a
// deterministic scene for screenshots (see shots.js).
import { CFG, TILE, W, H } from './config.js';
import { parseLevel } from './levels.js';
import { makeGuard, updateGuard, pebbleHeard, losBlocked } from './guards.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import * as R from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = makeAudio();
const input = makeInput(canvas);

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('shadow-step-progress') || '{}');
  } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem('shadow-step-progress', JSON.stringify(p)); } catch { /* private mode */ }
}

const progress = loadProgress();

export const state = {
  screen: 'title',
  levelIndex: 0,
  level: parseLevel(0),
  guards: [],
  player: { x: 60, y: 60, dir: 0, crouch: false, running: false, moving: false, inBush: false },
  alarms: 0,
  spotted: 0,
  pebbles: 4,
  pebblesFx: [],
  hasKey: false,
  scrollsGot: 0,
  levelTime: 0,
  time: 0,
  score: 0,
  levelScore: 0,
  rank: 'Ghost',
  ranks: [],
  levelNames: [],
  toast: '',
  toastT: 0,
  startedOnce: false,
  bestRank: progress.bestRank || '',
  bestScore: progress.bestScore || 0,
  shotMode: false,
};

function solids() {
  const s = [...state.level.walls];
  for (const c of state.level.covers) if (c.kind !== 'bush') s.push(c);
  if (state.level.door && !state.level.door.open) {
    s.push({ x: state.level.door.x - 20, y: state.level.door.y - 20, w: 40, h: 40 });
  }
  return s;
}

function startLevel(idx) {
  state.levelIndex = idx;
  state.level = parseLevel(idx);
  state.guards = state.level.guardDefs.map((d) => makeGuard(d));
  state.player = { x: state.level.player.x, y: state.level.player.y, dir: 0, crouch: false, running: false, moving: false, inBush: false };
  state.alarms = 0;
  state.spotted = 0;
  state.pebbles = state.level.pebbles;
  state.pebblesFx = [];
  state.hasKey = false;
  state.scrollsGot = 0;
  state.levelTime = 0;
  state.levelScore = 0;
  state.rank = 'Ghost';
  state.toast = '';
  state.toastT = 0;
  state.screen = 'play';
}

function toast(msg) {
  state.toast = msg;
  state.toastT = 2.6;
}

function circleHitsRect(x, y, r, rect) {
  return x + r > rect.x && x - r < rect.x + rect.w && y + r > rect.y && y - r < rect.y + rect.h;
}

function throwPebble(tx, ty) {
  if (state.pebbles <= 0) { toast('No pebbles left!'); return; }
  if (state.screen !== 'play') return;
  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const range = Math.min(dist, CFG.pebbleRange);
  const lx = state.player.x + (dx / dist) * range;
  const ly = state.player.y + (dy / dist) * range;
  state.pebbles--;
  audio.sfx.pebble();
  state.pebblesFx.push({ x: lx, y: ly, ping: 1, t: 0 });
  setTimeout(() => audio.sfx.ping(), 250);
  pebbleHeard(state.guards, lx, ly);
  toast('Pebble thrown — guards investigate!');
}

function triggerAlarm(guard) {
  if (state.screen !== 'play') return;
  state.alarms = Math.min(CFG.alarmMax, state.alarms + 1);
  audio.sfx.alarm();
  toast(`ALARM ${state.alarms}/3 — a guard spotted you!`);
  state.guards.forEach((g) => {
    if (g !== guard && g.state !== 'chase') { g.state = 'suspicious'; g.investigate = { x: state.player.x, y: state.player.y }; g.investigateT = 3; }
  });
  if (state.alarms >= CFG.alarmMax) {
    state.screen = 'failed';
    audio.sfx.caught();
  }
}

function caughtByGuard() {
  if (state.screen !== 'play') return;
  state.alarms = Math.min(CFG.alarmMax, state.alarms + 1);
  state.spotted++;
  audio.sfx.caught();
  if (state.alarms >= CFG.alarmMax) {
    state.screen = 'failed';
    return;
  }
  toast(`CAUGHT! Alarm ${state.alarms}/3 — back to the start`);
  state.player.x = state.level.player.x;
  state.player.y = state.level.player.y;
  state.guards = state.level.guardDefs.map((d) => makeGuard(d));
}

function levelComplete() {
  const timeBonus = Math.max(0, 600 - Math.floor(state.levelTime) * 4);
  const ghostBonus = state.spotted === 0 ? 500 : state.spotted === 1 ? 200 : 0;
  state.rank = state.spotted === 0 ? 'Ghost' : state.spotted === 1 ? 'Shadow' : 'Spotted';
  state.levelScore = 1000 + state.scrollsGot * 150 + timeBonus + ghostBonus;
  state.score += state.levelScore;
  state.ranks[state.levelIndex] = { rank: state.rank, time: state.levelTime, score: state.levelScore };
  state.levelNames[state.levelIndex] = state.level.name;
  progress.bestScore = Math.max(progress.bestScore || 0, state.score);
  if (state.rank === 'Ghost') progress.bestRank = 'Ghost';
  progress['level' + state.levelIndex] = state.rank;
  saveProgress(progress);
  state.bestScore = progress.bestScore;
  state.bestRank = progress.bestRank || '';
  audio.sfx.win();
  state.screen = 'levelcomplete';
}

function nextLevel() {
  if (state.levelIndex + 1 >= 6) {
    state.screen = 'gamecomplete';
  } else {
    startLevel(state.levelIndex + 1);
  }
}

function update(dt) {
  state.time += dt;
  if (state.toastT > 0) state.toastT -= dt;
  if (state.screen !== 'play') return;
  state.levelTime += dt;
  const p = state.player;
  const s = solids();

  // --- movement -----------------------------------------------------------
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  p.moving = mx !== 0 || my !== 0;
  p.crouch = input.crouchHeld;
  p.running = input.run && !p.crouch && p.moving;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.dir = Math.atan2(my, mx);
    const speed = p.crouch ? CFG.crouchSpeed : p.running ? CFG.runSpeed : CFG.walkSpeed;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    if (!circleHitsRect(nx, p.y, 12, { x: -20, y: -20, w: W + 40, h: H + 40 }) || true) { /* bounds below */ }
    const inBounds = (x, y) => x > 14 && x < W - 14 && y > 14 && y < H - 14;
    if (inBounds(nx, p.y) && !s.some((r) => circleHitsRect(nx, p.y, 12, r))) p.x = nx;
    if (inBounds(p.x, ny) && !s.some((r) => circleHitsRect(p.x, ny, 12, r))) p.y = ny;
    if (Math.random() < dt * 3) audio.sfx.step();
  }

  // In a bush? (hiding)
  p.inBush = state.level.covers.some((c) => c.kind === 'bush' && p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h);

  // --- pebble fx ----------------------------------------------------------
  for (const fx of state.pebblesFx) {
    fx.t += dt;
    fx.ping = Math.max(0, 1 - fx.t / 0.9);
  }
  state.pebblesFx = state.pebblesFx.filter((f) => f.t < 1);

  // --- guards -------------------------------------------------------------
  for (const g of state.guards) {
    const ev = updateGuard(g, dt, p, s, state, null);
    if (ev.alarm) triggerAlarm(g);
    if (ev.caught) { caughtByGuard(); return; }
    if (state.screen !== 'play') return; // level ended (failed) mid-tick
  }

  // --- pickups ------------------------------------------------------------
  const L = state.level;
  if (L.key && !L.key.taken && Math.hypot(p.x - L.key.x, p.y - L.key.y) < CFG.keyPickupDist) {
    L.key.taken = true;
    state.hasKey = true;
    audio.sfx.key();
    toast('Key found! The locked door can open now.');
  }
  for (const sc of L.scrolls) {
    if (!sc.taken && Math.hypot(p.x - sc.x, p.y - sc.y) < CFG.scrollPickupDist) {
      sc.taken = true;
      state.scrollsGot++;
      audio.sfx.pickup();
      toast(`Ancient scroll ${state.scrollsGot}/${L.scrolls.length} recovered! (+150)`);
    }
  }
  // Door opens when the key holder touches it.
  if (L.door && !L.door.open && state.hasKey && Math.hypot(p.x - L.door.x, p.y - L.door.y) < 36) {
    L.door.open = true;
    audio.sfx.door();
    toast('Door unlocked!');
  }
  // Exit — sealed until the key is found, so the key + door always matter.
  if (L.exit && Math.hypot(p.x - L.exit.x, p.y - L.exit.y) < CFG.exitDist) {
    if (!state.hasKey) {
      if (!state.exitWarnT || state.exitWarnT <= 0) {
        toast('The exit is sealed — find the KEY first!');
        state.exitWarnT = 3;
      }
    } else {
      levelComplete();
    }
  }
  if (state.exitWarnT > 0) state.exitWarnT -= dt;
}

function handleKeys() {
  if (input.wasPressed('mute')) {
    const m = audio.toggleMute();
    toast(m ? 'Sound muted' : 'Sound on');
  }
  if (state.screen === 'title') {
    if (input.wasPressed('confirm')) {
      audio.unlock();
      state.startedOnce = true;
      startLevel(progress.unlocked ? 0 : 0);
    }
    return;
  }
  if (state.screen === 'play') {
    if (input.wasPressed('pause')) { state.screen = 'pause'; audio.sfx.click(); }
    if (input.wasPressed('restart')) startLevel(state.levelIndex);
    if (input.wasPressed('throw')) throwPebble(state.player.x + Math.cos(state.player.dir) * 160, state.player.y + Math.sin(state.player.dir) * 160);
    if (input.consumeClick()) throwPebble(input.mouse.x, input.mouse.y);
    return;
  }
  if (state.screen === 'pause') {
    if (input.wasPressed('pause') || input.wasPressed('confirm')) state.screen = 'play';
    if (input.wasPressed('restart')) startLevel(state.levelIndex);
    return;
  }
  if (state.screen === 'levelcomplete') {
    if (input.wasPressed('confirm') || input.wasPressed('restart')) nextLevel();
    return;
  }
  if (state.screen === 'failed') {
    if (input.wasPressed('confirm') || input.wasPressed('restart')) startLevel(state.levelIndex);
    return;
  }
  if (state.screen === 'gamecomplete') {
    if (input.wasPressed('confirm')) {
      state.score = 0;
      state.ranks = [];
      startLevel(0);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  switch (state.screen) {
    case 'title': R.drawTitle(ctx, state); break;
    case 'pause': R.drawPause(ctx, state); break;
    case 'levelcomplete': R.drawLevelComplete(ctx, state); break;
    case 'failed': R.drawFailed(ctx, state); break;
    case 'gamecomplete': R.drawGameComplete(ctx, state); break;
    default:
      R.drawWorld(ctx, state);
      R.drawHUD(ctx, state);
  }
}

// Deterministic screenshot staging: ?shot=1..4 (see shots.js).
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  state.shotMode = true;
  stageShot(state, shot, { startLevel, toast });
  render();
  window.__shotReady = true;
  document.title = 'Shadow Step — shot ' + shot;
} else {
  // Normal interactive game.
  state.guards = state.level.guardDefs.map((d) => makeGuard(d));
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleKeys();
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// Expose a small debug/testing handle (used by headless playtests).
window.__shadowStep = { state, startLevel, nextLevel, throwPebble };
