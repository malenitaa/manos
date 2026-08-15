/**
 * Colour follows harmony. Major chords sit in gold, minor ones in pink, and the
 * more tension a chord carries the further it drifts towards violet — so the
 * screen tells you what you are hearing before you can name it.
 */

import type { TriadQuality } from "../music/theory";

export interface Palette {
  main: string;
  glow: string;
  soft: string;
}

export const NEUTRAL: Palette = {
  main: "rgba(244, 241, 234, 0.75)",
  glow: "rgba(244, 241, 234, 0.35)",
  soft: "rgba(244, 241, 234, 0.16)",
};

/** Where each kind of chord sits on the colour wheel. */
const HUES: Record<TriadQuality, (tension: number) => number> = {
  maj: (tension) => 46 - tension * 14, // gold, warming towards amber
  min: (tension) => 320 + tension * 10, // pink into magenta
  dim: () => 270, // violet
  aug: () => 22, // orange
  sus: (tension) => 190 - tension * 60, // teal walking towards green
};

export function paletteFor(flavour: TriadQuality, tension: number): Palette {
  const hue = (HUES[flavour] ?? HUES.maj)(tension);
  const saturation = 90;
  return {
    main: `hsl(${hue} ${saturation}% 62%)`,
    glow: `hsl(${hue} ${saturation}% 55% / 0.55)`,
    soft: `hsl(${hue} ${saturation}% 70% / 0.18)`,
  };
}
