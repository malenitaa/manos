/**
 * The bug button. There is no server to receive anything, so feedback lands as
 * a GitHub issue — the button opens the repo's issue form with the technical
 * details pre-filled. Nothing is sent silently; the player sees exactly what
 * goes out, and it goes out only when they press submit.
 *
 * It used to be a mailto:, but a personal address inside a public bundle is a
 * harvest waiting to happen. The issue tracker is public anyway.
 */

import type { Translate } from "../i18n";
import type { Settings } from "./settings";

/** Where reports land. One place to change it. */
export const FEEDBACK_URL = "https://github.com/malenitaa/manos/issues/new";

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

  const title = encodeURIComponent(t("feedback.subject"));
  // Fenced, so the details read as a tidy block in the issue.
  const body = encodeURIComponent(t("feedback.body", { info: "```\n" + info + "\n```" }));
  return `${FEEDBACK_URL}?title=${title}&body=${body}`;
}
