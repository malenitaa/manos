/**
 * The bug button. There is no server to receive anything, so feedback rides on
 * a mailto: link — it opens the player's own mail app with the report already
 * addressed and the technical details pre-filled. Nothing is sent silently;
 * they see exactly what goes out, and it goes out only when they press send.
 */

import type { Translate } from "../i18n";
import type { Settings } from "./settings";

/** Where reports land. One place to change it. */
export const FEEDBACK_EMAIL = "malvertva99@gmail.com";

export interface FeedbackContext {
  settings: Settings;
  fps: number;
}

export function buildFeedbackLink(t: Translate, { settings, fps }: FeedbackContext): string {
  // The state that has mattered in every bug so far: what was selected, how
  // fast the camera was running, and what browser this is.
  const info = [
    `mode: ${settings.mode} · root: ${settings.root} · tuning: ${settings.tuning}`,
    `timbre: ${settings.timbre}${settings.duo ? ` + ${settings.timbreLeft} (duet)` : ""} · voicing: ${settings.voicing}`,
    `drums: ${settings.drums ? `on, ${settings.tempo} bpm` : "off"} · smoothness: ${settings.smoothness}`,
    `camera: ${fps} fps · screen: ${window.innerWidth}×${window.innerHeight}`,
    `browser: ${navigator.userAgent}`,
  ].join("\n");

  const subject = encodeURIComponent(t("feedback.subject"));
  const body = encodeURIComponent(t("feedback.body", { info }));
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}
