// Small geometry helpers: distances, angles, segment intersection and
// line-of-sight against rectangular blockers. Pure functions, no game state.

export function dist(ax, ay, bx, by) {
  const dx = bx - ax; const dy = by - ay;
  return Math.hypot(dx, dy);
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }

/** Smallest signed difference between two angles, in (-pi, pi]. */
export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
export function circleHitsRect(x, y, rad, r) {
  const nx = clamp(x, r.x, r.x + r.w);
  const ny = clamp(y, r.y, r.y + r.h);
  return dist(x, y, nx, ny) < rad;
}

/** Segment-segment intersection test (proper crossing or touching). */
function segSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Does segment a-b cross any edge of rect r? */
function segHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const rx2 = r.x + r.w; const ry2 = r.y + r.h;
  return segSeg(x1, y1, x2, y2, r.x, r.y, rx2, r.y)
    || segSeg(x1, y1, x2, y2, rx2, r.y, rx2, ry2)
    || segSeg(x1, y1, x2, y2, rx2, ry2, r.x, ry2)
    || segSeg(x1, y1, x2, y2, r.x, ry2, r.x, r.y);
}

/** True when nothing in blockers stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (segHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

/** Move a circle out of every rect it overlaps; returns corrected [x, y]. */
export function resolveCollisions(x, y, rad, solids) {
  for (let pass = 0; pass < 2; pass++) {
    for (const r of solids) {
      if (!circleHitsRect(x, y, rad, r)) continue;
      const nx = clamp(x, r.x, r.x + r.w);
      const ny = clamp(y, r.y, r.y + r.h);
      let dx = x - nx; let dy = y - ny;
      let d = Math.hypot(dx, dy);
      if (d === 0) {
        // Centre inside the rect: push out along the shallowest axis.
        const left = x - r.x; const right = r.x + r.w - x;
        const top = y - r.y; const bot = r.y + r.h - y;
        const m = Math.min(left, right, top, bot);
        if (m === left) x = r.x - rad; else if (m === right) x = r.x + r.w + rad;
        else if (m === top) y = r.y - rad; else y = r.y + r.h + rad;
        continue;
      }
      dx /= d; dy /= d;
      x = nx + dx * rad; y = ny + dy * rad;
    }
  }
  return [x, y];
}
