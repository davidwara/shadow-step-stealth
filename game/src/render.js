// Shadow Step — all drawing: top-down world, vision cones, player, HUD,
// and every screen (title, pause, level complete, failed, game complete).
// Everything is procedural Canvas 2D; there are no image files.
import { TILE, W, H, CFG } from './config.js';

const STATE_COLOR = { calm: '#ffd76a', suspicious: '#ff9a3d', alert: '#ff4d4d', chase: '#ff2222' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, state) {
  const L = state.level;
  const t = L.theme;
  // Floor: two-tone tiles.
  for (let ry = 0; ry < 18; ry++) {
    for (let rx = 0; rx < 32; rx++) {
      ctx.fillStyle = (rx + ry) % 2 === 0 ? t.floor : t.floor2;
      ctx.fillRect(rx * TILE, ry * TILE, TILE, TILE);
    }
  }
  // Subtle tile grid lines.
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += TILE) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += TILE) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // Exit: glowing green portal in the floor.
  if (L.exit) {
    const p = 1 + 0.06 * Math.sin(state.time * 3);
    ctx.save();
    ctx.shadowColor = '#39ff88';
    ctx.shadowBlur = 26 * p;
    ctx.fillStyle = '#1d7a44';
    roundRect(ctx, L.exit.x - 26, L.exit.y - 26, 52, 52, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#39ff88';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', L.exit.x, L.exit.y - 1);
    ctx.restore();
  }

  // Door: locked = heavy brass gate; open = empty frame.
  if (L.door && !L.door.open) {
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(L.door.x - 20, L.door.y - 20, 40, 40);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(L.door.x - 14, L.door.y - 14, 28, 28);
    ctx.fillStyle = '#3a280f';
    ctx.beginPath();
    ctx.arc(L.door.x, L.door.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', L.door.x, L.door.y - 26);
  }

  // Key.
  if (L.key && !L.key.taken) {
    const bob = Math.sin(state.time * 4) * 3;
    ctx.save();
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(L.key.x, L.key.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(L.key.x + 4, L.key.y + bob - 2, 12, 4);
    ctx.fillRect(L.key.x + 12, L.key.y + bob - 2, 3, 8);
    ctx.restore();
    ctx.fillStyle = '#fff2c0';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEY', L.key.x, L.key.y + bob + 20);
  }

  // Scrolls (optional collectibles).
  for (const s of L.scrolls) {
    if (s.taken) continue;
    const bob = Math.sin(state.time * 3 + s.x) * 2;
    ctx.save();
    ctx.shadowColor = '#fff0b0';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f2e3b3';
    roundRect(ctx, s.x - 11, s.y + bob - 7, 22, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#b89a55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - 7, s.y + bob - 2); ctx.lineTo(s.x + 7, s.y + bob - 2);
    ctx.moveTo(s.x - 7, s.y + bob + 3); ctx.lineTo(s.x + 4, s.y + bob + 3);
    ctx.stroke();
    ctx.restore();
  }

  // Covers.
  for (const c of L.covers) {
    if (c.kind === 'crate') {
      ctx.fillStyle = '#6b4a22';
      ctx.fillRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
      ctx.strokeStyle = '#8a6132';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
      ctx.beginPath();
      ctx.moveTo(c.x + 3, c.y + 3); ctx.lineTo(c.x + c.w - 3, c.y + c.h - 3);
      ctx.moveTo(c.x + c.w - 3, c.y + 3); ctx.lineTo(c.x + 3, c.y + c.h - 3);
      ctx.stroke();
    } else if (c.kind === 'bush') {
      ctx.fillStyle = 'rgba(46,125,50,0.92)';
      for (const [ox, oy, r] of [[-8, -6, 12], [8, -6, 12], [0, 6, 13], [-10, 6, 10], [10, 6, 10]]) {
        ctx.beginPath();
        ctx.arc(c.x + c.w / 2 + ox, c.y + c.h / 2 + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7fc97f';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2 - 4, c.y + c.h / 2 - 4, 4, 0, Math.PI * 2);
      ctx.arc(c.x + c.w / 2 + 7, c.y + c.h / 2 + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.kind === 'table') {
      ctx.fillStyle = '#4a3220';
      roundRect(ctx, c.x + 4, c.y + 4, c.w - 8, c.h - 8, 6);
      ctx.fill();
      ctx.fillStyle = '#7a5a35';
      ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, 6);
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(c.x + 12, c.y + 16, 16, 10);
    } else if (c.kind === 'pillar') {
      ctx.fillStyle = '#555a6a';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7d8398';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aab0c4';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Walls.
  for (const w of L.walls) {
    ctx.fillStyle = t.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(w.x, w.y, w.w, 4);
  }

  // Pebble throws in flight / landed pings.
  for (const p of state.pebblesFx) {
    ctx.fillStyle = '#cfd4de';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.ping) {
      ctx.strokeStyle = `rgba(255,215,106,${p.ping})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (1 - p.ping) * 90 + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Guards: vision cone first (under the guard), then the guard body.
  for (const g of state.guards) drawCone(ctx, g);
  for (const g of state.guards) drawGuard(ctx, g);

  drawPlayer(ctx, state);
}

function drawCone(ctx, g) {
  const color = STATE_COLOR[g.state] || STATE_COLOR.calm;
  ctx.save();
  ctx.globalAlpha = g.state === 'calm' ? 0.16 : g.state === 'suspicious' ? 0.24 : 0.32;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, CFG.viewDist, g.angle - CFG.viewHalfAngle, g.angle + CFG.viewHalfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Cone edge lines.
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle - CFG.viewHalfAngle) * CFG.viewDist, g.y + Math.sin(g.angle - CFG.viewHalfAngle) * CFG.viewDist);
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle + CFG.viewHalfAngle) * CFG.viewDist, g.y + Math.sin(g.angle + CFG.viewHalfAngle) * CFG.viewDist);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGuard(ctx, g) {
  const color = STATE_COLOR[g.state] || STATE_COLOR.calm;
  // Body: armoured guard, dark blue-grey with a red sash.
  ctx.fillStyle = '#2c3550';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Facing nose / helmet brim.
  ctx.fillStyle = '#c8cede';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle) * 12, g.y + Math.sin(g.angle) * 12, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle - 0.35) * 8, g.y + Math.sin(g.angle - 0.35) * 8, 2.2, 0, Math.PI * 2);
  ctx.arc(g.x + Math.cos(g.angle + 0.35) * 8, g.y + Math.sin(g.angle + 0.35) * 8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // "?" when suspicious, "!" when alert/chase.
  if (g.state === 'suspicious' || g.state === 'alert' || g.state === 'chase') {
    ctx.fillStyle = color;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.state === 'suspicious' ? '?' : '!', g.x, g.y - 22);
  }
  // Detection meter above the guard.
  if (g.meter > 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(g.x - 18, g.y - 34, 36, 6);
    ctx.fillStyle = g.meter > 75 ? '#ff2222' : g.meter > 40 ? '#ff9a3d' : '#ffd76a';
    ctx.fillRect(g.x - 17, g.y - 33, 34 * (g.meter / 100), 4);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const r = p.crouch ? 11 : 13;
  // Noise ring while moving (what guards can hear).
  if (p.moving) {
    const nr = p.running ? CFG.noiseRun : p.crouch ? CFG.noiseCrouch : CFG.noiseWalk;
    ctx.strokeStyle = p.running ? 'rgba(255,80,80,0.35)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, nr * (0.85 + 0.15 * Math.sin(state.time * 8)), 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow cloak: dark hooded figure, smaller when crouched.
  ctx.save();
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.fillStyle = p.inBush ? '#1d3a24' : '#191a24';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#8affd4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Hood point in facing direction.
  ctx.fillStyle = '#8affd4';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * (r + 2), p.y + Math.sin(p.dir) * (r + 2), 4, 0, Math.PI * 2);
  ctx.fill();
  if (p.crouch) {
    ctx.fillStyle = '#8affd4';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CROUCH', p.x, p.y - r - 8);
  }
}

// ---------------------------------------------------------------- HUD ------
export function drawHUD(ctx, state) {
  const maxMeter = state.guards.reduce((m, g) => Math.max(m, g.meter), 0);
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(8,10,16,0.82)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SHADOW STEP  ·  Level ${state.levelIndex + 1}/6 — ${state.level.name}`, 14, 24);
  // Objective.
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#ffd76a';
  const obj = !state.hasKey ? 'Find the KEY, unlock the door' : 'Reach the EXIT unseen';
  ctx.fillText(obj, 430, 24);
  // Detection eye meter.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('👁', 700, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(724, 16, 110, 14);
  ctx.fillStyle = maxMeter > 75 ? '#ff2222' : maxMeter > 40 ? '#ff9a3d' : '#ffd76a';
  ctx.fillRect(725, 17, 108 * (maxMeter / 100), 12);
  // Alarms left.
  ctx.fillStyle = '#fff';
  ctx.fillText('🔔'.repeat(Math.max(0, CFG.alarmMax - state.alarms)) + '·'.repeat(state.alarms), 850, 24);
  // Key / pebbles / scrolls.
  ctx.fillStyle = state.hasKey ? '#ffd76a' : '#888';
  ctx.fillText(state.hasKey ? '🗝 KEY' : '🗝 —', 960, 24);
  ctx.fillStyle = '#fff';
  ctx.fillText(`🪨 ${state.pebbles}`, 1030, 24);
  ctx.fillText(`📜 ${state.scrollsGot}/${state.level.scrolls.length}`, 1090, 24);
  // Noise indicator.
  const noise = state.player.running ? 'NOISY!' : state.player.crouch ? 'silent' : state.player.moving ? 'quiet' : 'still';
  ctx.fillStyle = state.player.running ? '#ff6a6a' : '#9fe8b0';
  ctx.fillText(`🔊 ${noise}`, 1170, 24);
  // Bottom-left: timer + score.
  ctx.fillStyle = 'rgba(8,10,16,0.7)';
  ctx.fillRect(0, H - 34, 250, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`⏱ ${fmtTime(state.levelTime)}   ★ ${state.score}`, 12, H - 17);
  // Toast message.
  if (state.toast && state.toastT > 0) {
    ctx.font = 'bold 18px sans-serif';
    const tw = ctx.measureText(state.toast).width + 28;
    ctx.fillStyle = 'rgba(8,10,16,0.85)';
    roundRect(ctx, (W - tw) / 2, 58, tw, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, W / 2, 77);
  }
  ctx.restore();
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlay(ctx, title, lines, accent = '#ffd76a') {
  ctx.fillStyle = 'rgba(5,7,12,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 110);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 - 50 + i * 34));
}

export function drawTitle(ctx, state) {
  // Draw level 1 as a dim backdrop.
  drawWorld(ctx, state);
  ctx.fillStyle = 'rgba(5,7,12,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SHADOW STEP', W / 2, 190);
  ctx.fillStyle = '#8affd4';
  ctx.font = '22px sans-serif';
  ctx.fillText('Slip past the guards. Take the ancient manuscripts. Reach the exit unseen.', W / 2, 240);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  const rows = [
    'WASD / Arrows — move      Shift — run (loud!)      C — crouch (quiet, hard to see)',
    'Space or Click — throw a pebble to lure guards      E — pick up / interact',
    'R — restart level      M — mute      Esc — pause',
    '',
    '6 levels: Museum · Temple · Warehouse · Archive Office · Palace Garden · Vault Room',
    `Best rank so far: ${state.bestRank || '—'}      Best score: ${state.bestScore || 0}`,
  ];
  rows.forEach((r, i) => ctx.fillText(r, W / 2, 300 + i * 30));
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(state.startedOnce ? 'Press ENTER to continue' : 'Press ENTER to begin', W / 2, 540);
  ctx.fillStyle = '#aaa';
  ctx.font = '15px sans-serif';
  ctx.fillText('A top-down stealth game — all art drawn procedurally, all sound synthesized.', W / 2, 580);
}

export function drawPause(ctx, state) {
  drawWorld(ctx, state);
  drawHUD(ctx, state);
  overlay(ctx, 'PAUSED', [
    `Level ${state.levelIndex + 1} — ${state.level.name}`,
    'Press Esc to resume, or R to restart the level',
    'M — mute sound',
  ]);
}

export function drawLevelComplete(ctx, state) {
  drawWorld(ctx, state);
  overlay(ctx, `${state.rank} — LEVEL CLEAR!`, [
    `Level ${state.levelIndex + 1} — ${state.level.name}`,
    `Time ${fmtTime(state.levelTime)}   ·   Scrolls ${state.scrollsGot}/${state.level.scrolls.length}   ·   Seen ${state.spotted}x`,
    `Level score: ${state.levelScore}      Total score: ${state.score}`,
    '',
    'Press ENTER for the next level',
  ], state.rank === 'Ghost' ? '#8affd4' : '#ffd76a');
}

export function drawFailed(ctx, state) {
  drawWorld(ctx, state);
  overlay(ctx, 'CAUGHT!', [
    'Three alarms — the guards found you.',
    `Level ${state.levelIndex + 1} — ${state.level.name}`,
    '',
    'Press R or ENTER to retry the level',
  ], '#ff4d4d');
}

export function drawGameComplete(ctx, state) {
  ctx.fillStyle = '#0b0d16';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8affd4';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('MASTER OF SHADOWS', W / 2, 130);
  ctx.fillStyle = '#ffd76a';
  ctx.font = '22px sans-serif';
  ctx.fillText('All six manuscripts recovered. The archives never saw you coming.', W / 2, 180);
  ctx.fillStyle = '#fff';
  ctx.font = '19px sans-serif';
  state.ranks.forEach((r, i) => {
    ctx.fillText(`${i + 1}. ${state.levelNames[i]} — ${r.rank}  ·  ${fmtTime(r.time)}  ·  ${r.score} pts`, W / 2, 240 + i * 32);
  });
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`TOTAL SCORE: ${state.score}`, W / 2, 470);
  ctx.fillStyle = '#aaa';
  ctx.font = '16px sans-serif';
  ctx.fillText('Press ENTER to play again from Level 1', W / 2, 520);
}
