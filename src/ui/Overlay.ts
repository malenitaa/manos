/**
 * Everything on screen that is not the panel: the start card, the gesture
 * legend and the status line. Rebuilt whenever the language changes.
 */

import { renderEmphasis, type Translate, type TranslationKey } from "../i18n";
import { clear, element, requireElement } from "./dom";

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
  private feedbackButton = requireElement<HTMLButtonElement>("feedback-toggle");
  private startButton: HTMLButtonElement | null = null;
  private errorLine: HTMLElement | null = null;
  private onStart: (() => void) | null = null;
  private t: Translate | null = null;

  render(t: Translate) {
    this.t = t;
    this.renderStart(t);
    this.renderLegend(t);
    this.setRecording(this.recordButton.classList.contains("recording"));
    // The bug button is just the emoji; the words live in its tooltip.
    this.feedbackButton.title = t("feedback.label");
    this.feedbackButton.setAttribute("aria-label", t("feedback.label"));
    if (!this.status.textContent) this.status.textContent = t("app.waiting");
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
      button,
      error,
    );
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
