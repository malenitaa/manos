/**
 * The chord map: a row of chips along the bottom showing what each finger
 * count plays, in the current key, scale and family. This is the missing link
 * for playing from a chart — the relation between fingers and chords existed
 * but was written nowhere.
 *
 * The chips are generated from the theory tables, never by hand, so they are
 * always right for whatever key and scale are selected. The chip being played
 * lights up, which is also what makes song mode followable.
 */

import { LOCALES, type Locale, type Translate } from "../i18n";
import { buildChord, buildNote } from "../music/chords";
import { SCALES, scaleLength, type ScaleId } from "../music/theory";
import type { Family } from "../gesture/mapping";
import type { Settings } from "../app/settings";
import { clear, element } from "./dom";

/** The gesture glyph for each 1-based degree: fingers, then thumb combinations. */
export function gestureGlyph(degree: number): string {
  if (degree <= 4) return String(degree);
  if (degree === 5) return "👍";
  return `👍+${degree - 5}`;
}

export class ChordMap {
  private chips: HTMLElement[] = [];
  private activeDegree = 0;

  constructor(private root: HTMLElement) {}

  render(settings: Settings, family: Family, _t: Translate) {
    clear(this.root);
    this.chips = [];

    const visible = settings.showMap && settings.mode !== "free";
    this.root.classList.toggle("gone", !visible);
    if (!visible) return;

    const scale = SCALES[settings.mode as ScaleId];
    const locale: Locale = LOCALES[settings.language];
    const letterFirst = locale.notation === "letter";
    const length = scaleLength(scale);

    for (let degree = 1; degree <= length; degree++) {
      const input = {
        scale,
        root: settings.root,
        degree,
        quality: "natural" as const,
        octave: 0,
        tuning: settings.tuning,
        family,
      };
      const chord = settings.voicing === "notes" ? buildNote(input) : buildChord(input);
      const name = letterFirst ? chord.name : chord.solfege;

      const chip = element("div", { className: "chip" }, [
        element("span", { className: "g", text: gestureGlyph(degree) }),
        element("span", { className: "n", text: name }),
        element("span", { className: "r", text: chord.numeral }),
      ]);
      this.chips.push(chip);
      this.root.append(chip);
    }

    this.setActive(this.activeDegree);
  }

  /** Lights up the chip being played. Zero means nothing is sounding. */
  setActive(degree: number) {
    // On a seven-note scale, thumb + 3 still sounds the last degree — the
    // highlight follows the same clamping the chord builder applies.
    this.activeDegree = degree > 0 ? Math.min(degree, this.chips.length) : 0;
    this.chips.forEach((chip, i) => chip.classList.toggle("on", i === this.activeDegree - 1));
  }
}
