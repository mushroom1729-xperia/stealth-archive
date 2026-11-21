// The courier: keyboard movement, sneaking, footstep sounds, and the noise rings
// running makes. Also home of the shared circle-vs-rect collision both actors use.

import { WORLD_W, WORLD_H } from './levels.js';

/** Whether a circle at x,y with radius r overlaps the rect. */
export function circleOverlaps(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const ddx = x - cx;
  const ddy = y - cy;
  return ddx * ddx + ddy * ddy < r * r;
}

function circleHitsAny(x, y, r, rects) {
  for (const rect of rects) {
    if (circleOverlaps(x, y, r, rect)) return true;
  }
  return false;
}

/** Axis-separated circle movement against rects: slide along walls, never through. */
export function moveCircle(x, y, r, dx, dy, rects) {
  let nx = x + dx;
  if (circleHitsAny(nx, y, r, rects)) nx = x;
  let ny = y + dy;
  if (circleHitsAny(nx, ny, r, rects)) ny = y;
  return { x: nx, y: ny };
}

const WALK_SPEED = 150;
const SNEAK_SPEED = 74;

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.r = spawn.r ?? 11;
    this.dir = 0;
    this.moving = false;
    this.sneaking = false;
    this.noiseTimer = 0.3;
    this.stepPhase = 0;
  }

  /**
   * One step of movement. fx = { makeNoise(x, y), playerStep(gain) }.
   * Running (any movement without Shift) rings the air every 0.55s; sneaking is silent.
   */
  update(dt, input, rects, fx) {
    const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = ix !== 0 || iy !== 0;
    this.sneaking = !!input.sneak;
    if (!this.moving) {
      this.noiseTimer = Math.min(this.noiseTimer, 0.3);
      return;
    }
    const len = Math.hypot(ix, iy);
    const ux = ix / len;
    const uy = iy / len;
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const next = moveCircle(this.x, this.y, this.r, ux * speed * dt, uy * speed * dt, rects);
    this.x = Math.max(this.r, Math.min(WORLD_W - this.r, next.x));
    this.y = Math.max(this.r, Math.min(WORLD_H - this.r, next.y));
    this.dir = Math.atan2(uy, ux);
    if (this.sneaking) {
      this.noiseTimer = Math.min(this.noiseTimer, 0.3);
    } else {
      this.noiseTimer -= dt;
      if (this.noiseTimer <= 0) {
        this.noiseTimer = 0.55;
        fx.makeNoise(this.x, this.y);
      }
    }
    this.stepPhase += speed * dt;
    if (this.stepPhase > 30) {
      this.stepPhase = 0;
      fx.playerStep(this.sneaking ? 0.05 : 0.13);
    }
  }
}
