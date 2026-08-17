/**
 * Everything on screen that is not the panel: the start card, the gesture
 * legend and the status line. Rebuilt whenever the language changes.
 */

import { renderEmphasis, type Translate, type TranslationKey } from "../i18n";
import { clear, element, requireElement } from "./dom";
import { environmentHint } from "./environment";

/** What a take can be: sound or video, with or without the microphone. */
export interface TakeKind {
  video: boolean;
  voice: boolean;
}

const TAKE_OPTIONS: { kind: TakeKind; label: TranslationKey }[] = [
  { kind: { video: false, voice: false }, label: "record.audio" },
  { kind: { video: false, voice: true }, label: "record.audioVoice" },
  { kind: { video: true, voice: false }, label: "record.video" },
  { kind: { video: true, voice: true }, label: "record.videoVoice" },
];

const LEGEND_KEYS: TranslationKey[] = [
  "legend.degrees",
  "legend.thumb",
  "legend.tilt",
  "legend.octave",
  "legend.fist",
  "legend.other",
  "legend.family",
  "legend.colors",
  "legend.edge",
];

export class Overlay {
  private startScreen = requireElement("start");
  private startCard = requireElement("start-card");
  private legend = requireElement("legend");
  private status = requireElement("status");
  private recordButton = requireElement<HTMLButtonElement>("record-toggle");
  private recordMenu = requireElement("recmenu");
  private feedbackButton = requireElement<HTMLButtonElement>("feedback-toggle");
  private onTakeChosen: ((kind: TakeKind) => void) | null = null;
  private videoSupported = true;
  private startButton: HTMLButtonElement | null = null;
  private errorLine: HTMLElement | null = null;
  private onStart: (() => void) | null = null;
  private t: Translate | null = null;

  render(t: Translate) {
    this.t = t;
    this.renderStart(t);
    this.renderLegend(t);
    this.renderRecordMenu(t);
    this.setRecording(this.recordButton.classList.contains("recording"));
    // The bug button is just the emoji; the words live in its tooltip.
    this.feedbackButton.title = t("feedback.label");
    this.feedbackButton.setAttribute("aria-label", t("feedback.label"));
    if (!this.status.textContent) this.status.textContent = t("app.waiting");
  }

  /** Tells the menu whether to offer video takes at all. Set before render. */
  setVideoSupported(supported: boolean) {
    this.videoSupported = supported;
  }

  private renderRecordMenu(t: Translate) {
    clear(this.recordMenu);
    for (const option of TAKE_OPTIONS) {
      if (option.kind.video && !this.videoSupported) continue;
      const row = element("button", { text: t(option.label), attrs: { type: "button" } });
      row.addEventListener("click", () => {
        this.closeRecordMenu();
        this.onTakeChosen?.(option.kind);
      });
      this.recordMenu.append(row);
    }
    this.recordMenu.append(element("p", { className: "hint", text: t("record.voice.hint") }));
  }

  whenTakeChosen(handler: (kind: TakeKind) => void) {
    this.onTakeChosen = handler;
    // Clicking anywhere else puts the menu away. The record button itself is
    // excluded so its own toggle does not immediately undo itself.
    document.addEventListener("click", (event) => {
      const target = event.target as Node;
      if (!this.recordMenu.contains(target) && !this.recordButton.contains(target)) {
        this.closeRecordMenu();
      }
    });
  }

  toggleRecordMenu() {
    this.recordMenu.classList.toggle("gone");
  }

  closeRecordMenu() {
    this.recordMenu.classList.add("gone");
  }

  whenFeedback(handler: () => void) {
    this.feedbackButton.addEventListener("click", handler);
  }

  setLegendVisible(visible: boolean) {
    this.legend.classList.toggle("gone", !visible);
  }

  private renderStart(t: Translate) {
    clear(this.startCard);

    const button = element("button", { text: t("app.start"), attrs: { type: "button" } });
    button.id = "start-button";
    button.addEventListener("click", () => this.onStart?.());
    this.startButton = button;

    const error = element("p", { className: "fine error" });
    this.errorLine = error;

    this.startCard.append(
      element("h2", { text: "manos" }),
      element("p", { text: t("app.tagline") }),
      element("p", { className: "fine", text: t("app.privacy") }),
    );

    // A kind word where the instrument struggles — never a closed door.
    const hint = environmentHint();
    if (hint) {
      this.startCard.append(element("p", { className: "fine notice", text: t(`app.hint.${hint}`) }));
    }

    this.startCard.append(button, error);
  }

  private renderLegend(t: Translate) {
    clear(this.legend);
    const list = element("ul");
    for (const key of LEGEND_KEYS) {
      list.append(element("li", {}, [renderEmphasis(t(key))]));
    }
    this.legend.append(element("h3", { text: t("legend.title") }), list);
  }

  whenStarted(handler: () => void) {
    this.onStart = handler;
  }

  whenRecordToggled(handler: () => void) {
    this.recordButton.addEventListener("click", handler);
  }

  setRecording(recording: boolean) {
    if (!this.t) return;
    this.recordButton.classList.toggle("recording", recording);
    this.recordButton.textContent = this.t("record.open");
    this.recordButton.setAttribute("aria-label", this.t(recording ? "record.stop" : "record.start"));
    this.recordButton.setAttribute("aria-pressed", String(recording));
  }

  setRecordAvailable(available: boolean) {
    this.recordButton.disabled = !available;
  }

  setStarting(starting: boolean) {
    if (!this.startButton || !this.t) return;
    this.startButton.disabled = starting;
    this.startButton.textContent = starting ? this.t("app.starting") : this.t("app.start");
  }

  showError(message: string) {
    if (this.errorLine) this.errorLine.textContent = message;
  }

  hideStart() {
    this.startScreen.classList.add("gone");
  }

  setStatus(text: string) {
    this.status.textContent = text;
  }
}
