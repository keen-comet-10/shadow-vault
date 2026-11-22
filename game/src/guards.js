// Guard brains: patrol waypoints, investigate distractions, chase the
// player. Vision is a real cone with line-of-sight; hearing reacts to
// sprint noise and thrown coins. Alert builds while the player is seen
// (slower in shadow, slower crouched, faster up close) and decays unseen.
import {
  ALERT_CHASE, ALERT_DECAY, ALERT_SEEN_RATE, ALERT_SUSPICIOUS, CATCH_DIST,
  GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED, GUARD_PATROL_SPEED,
  HEARING_RANGE, VISION_HALF_ANGLE, VISION_RANGE,
} from './config.js';
import { angleDiff, angleTo, dist, hasLineOfSight, resolveCollisions } from './geometry.js';

export function createGuard(def, index) {
  const first = def.patrol[0];
  return {
    x: first[0], y: first[1], angle: index * 1.3,
    patrol: def.patrol, wp: 1 % def.patrol.length,
    alert: 0, state: 'patrol', // patrol | investigate | chase | search
    target: null, wait: 0, seenPlayer: false, lastKnown: null,
  };
}

/** Can this guard see the player right now? Returns 0..1 strength or 0. */
export function visionStrength(g, player, blockers) {
  const d = dist(g.x, g.y, player.x, player.y);
  if (d > VISION_RANGE) return 0;
  const ang = angleTo(g.x, g.y, player.x, player.y);
  if (Math.abs(angleDiff(ang, g.angle)) > VISION_HALF_ANGLE && d > 34) return 0;
  if (!hasLineOfSight(g.x, g.y, player.x, player.y, blockers)) return 0;
  let s = 1 - d / (VISION_RANGE * 1.25);
  if (player.inShadow) s *= 0.32;
  if (player.crouching) s *= 0.55;
  return Math.max(0.08, s);
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 4) return true;
  const a = angleTo(g.x, g.y, tx, ty);
  // Turn smoothly toward travel direction.
  g.angle += angleDiff(a, g.angle) * Math.min(1, dt * 7);
  const nx = g.x + Math.cos(a) * speed * dt;
  const ny = g.y + Math.sin(a) * speed * dt;
  const [rx, ry] = resolveCollisions(nx, ny, 14, solids);
  g.x = rx; g.y = ry;
  return d < 16;
}

export function updateGuard(g, dt, world) {
  const { player, blockers, solids } = world;
  const seen = visionStrength(g, player, blockers);
  g.seenPlayer = seen > 0;
  if (seen > 0) {
    g.alert = Math.min(ALERT_CHASE, g.alert + ALERT_SEEN_RATE * seen * dt * 2.2);
    g.lastKnown = { x: player.x, y: player.y };
    if (g.alert >= ALERT_CHASE && world.onSpotted) world.onSpotted(g);
  } else {
    // A guard who already gave up the chase (searching) calms down faster,
    // so breaking line of sight is a real escape, not a timer tax.
    const decay = g.state === 'search' ? ALERT_DECAY * 1.9 : ALERT_DECAY;
    g.alert = Math.max(0, g.alert - decay * dt);
  }
  // Hearing: sprinting near a calm guard draws a look; a coin pulls harder.
  if (player.noise > 0 && dist(g.x, g.y, player.x, player.y) < player.noise + 30 && g.state === 'patrol') {
    g.state = 'investigate'; g.target = { x: player.x, y: player.y }; g.wait = 1.2;
    g.alert = Math.max(g.alert, ALERT_SUSPICIOUS + 6);
  }
  if (world.coin && dist(g.x, g.y, world.coin.x, world.coin.y) < HEARING_RANGE && !world.coin.consumedBy.includes(g)) {
    world.coin.consumedBy.push(g);
    g.state = 'investigate'; g.target = { x: world.coin.x, y: world.coin.y }; g.wait = 2.4;
    g.alert = Math.max(g.alert, ALERT_SUSPICIOUS + 4);
  }

  if (g.alert >= ALERT_CHASE) g.state = 'chase';
  else if (g.state === 'chase') { g.state = 'search'; g.target = g.lastKnown; g.wait = 2.6; }

  if (g.state === 'chase') {
    const tgt = seen > 0 ? player : (g.lastKnown || player);
    moveToward(g, tgt.x, tgt.y, GUARD_CHASE_SPEED, dt, solids);
    if (dist(g.x, g.y, player.x, player.y) < CATCH_DIST) world.caught = true;
  } else if (g.state === 'investigate' || g.state === 'search') {
    if (g.target && moveToward(g, g.target.x, g.target.y, GUARD_INVESTIGATE_SPEED, dt, solids)) {
      g.wait -= dt;
      g.angle += dt * 1.8; // look around
      if (g.wait <= 0) { g.state = 'patrol'; g.target = null; }
    }
  } else {
    const wp = g.patrol[g.wp];
    if (moveToward(g, wp[0], wp[1], GUARD_PATROL_SPEED, dt, solids)) {
      g.wp = (g.wp + 1) % g.patrol.length;
    }
  }
  return g;
}

export function guardColour(g) {
  if (g.alert >= ALERT_CHASE) return '#ff4747';
  if (g.alert >= ALERT_SUSPICIOUS) return '#ff9f2e';
  return '#ffd94d';
}
