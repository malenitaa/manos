/**
 * Reading a pasted chord chart.
 *
 * The input is whatever the player copied: chords alone, chords over lyrics,
 * section headers. Anything that parses as a chord symbol is kept in order;
 * lines that are mostly words are treated as lyrics and skipped whole, so a
 * lyric that happens to start with "A" does not become a chord.
 */

import type { ShapeId } from "../music/chords";

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

interface QualityRule {
  shape: ShapeId;
  /** Set when the written chord is not exactly playable and this is the nearest. */
  approximated?: boolean;
}

/**
 * Every suffix the parser understands, mapped to the closest playable shape.
 * Exact matches first; below them, the chords that get simplified — a 13th
 * played as a plain dominant still functions as one.
 */
const QUALITIES: Record<string, QualityRule> = {
  "": { shape: "maj" },
  maj: { shape: "maj" },
  M: { shape: "maj" },
  m: { shape: "min" },
  min: { shape: "min" },
  "-": { shape: "min" },
  "7": { shape: "dom7" },
  "9": { shape: "dom9" },
  maj7: { shape: "maj7" },
  M7: { shape: "maj7" },
  "Δ": { shape: "maj7" },
  "Δ7": { shape: "maj7" },
  m7: { shape: "min7" },
  min7: { shape: "min7" },
  m9: { shape: "min9" },
  "6": { shape: "maj6" },
  m6: { shape: "min6" },
  sus2: { shape: "sus2" },
  sus4: { shape: "sus4" },
  sus: { shape: "sus4" },
  dim: { shape: "dim" },
  "°": { shape: "dim" },
  o: { shape: "dim" },

  maj9: { shape: "maj7", approximated: true },
  add9: { shape: "maj", approximated: true },
  madd9: { shape: "min", approximated: true },
  "69": { shape: "maj6", approximated: true },
  "6/9": { shape: "maj6", approximated: true },
  m7b5: { shape: "min7", approximated: true },
  "ø": { shape: "min7", approximated: true },
  "ø7": { shape: "min7", approximated: true },
  dim7: { shape: "dim", approximated: true },
  "°7": { shape: "dim", approximated: true },
  aug: { shape: "maj", approximated: true },
  "+": { shape: "maj", approximated: true },
  "7sus4": { shape: "sus4", approximated: true },
  "11": { shape: "dom7", approximated: true },
  "13": { shape: "dom7", approximated: true },
  "7b9": { shape: "dom7", approximated: true },
  "7#9": { shape: "dom7", approximated: true },
  "5": { shape: "maj", approximated: true },
};

export interface SongChord {
  /** As the player wrote it: "Bbmaj7", "E7/G#". */
  token: string;
  /** Pitch class of the root, 0 to 11. */
  pc: number;
  /** The shape it will be played as. */
  shape: ShapeId;
  /** The written quality, when the played one is only an approximation. */
  approximatedFrom?: string;
  /** A slash bass that will not sound — inversions are not playable yet. */
  bass?: string;
}

export interface ParsedSong {
  /** Every chord, in playing order, repeats included. */
  sequence: SongChord[];
  /** Tokens that looked like chords but could not be read. */
  skipped: string[];
}

const CHORD_PATTERN = /^([A-G])([#♯b♭]?)([^/]*)(?:\/([A-G][#♯b♭]?))?$/;

export function parseChordToken(token: string): SongChord | null {
  const cleaned = token.replace(/[(),.]/g, "").trim();
  const match = CHORD_PATTERN.exec(cleaned);
  if (!match) return null;

  const [, letter, accidental, suffix, bass] = match;
  const rule = QUALITIES[suffix as keyof typeof QUALITIES] ?? QUALITIES[suffix.toLowerCase()];
  if (!rule) return null;

  let pc = NOTE_PC[letter];
  if (accidental === "#" || accidental === "♯") pc += 1;
  if (accidental === "b" || accidental === "♭") pc -= 1;

  return {
    token: cleaned,
    pc: ((pc % 12) + 12) % 12,
    shape: rule.shape,
    approximatedFrom: rule.approximated ? letter + accidental + suffix : undefined,
    bass: bass || undefined,
  };
}

export function parseSong(text: string): ParsedSong {
  const sequence: SongChord[] = [];
  const skipped: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    // Section headers like [Chorus] or (Intro) are structure, not chords.
    const stripped = line.replace(/\[[^\]]*\]/g, " ").trim();
    if (!stripped) continue;

    const tokens = stripped.split(/[\s|]+/).filter(Boolean);
    const parsed = tokens.map((token) => ({ token, chord: parseChordToken(token) }));
    const hits = parsed.filter((entry) => entry.chord).length;

    // A line that is mostly words is lyrics; skip it whole so stray one-letter
    // words do not turn into chords.
    if (hits === 0 || hits < tokens.length / 2) continue;

    for (const entry of parsed) {
      if (entry.chord) sequence.push(entry.chord);
      else skipped.push(entry.token);
    }
  }

  return { sequence, skipped };
}
