/**
 * The instrument presets.
 *
 * Every one of these is the same three ideas with different numbers:
 *
 *   1. Stacked waves, slightly out of tune with each other, which gives body.
 *   2. A filter that removes highs, which gives warmth and material — glass,
 *      wood, metal.
 *   3. An envelope, meaning how the volume rises and falls over time. A piano
 *      hits instantly and decays; a violin fades in. Changing the envelope
 *      changes the instrument far more than changing the waveform does.
 *
 * Names and descriptions live in the translation files, not here.
 */

export type TimbreId =
  | "pad"
  | "pluck"
  | "bells"
  | "strings"
  | "choir"
  | "organ"
  | "rhodes"
  | "sub"
  | "glass"
  | "bowl"
  | "drone";

export interface Layer {
  type: OscillatorType;
  /** Detune in cents. A hundred cents is one semitone. */
  detune: number;
  /** Octaves above or below the requested note. */
  octave: number;
  gain: number;
}

export interface Timbre {
  layers: Layer[];
  /**
   * Frequency modulation: one wave bending another thousands of times a second.
   * This is what produces metallic, bell-like and electric-piano sounds.
   */
  fm?: { ratio: number; index: number; decay: number };
  filter: { base: number; env: number; q: number };
  /** Attack, decay, sustain, release. Times in seconds; sustain is a proportion. */
  envelope: { attack: number; decay: number; sustain: number; release: number };
  vibrato?: { rate: number; depth: number };
  gain: number;
}

export const TIMBRES: Record<TimbreId, Timbre> = {
  pad: {
    layers: [
      { type: "sawtooth", detune: -7, octave: 0, gain: 1 },
      { type: "sawtooth", detune: 7, octave: 0, gain: 1 },
      { type: "sawtooth", detune: 0, octave: -1, gain: 0.5 },
    ],
    filter: { base: 900, env: 1.2, q: 1 },
    envelope: { attack: 0.35, decay: 0.9, sustain: 0.75, release: 1.4 },
    gain: 0.16,
  },
  pluck: {
    layers: [
      { type: "triangle", detune: 0, octave: 0, gain: 1 },
      { type: "sine", detune: 0, octave: 1, gain: 0.3 },
    ],
    filter: { base: 2600, env: 3, q: 2 },
    envelope: { attack: 0.004, decay: 0.55, sustain: 0, release: 0.35 },
    gain: 0.3,
  },
  bells: {
    layers: [{ type: "sine", detune: 0, octave: 0, gain: 1 }],
    fm: { ratio: 3.51, index: 6, decay: 0.9 },
    filter: { base: 6000, env: 0, q: 0.5 },
    envelope: { attack: 0.002, decay: 2.2, sustain: 0, release: 1.2 },
    gain: 0.26,
  },
  strings: {
    layers: [
      { type: "sawtooth", detune: -9, octave: 0, gain: 1 },
      { type: "sawtooth", detune: 9, octave: 0, gain: 1 },
      { type: "sawtooth", detune: 0, octave: -1, gain: 0.4 },
    ],
    filter: { base: 1400, env: 0.6, q: 1 },
    envelope: { attack: 0.55, decay: 0.8, sustain: 0.85, release: 1.6 },
    vibrato: { rate: 5.2, depth: 6 },
    gain: 0.14,
  },
  choir: {
    layers: [
      { type: "sawtooth", detune: -12, octave: 0, gain: 1 },
      { type: "sawtooth", detune: 12, octave: 0, gain: 1 },
      { type: "triangle", detune: 0, octave: 1, gain: 0.25 },
    ],
    filter: { base: 850, env: 1.5, q: 4 },
    envelope: { attack: 0.3, decay: 0.6, sustain: 0.8, release: 1.1 },
    vibrato: { rate: 5.6, depth: 9 },
    gain: 0.15,
  },
  organ: {
    layers: [
      { type: "sine", detune: 0, octave: 0, gain: 1 },
      { type: "sine", detune: 0, octave: 1, gain: 0.5 },
      // 702 cents above the octave is the twelfth, the classic organ stop.
      { type: "sine", detune: 702, octave: 1, gain: 0.3 },
      { type: "sine", detune: 0, octave: 2, gain: 0.22 },
    ],
    filter: { base: 4000, env: 0, q: 0.7 },
    envelope: { attack: 0.012, decay: 0.05, sustain: 1, release: 0.12 },
    gain: 0.13,
  },
  rhodes: {
    layers: [
      { type: "sine", detune: 0, octave: 0, gain: 1 },
      { type: "sine", detune: 0, octave: 1, gain: 0.15 },
    ],
    fm: { ratio: 2, index: 2.2, decay: 1.2 },
    filter: { base: 3000, env: 1, q: 0.7 },
    envelope: { attack: 0.005, decay: 1.6, sustain: 0.18, release: 0.5 },
    gain: 0.3,
  },
  sub: {
    layers: [
      { type: "sine", detune: 0, octave: -1, gain: 1 },
      { type: "triangle", detune: 0, octave: -1, gain: 0.4 },
      { type: "sine", detune: 0, octave: 0, gain: 0.25 },
    ],
    filter: { base: 320, env: 0.4, q: 0.8 },
    envelope: { attack: 0.03, decay: 0.3, sustain: 0.9, release: 0.5 },
    gain: 0.3,
  },
  glass: {
    layers: [
      { type: "sine", detune: 0, octave: 0, gain: 1 },
      { type: "sine", detune: 4, octave: 1, gain: 0.2 },
    ],
    // A ratio that is not a whole number makes the partials clash slightly,
    // which is exactly what makes struck glass and metal sound the way they do.
    fm: { ratio: 2.76, index: 4, decay: 2.5 },
    filter: { base: 5000, env: 0, q: 0.8 },
    envelope: { attack: 0.01, decay: 3.2, sustain: 0.05, release: 2.2 },
    gain: 0.22,
  },
  bowl: {
    layers: [
      { type: "sine", detune: 0, octave: 0, gain: 1 },
      // Two nearly identical tones fight each other and produce the slow pulse
      // you hear from a struck singing bowl. That beating is the whole sound.
      { type: "sine", detune: 8, octave: 0, gain: 0.9 },
      { type: "sine", detune: -5, octave: 1, gain: 0.35 },
    ],
    fm: { ratio: 2.4, index: 1.4, decay: 4 },
    filter: { base: 2600, env: 0.6, q: 0.7 },
    envelope: { attack: 0.12, decay: 6, sustain: 0.16, release: 4.5 },
    gain: 0.26,
  },
  drone: {
    layers: [
      { type: "sawtooth", detune: -5, octave: -1, gain: 1 },
      { type: "sawtooth", detune: 6, octave: -1, gain: 1 },
      { type: "sine", detune: 0, octave: 0, gain: 0.45 },
      { type: "triangle", detune: 3, octave: 1, gain: 0.12 },
    ],
    filter: { base: 620, env: 0.5, q: 1.2 },
    // Never decays and lets go slowly: it is meant to sit under everything else.
    envelope: { attack: 1.6, decay: 1, sustain: 1, release: 3.2 },
    vibrato: { rate: 0.18, depth: 5 },
    gain: 0.14,
  },
};

export const TIMBRE_IDS = Object.keys(TIMBRES) as TimbreId[];

export type TimbreGroupId = "sustained" | "struck" | "resonant" | "low";

/**
 * How the sounds are grouped in the panel. Adding a sound later means writing
 * its preset above and adding its id to one of these lines — the interface
 * builds itself from this.
 */
export const TIMBRE_GROUPS: { id: TimbreGroupId; timbres: TimbreId[] }[] = [
  { id: "sustained", timbres: ["pad", "strings", "choir"] },
  { id: "struck", timbres: ["pluck", "rhodes", "organ"] },
  { id: "resonant", timbres: ["bells", "glass", "bowl"] },
  { id: "low", timbres: ["sub", "drone"] },
];

export function isTimbreId(value: unknown): value is TimbreId {
  return typeof value === "string" && value in TIMBRES;
}
