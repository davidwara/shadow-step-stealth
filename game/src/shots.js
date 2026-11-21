// Shadow Step — deterministic screenshot staging.
// `?shot=N` places the player and guards at fixed spots, sets meters and
// status, and returns the screen to draw. Same seed, same pixels every run.
import { TILE } from './config.js';

function placeGuard(state, i, tx, ty, angle, meter, gstate) {
  const g = state.guards[i];
  if (!g) return;
  g.x = tx * TILE + TILE / 2;
  g.y = ty * TILE + TILE / 2;
  g.angle = angle;
  g.meter = meter;
  g.state = gstate;
  g.pauseT = 999; // hold still for the screenshot
  g.investigate = null;
  g.wp = 0;
}

export function stageShot(state, shot, helpers) {
  const { startLevel } = helpers;
  if (shot === '1' || shot === 'start') {
    // Cover shot: level 1 mid-play, 2 guards with cones pointing apart,
    // player crouched behind a crate, exit visible, full HUD.
    startLevel(0);
    state.screen = 'play';
    state.levelTime = 47;
    state.pebbles = 3;
    state.scrollsGot = 1;
    state.level.scrolls[0].taken = true;
    state.player.x = 7 * TILE + 6;
    state.player.y = 2 * TILE + 20;
    state.player.dir = Math.PI / 2;
    state.player.crouch = true;
    state.player.moving = false;
    placeGuard(state, 0, 10, 3, 0, 12, 'calm');
    placeGuard(state, 1, 24, 8, Math.PI, 0, 'calm');
    placeGuard(state, 2, 5, 12, -Math.PI / 2, 0, 'calm');
    state.toast = 'Stay low — the guard is looking this way...';
    state.toastT = 999;
  } else if (shot === '2' || shot === 'play') {
    // Alert moment: guard chasing, red cone, meter nearly full, player runs.
    startLevel(0);
    state.screen = 'play';
    state.levelTime = 83;
    state.alarms = 1;
    state.spotted = 1;
    state.pebbles = 2;
    state.hasKey = true;
    state.level.key.taken = true;
    state.player.x = 13 * TILE + 20;
    state.player.y = 7 * TILE + 20;
    state.player.dir = 0;
    state.player.running = true;
    state.player.moving = true;
    state.player.crouch = false;
    placeGuard(state, 0, 10, 7, 0, 92, 'chase');
    placeGuard(state, 1, 24, 8, Math.PI, 55, 'suspicious');
    placeGuard(state, 2, 5, 12, -Math.PI / 2, 8, 'calm');
    state.toast = 'SPOTTED! Run for cover!';
    state.toastT = 999;
  } else if (shot === '3' || shot === 'garden') {
    // Later level: Palace Garden — 5 guards, bushes, scrolls, key in hand.
    startLevel(4);
    state.screen = 'play';
    state.levelTime = 121;
    state.pebbles = 5;
    state.hasKey = true;
    state.level.key.taken = true;
    state.scrollsGot = 1;
    state.level.scrolls[0].taken = true;
    state.player.x = 4 * TILE + 20;
    state.player.y = 3 * TILE + 20;
    state.player.dir = Math.PI / 2;
    state.player.crouch = true;
    state.player.moving = false;
    state.player.inBush = true;
    placeGuard(state, 0, 10, 3, Math.PI / 2, 18, 'calm');
    placeGuard(state, 1, 5, 8, 0, 0, 'calm');
    placeGuard(state, 2, 25, 5, Math.PI, 0, 'calm');
    placeGuard(state, 3, 22, 12, -Math.PI / 2, 34, 'suspicious');
    placeGuard(state, 4, 5, 14, Math.PI / 2, 0, 'calm');
    state.toast = 'Hidden in the bushes — the patrol passes by...';
    state.toastT = 999;
  } else if (shot === '4' || shot === 'end') {
    // Level complete with a Ghost rank and score.
    startLevel(0);
    state.screen = 'levelcomplete';
    state.levelTime = 98;
    state.scrollsGot = 2;
    state.level.scrolls.forEach((s) => { s.taken = true; });
    state.hasKey = true;
    state.level.key.taken = true;
    state.spotted = 0;
    state.rank = 'Ghost';
    state.levelScore = 2150;
    state.score = 2150;
    state.ranks = [{ rank: 'Ghost', time: 98, score: 2150 }];
    state.levelNames = ['Museum Malam'];
    placeGuard(state, 0, 10, 3, 0, 0, 'calm');
    placeGuard(state, 1, 24, 8, Math.PI, 0, 'calm');
  } else {
    startLevel(0);
  }
}
