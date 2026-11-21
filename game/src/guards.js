// Shadow Step — guard AI: patrol waypoints, vision cone, line of sight,
// detection meter, suspicion / alert / chase states, hearing (noise + pebbles).
import { CFG, TILE } from './config.js';

// A guard starts at the first waypoint of its patrol path.
export function makeGuard(def, speedMul = 1) {
  const pts = def.path.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }));
  return {
    x: pts[0].x,
    y: pts[0].y,
    path: pts,
    wp: 1 % pts.length,
    speed: CFG.guardSpeed * (def.speed || 1) * speedMul,
    angle: 0,
    state: 'calm', // calm | suspicious | alert | chase
    meter: 0,
    pauseT: 0,
    lastSeen: null,
    investigate: null,
    investigateT: 0,
    alertT: 0,
    bob: Math.random() * Math.PI * 2,
  };
}

// Segment (x1,y1)-(x2,y2) blocked by any wall rect or solid cover rect?
export function losBlocked(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does the segment cross the rect?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  for (const [p, d, lo, hi] of [
    [x1, dx, r.x, r.x + r.w],
    [y1, dy, r.y, r.y + r.h],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let t1 = (lo - p) / d;
      let t2 = (hi - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

// Is the player inside this guard's vision cone and line of sight?
export function guardCanSee(g, player, solids, hiddenFactor) {
  const dx = player.x - g.x;
  const dy = player.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CFG.viewDist) return { seen: false, dist };
  let angDiff = Math.atan2(dy, dx) - g.angle;
  while (angDiff > Math.PI) angDiff -= Math.PI * 2;
  while (angDiff < -Math.PI) angDiff += Math.PI * 2;
  if (Math.abs(angDiff) > CFG.viewHalfAngle) return { seen: false, dist };
  if (losBlocked(g.x, g.y, player.x, player.y, solids)) return { seen: false, dist };
  return { seen: true, dist, visibility: hiddenFactor(dist) };
}

// One guard tick. Returns events: { alarm: bool, caught: bool }.
export function updateGuard(g, dt, player, solids, world, onNoise) {
  const events = { alarm: false, caught: false };
  g.bob += dt * 6;

  // --- vision ------------------------------------------------------------
  const hidden = player.inBush ? 0.18 : player.crouch ? 0.45 : player.running ? 1.5 : 1;
  const vis = guardCanSee(g, player, solids, (dist) => {
    const near = 1 - (dist / CFG.viewDist) * 0.45; // closer = seen faster
    return near * hidden;
  });
  if (vis.seen) {
    const rate = CFG.detectRate * Math.max(0.15, vis.visibility);
    g.meter = Math.min(100, g.meter + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    if (g.meter > 45 && g.state === 'calm') g.state = 'suspicious';
    if (g.meter >= 100) {
      events.alarm = true;
      g.state = 'chase';
      g.alertT = 4;
      g.meter = 55; // stays hot while chasing, does not instantly re-alarm
    }
  } else {
    g.meter = Math.max(0, g.meter - CFG.detectDecay * dt);
    if (g.meter < 20 && g.state === 'suspicious' && !g.investigate) g.state = 'calm';
  }

  // --- hearing: footsteps -------------------------------------------------
  const noiseR = player.running ? CFG.noiseRun : player.crouch ? CFG.noiseCrouch : CFG.noiseWalk;
  const pDist = Math.hypot(player.x - g.x, player.y - g.y);
  if (player.moving && pDist < noiseR && g.state !== 'chase') {
    g.investigate = { x: player.x, y: player.y };
    g.investigateT = 3;
    if (g.state === 'calm') g.state = 'suspicious';
  }

  // --- movement by state --------------------------------------------------
  if (g.state === 'chase') {
    g.alertT -= dt;
    const target = g.lastSeen || { x: player.x, y: player.y };
    moveToward(g, target, CFG.guardChaseSpeed, dt, solids);
    if (pDist < CFG.catchDist) events.caught = true;
    if (g.alertT <= 0 && !vis.seen) {
      g.state = 'suspicious';
      g.investigate = g.lastSeen;
      g.investigateT = 2.5;
    }
  } else if (g.investigate) {
    g.investigateT -= dt;
    const arrived = moveToward(g, g.investigate, g.speed * 1.35, dt, solids);
    if (arrived || g.investigateT <= 0) {
      g.investigate = null;
      g.pauseT = 1.2; // look around, then resume patrol
    }
  } else if (g.pauseT > 0) {
    g.pauseT -= dt;
    g.angle += dt * 1.4; // scan the room while paused
  } else {
    const target = g.path[g.wp];
    const arrived = moveToward(g, target, g.speed, dt, solids);
    if (arrived) {
      g.wp = (g.wp + 1) % g.path.length;
      g.pauseT = 0.6;
    }
  }
  return events;
}

// Move toward a point, sliding along solid rects. Returns true when arrived.
function moveToward(g, target, speed, dt, solids) {
  const dx = target.x - g.x;
  const dy = target.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  g.angle = Math.atan2(dy, dx);
  if (!hitsSolid(nx, g.y, solids)) g.x = nx;
  if (!hitsSolid(g.x, ny, solids)) g.y = ny;
  return dist <= step + 2;
}

function hitsSolid(x, y, solids) {
  const r = 13;
  for (const s of solids) {
    if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
  }
  return false;
}

// Guards hear a pebble landing: everyone in range investigates the point.
export function pebbleHeard(guards, x, y) {
  for (const g of guards) {
    if (Math.hypot(g.x - x, g.y - y) < CFG.pebbleNoise && g.state !== 'chase') {
      g.investigate = { x, y };
      g.investigateT = 4;
      if (g.state === 'calm') g.state = 'suspicious';
    }
  }
}
