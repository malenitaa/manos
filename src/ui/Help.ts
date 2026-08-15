/**
 * The help panel: the whole instruction manual behind one button.
 *
 * The legend in the corner is a reminder for someone already playing. This is
 * for someone who has just arrived, and it is the only place the gestures are
 * explained on a phone, where the corner legend does not fit.
 */

import { renderEmphasis, type Translate, type TranslationKey } from "../i18n";
import { clear, element } from "./dom";

const GESTURE_KEYS: TranslationKey[] = [
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

const SECTIONS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "help.hands.title", body: "help.hands.body" },
  { title: "help.modes.title", body: "help.modes.body" },
  { title: "help.rhythm.title", body: "help.rhythm.body" },
  { title: "help.record.title", body: "help.record.body" },
  { title: "help.tips.title", body: "help.tips.body" },
  { title: "help.privacy.title", body: "help.privacy.body" },
];

export class Help {
  private open = false;

  constructor(
    private overlay: HTMLElement,
    private card: HTMLElement,
    private button: HTMLButtonElement,
  ) {
    this.button.addEventListener("click", () => this.toggle());
    // Clicking the backdrop closes; clicking inside the card does not.
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.hide();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.open) this.hide();
    });
  }

  render(t: Translate) {
    this.button.textContent = t("help.open");
    this.button.setAttribute("aria-label", t("help.title"));

    clear(this.card);
    const close = element("button", { className: "close", text: "✕", attrs: { type: "button" } });
    close.setAttribute("aria-label", t("help.close"));
    close.addEventListener("click", () => this.hide());

    const gestures = element("ul", { className: "gesture-list" });
    for (const key of GESTURE_KEYS) {
      gestures.append(element("li", {}, [renderEmphasis(t(key))]));
    }

    this.card.append(
      close,
      element("h2", { text: t("help.title") }),
      element("p", { className: "lead", text: t("help.intro") }),
      element("h3", { text: t("help.gestures.title") }),
      gestures,
      ...SECTIONS.flatMap(({ title, body }) => [
        element("h3", { text: t(title) }),
        element("p", { text: t(body) }),
      ]),
    );
  }

  toggle() {
    if (this.open) this.hide();
    else this.show();
  }

  show() {
    this.open = true;
    this.overlay.classList.remove("gone");
    this.card.scrollTop = 0;
  }

  hide() {
    this.open = false;
    this.overlay.classList.add("gone");
  }
}
