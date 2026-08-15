/**
 * The controls panel.
 *
 * It owns no state of its own: it writes into the settings object it was given
 * and reports which key changed. The whole thing is rebuilt when the language
 * changes, which is simpler and cheaper than tracking every label.
 */

import { TIMBRE_GROUPS, type TimbreId } from "../audio";
import { LANGUAGES, LOCALES, type Language, type Translate, type TranslationKey } from "../i18n";
import { LETTER_NAMES, SOLFEGE_NAMES, TUNINGS, type ModeId, type ScaleGroup } from "../music/theory";
import { EFFECT_KEYS, RANGES, type EffectKey, type SettingKey, type Settings } from "../app/settings";
import { clear, element } from "./dom";

/** The order scales appear in, and which heading they sit under. */
const SCALE_GROUPS: { group: ScaleGroup | "free"; label: TranslationKey; modes: ModeId[] }[] = [
  { group: "simple", label: "group.simple", modes: ["guided", "major", "minor", "pentatonicMinor"] },
  { group: "modes", label: "group.modes", modes: ["dorian", "phrygian", "lydian", "mixolydian"] },
  { group: "world", label: "group.world", modes: ["hirajoshi", "hijaz"] },
  { group: "tones", label: "group.tones", modes: ["solfeggio"] },
  { group: "free", label: "group.free", modes: ["free"] },
];

const TOGGLES: { key: "duo" | "swap" | "skeleton" | "showMap" | "showLegend"; label: TranslationKey }[] = [
  { key: "duo", label: "hands.duo" },
  { key: "swap", label: "hands.swap" },
  { key: "skeleton", label: "hands.skeleton" },
  { key: "showMap", label: "map.show" },
  { key: "showLegend", label: "legend.show" },
];

const EFFECT_LABELS: Record<EffectKey, TranslationKey> = {
  reverb: "fx.reverb",
  delay: "fx.delay",
  chorus: "fx.chorus",
  drive: "fx.drive",
};

export type PanelListener = (key: SettingKey, settings: Settings) => void;

export class Panel {
  /** Controls that a fixed-frequency scale makes meaningless. */
  private transposable: HTMLElement[] = [];
  /** Which hand the timbre grid is editing, in duet mode. */
  private editingHand: "left" | "right" = "right";

  constructor(
    private root: HTMLElement,
    private toggleButton: HTMLButtonElement,
    private settings: Settings,
    private onChange: PanelListener,
  ) {
    this.toggleButton.addEventListener("click", () => this.root.classList.toggle("hidden"));
  }

  render(t: Translate) {
    clear(this.root);
    this.transposable = [];
    this.toggleButton.textContent = t("panel.toggle");
    this.toggleButton.setAttribute("aria-label", t("panel.toggle"));
    this.root.append(
      this.scaleSection(t),
      this.keySection(t),
      this.tuningSection(t),
      this.timbreSection(t),
      this.rhythmSection(t),
      this.effectsSection(t),
      this.responseSection(t),
      this.handsSection(t),
      this.languageSection(t),
    );
    this.refreshAvailability();
  }

  /**
   * The solfeggio scale is defined in hertz, so there is nothing to transpose
   * and no tuning reference to apply. Those controls are dimmed rather than
   * hidden, so the panel does not jump around.
   */
  private refreshAvailability() {
    const fixed = this.settings.mode === "solfeggio";
    const noKey = fixed || this.settings.mode === "free";
    for (const node of this.transposable) {
      const disabled = node.dataset.needs === "key" ? noKey : fixed;
      node.classList.toggle("disabled", disabled);
      for (const field of node.querySelectorAll("select, button, input")) {
        (field as HTMLInputElement).disabled = disabled;
      }
    }
  }

  private section(title: string, children: (Node | string)[]): HTMLElement {
    return element("section", {}, [element("h2", { text: title }), ...children]);
  }

  private change(key: SettingKey) {
    this.onChange(key, this.settings);
  }

  private scaleSection(t: Translate): HTMLElement {
    const hint = element("p", { className: "hint" });
    const select = element("select", { attrs: { "aria-label": t("panel.scale") } });

    for (const { label, modes } of SCALE_GROUPS) {
      const group = element("optgroup");
      group.label = t(label);
      for (const mode of modes) {
        const option = element("option", { text: t(`mode.${mode}` as TranslationKey) });
        option.value = mode;
        group.append(option);
      }
      select.append(group);
    }

    select.value = this.settings.mode;
    const paint = () => {
      hint.textContent = t(`mode.${this.settings.mode}.hint` as TranslationKey);
    };
    select.addEventListener("change", () => {
      this.settings.mode = select.value as ModeId;
      paint();
      this.refreshAvailability();
      this.change("mode");
    });

    // Chords or single notes: a small switch, because it changes what every
    // gesture means and should be one tap away.
    const voicing = element("div", { className: "segmented" });
    const voicingButtons: HTMLButtonElement[] = [];
    const paintVoicing = () => {
      for (const button of voicingButtons) {
        button.classList.toggle("on", button.dataset.voicing === this.settings.voicing);
      }
    };
    for (const id of ["chords", "notes"] as const) {
      const button = element("button", { text: t(`voicing.${id}` as TranslationKey), attrs: { type: "button" } });
      button.dataset.voicing = id;
      button.addEventListener("click", () => {
        this.settings.voicing = id;
        paintVoicing();
        this.change("voicing");
      });
      voicingButtons.push(button);
      voicing.append(button);
    }

    paint();
    paintVoicing();
    return this.section(t("panel.scale"), [
      select,
      hint,
      voicing,
      element("p", { className: "hint", text: t("voicing.hint") }),
    ]);
  }

  private keySection(t: Translate): HTMLElement {
    const select = element("select", { attrs: { "aria-label": t("panel.key") } });
    LETTER_NAMES.forEach((letter, index) => {
      const option = element("option", { text: `${letter} — ${SOLFEGE_NAMES[index]}` });
      option.value = String(index);
      select.append(option);
    });
    select.value = String(this.settings.root);
    select.addEventListener("change", () => {
      this.settings.root = Number(select.value);
      this.change("root");
    });

    const section = this.section(t("panel.key"), [select]);
    section.dataset.needs = "key";
    this.transposable.push(section);
    return section;
  }

  private tuningSection(t: Translate): HTMLElement {
    const group = element("div", { className: "segmented" });
    const buttons: HTMLButtonElement[] = [];

    const paint = () => {
      for (const button of buttons) {
        button.classList.toggle("on", Number(button.dataset.tuning) === this.settings.tuning);
      }
    };

    for (const tuning of TUNINGS) {
      const button = element("button", {
        text: t(`tuning.${tuning}` as TranslationKey),
        attrs: { type: "button" },
      });
      button.dataset.tuning = String(tuning);
      button.addEventListener("click", () => {
        this.settings.tuning = tuning;
        paint();
        this.change("tuning");
      });
      buttons.push(button);
      group.append(button);
    }

    paint();
    const section = this.section(t("panel.tuning"), [group, element("p", { className: "hint", text: t("tuning.hint") })]);
    section.dataset.needs = "tuning";
    this.transposable.push(section);
    return section;
  }

  private timbreSection(t: Translate): HTMLElement {
    const hint = element("p", { className: "hint" });
    const buttons: HTMLButtonElement[] = [];

    // In duet mode each hand keeps its own instrument; this picks which one
    // the grid below is editing.
    const editing = (): TimbreId => (this.editingHand === "left" ? this.settings.timbreLeft : this.settings.timbre);
    const handPicker = element("div", { className: "segmented" });
    const handButtons: HTMLButtonElement[] = [];

    const paint = () => {
      hint.textContent = t(`timbre.${editing()}.desc` as TranslationKey);
      for (const button of buttons) {
        button.classList.toggle("on", button.dataset.timbre === editing());
      }
      for (const button of handButtons) {
        button.classList.toggle("on", button.dataset.hand === this.editingHand);
      }
    };

    for (const hand of ["left", "right"] as const) {
      const button = element("button", {
        text: t(`timbre.hand.${hand}` as TranslationKey),
        attrs: { type: "button" },
      });
      button.dataset.hand = hand;
      button.addEventListener("click", () => {
        this.editingHand = hand;
        paint();
      });
      handButtons.push(button);
      handPicker.append(button);
    }

    // One small labelled grid per family of sounds. The groups live next to
    // the presets themselves, so a new sound lands in the right place without
    // touching this file.
    const groups: (Node | string)[] = [];
    for (const group of TIMBRE_GROUPS) {
      const grid = element("div", { className: "timbres" });
      for (const id of group.timbres) {
        const button = element("button", {
          text: t(`timbre.${id}` as TranslationKey),
          attrs: { type: "button" },
        });
        button.dataset.timbre = id;
        button.addEventListener("click", () => {
          if (this.editingHand === "left") {
            this.settings.timbreLeft = id as TimbreId;
            paint();
            this.change("timbreLeft");
          } else {
            this.settings.timbre = id as TimbreId;
            paint();
            this.change("timbre");
          }
        });
        buttons.push(button);
        grid.append(button);
      }
      groups.push(element("p", { className: "group-label", text: t(`timbregroup.${group.id}` as TranslationKey) }), grid);
    }

    paint();
    const children: (Node | string)[] = this.settings.duo
      ? [handPicker, element("p", { className: "hint", text: t("timbre.perhand.hint") }), ...groups, hint]
      : [...groups, hint];
    return this.section(t("panel.timbre"), children);
  }

  /** Drums: a toggle and a tempo. The conducting happens with the hand. */
  private rhythmSection(t: Translate): HTMLElement {
    const toggle = element("input", { attrs: { type: "checkbox" } });
    toggle.checked = this.settings.drums;
    toggle.addEventListener("change", () => {
      this.settings.drums = toggle.checked;
      this.change("drums");
    });

    const tempo = element("input", {
      attrs: { type: "range", min: "50", max: "200", step: "1" },
    });
    tempo.value = String(this.settings.tempo);
    const tempoLabel = element("span", { text: `${t("rhythm.tempo")} · ${this.settings.tempo}` });
    tempo.addEventListener("input", () => {
      this.settings.tempo = Number(tempo.value);
      tempoLabel.textContent = `${t("rhythm.tempo")} · ${this.settings.tempo}`;
      this.change("tempo");
    });

    return this.section(t("panel.rhythm"), [
      element("label", { className: "check" }, [toggle, element("span", { text: t("rhythm.enable") })]),
      element("label", { className: "knob" }, [tempoLabel, tempo]),
      element("p", { className: "hint", text: t("rhythm.hint") }),
    ]);
  }

  private effectsSection(t: Translate): HTMLElement {
    const rows = EFFECT_KEYS.map((key) => {
      const range = RANGES[key];
      const input = element("input", {
        attrs: {
          type: "range",
          min: String(range.min),
          max: String(range.max),
          step: String(range.step),
        },
      });
      input.value = String(this.settings[key]);
      input.addEventListener("input", () => {
        this.settings[key] = Number(input.value);
        this.change(key);
      });
      return element("label", { className: "knob" }, [element("span", { text: t(EFFECT_LABELS[key]) }), input]);
    });
    return this.section(t("panel.effects"), rows);
  }

  /**
   * How the instrument answers your hand. This is the one people reach for
   * first: whether it feels twitchy or feels a beat behind is entirely taste,
   * and depends on the timbre and on how fast you are playing.
   */
  private responseSection(t: Translate): HTMLElement {
    const slider = element("input", {
      attrs: { type: "range", min: "0", max: "1", step: "0.01" },
    });
    slider.value = String(this.settings.smoothness);
    slider.addEventListener("input", () => {
      this.settings.smoothness = Number(slider.value);
      this.change("smoothness");
    });

    const glide = element("input", { attrs: { type: "checkbox" } });
    glide.checked = this.settings.glide;
    glide.addEventListener("change", () => {
      this.settings.glide = glide.checked;
      this.change("glide");
    });

    return this.section(t("panel.response"), [
      element("label", { className: "knob" }, [
        element("span", { text: t("response.smoothness") }),
        slider,
      ]),
      element("p", { className: "hint", text: t("response.smoothness.hint") }),
      element("label", { className: "check" }, [glide, element("span", { text: t("response.glide") })]),
      element("p", { className: "hint", text: t("response.glide.hint") }),
    ]);
  }

  private handsSection(t: Translate): HTMLElement {
    const rows = TOGGLES.map(({ key, label }) => {
      const input = element("input", { attrs: { type: "checkbox" } });
      input.checked = this.settings[key];
      input.addEventListener("change", () => {
        this.settings[key] = input.checked;
        this.change(key);
      });
      return element("label", { className: "check" }, [input, element("span", { text: t(label) })]);
    });
    return this.section(t("panel.hands"), rows);
  }

  private languageSection(t: Translate): HTMLElement {
    const group = element("div", { className: "segmented" });
    for (const code of LANGUAGES) {
      const button = element("button", { text: LOCALES[code].label, attrs: { type: "button" } });
      button.classList.toggle("on", code === this.settings.language);
      button.addEventListener("click", () => {
        this.settings.language = code as Language;
        this.change("language");
      });
      group.append(button);
    }
    return this.section(t("panel.language"), [group]);
  }
}
