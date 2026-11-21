// All drawing for the archive, onto one canvas: the dark blue-grey floor, warm
// amber lamp pools cut out of the darkness, walls and wooden crates, warden
// sight cones tinted by suspicion, the two actors, the glowing green exit, and
// the brief marks — noise rings, "!", level titles, the caught flash.

import { WORLD_W, WORLD_H, WALL_T } from './levels.js';
import { VIEW_RANGE, conePoints } from './vision.js';

const SUS_LOW = { r: 242, g: 226, b: 150 }; // pale yellow — routine
const SUS_MID = { r: 244, g: 158, b: 64 }; // orange — interested
const SUS_HIGH = { r: 235, g: 72, b: 72 }; // red — about to catch you

/** Yellow -> orange -> red as suspicion v (0..1) climbs. */
function suspicionColor(v) {
  const mix = (a, b, t) => ({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  });
  return v < 0.5 ? mix(SUS_LOW, SUS_MID, v * 2) : mix(SUS_MID, SUS_HIGH, (v - 0.5) * 2);
}

const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

export class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    const v = this.ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.42, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.72);
    v.addColorStop(0, 'rgba(5,8,14,0)');
    v.addColorStop(1, 'rgba(5,8,14,0.55)');
    this.vignette = v;
  }

  draw(g) {
    const ctx = this.ctx;
    this.level = g.level;
    this.floor();
    this.darkness(g.time);
    this.exitDoor(g.time);
    for (const w of this.level.walls) this.wall(w);
    for (const c of this.level.crates) this.crate(c);
    for (const gu of g.guards) this.cone(gu);
    for (const ring of g.rings) this.ring(ring);
    for (const gu of g.guards) this.guard(gu);
    if (g.state !== 'title') this.player(g.player);
    this.feedback(g);
  }

  floor() {
    const ctx = this.ctx;
    ctx.fillStyle = '#272f3d';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = 'rgba(148,166,198,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 48; x < WORLD_W; x += 48) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, WORLD_H);
    }
    for (let y = 48; y < WORLD_H; y += 48) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(WORLD_W, y + 0.5);
    }
    ctx.stroke();
  }

  darkness(time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(7,10,18,0.55)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.globalCompositeOperation = 'destination-out';
    for (const lamp of this.level.lamps) {
      const rr = lamp.r * 1.35;
      const grad = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, rr);
      grad.addColorStop(0, 'rgba(0,0,0,0.95)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const lamp of this.level.lamps) {
      const grad = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.r);
      grad.addColorStop(0, 'rgba(255,176,84,0.20)');
      grad.addColorStop(1, 'rgba(255,176,84,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      ctx.fill();
      const flick = 0.75 + 0.25 * Math.sin(time * 13 + lamp.x * 0.7);
      ctx.fillStyle = `rgba(255,214,140,${0.85 * flick})`;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  exitDoor(time) {
    const ctx = this.ctx;
    const e = this.level.exit;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const pulse = 0.72 + 0.28 * Math.sin(time * 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
    glow.addColorStop(0, `rgba(80,240,140,${0.30 * pulse})`);
    glow.addColorStop(1, 'rgba(80,240,140,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2fae68';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#7dffb1';
    const inset = 3;
    ctx.fillRect(e.x + inset, e.y + inset, Math.max(2, e.w - inset * 2), Math.max(2, e.h - inset * 2));
    ctx.strokeStyle = '#0f3d24';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
    ctx.fillStyle = '#9df0be';
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const horizontal = e.w > e.h;
    ctx.fillText('EXIT', cx, horizontal ? e.y + e.h + 12 : cy - Math.max(e.h / 2, 12) - 4);
  }

  wall(w) {
    const ctx = this.ctx;
    ctx.fillStyle = '#3b4457';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(w.x, w.y, w.w, 3);
    ctx.fillStyle = 'rgba(10,14,22,0.5)';
    ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
    ctx.strokeStyle = 'rgba(12,16,24,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }

  crate(c) {
    const ctx = this.ctx;
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#5f3c1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    ctx.strokeStyle = 'rgba(95,60,28,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x + 4, c.y + c.h / 3);
    ctx.lineTo(c.x + c.w - 4, c.y + c.h / 3);
    ctx.moveTo(c.x + 4, c.y + (2 * c.h) / 3);
    ctx.lineTo(c.x + c.w - 4, c.y + (2 * c.h) / 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + 2, c.y + 2);
    ctx.lineTo(c.x + c.w - 2, c.y + 2);
    ctx.stroke();
  }

  cone(gu) {
    const ctx = this.ctx;
    const v = Math.max(gu.meter, gu.seen ? 0.4 : 0, gu.state === 'investigate' ? 0.3 : 0);
    const c = suspicionColor(Math.min(1, v));
    const range = gu.state === 'stare' ? gu.sightRange : VIEW_RANGE;
    const pts = conePoints(this.level, gu.x, gu.y, gu.dir, range);
    const grad = ctx.createRadialGradient(gu.x, gu.y, 8, gu.x, gu.y, range);
    grad.addColorStop(0, rgba(c, 0.32));
    grad.addColorStop(0.45, rgba(c, 0.2));
    grad.addColorStop(0.8, rgba(c, 0.08));
    grad.addColorStop(1, rgba(c, 0.015));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(c, 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ring(ring) {
    const ctx = this.ctx;
    const a = Math.max(0, ring.life / ring.life0);
    ctx.strokeStyle = `rgba(190,220,255,${0.4 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  guard(gu) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(gu.x, gu.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8c2432';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a0e16';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#571722';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2e0b11';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(gu.dir) * 4, Math.sin(gu.dir) * 4);
    ctx.lineTo(Math.cos(gu.dir) * 11, Math.sin(gu.dir) * 11);
    ctx.stroke();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(Math.cos(gu.dir) * 3, Math.sin(gu.dir) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (gu.alertFlash > 0) {
      const a = Math.min(1, gu.alertFlash / 0.9);
      ctx.fillStyle = `rgba(255,120,60,${a})`;
      ctx.font = '700 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -18 - (1 - a) * 6);
    }
    ctx.restore();
  }

  player(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 10, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const r = p.sneaking ? 9.5 : 11;
    ctx.fillStyle = p.sneaking ? '#63bfae' : '#7fded0';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b6f66';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#c8f4ec';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f8f84';
    ctx.beginPath();
    ctx.arc(Math.cos(p.dir) * (r - 3), Math.sin(p.dir) * (r - 3), 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  feedback(g) {
    const ctx = this.ctx;
    if (g.introT > 0) {
      const a = Math.min(1, g.introT, (INTRO_TIME - g.introT) * 2.5);
      ctx.fillStyle = `rgba(242,227,184,${Math.max(0, a)})`;
      ctx.font = '600 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${g.levelIndex + 1} — ${g.level.name}`, WORLD_W / 2, 74);
      ctx.fillStyle = `rgba(139,150,171,${Math.max(0, a) * 0.9})`;
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText(g.level.hint, WORLD_W / 2, 98);
    }
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255,60,50,${0.38 * g.flash})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    if (g.state === 'title') {
      ctx.fillStyle = 'rgba(139,150,171,0.75)';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('the wardens make their rounds while you wait', WORLD_W / 2, WORLD_H - WALL_T - 34);
    }
  }
}

const INTRO_TIME = 2.4;
export { INTRO_TIME };
