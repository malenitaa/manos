/**
 * Everything the player can change, plus saving it between visits.
 *
 * Stored values are treated as untrusted: anything can be in localStorage, so
 * every field is validated and clamped on the way in and unknown keys are
 * dropped. A corrupted entry falls back to the defaults instead of throwing.
 */

import { isTimbreId, type TimbreId } from "../audio";
import { detectLanguage, isLanguage, type Language } from "../i18n";
import { isScaleId, isTuning, type ModeId, type Tuning } from "../music/theory";

const STORAGE_KEY = "manos.settings.v1";

export interface Settings {
  language: Language;
  mode: ModeId;
  /** Tonic of the key: 0 is C, 11 is B. */
  root: number;
  /** Reference pitch for the A above middle C. */
  tuning: Tuning;
  /** Whether a gesture plays a chord or a single scale note (melody). */
  voicing: "chords" | "notes";
  /** The strip of chips showing which fingers give which chord. */
  showMap: boolean;
  /** The gesture guide in the corner. Nice for learning, noise for playing. */
  showLegend: boolean;
  timbre: TimbreId;
  /** The left hand's own timbre, used in duet mode. */
  timbreLeft: TimbreId;
  /** Drums running, conducted by the expression hand. */
  drums: boolean;
  /** Beats per minute for the drums. */
  tempo: number;
  reverb: number;
  delay: number;
  chorus: number;
  drive: number;
  /**
   * How much everything is smoothed, from 0 (immediate and twitchy) to 1 (slow
   * and glassy). Drives the landmark filter, how long a gesture has to hold
   * before it counts, and how fast volume and brightness follow the hand.
   */
  smoothness: number;
  /** Chord changes slide in pitch instead of being struck again. */
  glide: boolean;
  /** Both hands play their own voice instead of one playing and one shaping. */
  duo: boolean;
  /** Swaps which hand holds the chord. */
  swap: boolean;
  skeleton: boolean;
}

export type SettingKey = keyof Settings;

export function defaultSettings(): Settings {
  return {
    language: detectLanguage(),
    mode: "guided",
    root: 0,
    tuning: 440,
    voicing: "chords",
    showMap: true,
    showLegend: true,
    timbre: "pad",
    timbreLeft: "sub",
    drums: false,
    tempo: 96,
    reverb: 0.35,
    delay: 0.12,
    chorus: 0.25,
    drive: 0,
    smoothness: 0.6,
    glide: false,
    duo: false,
    swap: false,
    skeleton: true,
  };
}

/** Ranges for the effect sliders, shared by the UI and by validation. */
export const RANGES = {
  reverb: { min: 0, max: 1, step: 0.01 },
  delay: { min: 0, max: 0.6, step: 0.01 },
  chorus: { min: 0, max: 0.7, step: 0.01 },
  drive: { min: 0, max: 1, step: 0.01 },
} as const;

export type EffectKey = keyof typeof RANGES;
export const EFFECT_KEYS = Object.keys(RANGES) as EffectKey[];

/**
 * What the smoothness slider actually controls. At 0 the instrument answers the
 * moment your hand moves, at the cost of twitching; at 1 everything glides, at
 * the cost of feeling a beat behind.
 */
export interface ResponseProfile {
  /** One Euro cutoff for the landmarks. Higher follows the hand more closely. */
  minCutoff: number;
  beta: number;
  /** Frames a changed finger count must hold before the chord follows. */
  framesNeeded: number;
  /** How fast volume and brightness chase the expression hand, per frame. */
  expressionGlide: number;
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * The default of 0.6 sits a little to the smooth side of centre. Landmark
 * filtering and expression tracking land near where they were before this
 * became adjustable; what is noticeably calmer is how long a chord has to be
 * held before it changes, which is where most of the roughness came from.
 */
export function responseFor(smoothness: number): ResponseProfile {
  const s = Math.min(1, Math.max(0, smoothness));
  return {
    minCutoff: mix(2.8, 0.4, s),
    beta: mix(0.08, 0.015, s),
    framesNeeded: Math.round(mix(2, 9, s)),
    expressionGlide: mix(0.3, 0.035, s),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function loadSettings(): Settings {
  const settings = defaultSettings();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked entirely; the defaults are fine.
    return settings;
  }
  if (!raw) return settings;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return settings;
  }
  if (typeof stored !== "object" || stored === null) return settings;
  const data = stored as Record<string, unknown>;

  if (isLanguage(data.language)) settings.language = data.language;
  if (data.mode === "free" || isScaleId(data.mode)) settings.mode = data.mode;
  if (isTuning(data.tuning)) settings.tuning = data.tuning;
  if (data.voicing === "chords" || data.voicing === "notes") settings.voicing = data.voicing;
  settings.showMap = readBoolean(data.showMap, settings.showMap);
  settings.showLegend = readBoolean(data.showLegend, settings.showLegend);
  if (isTimbreId(data.timbre)) settings.timbre = data.timbre;
  if (isTimbreId(data.timbreLeft)) settings.timbreLeft = data.timbreLeft;
  settings.drums = readBoolean(data.drums, settings.drums);
  settings.tempo = Math.round(clampNumber(data.tempo, 50, 200, settings.tempo));
  settings.root = Math.round(clampNumber(data.root, 0, 11, settings.root));
  for (const key of EFFECT_KEYS) {
    settings[key] = clampNumber(data[key], RANGES[key].min, RANGES[key].max, settings[key]);
  }
  settings.smoothness = clampNumber(data.smoothness, 0, 1, settings.smoothness);
  settings.glide = readBoolean(data.glide, settings.glide);
  settings.duo = readBoolean(data.duo, settings.duo);
  settings.swap = readBoolean(data.swap, settings.swap);
  settings.skeleton = readBoolean(data.skeleton, settings.skeleton);

  return settings;
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota. Not worth interrupting anyone over.
  }
}
