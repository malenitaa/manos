/**
 * The four cables, and what each one does with its light.
 *
 * Each cable is an instrument of its own, in a register of its own — bass at
 * the bottom, a voice at the top — so that heard alone each one is clear, and
 * heard together they stack into one chord instead of blurring. All of them
 * draw their notes from the scale and key chosen in the panel, which is what
 * keeps the stack consonant whatever the light does.
 *
 * Nothing here is struck. Light picks a note, and the note changes only when
 * the light has settled on something else for a moment; with these slow
 * sounds a change is a crossfade, not an attack. No light, no sound.
 */

import type { TimbreId } from "../audio";
import { Steady } from "../gesture/Steady";
import { letterName, midiToFrequency, solfegeName, type Scale, type Tuning } from "../music/theory";

export type CableId = "bass" | "drone" | "strings" | "voice";

interface CableSpec {
  id: CableId;
  timbre: TimbreId;
  /** MIDI note of the key's tonic for this cable: its register. 48 is C3. */
  baseMidi: number;
  /** Octaves away from the written tones, for fixed-frequency scales. */
  toneOctave: number;
  /** Which notes of the scale the light can choose between. */
  choices: "root" | "fifth" | "scale";
}

const CABLES: CableSpec[] = [
  { id: "bass", timbre: "sub", baseMidi: 36, toneOctave: -1, choices: "root" },
  { id: "drone", timbre: "drone", baseMidi: 48, toneOctave: 0, choices: "fifth" },
  { id: "strings", timbre: "strings", baseMidi: 60, toneOctave: 0, choices: "scale" },
  { id: "voice", timbre: "choir", baseMidi: 72, toneOctave: 1, choices: "scale" },
];

export interface CableState {
  id: CableId;
  timbre: TimbreId;
  /** The light on this cable, 0 to 1. */
  level: number;
  /** How loud it should sound, 0 to 1. Null while the cable is dark. */
  gain: number | null;
  frequency: number;
  name: string;
  solfege: string;
}

/**
 * Below this the cable is silent. The reader already maps darkness to zero;
 * this just stops the last flicker of grey from holding a note.
 */
const SILENT = 0.03;

/** Frames the light has to point at a new note before the cable moves to it. */
const FRAMES_TO_CHANGE = 20;

interface NoteOption {
  frequency: number;
  name: string;
  solfege: string;
}

/** The scale degrees a cable may play, as semitones above the tonic. */
function stepChoices(steps: number[], choices: CableSpec["choices"]): number[] {
  if (choices === "root") return [0];
  if (choices === "fifth") {
    // The step nearest a perfect fifth: the drone leans between home and away.
    const fifth = steps.reduce((best, step) => (Math.abs(step - 7) < Math.abs(best - 7) ? step : best), steps[0]);
    return fifth === 0 ? [0] : [0, fifth];
  }
  return steps;
}

function optionsFor(cable: CableSpec, scale: Scale, root: number, tuning: Tuning): NoteOption[] {
  if (scale.kind === "steps") {
    return stepChoices(scale.steps, cable.choices).map((step) => ({
      frequency: midiToFrequency(cable.baseMidi + root + step, tuning),
      name: letterName(root + step),
      solfege: solfegeName(root + step),
    }));
  }
  // Fixed tones have no degrees to stack; the cables share the list and sit in
  // different octaves of it.
  const indices =
    cable.choices === "root"
      ? [0]
      : cable.choices === "fifth"
        ? [0, Math.floor(scale.frequencies.length / 2)]
        : scale.frequencies.map((_, i) => i);
  return indices.map((i) => ({
    frequency: scale.frequencies[i] * Math.pow(2, cable.toneOctave),
    name: scale.labels[i],
    solfege: scale.labels[i],
  }));
}

export class CableBoard {
  private steadies = CABLES.map(() => new Steady<number>(0, FRAMES_TO_CHANGE));

  /** Levels arrive one per cable, left to right. */
  update(levels: number[], scale: Scale, root: number, tuning: Tuning): CableState[] {
    return CABLES.map((cable, i) => {
      const level = Math.min(1, Math.max(0, levels[i] ?? 0));
      const options = optionsFor(cable, scale, root, tuning);
      const wanted = Math.min(options.length - 1, Math.floor(level * options.length));
      const index = Math.min(options.length - 1, this.steadies[i].push(wanted));
      const note = options[index];
      return {
        id: cable.id,
        timbre: cable.timbre,
        level,
        // Loudness is not linear in the ear: a little light should already be audible.
        gain: level > SILENT ? Math.sqrt(level) : null,
        frequency: note.frequency,
        name: note.name,
        solfege: note.solfege,
      };
    });
  }

  reset() {
    for (const steady of this.steadies) steady.reset(0);
  }
}
