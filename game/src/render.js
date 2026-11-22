// Canvas renderer: floor, shadows, walls, crates, gems, exit, vision cones,
// noise rings, actors, HUD and the title / pause / clear / caught screens.
import { HUD_H, VIEW_H, VIEW_W, VISION_HALF_ANGLE, VISION_RANGE, WORLD_H } from './config.js';
import { guardColour } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

function conePath(ctx, g, blockers) {
  // Fan the cone with rays so walls visibly cut it.
  const steps = 22;
  ctx.beginPath(); ctx.moveTo(g.x, g.y + HUD_H);
  for (let i = 0; i <= steps; i++) {
    const a = g.angle - VISION_HALF_ANGLE + (2 * VISION_HALF_ANGLE * i) / steps;
    let r = VISION_RANGE;
    // March the ray until a blocker or full range.
    for (let t = 12; t < VISION_RANGE; t += 12) {
      const px = g.x + Math.cos(a) * t; const py = g.y + Math.sin(a) * t;
      let hit = false;
      for (const b of blockers) { if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) { hit = true; break; } }
      if (hit) { r = t; break; }
    }
    ctx.lineTo(g.x + Math.cos(a) * r, g.y + HUD_H + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function drawWorld(s) {
    ctx.fillStyle = '#1b2130'; ctx.fillRect(0, HUD_H, VIEW_W, WORLD_H);
    // Floor tiles.
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW_W; x += 64) { ctx.beginPath(); ctx.moveTo(x, HUD_H); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
    for (let y = 0; y <= WORLD_H; y += 64) { ctx.beginPath(); ctx.moveTo(0, HUD_H + y); ctx.lineTo(VIEW_W, HUD_H + y); ctx.stroke(); }
    const L = s.level;
    // Shadow pools.
    for (const r of L.shadows) { ctx.fillStyle = 'rgba(8,12,26,0.78)'; ctx.fillRect(r.x, r.y + HUD_H, r.w, r.h); ctx.strokeStyle = 'rgba(90,140,255,0.25)'; ctx.strokeRect(r.x + 0.5, r.y + HUD_H + 0.5, r.w, r.h); }
    // Exit.
    const open = s.gemsLeft === 0;
    ctx.fillStyle = open ? '#1f7a4d' : '#3a2330'; ctx.fillRect(L.exit.x, L.exit.y + HUD_H, L.exit.w, L.exit.h);
    ctx.strokeStyle = open ? '#4dff9d' : '#7a4458'; ctx.lineWidth = 3; ctx.strokeRect(L.exit.x, L.exit.y + HUD_H, L.exit.w, L.exit.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'EXIT 🔒', L.exit.x + L.exit.w / 2, L.exit.y + HUD_H + L.exit.h / 2 + 5);
    // Gems.
    for (const gem of s.gems) {
      if (gem.taken) continue;
      ctx.save(); ctx.translate(gem.x, gem.y + HUD_H); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#39d5ff'; ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = '#b8f2ff'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    }
    // Crates then walls.
    for (const r of L.crates) { ctx.fillStyle = '#8a6a3b'; ctx.fillRect(r.x, r.y + HUD_H, r.w, r.h); ctx.strokeStyle = '#5d4525'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + HUD_H + 1, r.w - 2, r.h - 2); ctx.beginPath(); ctx.moveTo(r.x, r.y + HUD_H); ctx.lineTo(r.x + r.w, r.y + HUD_H + r.h); ctx.moveTo(r.x + r.w, r.y + HUD_H); ctx.lineTo(r.x, r.y + HUD_H + r.h); ctx.stroke(); }
    for (const r of L.walls) { ctx.fillStyle = '#4a5468'; ctx.fillRect(r.x, r.y + HUD_H, r.w, r.h); ctx.fillStyle = '#5d6b84'; ctx.fillRect(r.x, r.y + HUD_H, r.w, 3); }
    // Vision cones under actors.
    for (const g of s.guards) {
      conePath(ctx, g, s.blockers);
      // Chasing cones read stronger than calm ones at screenshot size.
      ctx.fillStyle = guardColour(g) + (g.alert >= 100 ? '4a' : g.alert >= 30 ? '38' : '2e'); ctx.fill();
    }
    // Coin distraction.
    if (s.coin) {
      ctx.strokeStyle = 'rgba(255,215,80,0.7)'; ctx.beginPath(); ctx.arc(s.coin.x, s.coin.y + HUD_H, 10 + 26 * (1 - s.coin.ttl / 3), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(s.coin.x, s.coin.y + HUD_H, 6, 0, Math.PI * 2); ctx.fill();
    }
    // Sprint noise ring.
    if (s.player.noise > 0 && s.screen === SCREEN_PLAY) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(s.player.x, s.player.y + HUD_H, s.player.noise, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // Guards.
    for (const g of s.guards) {
      ctx.fillStyle = '#2e3444'; ctx.beginPath(); ctx.arc(g.x, g.y + HUD_H, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = guardColour(g); ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = guardColour(g);
      ctx.beginPath(); ctx.arc(g.x + Math.cos(g.angle) * 8, g.y + HUD_H + Math.sin(g.angle) * 8, 4, 0, Math.PI * 2); ctx.fill();
      // Alert bar / bang.
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(g.x - 16, g.y + HUD_H - 30, 32, 6);
      ctx.fillStyle = guardColour(g); ctx.fillRect(g.x - 16, g.y + HUD_H - 30, 32 * Math.min(1, g.alert / 100), 6);
      if (g.alert >= 100) { ctx.fillStyle = '#ff4747'; ctx.font = 'bold 20px system-ui'; ctx.fillText('!', g.x, g.y + HUD_H - 36); }
      else if (g.alert >= 30) { ctx.fillStyle = '#ff9f2e'; ctx.font = 'bold 17px system-ui'; ctx.fillText('?', g.x, g.y + HUD_H - 36); }
    }
    // Player: hooded thief, brighter ring when crouched, dimmer in shadow.
    const p = s.player;
    ctx.fillStyle = p.inShadow ? '#6f7f9f' : '#aebadd'; ctx.beginPath(); ctx.arc(p.x, p.y + HUD_H, p.crouching ? 11 : 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#232a3d'; ctx.beginPath(); ctx.arc(p.x, p.y + HUD_H - 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#39d5ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y + HUD_H, p.crouching ? 14 : 16, 0, Math.PI * 2); ctx.stroke();
  }
  function drawHUD(s) {
    ctx.fillStyle = '#10141f'; ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('◆ SHADOW VAULT', 16, 35);
    ctx.fillStyle = '#e8ecf5'; ctx.font = '16px system-ui';
    ctx.fillText(s.level.name, 230, 35);
    ctx.fillText(`💎 ${s.gemsTaken}/${s.gemsTotal}`, 620, 35);
    ctx.fillText(`🪙 × ${s.coins}`, 730, 35);
    ctx.fillText(`Score ${s.score}`, 850, 35);
    ctx.fillText(`⏱ ${Math.floor(s.time)}s`, 990, 35);
    const danger = s.guards.some((g) => g.alert >= 100) ? '🔴 CHASE!' : s.guards.some((g) => g.alert >= 30) ? '🟠 SUSPICIOUS' : '🟢 UNSEEN';
    ctx.fillStyle = '#fff'; ctx.fillText(danger, 1090, 35);
    if (s.level.tip && s.time < 9 && s.screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(10,14,24,0.82)'; ctx.fillRect(240, HUD_H + 12, 800, 34);
      ctx.fillStyle = '#cfe0ff'; ctx.font = '15px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(s.level.tip, VIEW_W / 2, HUD_H + 34); ctx.textAlign = 'left';
    }
  }
  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(5,8,16,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = accent; ctx.font = 'bold 54px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, 250);
    ctx.fillStyle = '#e8ecf5'; ctx.font = '21px system-ui';
    lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 320 + i * 34));
    ctx.textAlign = 'left';
  }
  return {
    draw(s) {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      drawWorld(s); drawHUD(s);
      if (s.screen === SCREEN_TITLE) panel('SHADOW VAULT', ['A top-down stealth heist in three floors.', 'WASD / Arrows move · C crouch · Shift sprint (loud)', 'Click anywhere to throw a coin and lure a guard', 'Steal every gem ◆, then escape through the EXIT', '', 'Press Enter or click to begin'], '#ffd94d');
      else if (s.screen === SCREEN_PAUSED) panel('PAUSED', ['Press P / Esc or Enter to resume'], '#9fb6dd');
      else if (s.screen === SCREEN_CAUGHT) panel('CAUGHT!', [`The guards got you on ${s.level.name}.`, `Score ${s.score} · Gems ${s.gemsTaken}/${s.gemsTotal}`, '', 'Press R or Enter to try this floor again'], '#ff4747');
      else if (s.screen === SCREEN_CLEAR) panel('FLOOR CLEARED!', s.clearLines, '#4dff9d');
      else if (s.screen === SCREEN_WIN) panel('VAULT EMPTIED — YOU WIN!', [...s.clearLines, '', 'Press Enter to play again'], '#ffd94d');
    },
  };
}
