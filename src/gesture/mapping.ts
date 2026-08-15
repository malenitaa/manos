/**
 * The instrument's rules: which gesture means what.
 *
 * This is the only file that decides how the thing is played, and it is
 * deliberately abstract. It does not try to recognise guitar or piano shapes —
 * a D chord is a different shape on every instrument, and reading fretting
 * hands from a webcam is both fragile and meaningless. What a camera reads well
 * is countable, positional things, so those are what the instrument uses:
 *
 *   how many fingers   →  which degree of the scale
 *   how far it leans   →  whether that degree is dark, plain or tense
 *   how high it is     →  which octave
 *   the other hand     →  how loud and how bright
 */

import { clamp, remap } from "../vision/landmarks";
import type { HandReading } from "../vision/types";
import { Steady } from "./Steady";

export type ChordQuality = "min7" | "min" | "natural" | "maj" | "dom7";

/**
 * The colour family, held by the expression hand: an open hand plays plain
 * triads, two fingers turn the same leans into sevenths and ninths, one finger
 * into sus and sixth chords. Five lean zones were not enough room for every
 * chord a chart can ask for; five zones by three families is.
 */
export type Family = "classic" | "sevenths" | "colors";

export const QUALITY_ORDER: ChordQuality[] = ["min7", "min", "natural", "maj", "dom7"];

/** Boundaries in degrees between the five lean zones. */
const QUALITY_EDGES = [-45, -15, 15, 45];

/** How far past a boundary you have to lean before the zone actually changes. */
const QUALITY_HYSTERESIS = 6;

/** Where the frame splits into low, middle and high octaves. */
const OCTAVE_EDGES = { high: 0.36, low: 0.64 };
const OCTAVE_HYSTERESIS = 0.05;

export interface PlayIntent {
  handId: number;
  /** 1 to 7. Zero means this hand is silent. */
  degree: number;
  quality: ChordQuality;
  /** -1, 0 or +1. */
  octave: number;
  /** Chromatic shift from holding the hand at the edge of the frame. */
  shift: number;
  /** Horizontal position of the palm, used by free mode. */
  position: number;
  /** How many notes to stack, used by free mode. */
  voices: number;
}

export interface ExpressionIntent {
  volume: number;
  brightness: number;
}

/**
 * Which degree the hand is asking for, from 0 to 7.
 *
 * You count I to IV on the four long fingers, the way anyone counts to four.
 * The thumb adds five: thumb alone is V, thumb and one finger is VI, thumb and
 * two is VII. One hand covers all seven degrees, and a closed fist is silence.
 */
export function degreeFromHand(hand: HandReading): number {
  if (hand.thumb) return clamp(5 + hand.longFingerCount, 5, 7);
  return hand.longFingerCount;
}

/**
 * Which colour that degree takes, from how far the hand leans.
 *
 * Upright is whatever the key says the chord should be. Leaning one way darkens
 * it into a minor, leaning the other adds the tension of a seventh. It is the
 * same move a musician makes when they want a chord to ache, turned into a
 * gesture you can feel.
 */
export function qualityFromTilt(tilt: number, previous: ChordQuality): ChordQuality {
  const previousIndex = QUALITY_ORDER.indexOf(previous);
  let index = 0;
  for (let i = 0; i < QUALITY_EDGES.length; i++) {
    // Push each boundary away from the zone currently held, so small wobbles
    // near an edge do not flip back and forth.
    const bias = previousIndex <= i ? QUALITY_HYSTERESIS : -QUALITY_HYSTERESIS;
    if (tilt > QUALITY_EDGES[i] + bias) index = i + 1;
  }
  return QUALITY_ORDER[index];
}

/**
 * Chromatic shift from the horizontal edges of the frame: hold the chord hand
 * at the far left and the root drops a semitone, far right and it rises. This
 * is how chords from outside the key are reached — the common borrowed chords
 * (♭VII, ♭III, ♭VI) are all one flat away from a degree you already have.
 * Hysteresis keeps the boundary from flapping while you hover near it.
 */
export function shiftFromX(x: number, previous: number): number {
  if (previous === -1) return x < 0.19 ? -1 : x > 0.85 ? 1 : 0;
  if (previous === 1) return x > 0.81 ? 1 : x < 0.15 ? -1 : 0;
  return x < 0.15 ? -1 : x > 0.85 ? 1 : 0;
}

/**
 * Which family the expression hand is holding. Open or resting is the plain
 * one; two fingers is sevenths; one finger is colours. Runs through a Steady
 * so a finger caught mid-move cannot flip the whole harmony for a frame.
 */
export function familyFromHand(hand: HandReading | undefined, steady: Steady<Family>): Family {
  let next: Family = "classic";
  if (hand && hand.fingerCount > 0) {
    if (hand.longFingerCount === 2) next = "sevenths";
    else if (hand.longFingerCount === 1) next = "colors";
  }
  return steady.push(next);
}

/** Octave from height: high in the frame is high in pitch. */
export function octaveFromHeight(y: number, previous: number): number {
  const high = OCTAVE_EDGES.high + (previous === 1 ? OCTAVE_HYSTERESIS : -OCTAVE_HYSTERESIS);
  const low = OCTAVE_EDGES.low + (previous === -1 ? -OCTAVE_HYSTERESIS : OCTAVE_HYSTERESIS);
  if (y < high) return 1;
  if (y > low) return -1;
  return 0;
}

/**
 * The expression hand. Height is loudness, openness is brightness, and a closed
 * fist is silence — the same three things a player controls without thinking.
 */
export function expressionFromHand(hand: HandReading | undefined): ExpressionIntent {
  if (!hand) return { volume: 0.78, brightness: 0.62 };
  if (hand.fingerCount === 0) return { volume: 0, brightness: 0.4 };
  return {
    volume: remap(hand.palm.y, 0.88, 0.12, 0.1, 1),
    brightness: remap(hand.openness, 0, 1, 0.16, 1),
  };
}

interface HandMemory {
  degree: Steady<number>;
  quality: ChordQuality;
  octave: number;
  shift: number;
}

/**
 * Reads intents while remembering each hand between frames, which is what the
 * hysteresis and the anti-flicker filter need to work.
 */
export class GestureReader {
  private memories = new Map<number, HandMemory>();
  private framesNeeded = 4;

  /** How long a changed finger count has to hold before the chord follows. */
  setFramesNeeded(frames: number) {
    this.framesNeeded = frames;
    for (const memory of this.memories.values()) memory.degree.setFramesNeeded(frames);
  }

  read(hand: HandReading): PlayIntent {
    let memory = this.memories.get(hand.id);
    if (!memory) {
      memory = { degree: new Steady(0, this.framesNeeded), quality: "natural", octave: 0, shift: 0 };
      this.memories.set(hand.id, memory);
    }

    memory.octave = octaveFromHeight(hand.palm.y, memory.octave);
    memory.quality = qualityFromTilt(hand.tilt, memory.quality);
    memory.shift = shiftFromX(hand.palm.x, memory.shift);
    const degree = memory.degree.push(degreeFromHand(hand));

    return {
      handId: hand.id,
      degree,
      quality: memory.quality,
      octave: memory.octave,
      shift: memory.shift,
      position: hand.palm.x,
      voices: Math.max(1, hand.fingerCount),
    };
  }

  /** Drops memory for hands that are no longer on screen. */
  keepOnly(ids: Iterable<number>) {
    const alive = new Set(ids);
    for (const id of this.memories.keys()) {
      if (!alive.has(id)) this.memories.delete(id);
    }
  }
}
