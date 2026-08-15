/**
 * Building the actual notes.
 *
 * A gesture arrives as "degree four, leaning left, high octave" and leaves as a
 * handful of frequencies plus the names to put on screen.
 *
 * The lean gives five zones, which was running out of room for chord colours.
 * So the zones are crossed with *families*, chosen by the other hand: the same
 * lean means triads in one family, sevenths and ninths in another, sus and
 * sixth chords in the third. Five zones by three families covers most of what a
 * chord chart can ask for.
 *
 * On top of that, sliding the chord hand to the edge of the frame moves the
 * root a semitone — which is how chords from outside the key are reached
 * without touching the panel.
 */

import type { ChordQuality, Family } from "../gesture/mapping";
import {
  letterName,
  midiToFrequency,
  numeralFor,
  pitchClass,
  scaleLength,
  seventhAt,
  solfegeName,
  triadAt,
  type Scale,
  type StepScale,
  type ToneScale,
  type TriadQuality,
  type Tuning,
} from "./theory";

/** Every chord shape a gesture can force, in semitones above the root. */
const SHAPES = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  min9: [0, 3, 7, 10, 14],
  dom9: [0, 4, 7, 10, 14],
  maj6: [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
} as const;

export type ShapeId = keyof typeof SHAPES;

/** Everything a chord can turn out to be, including the derived ones. */
export type ChordShape = ShapeId | "m7b5" | "dim7" | "aug" | "sus";

/**
 * What each lean zone means inside each family. "natural" is whatever the scale
 * says belongs on that degree; "natural7" is the same with one more third on
 * top. Everything else forces a shape regardless of the key.
 */
const FAMILY_ZONES: Record<Family, Record<ChordQuality, ShapeId | "natural" | "natural7">> = {
  classic: { min7: "min7", min: "min", natural: "natural", maj: "maj", dom7: "dom7" },
  sevenths: { min7: "min9", min: "min7", natural: "natural7", maj: "maj7", dom7: "dom9" },
  colors: { min7: "min6", min: "sus2", natural: "natural", maj: "sus4", dom7: "maj6" },
};

/** MIDI 48 is the C two octaves below concert A — a comfortable middle. */
const BASE_MIDI = 48;

export interface Chord {
  /** The frequencies to sound, in Hz. */
  frequencies: number[];
  /** Letter name: "A", "Am", "Bbmaj7". */
  name: string;
  /** Solfège name: "La", "La m", "Sib maj7". */
  solfege: string;
  /** Position in the key: "IV", "iv7", "♭VII". */
  numeral: string;
  /** What it turned out to be, for matching in song mode. */
  shape: ChordShape;
  /** Pitch class of the root, 0 to 11. -1 for the fixed-frequency scales. */
  rootPc: number;
  /** Used to pick the colour on screen. */
  flavour: TriadQuality;
  /** 0 to 1, how much tension the chord carries. */
  tension: number;
}

const SUFFIX: Record<ChordShape, string> = {
  maj: "",
  min: "m",
  dim: "dim",
  aug: "+",
  sus: "sus",
  dom7: "7",
  min7: "m7",
  maj7: "maj7",
  min9: "m9",
  dom9: "9",
  maj6: "6",
  min6: "m6",
  sus2: "sus2",
  sus4: "sus4",
  m7b5: "m7♭5",
  dim7: "dim7",
};

const NUMERAL_SUFFIX: Partial<Record<ChordShape, string>> = {
  dom7: "7",
  min7: "7",
  maj7: "maj7",
  min9: "9",
  dom9: "9",
  maj6: "6",
  min6: "6",
  sus2: "sus2",
  sus4: "sus4",
  m7b5: "ø7",
  dim7: "°7",
};

const FLAVOUR: Record<ChordShape, TriadQuality> = {
  maj: "maj",
  min: "min",
  dim: "dim",
  aug: "aug",
  sus: "sus",
  dom7: "maj",
  min7: "min",
  maj7: "maj",
  min9: "min",
  dom9: "maj",
  maj6: "maj",
  min6: "min",
  sus2: "sus",
  sus4: "sus",
  m7b5: "dim",
  dim7: "dim",
};

/** Tension per lean zone. Kept the same across families so the colour on screen
 *  keeps meaning the same thing: further from centre is further from rest. */
const TENSION: Record<ChordQuality, number> = {
  natural: 0.25,
  maj: 0.35,
  min: 0.45,
  dom7: 0.9,
  min7: 0.7,
};

export interface BuildChordInput {
  scale: Scale;
  /** Tonic of the key, 0 for C through 11 for B. Ignored by tone scales. */
  root: number;
  /** 1 through however many notes the scale has. */
  degree: number;
  quality: ChordQuality;
  octave: number;
  tuning: Tuning;
  /** Which colour family the other hand is holding. */
  family?: Family;
  /** Chromatic shift from sliding to the edge of the frame: -1, 0 or +1. */
  shift?: number;
}

export function buildChord(input: BuildChordInput): Chord {
  return input.scale.kind === "tones" ? buildToneChord(input) : buildStepChord({ ...input, scale: input.scale });
}

function buildStepChord({
  scale,
  root,
  degree,
  quality,
  octave,
  tuning,
  family = "classic",
  shift = 0,
}: BuildChordInput & { scale: StepScale }): Chord {
  const index = Math.min(Math.max(degree, 1), scale.steps.length) - 1;

  // The pentatonic scales borrow their chords from the full scale their notes
  // come from, which sounds far better than stacking five notes on themselves.
  const chordSource = scale.borrowedFrom ?? scale.steps;
  const borrowed = scale.borrowedFrom ? chordSource.indexOf(scale.steps[index]) : -1;
  const sourceIndex = borrowed >= 0 ? borrowed : index;

  let rule = FAMILY_ZONES[family][quality];
  // A shifted degree has left the key, so "whatever the key says" stops meaning
  // anything. Borrowed chords (♭VII, ♭III, ♭VI) are nearly always major, so
  // that is what an upright hand gets at the edge — maj7 in the sevenths family.
  if (shift !== 0) {
    if (rule === "natural") rule = "maj";
    if (rule === "natural7") rule = "maj7";
  }
  let intervals: readonly number[];
  let shape: ChordShape;
  if (rule === "natural") {
    const natural = triadAt(chordSource, sourceIndex);
    intervals = natural.intervals;
    shape = natural.quality;
  } else if (rule === "natural7") {
    const seventh = seventhAt(chordSource, sourceIndex);
    intervals = seventh.intervals;
    shape = seventh.quality;
  } else {
    intervals = SHAPES[rule];
    shape = rule;
  }

  const chordRoot = root + scale.steps[index] + shift;
  const base = BASE_MIDI + chordRoot + octave * 12;

  const frequencies = intervals.map((interval) => midiToFrequency(base + interval, tuning));
  // The root doubled an octave down is what gives the chord a body.
  frequencies.push(midiToFrequency(base - 12, tuning));

  const flavour = FLAVOUR[shape];
  // A lowered chord is spelled with flats, the way it appears on a chart.
  const preferFlat = shift < 0;
  const accidental = shift < 0 ? "♭" : shift > 0 ? "♯" : "";

  // The numeral keeps the triad's own marking (vii°, III+); sus chords are
  // written uppercase with their suffix carrying the story.
  const numeralQuality = flavour === "sus" ? "maj" : flavour;

  return {
    frequencies,
    name: letterName(chordRoot, preferFlat) + SUFFIX[shape],
    solfege: solfegeName(chordRoot, preferFlat) + (SUFFIX[shape] ? ` ${SUFFIX[shape]}` : ""),
    numeral: accidental + numeralFor(sourceIndex, numeralQuality) + (NUMERAL_SUFFIX[shape] ?? ""),
    shape,
    rootPc: pitchClass(chordRoot),
    flavour,
    tension: TENSION[quality],
  };
}

/**
 * The tone scales are absolute frequencies, so there is no root, no
 * transposition and no chord in the usual sense. Leaning the hand thickens the
 * sound instead — an octave, a fifth, a sub — which is how drone and sound-bath
 * music is built anyway. Families and shifts do not apply here.
 */
function buildToneChord({ scale, degree, quality, octave }: BuildChordInput): Chord {
  const tones = scale as ToneScale;
  const index = Math.min(Math.max(degree, 1), tones.frequencies.length) - 1;
  const fundamental = tones.frequencies[index] * Math.pow(2, octave);

  // Below ~600 Hz a tone thickens upward, with octaves and fifths above it.
  // Above that, the added octave turns piercing — the ear is most sensitive
  // right where 963×2 lands — so bright tones thicken downward instead. The
  // named frequency itself is present either way; only its company moves.
  const bright = fundamental >= 600;
  const multipliers: Record<ChordQuality, number[]> = bright
    ? {
        natural: [1, 0.5],
        min: [0.5, 1],
        maj: [1, 0.5, 0.25],
        dom7: [1, 0.75, 0.5],
        min7: [0.5, 1, 0.25],
      }
    : {
        natural: [1, 2],
        min: [0.5, 1],
        maj: [1, 2, 3],
        dom7: [1, 1.5, 2],
        min7: [0.5, 1, 2],
      };

  return {
    frequencies: multipliers[quality].map((multiplier) => fundamental * multiplier),
    name: `${Math.round(fundamental)} Hz`,
    solfege: `${Math.round(fundamental)} Hz`,
    numeral: tones.labels[index] ?? "",
    shape: "sus",
    rootPc: -1,
    flavour: "sus",
    // Colour rises with the frequency, so the palette walks up the spectrum.
    tension: index / Math.max(1, tones.frequencies.length - 1),
  };
}

/**
 * A single scale degree as one note rather than a chord — the melody voicing.
 * The octave-down double is left out so lines stay clean.
 */
export function buildNote(input: BuildChordInput): Chord {
  if (input.scale.kind === "tones") return buildToneChord(input);

  const scale = input.scale;
  const index = Math.min(Math.max(input.degree, 1), scale.steps.length) - 1;
  const shift = input.shift ?? 0;
  const noteRoot = input.root + scale.steps[index] + shift;
  const base = BASE_MIDI + 12 + noteRoot + input.octave * 12; // an octave up: melody register

  const preferFlat = shift < 0;
  const accidental = shift < 0 ? "♭" : shift > 0 ? "♯" : "";
  const chordSource = scale.borrowedFrom ?? scale.steps;
  const borrowed = scale.borrowedFrom ? chordSource.indexOf(scale.steps[index]) : -1;

  return {
    frequencies: [midiToFrequency(base, input.tuning)],
    name: letterName(noteRoot, preferFlat),
    solfege: solfegeName(noteRoot, preferFlat),
    numeral: accidental + numeralFor(borrowed >= 0 ? borrowed : index, "maj"),
    shape: "maj",
    rootPc: pitchClass(noteRoot),
    flavour: "maj",
    tension: 0.3,
  };
}

export interface FreeNote {
  frequency: number;
  name: string;
  solfege: string;
  /** How far off the nearest named note, in cents. A hundred cents is a semitone. */
  cents: number;
}

/**
 * Free mode ignores scales. Horizontal position is pitch with no steps in
 * between, so you can slide between notes the way a theremin or a fretless
 * instrument does. Two and a half octaves across the frame.
 */
export function freePitch(x: number, octave: number, tuning: Tuning = 440): FreeNote {
  const midi = BASE_MIDI + x * 30 + octave * 12;
  const nearest = Math.round(midi);
  return {
    frequency: midiToFrequency(midi, tuning),
    name: letterName(nearest),
    solfege: solfegeName(nearest),
    cents: Math.round((midi - nearest) * 100),
  };
}

/** Stacks octaves and fifths on a single note, for free mode. */
export function freeStack(frequency: number, voices: number): number[] {
  const stack = [frequency];
  if (voices >= 2) stack.push(frequency * 1.5); // the fifth
  if (voices >= 3) stack.push(frequency * 2); // the octave
  if (voices >= 4) stack.push(frequency * 3); // the fifth above that
  if (voices >= 5) stack.push(frequency / 2); // the bass
  return stack;
}

export { pitchClass, scaleLength };
