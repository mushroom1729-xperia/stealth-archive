// Archive wardens: waypoint patrols they walk on a learnable rhythm, ears for
// the courier's running footsteps, and a suspicion meter that fills while they
// see you — fastest up close and in lamplight — and drains once you break away.
// A suspecting warden halts and stares; only a full meter catches you.

import { VIEW_RANGE, sightOf, inLight } from './vision.js';
import { moveCircle } from './player.js';
import { WORLD_W, WORLD_H } from './levels.js';

const GUARD_SPEED = 86;
const HEAR_RADIUS = 150;
const WAYPOINT_PAUSE = 0.7;
const SCAN_PAUSE = 1.5;
const STARE_ENTER = 0.15;
const STARE_EXIT = 0.1;
const DRAIN_PER_SEC = 0.7;
const SPOT_GRACE = 0.35; // seconds of half-speed filling at the start of a sighting
const GRACE_RATE_MUL = 0.4; // so a cone grazing you can still be slipped

export class Guard {
  constructor(spec) {
    this.x = spec.x;
    this.y = spec.y;
    this.r = 11;
    this.waypoints = spec.waypoints.map((p) => p.slice());
    this.wp = 0;
    this.speed = spec.speed ?? GUARD_SPEED;
    this.dir = Math.atan2(this.waypoints[0][1] - this.y, this.waypoints[0][0] - this.x);
    this.state = 'patrol'; // patrol | investigate | stare
    this.wait = 0;
    this.scanDir = 0;
    this.investigate = null;
    this.investigateCooldown = 0;
    this.meter = 0;
    this.seen = false;
    this.wasSeen = false;
    this.spotGrace = 0;
    this.sightDist = Infinity;
    this.sightRange = VIEW_RANGE;
    this.alertFlash = 0;
    this.walkPhase = 0;
    this.stuck = 0;
    this.lastX = this.x;
    this.lastY = this.y;
  }

  /**
   * One step of warden behaviour.
   * fx = { noises, spotted(guard), caught(guard), guardStep(gain) };
   * pass playerActive = false to let guards patrol while nobody plays.
   */
  update(dt, world, lamps, player, fx, playerActive) {
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    this.investigateCooldown = Math.max(0, this.investigateCooldown - dt);

    // Sight.
    const s = playerActive ? sightOf(world, lamps, this, player) : null;
    this.seen = !!(s && s.seen);
    this.sightDist = s ? s.dist : Infinity;
    this.sightRange = s ? s.range : VIEW_RANGE;

    // Hearing: running near a warden sends them to look.
    if (playerActive && this.state !== 'stare') {
      for (const n of fx.noises) {
        if (this.investigateCooldown > 0) break;
        if (Math.hypot(n.x - this.x, n.y - this.y) < HEAR_RADIUS) {
          this.state = 'investigate';
          this.investigate = { x: n.x, y: n.y };
          this.wait = 0;
        }
      }
    }

    // Suspicion: fills while seen, drains while not. The first beat of any new
    // sighting fills at half rate, so a cone that merely grazes you can be slipped;
    // stay in it and the meter closes fast.
    if (this.seen) {
      if (!this.wasSeen) this.spotGrace = SPOT_GRACE;
      const near = Math.max(0, 1 - this.sightDist / this.sightRange);
      const proximity = 1 + 2 * Math.pow(near, 1.4);
      const light = inLight(lamps, player.x, player.y) ? 1.9 : 0.75;
      const graceMul = this.spotGrace > 0 ? GRACE_RATE_MUL : 1;
      const before = this.meter;
      this.meter = Math.min(1, this.meter + 1.35 * proximity * light * graceMul * dt);
      if (before < 0.02) {
        this.alertFlash = 0.9;
        fx.spotted(this);
      }
    } else {
      this.meter = Math.max(0, this.meter - DRAIN_PER_SEC * dt);
    }
    this.spotGrace = Math.max(0, this.spotGrace - dt);
    this.wasSeen = this.seen;
    if (this.meter >= 1) {
      fx.caught(this);
      return;
    }

    // Behaviour.
    if (this.seen && this.meter > STARE_ENTER) {
      this.state = 'stare';
    } else if (this.state === 'stare' && this.meter <= STARE_EXIT) {
      this.state = 'patrol';
    }

    if (this.state === 'stare') {
      this.faceToward(player.x, player.y, dt * 6);
    } else if (this.state === 'investigate') {
      this.walkInvestigating(dt, rectsOf(world));
    } else {
      this.walkPatrol(dt, rectsOf(world));
    }

    // Footsteps: soft thuds that swell as the warden nears the courier.
    const moved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    this.walkPhase += moved;
    if (this.walkPhase > 27) {
      this.walkPhase = 0;
      const d = playerActive ? Math.hypot(player.x - this.x, player.y - this.y) : Infinity;
      fx.guardStep(Math.pow(Math.max(0, 1 - d / 460), 1.7) * 0.5);
    }
    this.lastX = this.x;
    this.lastY = this.y;
  }

  faceToward(x, y, turn) {
    const target = Math.atan2(y - this.y, x - this.x);
    let diff = target - this.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.dir += Math.max(-turn, Math.min(turn, diff));
  }

  walkInvestigating(dt, rects) {
    const t = this.investigate;
    if (this.wait > 0) {
      this.wait -= dt;
      this.scanDir += dt * 1.6;
      this.dir += Math.sin(this.scanDir) * dt * 1.1;
      if (this.wait <= 0) {
        this.state = 'patrol';
        this.investigate = null;
        this.investigateCooldown = 3;
      }
      return;
    }
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      this.wait = SCAN_PAUSE;
      return;
    }
    this.stepToward(dx / dist, dy / dist, this.speed * 1.15, dt, rects);
  }

  walkPatrol(dt, rects) {
    const target = this.waypoints[this.wp];
    const dx = target[0] - this.x;
    const dy = target[1] - this.y;
    const dist = Math.hypot(dx, dy);
    if (this.wait > 0) {
      this.wait -= dt;
      this.scanDir += dt * 1.4;
      this.dir += Math.sin(this.scanDir) * dt * 0.9;
      if (this.wait <= 0) this.wp = (this.wp + 1) % this.waypoints.length;
      return;
    }
    if (dist < 6) {
      this.wait = WAYPOINT_PAUSE;
      return;
    }
    this.stepToward(dx / dist, dy / dist, this.speed, dt, rects);
  }

  stepToward(ux, uy, speed, dt, rects) {
    const next = moveCircle(this.x, this.y, this.r, ux * speed * dt, uy * speed * dt, rects);
    this.x = Math.max(this.r, Math.min(WORLD_W - this.r, next.x));
    this.y = Math.max(this.r, Math.min(WORLD_H - this.r, next.y));
    this.faceToward(this.x + ux, this.y + uy, dt * 5);
    // A blocked path should never trap a warden: skip ahead instead.
    if (Math.hypot(this.x - this.lastX, this.y - this.lastY) < 0.4) {
      this.stuck += dt;
      if (this.stuck > 1.5) {
        this.stuck = 0;
        this.wp = (this.wp + 1) % this.waypoints.length;
        if (this.state === 'investigate') {
          this.state = 'patrol';
          this.investigate = null;
          this.investigateCooldown = 3;
        }
      }
    } else {
      this.stuck = 0;
    }
  }
}

function rectsOf(world) {
  return world.walls.concat(world.crates);
}
