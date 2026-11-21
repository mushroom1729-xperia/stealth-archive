// Every sound the archive makes, synthesized with WebAudio — no files. Soft
// thudding footsteps that swell as a warden nears, a rising alarm tone while
// suspicion climbs, and stings for the moment of discovery, the catch and the
// clean getaway.

export class SoundKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.muted = false;
    this.alarm = null;
  }

  /** Create or resume the AudioContext; call from a user gesture. */
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.85;
    return this.muted;
  }

  /** One soft footfall: a low-filtered noise burst. gain 0..~0.5, pitch ~1. */
  step(gain, pitch = 1) {
    if (!this.ctx || this.muted || gain <= 0.015) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = pitch;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240 * pitch;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.12);
  }

  /** The spot sting: a short rising cry when a warden first fixes on you. */
  sting() {
    this.sweep('sawtooth', 300, 820, 0.28, 0.16);
    this.sweep('square', 452, 1230, 0.28, 0.05);
  }

  /** The catch: a harsh falling buzz. */
  caught() {
    this.sweep('sawtooth', 520, 92, 0.65, 0.22);
    this.sweep('square', 260, 46, 0.65, 0.1);
  }

  /** The clear: a small ascending arpeggio. */
  cleared() {
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      this.sweep('sine', f, f, 0.22, 0.12, i * 0.09);
    });
  }

  sweep(type, f0, f1, dur, gain, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** The alarm tone's rise, 0..1. 0 silences it; 0.5+ is a warden nearly sure. */
  alarmSet(p) {
    if (!this.ctx) return;
    p = Math.max(0, Math.min(1, p));
    if (!this.alarm && p > 0) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 170;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      osc.start();
      this.alarm = { osc, g };
    }
    if (!this.alarm) return;
    const t = this.ctx.currentTime;
    this.alarm.osc.frequency.setTargetAtTime(170 + 330 * p, t, 0.08);
    this.alarm.g.gain.setTargetAtTime(p > 0 ? 0.02 + 0.08 * p : 0, t, 0.12);
  }
}
