/**
 * The drum machine. A pattern that runs on its own clock, in time, while the
 * hand *conducts* it — how many fingers is how busy the beat gets, height is
 * volume, a fist mutes it without losing the bar.
 *
 * Conducting rather than striking is deliberate. Between camera latency and
 * the frames a finger count needs to confirm, hitting each drum by gesture
 * would always land late. A pattern scheduled ahead on the audio clock is
 * immune to all of that: the groove is perfect even when the page stutters.
 *
 * The sounds are synthesized on the spot, like everything else here: a kick is
 * a sine wave falling in pitch, a snare is noise through a bandpass with a
 * short tone underneath, a hat is high-passed noise. No samples.
 */

/** Sixteen steps to a bar: four beats, four subdivisions each. */
const STEPS = 16;

/** How far ahead notes are scheduled, and how often the scheduler wakes. */
const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;

interface Pattern {
  kick: number[];
  snare: number[];
  hatClosed: number[];
  hatOpen: number[];
}

/**
 * One pattern per density level. Each level keeps everything the previous one
 * had, so raising a finger only ever adds — the groove never lurches.
 */
const PATTERNS: Record<number, Pattern> = {
  1: { kick: [0, 8], snare: [], hatClosed: [], hatOpen: [] },
  2: { kick: [0, 8], snare: [4, 12], hatClosed: [], hatOpen: [] },
  3: { kick: [0, 8, 10], snare: [4, 12], hatClosed: [0, 2, 4, 6, 8, 10, 12, 14], hatOpen: [] },
  4: {
    kick: [0, 7, 8, 10],
    snare: [4, 12],
    hatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
    hatOpen: [14],
  },
};

export class DrumMachine {
  /** Conducted volume, set by the hand. Separate from the fixed voice levels. */
  private level: GainNode;
  private out: GainNode;
  private noise: AudioBuffer;

  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private bpm = 96;
  private density = 2;
  private muted = false;

  constructor(
    private context: AudioContext,
    destination: AudioNode,
  ) {
    this.level = context.createGain();
    this.level.gain.value = 0.8;
    this.out = context.createGain();
    this.out.gain.value = 0.9;
    this.level.connect(this.out);
    this.out.connect(destination);

    // One second of white noise, shared by the snare and the hats.
    const length = context.sampleRate;
    this.noise = context.createBuffer(1, length, context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  get running(): boolean {
    return this.timer !== null;
  }

  setTempo(bpm: number) {
    this.bpm = Math.min(200, Math.max(50, bpm));
  }

  /** 1 to 4 raises the density; 0 mutes while the clock keeps the bar. */
  setDensity(fingers: number) {
    if (fingers <= 0) {
      this.muted = true;
      return;
    }
    this.muted = false;
    this.density = Math.min(4, Math.max(1, Math.round(fingers)));
  }

  setVolume(value: number) {
    const level = Math.min(1, Math.max(0, value));
    this.level.gain.setTargetAtTime(level * level, this.context.currentTime, 0.08);
  }

  start() {
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.context.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * The standard Web Audio pattern: wake often, schedule everything that falls
   * inside the lookahead window at exact audio-clock times. The interval can
   * jitter freely — the scheduled notes cannot.
   */
  private schedule() {
    const stepSeconds = 60 / this.bpm / 4;
    while (this.nextTime < this.context.currentTime + LOOKAHEAD_SECONDS) {
      // A muted bar still advances, so opening the hand comes back on beat.
      if (!this.muted) this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % STEPS;
      this.nextTime += stepSeconds;
    }
  }

  private playStep(step: number, time: number) {
    const pattern = PATTERNS[this.density];
    if (pattern.kick.includes(step)) this.kick(time);
    if (pattern.snare.includes(step)) this.snare(time);
    if (pattern.hatClosed.includes(step)) this.hat(time, 0.045, 0.5);
    if (pattern.hatOpen.includes(step)) this.hat(time, 0.28, 0.4);
  }

  /** A sine that falls from 150 Hz to the floor: that pitch drop IS the kick. */
  private kick(time: number) {
    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.11);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);

    osc.connect(gain);
    gain.connect(this.level);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  /** Noise through a bandpass for the wires, a short tone for the drum body. */
  private snare(time: number) {
    const noise = this.context.createBufferSource();
    noise.buffer = this.noise;
    const band = this.context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    band.Q.value = 0.8;
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(this.level);
    noise.start(time);
    noise.stop(time + 0.2);

    const body = this.context.createOscillator();
    body.type = "triangle";
    body.frequency.value = 190;
    const bodyGain = this.context.createGain();
    bodyGain.gain.setValueAtTime(0.4, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    body.connect(bodyGain);
    bodyGain.connect(this.level);
    body.start(time);
    body.stop(time + 0.1);
  }

  private hat(time: number, decay: number, gainLevel: number) {
    const noise = this.context.createBufferSource();
    noise.buffer = this.noise;
    const high = this.context.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 7200;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    noise.connect(high);
    high.connect(gain);
    gain.connect(this.level);
    noise.start(time);
    noise.stop(time + decay + 0.02);
  }
}
