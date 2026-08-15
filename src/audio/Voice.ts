/**
 * One note, sounding.
 *
 * A voice is created when a note starts and torn down once it has faded out.
 * Nothing is reused: Web Audio oscillators are single-use by design, and
 * creating them is cheap.
 */

import type { Timbre } from "./timbres";

/** Web Audio cannot ramp to exactly zero on an exponential curve. */
const NEAR_ZERO = 0.0001;

const MAX_FILTER_HZ = 16000;

export class Voice {
  private oscillators: OscillatorNode[] = [];
  private modulators: OscillatorNode[] = [];
  private modulationGain: GainNode | null = null;
  private amplitude: GainNode;
  private fmRatio = 0;
  private released = false;

  /** When this note goes quiet on its own. Infinity for sustained timbres. */
  readonly diesAt: number;

  constructor(
    private context: AudioContext,
    destination: AudioNode,
    private timbre: Timbre,
    frequency: number,
  ) {
    const now = context.currentTime;

    this.amplitude = context.createGain();
    this.amplitude.gain.value = 0;
    this.amplitude.connect(destination);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = timbre.filter.q;
    filter.connect(this.amplitude);

    // The filter opens instantly and closes over time. That fading brightness is
    // what makes a note sound struck rather than blown.
    const base = Math.min(MAX_FILTER_HZ, timbre.filter.base);
    const peak = Math.min(MAX_FILTER_HZ, base * (1 + timbre.filter.env));
    filter.frequency.setValueAtTime(peak, now);
    filter.frequency.exponentialRampToValueAtTime(base, now + Math.max(0.08, timbre.envelope.decay));

    for (const layer of timbre.layers) {
      const oscillator = context.createOscillator();
      oscillator.type = layer.type;
      oscillator.frequency.value = frequency * Math.pow(2, layer.octave);
      oscillator.detune.value = layer.detune;

      const gain = context.createGain();
      gain.gain.value = layer.gain;
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start(now);
      this.oscillators.push(oscillator);
    }

    if (timbre.fm) {
      this.fmRatio = timbre.fm.ratio;
      const modulator = context.createOscillator();
      modulator.type = "sine";
      modulator.frequency.value = frequency * timbre.fm.ratio;

      const depth = context.createGain();
      const amount = frequency * timbre.fm.index;
      depth.gain.setValueAtTime(amount, now);
      depth.gain.exponentialRampToValueAtTime(Math.max(1, amount * 0.02), now + timbre.fm.decay);

      modulator.connect(depth);
      for (const oscillator of this.oscillators) depth.connect(oscillator.frequency);
      modulator.start(now);

      this.modulators.push(modulator);
      this.modulationGain = depth;
    }

    if (timbre.vibrato) {
      const lfo = context.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = timbre.vibrato.rate;
      const depth = context.createGain();
      depth.gain.value = timbre.vibrato.depth;
      lfo.connect(depth);
      for (const oscillator of this.oscillators) depth.connect(oscillator.detune);
      lfo.start(now);
      this.modulators.push(lfo);
    }

    const { attack, decay, sustain } = timbre.envelope;
    const peakGain = timbre.gain;
    this.amplitude.gain.setValueAtTime(0, now);
    this.amplitude.gain.linearRampToValueAtTime(peakGain, now + attack);
    this.amplitude.gain.linearRampToValueAtTime(Math.max(NEAR_ZERO, peakGain * sustain), now + attack + decay);

    this.diesAt = sustain <= 0.001 ? now + attack + decay + 0.05 : Infinity;
  }

  /** Slides to a new pitch without re-attacking. This is free mode's glissando. */
  glideTo(frequency: number, seconds = 0.06) {
    const now = this.context.currentTime;
    this.oscillators.forEach((oscillator, i) => {
      const target = frequency * Math.pow(2, this.timbre.layers[i].octave);
      oscillator.frequency.setTargetAtTime(target, now, seconds);
    });
    if (this.fmRatio) {
      for (const modulator of this.modulators) {
        // Only the FM modulator tracks pitch; a vibrato LFO runs at a few Hz.
        if (modulator.frequency.value > 30) {
          modulator.frequency.setTargetAtTime(frequency * this.fmRatio, now, seconds);
        }
      }
    }
  }

  /** Lets the note go. Returns how many seconds until it is fully silent. */
  release(): number {
    if (this.released) return 0;
    this.released = true;

    const now = this.context.currentTime;
    const { release } = this.timbre.envelope;
    const current = this.amplitude.gain.value;

    this.amplitude.gain.cancelScheduledValues(now);
    this.amplitude.gain.setValueAtTime(current, now);
    this.amplitude.gain.linearRampToValueAtTime(NEAR_ZERO, now + release);
    this.modulationGain?.gain.cancelScheduledValues(now);

    for (const node of [...this.oscillators, ...this.modulators]) {
      try {
        node.stop(now + release + 0.06);
      } catch {
        // Already stopped; nothing to do.
      }
    }
    return release + 0.1;
  }

  /** Cuts everything immediately. Used when tearing the whole engine down. */
  dispose() {
    const now = this.context.currentTime;
    for (const node of [...this.oscillators, ...this.modulators]) {
      try {
        node.stop(now);
      } catch {
        // Already stopped.
      }
      node.disconnect();
    }
    this.amplitude.disconnect();
  }
}
