/**
 * All sound is generated live with the Web Audio API (no audio files):
 * - the sea: filtered noise that swells and recedes like waves
 * - music: a slow, sparse music-box melody on a pentatonic scale, with echo
 * - small sound effects for collecting and mending
 * Browsers only allow audio after a tap, so start() is called on the first interaction.
 */
export type Sfx = 'tap' | 'chest' | 'upgrade';

// D major pentatonic across two octaves (Hz).
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];
const PAD_ROOTS = [146.83, 196.0, 220.0, 164.81]; // D3, G3, A3, E3

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private timers: number[] = [];
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  start(): void {
    if (this.ctx) {
      if (this.enabled && this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    this.master.connect(ctx.destination);
    this.buildSea();
    this.buildMusic();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.8 : 0, t, 0.3);
    if (on && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Pause everything while the page is hidden. */
  setVisible(visible: boolean): void {
    if (!this.ctx) return;
    if (visible && this.enabled) void this.ctx.resume();
    else if (!visible) void this.ctx.suspend();
  }

  play(kind: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    if (kind === 'tap') this.blip(t, 880, 1320, 0.12, 0.18);
    if (kind === 'chest') [587.33, 739.99, 880].forEach((f, i) => this.bell(t + i * 0.08, f, 0.16, 0.9));
    if (kind === 'upgrade') {
      [440, 554.37, 659.25, 880].forEach((f, i) => this.bell(t + i * 0.06, f, 0.14, 1.6));
      this.bell(t + 0.3, 1318.5, 0.06, 2.2);
    }
  }

  // ---------- the sea ----------
  private buildSea(): void {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // brown noise: soft and deep, like distant surf
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const swell = ctx.createGain();
    swell.gain.value = 0.16;
    // Waves: a slow LFO on both volume and brightness.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.085;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain).connect(swell.gain);
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 260;
    lfo.connect(lfo2Gain).connect(lp.frequency);
    src.connect(lp).connect(swell).connect(this.master);
    src.start();
    lfo.start();
  }

  // ---------- music ----------
  private buildMusic(): void {
    const ctx = this.ctx!;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.55;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.48;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    delay.connect(fb).connect(tone).connect(delay);
    this.musicBus.connect(this.master);
    this.musicBus.connect(delay);
    tone.connect(this.master);

    let step = 0;
    let lastNote = 4;
    const note = () => {
      const c = this.ctx!;
      const t = c.currentTime + 0.05;
      // Wander the scale by small steps, sometimes resting, for a calm, unhurried line.
      if (Math.random() > 0.2) {
        lastNote = Math.max(0, Math.min(SCALE.length - 1, lastNote + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        this.bell(t, SCALE[lastNote], 0.09, 2.6, this.musicBus);
        if (Math.random() < 0.25) this.bell(t + 0.18, SCALE[Math.max(0, lastNote - 2)], 0.05, 2.4, this.musicBus);
      }
      if (step % 8 === 0) this.pad(t, PAD_ROOTS[(step / 8) % PAD_ROOTS.length]);
      step++;
      this.timers.push(window.setTimeout(note, 1400 + Math.random() * 1600));
    };
    this.timers.push(window.setTimeout(note, 800));
  }

  private bell(t: number, freq: number, vol: number, decay: number, out: AudioNode = this.master): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(out);
    o1.start(t);
    o2.start(t);
    o1.stop(t + decay + 0.1);
    o2.stop(t + decay + 0.1);
  }

  private pad(t: number, root: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 3);
    g.gain.linearRampToValueAtTime(0, t + 11);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    for (const mult of [1, 1.5, 2]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = root * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(lp);
      o.start(t);
      o.stop(t + 11.5);
    }
    lp.connect(g).connect(this.musicBus);
  }

  private blip(t: number, f0: number, f1: number, vol: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
