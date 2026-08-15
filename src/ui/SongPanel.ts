/**
 * Song mode: paste the chords of what you are reading, get the key and the
 * gesture for each one, and a strip that follows along while you play.
 *
 * The chords come from the player; nothing is fetched. The plan lives in
 * localStorage so the song survives a reload.
 */

import type { ChordQuality, Family } from "../gesture/mapping";
import { LETTER_NAMES, SOLFEGE_NAMES, type ScaleId } from "../music/theory";
import { LOCALES, type Translate, type TranslationKey } from "../i18n";
import { parseSong, type ParsedSong } from "../song/parse";
import { chordMatches, planInKey, planSong, type PlannedChord, type SongPlan } from "../song/plan";
import { clear, element, requireElement } from "./dom";

const STORAGE_KEY = "manos.song.v1";

/** Frames the played chord must match the next card before the strip advances. */
const ADVANCE_FRAMES = 6;

/** Frames away from the current chord before a repeated chord can advance. */
const REARM_FRAMES = 5;

export interface PlayedNow {
  rootPc: number;
  shape: string;
}

interface Stored {
  text: string;
  root?: number;
  scaleId?: ScaleId;
}

export class SongPanel {
  private modal = requireElement("song");
  private card = requireElement("song-card");
  private strip = requireElement("songstrip");
  private button = requireElement<HTMLButtonElement>("song-toggle");

  private text = "";
  private plan: SongPlan | null = null;
  private overridden: { root: number; scaleId: ScaleId } | null = null;
  private current = 0;
  private matchStreak = 0;
  /** Whether the hand has let go of the current chord since arriving at it.
   *  Born false: arriving at a card — including the first — counts as holding it. */
  private rearmed = false;
  private awayStreak = 0;
  private open = false;
  private t: Translate | null = null;
  private language: "en" | "es" = "en";
  private onSongChanged: (() => void) | null = null;

  constructor(private onKeyChosen: (root: number, scaleId: ScaleId) => void) {
    this.button.addEventListener("click", () => this.toggle());
    this.modal.addEventListener("click", (event) => {
      if (event.target === this.modal) this.hide();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.open) this.hide();
    });
    this.restore();
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Stored;
      if (typeof stored.text !== "string" || !stored.text.trim()) return;
      this.text = stored.text;
      if (typeof stored.root === "number" && (stored.scaleId === "major" || stored.scaleId === "minor")) {
        this.overridden = { root: stored.root, scaleId: stored.scaleId };
      }
      this.rebuild(false);
    } catch {
      // A broken stored song is not worth an error; start clean.
    }
  }

  private persist() {
    try {
      if (!this.text.trim()) localStorage.removeItem(STORAGE_KEY);
      else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ text: this.text, root: this.overridden?.root, scaleId: this.overridden?.scaleId }),
        );
      }
    } catch {
      // Storage may be blocked; the song still works for this visit.
    }
  }

  /** Parses the text and plans it, keeping any key override the player made. */
  private rebuild(announce = true) {
    const parsed: ParsedSong = parseSong(this.text);
    if (parsed.sequence.length === 0) {
      this.plan = null;
      return;
    }
    this.plan = this.overridden
      ? planInKey(parsed.sequence, this.overridden.root, this.overridden.scaleId)
      : planSong(parsed.sequence);
    this.current = 0;
    this.matchStreak = 0;
    this.rearmed = false;
    this.awayStreak = 0;
    if (announce) this.onKeyChosen(this.plan.root, this.plan.scaleId);
  }

  /** Whether a song is loaded — the strip is only shown when one is. */
  get hasSong(): boolean {
    return this.plan !== null;
  }

  /** Fires after a song is loaded or removed, for layout that depends on it. */
  whenChanged(handler: () => void) {
    this.onSongChanged = handler;
  }

  get key(): { root: number; scaleId: ScaleId } | null {
    return this.plan ? { root: this.plan.root, scaleId: this.plan.scaleId } : null;
  }

  render(t: Translate, language: "en" | "es") {
    this.t = t;
    this.language = language;
    this.button.textContent = t("song.open");
    this.renderModal();
    this.renderStrip();
  }

  // --- The modal -----------------------------------------------------------

  private renderModal() {
    const t = this.t;
    if (!t) return;
    clear(this.card);

    const close = element("button", { className: "close", text: "✕", attrs: { type: "button" } });
    close.addEventListener("click", () => this.hide());

    const textarea = element("textarea", { attrs: { rows: "6", placeholder: t("song.placeholder") } });
    textarea.value = this.text;

    const load = element("button", { className: "action", text: t("song.load"), attrs: { type: "button" } });
    load.addEventListener("click", () => {
      this.text = textarea.value;
      this.overridden = null;
      this.rebuild();
      this.persist();
      this.renderModal();
      this.renderStrip();
      this.onSongChanged?.();
    });

    const buttons = element("div", { className: "row" }, [load]);
    if (this.plan) {
      const removeSong = element("button", { className: "action quiet", text: t("song.clear"), attrs: { type: "button" } });
      removeSong.addEventListener("click", () => {
        this.text = "";
        this.plan = null;
        this.overridden = null;
        this.persist();
        this.renderModal();
        this.renderStrip();
        this.onSongChanged?.();
      });
      buttons.append(removeSong);
    }

    this.card.append(
      close,
      element("h2", { text: t("song.title") }),
      element("p", { className: "lead", text: t("song.intro") }),
      textarea,
      buttons,
    );

    if (this.text.trim() && !this.plan) {
      this.card.append(element("p", { className: "hint", text: t("song.none") }));
    }
    if (this.plan) this.card.append(...this.summary(this.plan));
  }

  private keyName(root: number, scaleId: ScaleId): string {
    const letterFirst = LOCALES[this.language].notation === "letter";
    const note = letterFirst ? LETTER_NAMES[root] : SOLFEGE_NAMES[root];
    const mode = this.t ? this.t(`mode.${scaleId}` as TranslationKey).toLowerCase() : scaleId;
    return `${note} ${mode}`;
  }

  private summary(plan: SongPlan): HTMLElement[] {
    const t = this.t;
    if (!t) return [];
    const out: HTMLElement[] = [];

    out.push(element("h3", { text: t("song.key", { key: this.keyName(plan.root, plan.scaleId) }) }));
    out.push(element("p", { className: "hint", text: t("song.key.direct", { direct: plan.directCount, total: plan.total }) }));

    // Let the player move the whole song to any of the 24 keys.
    const select = element("select");
    for (const scaleId of ["major", "minor"] as ScaleId[]) {
      for (let root = 0; root < 12; root++) {
        const option = element("option", { text: this.keyName(root, scaleId) });
        option.value = `${root}:${scaleId}`;
        select.append(option);
      }
    }
    select.value = `${plan.root}:${plan.scaleId}`;
    select.addEventListener("change", () => {
      const [root, scaleId] = select.value.split(":");
      this.overridden = { root: Number(root), scaleId: scaleId as ScaleId };
      this.rebuild();
      this.persist();
      this.renderModal();
      this.renderStrip();
    });
    out.push(element("label", { className: "knob wide" }, [element("span", { text: t("song.override") }), select]));

    // One line per distinct chord: its gesture, and any compromise made.
    out.push(element("h3", { text: t("song.chords.title") }));
    const list = element("ul", { className: "gesture-list" });
    const seen = new Set<string>();
    for (const chord of plan.sequence) {
      if (seen.has(chord.token)) continue;
      seen.add(chord.token);

      const notes: string[] = [];
      if (chord.approximatedFrom) {
        notes.push(t("song.approx", { written: chord.approximatedFrom, played: chord.token.replace(/\/.*$/, "") }));
      }
      if (chord.bass) notes.push(t("song.bass", { bass: chord.bass }));
      const gesture = chord.plan ? this.gestureText(chord.plan) : t("song.unplayable");
      const detail = notes.length > 0 ? `${gesture} — ${notes.join("; ")}` : gesture;

      const item = element("li", {}, [element("b", { text: chord.token }), element("span", { text: detail })]);
      if (!chord.plan) item.classList.add("bad");
      list.append(item);
    }
    out.push(list);
    return out;
  }

  /** "pulgar + 1 · inclinada → · otra mano: 2 dedos · al borde izquierdo" */
  private gestureText(plan: { degree: number; shift: number; family: Family; zone: ChordQuality }): string {
    const t = this.t;
    if (!t) return "";
    const parts: string[] = [];

    if (plan.degree <= 4) {
      parts.push(plan.degree === 1 ? t("gesture.finger.one") : t("gesture.fingers", { n: plan.degree }));
    } else if (plan.degree === 5) {
      parts.push(t("gesture.thumb"));
    } else {
      parts.push(t("gesture.thumb.plus", { n: plan.degree - 5 }));
    }

    if (plan.zone !== "natural") parts.push(t(`gesture.tilt.${plan.zone}` as TranslationKey));
    if (plan.family === "sevenths") parts.push(t("gesture.family.sevenths"));
    if (plan.family === "colors") parts.push(t("gesture.family.colors"));
    if (plan.shift < 0) parts.push(t("gesture.shift.flat"));
    if (plan.shift > 0) parts.push(t("gesture.shift.sharp"));

    return parts.join(" · ");
  }

  // --- The strip -----------------------------------------------------------

  private renderStrip() {
    clear(this.strip);
    this.strip.classList.toggle("gone", !this.plan);
    if (!this.plan) return;

    this.plan.sequence.forEach((chord, index) => {
      const card = element("button", { className: "songcard", attrs: { type: "button" } }, [
        element("span", { className: "n", text: chord.token }),
        element("span", { className: "g", text: chord.plan ? this.gestureText(chord.plan) : (this.t?.("song.unplayable") ?? "") }),
      ]);
      if (!chord.plan) card.classList.add("bad");
      else if (chord.approximatedFrom || chord.bass) card.classList.add("warn");
      card.addEventListener("click", () => this.moveTo(index));
      this.strip.append(card);
    });
    this.paintStrip();
  }

  private paintStrip() {
    const cards = Array.from(this.strip.children) as HTMLElement[];
    cards.forEach((card, index) => {
      card.classList.toggle("on", index === this.current);
      card.classList.toggle("done", index < this.current);
      // A stale green from a card we already left would lie.
      if (index !== this.current) card.classList.remove("hit");
    });
    cards[this.current]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  /**
   * Called every frame with what is actually sounding.
   *
   * Two kinds of feedback. Playing the *current* chord turns its card green on
   * the spot — that is the "yes, that's it" the eye needs. Holding the *next*
   * chord for a few frames slides the strip forward. Matching is forgiving
   * about fine colour (a plain A counts for Amaj7) but never about mode (A
   * does not count for Am), so the strip follows a learner without lying.
   */
  follow(played: PlayedNow | null) {
    if (!this.plan) return;

    const current = this.plan.sequence[this.current];
    const hittingCurrent =
      played !== null && current?.plan != null && chordMatches(current.pc, current.shape, played.rootPc, played.shape);
    this.paintHit(hittingCurrent);

    // Re-arming. A repeated chord (C → C) may only advance after the hand has
    // let go of the current one for a moment — otherwise one held C would race
    // through the whole repeat at once. Silence or a different chord both
    // count as letting go. Distinct chords never need this.
    if (hittingCurrent) {
      this.awayStreak = 0;
    } else if (!this.rearmed && ++this.awayStreak >= REARM_FRAMES) {
      this.rearmed = true;
    }

    if (!played) {
      this.matchStreak = 0;
      return;
    }
    const target = this.findNext();
    if (!target) return;

    const matchesNext = chordMatches(target.chord.pc, target.chord.shape, played.rootPc, played.shape);
    const wantsNext = matchesNext && (!hittingCurrent || this.rearmed);
    this.matchStreak = wantsNext ? this.matchStreak + 1 : 0;
    if (this.matchStreak >= ADVANCE_FRAMES) {
      this.moveTo(target.index);
    }
  }

  /** Jumping anywhere resets the per-card state the follower keeps. */
  private moveTo(index: number) {
    this.current = index;
    this.matchStreak = 0;
    this.rearmed = false;
    this.awayStreak = 0;
    this.paintStrip();
  }

  /** The green "that's it" on the current card, per frame. */
  private paintHit(hitting: boolean) {
    const card = this.strip.children[this.current] as HTMLElement | undefined;
    card?.classList.toggle("hit", hitting);
  }

  /** The next playable chord after the current one, skipping unplayable cards. */
  private findNext(): { chord: PlannedChord; index: number } | null {
    if (!this.plan) return null;
    for (let index = this.current + 1; index < this.plan.sequence.length; index++) {
      const chord = this.plan.sequence[index];
      if (chord.plan) return { chord, index };
    }
    return null;
  }

  toggle() {
    if (this.open) this.hide();
    else {
      this.open = true;
      this.modal.classList.remove("gone");
    }
  }

  hide() {
    this.open = false;
    this.modal.classList.add("gone");
  }
}
