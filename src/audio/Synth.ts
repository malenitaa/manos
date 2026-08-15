/**
 * The polyphonic engine.
 *
 * The rest of the app never says "play" or "stop". It says, sixty times a
 * second, "these are the notes that should be sounding right now", and the
 * synth works out the difference: notes that are already on stay on and are not
 * re-attacked, new ones start, and missing ones are released. That is what
 * makes chord changes sound joined up instead of chopped.
 *
 * Signal path:
 *
 *   voices → tone filter → volume → drive ┬────────→ master → limiter → analyser → out
 *                                          ├→ reverb ─→ master
 *                                          ├→ delay ──→ master
 *                                          └→ chorus ─→ master
 */

import { createChorus, createDelay, createDriveCurve, createReverb } from "./effects";
import { TIMBRES, type TimbreId } from "./timbres";
import { Voice } from "./Voice";

export type SendId = "reverb" | "delay" | "chorus";

/** Ceiling on simultaneous voices, so a flurry of gestures cannot choke the CPU. */
const MAX_VOICES = 24;

const BRIGHTNESS_MIN_HZ = 300;
const BRIGHTNESS_RANGE = 30; // multiplied, so the top ends up at 9 kHz

export class Synth {
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;

  private input: GainNode;
  private tone: BiquadFilterNode;
  private volume: GainNode;
  private drive: WaveShaperNode;
  private master: GainNode;
  private limiter: DynamicsCompressorNode;
  private sends: Record<SendId, GainNode>;
  private delayNode: DelayNode;

  private voices = new Map<string, Voice>();
  private timbreId: TimbreId = "pad";

  constructor() {
    const context = new AudioContext();
    this.context = context;

    this.input = context.createGain();

    // Global brightness, driven by how open the expression hand is.
    this.tone = context.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 4000;
    this.tone.Q.value = 0.6;

    // Global loudness, driven by how high the expression hand is.
    this.volume = context.createGain();
    this.volume.gain.value = 0;

    this.drive = context.createWaveShaper();
    this.drive.curve = createDriveCurve(0);
    this.drive.oversample = "2x";

    this.master = context.createGain();
    this.master.gain.value = 0.9;

    const dry = context.createGain();
    dry.gain.value = 1;

    this.input.connect(this.tone);
    this.tone.connect(this.volume);
    this.volume.connect(this.drive);
    this.drive.connect(dry);
    dry.connect(this.master);

    const reverb = createReverb(context);
    const delay = createDelay(context);
    const chorus = createChorus(context);
    this.delayNode = delay.delay;

    for (const effect of [reverb, delay, chorus]) {
      this.drive.connect(effect.send);
      effect.output.connect(this.master);
    }
    this.sends = { reverb: reverb.send, delay: delay.send, chorus: chorus.send };

    // A brickwall on the way out. Six voices with reverb and delay stacked on
    // top will happily push past full scale, and a recording that clips is
    // useless — so everything passes through a fast limiter first. It only does
    // anything when the signal would have distorted anyway.
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;
    this.master.connect(this.limiter);

    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;
    this.limiter.connect(this.analyser);
    this.analyser.connect(context.destination);
  }

  /**
   * The final mix, after effects and after the limiter. This is what a recorder
   * should listen to: it carries exactly what reaches the speakers.
   */
  get output(): AudioNode {
    return this.limiter;
  }

  /**
   * Where an external source (the drums) joins the mix: straight into the
   * master, past the tone filter and the hand-driven volume — the beat should
   * not get muffled when the expression hand closes — but before the limiter,
   * so recordings carry it and it cannot clip the output.
   */
  createExternalInput(): GainNode {
    const input = this.context.createGain();
    input.connect(this.master);
    return input;
  }

  /** Browsers start audio suspended until a real user gesture resumes it. */
  async resume(): Promise<void> {
    if (this.context.state !== "running") await this.context.resume();
  }

  get timbre(): TimbreId {
    return this.timbreId;
  }

  setTimbre(id: TimbreId) {
    if (id === this.timbreId) return;
    this.timbreId = id;
    // Existing voices were built with the old preset baked in, so they go.
    this.releaseAll();
  }

  /** 0 to 1. Squared, because loudness is not how the ear works. */
  setVolume(value: number) {
    const level = Math.min(1, Math.max(0, value));
    this.volume.gain.setTargetAtTime(level * level, this.context.currentTime, 0.05);
  }

  /** 0 to 1, from muffled and distant to open and present. */
  setBrightness(value: number) {
    const level = Math.min(1, Math.max(0, value));
    const hz = BRIGHTNESS_MIN_HZ * Math.pow(BRIGHTNESS_RANGE, level);
    this.tone.frequency.setTargetAtTime(hz, this.context.currentTime, 0.06);
  }

  setSend(id: SendId, value: number) {
    this.sends[id].gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setDrive(value: number) {
    this.drive.curve = createDriveCurve(value);
  }

  setDelayTime(seconds: number) {
    this.delayNode.delayTime.setTargetAtTime(seconds, this.context.currentTime, 0.1);
  }

  /**
   * Makes exactly these frequencies sound, re-attacking only what is new.
   */
  setNotes(frequencies: number[]) {
    this.setNoteGroups([{ timbre: this.timbreId, frequencies }]);
  }

  /**
   * The same, but each group carries its own timbre — this is what lets each
   * hand be a different instrument in duet mode. Voices are keyed by timbre
   * and pitch together, so the same note on two instruments is two voices, and
   * changing one hand's timbre releases only that hand's notes.
   */
  setNoteGroups(groups: { timbre: TimbreId; frequencies: number[] }[]) {
    const now = this.context.currentTime;
    const wanted = new Map<string, { timbre: TimbreId; frequency: number }>();
    let count = 0;
    for (const group of groups) {
      for (const frequency of group.frequencies) {
        if (count >= MAX_VOICES) break;
        wanted.set(`${group.timbre}:${Math.round(frequency * 10)}`, { timbre: group.timbre, frequency });
        count++;
      }
    }

    for (const [key, voice] of this.voices) {
      if (!wanted.has(key) || voice.diesAt < now) {
        voice.release();
        this.voices.delete(key);
      }
    }
    for (const [key, note] of wanted) {
      if (!this.voices.has(key)) {
        this.voices.set(key, new Voice(this.context, this.input, TIMBRES[note.timbre], note.frequency));
      }
    }
  }

  /**
   * Like setNotes, but slides the notes already sounding to the new pitches
   * instead of re-attacking. This is free mode.
   *
   * Voices are keyed by slot rather than by pitch, since the pitch is changing
   * continuously and would otherwise look like a different note every frame.
   */
  glideNotes(frequencies: number[]) {
    const now = this.context.currentTime;
    const keys = frequencies.map((_, i) => `slot${i}`);

    for (const [key, voice] of this.voices) {
      if (!keys.includes(key)) {
        voice.release();
        this.voices.delete(key);
      }
    }

    frequencies.slice(0, MAX_VOICES).forEach((frequency, i) => {
      const key = `slot${i}`;
      const existing = this.voices.get(key);
      // While a note is still alive it just slides. Timbres that decay on their
      // own get re-struck when they run out, which reads as a tremolo.
      if (existing && existing.diesAt > now) {
        existing.glideTo(frequency);
        return;
      }
      existing?.release();
      this.voices.set(key, new Voice(this.context, this.input, TIMBRES[this.timbreId], frequency));
    });
  }

  releaseAll() {
    for (const [key, voice] of this.voices) {
      voice.release();
      this.voices.delete(key);
    }
  }

  get voiceCount(): number {
    return this.voices.size;
  }

  async dispose(): Promise<void> {
    for (const voice of this.voices.values()) voice.dispose();
    this.voices.clear();
    await this.context.close();
  }
}
