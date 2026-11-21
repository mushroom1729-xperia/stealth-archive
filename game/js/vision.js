// Sight geometry for the archive: line of sight against walls and crates, the
// ray-cast that clips a warden's vision cone, and whether a point stands in
// lamplight. Everything here is pure — no DOM, no canvas.

export const FOV_HALF = Math.PI * 0.36; // a warden sees a ~65 degree fan
export const VIEW_RANGE = 220; // sight distance in lamplight
export const SHADOW_RANGE_MUL = 0.58; // sight distance once the target is in shadow

/** Whether the segment p1->p2 crosses the rect's interior. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Distance along the ray (unit direction) to the first rect hit, capped at maxDist. */
export function rayDist(x, y, ang, maxDist, rects) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let best = maxDist;
  for (const r of rects) {
    let tmin = -Infinity;
    let tmax = Infinity;
    if (dx !== 0) {
      let t1 = (r.x - x) / dx;
      let t2 = (r.x + r.w - x) / dx;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (x < r.x || x > r.x + r.w) {
      continue;
    }
    if (dy !== 0) {
      let t1 = (r.y - y) / dy;
      let t2 = (r.y + r.h - y) / dy;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (y < r.y || y > r.y + r.h) {
      continue;
    }
    if (tmax < 0 || tmax < tmin) continue;
    const t = tmin > 0 ? tmin : 0;
    if (t < best) best = t;
  }
  return best;
}

/** True when the point sits inside any lamp's pool of light. */
export function inLight(lamps, x, y) {
  for (const lamp of lamps) {
    const ddx = x - lamp.x;
    const ddy = y - lamp.y;
    const rr = lamp.r * 0.92;
    if (ddx * ddx + ddy * ddy < rr * rr) return true;
  }
  return false;
}

/** Whether sight is blocked by any wall or crate between two points. */
export function losClear(world, x1, y1, x2, y2) {
  for (const rect of world.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  for (const rect of world.crates) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

/** All the rects that block sight. */
export function sightRects(world) {
  return world.walls.concat(world.crates);
}

/** What a warden perceives of the courier: seen?, how far, and the range that applied. */
export function sightOf(world, lamps, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const lit = inLight(lamps, player.x, player.y);
  const range = VIEW_RANGE * (lit ? 1 : SHADOW_RANGE_MUL);
  const out = { seen: false, dist, range };
  if (dist > range) return out;
  const ang = Math.atan2(dy, dx);
  let diff = ang - guard.dir;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > FOV_HALF) return out;
  if (!losClear(world, guard.x, guard.y, player.x, player.y)) return out;
  out.seen = true;
  return out;
}

/** The cone polygon a warden's fan of rays traces against the walls, for drawing. */
export function conePoints(world, x, y, dir, range, rays = 26, half = FOV_HALF) {
  const rects = sightRects(world);
  const pts = [x, y];
  for (let i = 0; i <= rays; i++) {
    const ang = dir - half + (2 * half * i) / rays;
    const d = rayDist(x, y, ang, range, rects);
    pts.push(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
  }
  return pts;
}
