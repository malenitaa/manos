/**
 * The theory, which is really just a few tables and one piece of arithmetic.
 *
 * An octave is twelve semitones. A scale is a list of which of those twelve you
 * use. A chord is built by stacking every other note of that scale. A roman
 * numeral is the chord's position in the scale, written in capitals when it is
 * major and lowercase when it is minor.
 *
 * Chords are *derived* from the scale rather than written out by hand, which is
 * what lets a Japanese or Arabic scale be added as one line of numbers and still
 * come out with sensible chords and labels.
 */

/** The twelve pitch classes, written the way English-speaking musicians write them. */
export const LETTER_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** The same twelve in do-re-mi, used across most of Europe and Latin America. */
export const SOLFEGE_NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"] as const;

/** Flat spellings, used when a chord was reached by lowering a degree. */
export const LETTER_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
export const SOLFEGE_NAMES_FLAT = ["Do", "Reb", "Re", "Mib", "Mi", "Fa", "Solb", "Sol", "Lab", "La", "Sib", "Si"] as const;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] as const;

export type TriadQuality = "maj" | "min" | "dim" | "aug" | "sus";

export type ScaleGroup = "simple" | "modes" | "world" | "tones";

export type ScaleId =
  | "guided"
  | "major"
  | "minor"
  | "harmonicMinor"
  | "pentatonicMinor"
  | "blues"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "hirajoshi"
  | "hijaz"
  | "solfeggio";

export type ModeId = ScaleId | "free";

/** A scale described as distances from its tonic, in semitones. */
export interface StepScale {
  kind: "steps";
  id: ScaleId;
  group: ScaleGroup;
  steps: number[];
  /**
   * Chords to use instead of the derived ones. Only the guided scale sets this:
   * its five notes belong to a major key, so borrowing that key's chords sounds
   * far better than stacking the pentatonic on itself.
   */
  borrowedFrom?: number[];
}

/**
 * A scale given as fixed frequencies rather than intervals. The solfeggio set
 * is defined in hertz, so it is not transposable and ignores the tuning
 * reference — those numbers are the whole point of it.
 */
export interface ToneScale {
  kind: "tones";
  id: ScaleId;
  group: ScaleGroup;
  frequencies: number[];
  /** A short label per tone, shown where a roman numeral would go. */
  labels: string[];
}

export type Scale = StepScale | ToneScale;

export const SCALES: Record<ScaleId, Scale> = {
  /**
   * Five notes chosen so any combination sounds good: degrees I, ii, iii, V and
   * vi of the major scale. Nothing here can clash with anything else here.
   */
  guided: {
    kind: "steps",
    id: "guided",
    group: "simple",
    steps: [0, 2, 4, 7, 9],
    borrowedFrom: [0, 2, 4, 5, 7, 9, 11],
  },
  major: { kind: "steps", id: "major", group: "simple", steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { kind: "steps", id: "minor", group: "simple", steps: [0, 2, 3, 5, 7, 8, 10] },
  /** Minor with the seventh raised: the dramatic minor, with a major V that pulls home. */
  harmonicMinor: { kind: "steps", id: "harmonicMinor", group: "simple", steps: [0, 2, 3, 5, 7, 8, 11] },
  /** The blues-and-rock five notes. Nothing in it clashes either. */
  pentatonicMinor: {
    kind: "steps",
    id: "pentatonicMinor",
    group: "simple",
    steps: [0, 3, 5, 7, 10],
    borrowedFrom: [0, 2, 3, 5, 7, 8, 10],
  },
  /**
   * The minor pentatonic plus the blue note. Its own stacked chords come out
   * open and sus-flavoured — true to the scale — and leaning right forces the
   * dominant sevenths blues actually runs on.
   */
  blues: { kind: "steps", id: "blues", group: "simple", steps: [0, 3, 5, 6, 7, 10] },

  /** The old church modes: a major scale started from a different note. */
  dorian: { kind: "steps", id: "dorian", group: "modes", steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { kind: "steps", id: "phrygian", group: "modes", steps: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { kind: "steps", id: "lydian", group: "modes", steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { kind: "steps", id: "mixolydian", group: "modes", steps: [0, 2, 4, 5, 7, 9, 10] },

  /** Hirajoshi, a Japanese koto tuning. */
  hirajoshi: { kind: "steps", id: "hirajoshi", group: "world", steps: [0, 2, 3, 7, 8] },
  /** Hijaz, the maqam behind a lot of Arabic and Andalusian music. */
  hijaz: { kind: "steps", id: "hijaz", group: "world", steps: [0, 1, 4, 5, 7, 8, 10] },

  /**
   * The solfeggio frequencies — the full nine, from 174 to 963 Hz. These are
   * absolute pitches in hertz, associated with meditation and sound-bath
   * practice, and they do not line up with equal temperament — which is
   * exactly why they need their own kind of scale. Only the middle six carry
   * traditional syllable names; the outer ones are known by their number.
   */
  solfeggio: {
    kind: "tones",
    id: "solfeggio",
    group: "tones",
    frequencies: [174, 285, 396, 417, 528, 639, 741, 852, 963],
    labels: ["174", "285", "UT", "RE", "MI", "FA", "SOL", "LA", "963"],
  },
};

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

export function isScaleId(value: unknown): value is ScaleId {
  return typeof value === "string" && value in SCALES;
}

/** How many gestures a scale answers to. */
export function scaleLength(scale: Scale): number {
  return scale.kind === "steps" ? scale.steps.length : scale.frequencies.length;
}

/** Reference pitch for the A above middle C. 432 Hz is the usual alternative. */
export type Tuning = 440 | 432;
export const TUNINGS: Tuning[] = [440, 432];

export function isTuning(value: unknown): value is Tuning {
  return value === 440 || value === 432;
}

/** MIDI note 69 is that A. Everything else follows from the reference. */
export function midiToFrequency(midi: number, reference: number = 440): number {
  return reference * Math.pow(2, (midi - 69) / 12);
}

export function pitchClass(semitones: number): number {
  return ((semitones % 12) + 12) % 12;
}

export function letterName(semitones: number, preferFlat = false): string {
  return (preferFlat ? LETTER_NAMES_FLAT : LETTER_NAMES)[pitchClass(semitones)];
}

export function solfegeName(semitones: number, preferFlat = false): string {
  return (preferFlat ? SOLFEGE_NAMES_FLAT : SOLFEGE_NAMES)[pitchClass(semitones)];
}

export interface DerivedTriad {
  /** Semitones above the chord's root. */
  intervals: number[];
  quality: TriadQuality;
}

/**
 * Builds the chord that belongs on a given degree by stacking every other note
 * of the scale — the same move that turns do-re-mi-fa-sol into do-mi-sol. On a
 * five-note scale it wraps into the next octave, which is what gives the
 * pentatonic and world scales their open, unresolved chords.
 */
export function triadAt(steps: number[], index: number): DerivedTriad {
  const length = steps.length;
  const noteAt = (i: number) => steps[i % length] + 12 * Math.floor(i / length);

  const root = noteAt(index);
  const third = noteAt(index + 2) - root;
  const fifth = noteAt(index + 4) - root;

  return { intervals: [0, third, fifth], quality: classifyTriad(third, fifth) };
}

function classifyTriad(third: number, fifth: number): TriadQuality {
  if (third === 4 && fifth === 7) return "maj";
  if (third === 3 && fifth === 7) return "min";
  if (third === 3 && fifth === 6) return "dim";
  if (third === 4 && fifth === 8) return "aug";
  // Anything else is not a triad in the usual sense: a second or a fourth where
  // the third should be. Those get grouped as suspended, which is what they
  // sound like — open, neither happy nor sad.
  return "sus";
}

export type SeventhQuality = "maj7" | "min7" | "dom7" | "m7b5" | "dim7";

export interface DerivedSeventh {
  /** Semitones above the chord's root: root, third, fifth, seventh. */
  intervals: number[];
  quality: SeventhQuality;
}

/**
 * One more third on top of the triad: the seventh chord that belongs on this
 * degree. Stacking the scale on itself is how jazz harmonises anything — on the
 * I of a major key it lands on maj7, on the V it lands on the dominant.
 */
export function seventhAt(steps: number[], index: number): DerivedSeventh {
  const length = steps.length;
  const noteAt = (i: number) => steps[i % length] + 12 * Math.floor(i / length);

  const root = noteAt(index);
  const third = noteAt(index + 2) - root;
  const fifth = noteAt(index + 4) - root;
  const seventh = noteAt(index + 6) - root;

  return { intervals: [0, third, fifth, seventh], quality: classifySeventh(third, fifth, seventh) };
}

function classifySeventh(third: number, fifth: number, seventh: number): SeventhQuality {
  if (third === 4 && seventh === 11) return "maj7";
  if (third === 4) return "dom7";
  if (fifth === 6 && seventh === 9) return "dim7";
  if (fifth === 6) return "m7b5";
  if (seventh === 11) return "maj7"; // minor-major: rare, filed under the nearest
  return "min7";
}

const NUMERAL_SUFFIX: Record<TriadQuality, string> = {
  maj: "",
  min: "",
  dim: "°",
  aug: "+",
  sus: "sus",
};

/** Lowercase for the dark ones, capitals for the bright ones. */
export function numeralFor(index: number, quality: TriadQuality): string {
  const roman = ROMAN[index] ?? String(index + 1);
  const dark = quality === "min" || quality === "dim";
  return (dark ? roman.toLowerCase() : roman) + NUMERAL_SUFFIX[quality];
}
