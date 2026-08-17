/**
 * Choosing the key, and the gesture for every chord.
 *
 * Every chord in the song is scored in every key: zero cost if it falls out of
 * the fingers naturally, a little more if it needs a lean, more again if it
 * needs the other hand's family, and the most if it needs the chromatic edge
 * shift. The key with the lowest total wins — which is simply the key where the
 * song is easiest to play.
 */

import type { ChordQuality, Family } from "../gesture/mapping";
import type { ShapeId } from "../music/chords";
import { SCALES, seventhAt, triadAt, type ScaleId, type StepScale } from "../music/theory";
import type { SongChord } from "./parse";

/** Only the full seven-note keys make sense to plan a song in. */
const PLAN_SCALES: ScaleId[] = ["major", "minor"];

/** Which family and lean force each shape, when the key does not give it for free. */
const FORCED: Record<ShapeId, { family: Family; zone: ChordQuality }> = {
  maj: { family: "classic", zone: "maj" },
  min: { family: "classic", zone: "min" },
  dim: { family: "classic", zone: "natural" }, // only diatonic; guarded below
  dom7: { family: "classic", zone: "dom7" },
  min7: { family: "classic", zone: "min7" },
  maj7: { family: "sevenths", zone: "maj" },
  min9: { family: "sevenths", zone: "min7" },
  dom9: { family: "sevenths", zone: "dom7" },
  maj6: { family: "colors", zone: "dom7" },
  min6: { family: "colors", zone: "min7" },
  sus2: { family: "colors", zone: "min" },
  sus4: { family: "colors", zone: "maj" },
};

export interface GesturePlan {
  /** 1-based degree — the finger count. */
  degree: number;
  /** -1, 0 or +1: the edge shift. */
  shift: number;
  family: Family;
  zone: ChordQuality;
  /** 0 = falls out of the fingers; higher = more moving parts. */
  cost: number;
}

export interface PlannedChord extends SongChord {
  /** Null only for a diminished chord whose root is not in the key. */
  plan: GesturePlan | null;
  /** How many chart chords in a row this card absorbed. */
  times: number;
  /** Those chords as written, in order — repeats and slash spellings included. */
  merged: SongChord[];
}

export interface SongPlan {
  root: number;
  scaleId: ScaleId;
  sequence: PlannedChord[];
  /** How many chords in the song need nothing but fingers. */
  directCount: number;
  total: number;
}

function planChord(scale: StepScale, root: number, chord: SongChord): GesturePlan | null {
  const source = scale.borrowedFrom ?? scale.steps;
  let best: GesturePlan | null = null;

  for (let index = 0; index < scale.steps.length; index++) {
    for (const shift of [0, -1, 1]) {
      if ((((root + scale.steps[index] + shift) % 12) + 12) % 12 !== chord.pc) continue;

      const borrowed = scale.borrowedFrom ? source.indexOf(scale.steps[index]) : index;
      const sourceIndex = borrowed >= 0 ? borrowed : index;
      const shiftCost = shift === 0 ? 0 : 3;

      let candidate: GesturePlan | null = null;
      if (shift === 0 && triadAt(source, sourceIndex).quality === chord.shape) {
        // The key hands this chord over for free: fingers alone.
        candidate = { degree: index + 1, shift, family: "classic", zone: "natural", cost: 0 };
      } else if (shift === 0 && seventhAt(source, sourceIndex).quality === chord.shape) {
        // The diatonic seventh: only a family change, no lean.
        candidate = { degree: index + 1, shift, family: "sevenths", zone: "natural", cost: 1 };
      } else if (shift !== 0 && chord.shape === "maj") {
        // At the edge an upright hand plays major, which is what borrowed
        // chords nearly always are — no lean needed.
        candidate = { degree: index + 1, shift, family: "classic", zone: "natural", cost: shiftCost };
      } else if (chord.shape !== "dim") {
        // Forced shapes work anywhere. Diminished is the one shape with no
        // forced gesture, so off-key dim chords stay unreachable.
        const forced = FORCED[chord.shape];
        const familyCost = forced.family === "classic" ? 0 : 1;
        candidate = { degree: index + 1, shift, family: forced.family, zone: forced.zone, cost: 1 + familyCost + shiftCost };
      }

      if (candidate && (best === null || candidate.cost < best.cost)) best = candidate;
    }
  }
  return best;
}

const MINOR_LIKE = new Set(["min", "min7", "min9", "min6", "dim", "dim7", "m7b5"]);
const SUS_LIKE = new Set(["sus2", "sus4", "sus"]);

function colourOf(shape: string): "min" | "sus" | "maj" {
  if (MINOR_LIKE.has(shape)) return "min";
  if (SUS_LIKE.has(shape)) return "sus";
  return "maj";
}

/**
 * Whether what is being played counts as the chart's chord. Deliberately
 * forgiving about the fine colour: playing a plain A where the chart says
 * Amaj7 is the right chord missing a garnish, and a learner should see the
 * strip move for it. It still refuses to confuse A with Am — same root but
 * the opposite colour is a different chord, not a simplification.
 */
export function chordMatches(targetPc: number, targetShape: string, playedPc: number, playedShape: string): boolean {
  if (targetPc !== playedPc) return false;
  return targetShape === playedShape || colourOf(targetShape) === colourOf(playedShape);
}

export function planInKey(sequence: SongChord[], root: number, scaleId: ScaleId): SongPlan {
  const scale = SCALES[scaleId] as StepScale;

  // Consecutive chords that sound identical here collapse into one card: plain
  // repeats ("Cm Cm"), but also spellings this instrument cannot tell apart —
  // "G G/A G/B" is three names for the same played chord, since slash basses do
  // not sound. Duration belongs to the hand, so the strip only ever needs to
  // ask for changes *it can hear*. The names all stay on the card.
  const planned: PlannedChord[] = [];
  for (const chord of sequence) {
    const previous = planned[planned.length - 1];
    if (previous && previous.pc === chord.pc && previous.shape === chord.shape) {
      previous.times += 1;
      previous.merged.push(chord);
      continue;
    }
    planned.push({ ...chord, plan: planChord(scale, root, chord), times: 1, merged: [chord] });
  }

  return {
    root,
    scaleId,
    sequence: planned,
    directCount: planned.filter((chord) => chord.plan?.cost === 0).length,
    total: planned.length,
  };
}

/** Tries all 24 keys and keeps the one where the song is easiest to play. */
export function planSong(sequence: SongChord[]): SongPlan {
  let best: SongPlan | null = null;
  let bestScore = Infinity;

  for (const scaleId of PLAN_SCALES) {
    for (let root = 0; root < 12; root++) {
      const plan = planInKey(sequence, root, scaleId);
      const score = plan.sequence.reduce(
        (total, chord) => total + (chord.plan ? chord.plan.cost + (chord.approximatedFrom ? 1 : 0) : 40),
        0,
      );
      // Ties go to the key where more chords need nothing but fingers — that
      // is usually the key the song was actually written in.
      if (score < bestScore || (score === bestScore && best !== null && plan.directCount > best.directCount)) {
        bestScore = score;
        best = plan;
      }
    }
  }
  // Sequence can be empty; fall back to C major so callers always get a plan.
  return best ?? planInKey(sequence, 0, "major");
}
