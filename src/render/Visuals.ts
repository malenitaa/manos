/**
 * Everything drawn on screen, on a transparent canvas laid over the camera.
 *
 * The waveform is not decoration: it is the sound itself. The analyser hands
 * back the last few milliseconds of audio and they are drawn sample by sample.
 * When the line ripples faster, the note is higher — that is the whole
 * relationship between pitch and frequency, visible.
 */

import { BONES } from "../vision/landmarks";
import type { HandReading } from "../vision/types";
import type { Palette } from "./palette";

/** Where the waveform sits vertically, as a fraction of the frame. */
const WAVE_LINE = 0.72;

export interface LabelContent {
  /** The big text: a chord or note name. */
  name: string;
  /** The roman numeral or cent offset, shown smaller in brackets. */
  detail: string;
  /** A quiet line underneath. */
  caption: string;
}

export class Visuals {
  private context: CanvasRenderingContext2D;
  private samples: Float32Array<ArrayBuffer>;
  /** Smoothed peak level, so the drawing breathes instead of twitching. */
  private level = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private analyser: AnalyserNode,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot give a 2D canvas context.");
    this.context = context;
    this.samples = new Float32Array(analyser.fftSize);
  }

  /** Matches the backing store to the CSS size, accounting for retina screens. */
  resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  get width(): number {
    return this.canvas.getBoundingClientRect().width;
  }

  get height(): number {
    return this.canvas.getBoundingClientRect().height;
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawHands(hands: HandReading[], palette: Palette) {
    const { context } = this;
    const w = this.width;
    const h = this.height;

    for (const hand of hands) {
      context.save();
      context.strokeStyle = palette.soft;
      context.lineWidth = 2;
      context.lineCap = "round";
      context.beginPath();
      for (const [from, to] of BONES) {
        context.moveTo(hand.points[from].x * w, hand.points[from].y * h);
        context.lineTo(hand.points[to].x * w, hand.points[to].y * h);
      }
      context.stroke();

      context.fillStyle = palette.glow;
      for (const point of hand.points) {
        context.beginPath();
        context.arc(point.x * w, point.y * h, 3, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
  }

  /** Two passes of the same wave — a wide soft one and a thin bright one. */
  drawWave(palette: Palette) {
    const { context } = this;
    this.analyser.getFloatTimeDomainData(this.samples);

    const w = this.width;
    const h = this.height;
    const middle = h * WAVE_LINE;

    let peak = 0;
    for (const sample of this.samples) peak = Math.max(peak, Math.abs(sample));
    this.level += (peak - this.level) * 0.2;

    const amplitude = Math.min(h * 0.16, h * 0.02 + this.level * h * 0.55);
    const step = Math.max(1, Math.floor(this.samples.length / Math.max(1, w)));

    const trace = (offset: number, colour: string, lineWidth: number, blur: number) => {
      context.save();
      context.strokeStyle = colour;
      context.lineWidth = lineWidth;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.shadowColor = colour;
      context.shadowBlur = blur;
      context.beginPath();
      for (let x = 0, i = 0; x <= w; x++, i += step) {
        const sample = this.samples[Math.min(i, this.samples.length - 1)];
        // Fade the ends so the line does not appear to be cut off.
        const fade = Math.min(1, Math.min(x, w - x) / (w * 0.12));
        const y = middle + offset + sample * amplitude * fade;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.restore();
    };

    trace(6, palette.glow, 5, 26);
    trace(0, palette.main, 2.2, 14);
  }

  /** The chord name with its roman numeral beside it, sitting on the wave. */
  drawLabel({ name, detail, caption }: LabelContent, palette: Palette) {
    const { context } = this;
    const w = this.width;
    const h = this.height;
    const scale = Math.min(1.4, Math.max(0.7, w / 900));

    const baseline = h * WAVE_LINE - 26 * scale;
    const nameSize = 58 * scale;
    const detailSize = 30 * scale;
    const nameFont = `600 ${nameSize}px ui-serif, Georgia, "Times New Roman", serif`;
    const detailFont = `400 ${detailSize}px ui-serif, Georgia, serif`;
    const detailText = detail ? ` (${detail})` : "";

    context.save();
    context.textBaseline = "alphabetic";

    context.font = nameFont;
    const nameWidth = context.measureText(name).width;
    context.font = detailFont;
    const detailWidth = context.measureText(detailText).width;

    const left = w / 2 - (nameWidth + detailWidth) / 2;

    context.shadowColor = palette.glow;
    context.shadowBlur = 22;
    context.fillStyle = palette.main;
    context.textAlign = "left";
    context.font = nameFont;
    context.fillText(name, left, baseline);

    if (detailText) {
      context.globalAlpha = 0.75;
      context.font = detailFont;
      context.fillText(detailText, left + nameWidth, baseline);
    }

    if (caption) {
      context.globalAlpha = 0.5;
      context.shadowBlur = 8;
      context.textAlign = "center";
      context.font = `400 ${14 * scale}px ui-sans-serif, system-ui, sans-serif`;
      context.fillText(caption, w / 2, baseline + 22 * scale);
    }
    context.restore();
  }

  /**
   * A short line near the top, for prompts like "raise a hand". The height is
   * a fraction of the frame so the caller can push it below the song strip,
   * which otherwise sits exactly on top of it.
   */
  drawHint(text: string, yFactor = 0.14) {
    const { context } = this;
    context.save();
    context.textAlign = "center";
    context.globalAlpha = 0.55;
    context.fillStyle = "#fff";
    context.font = `400 ${Math.min(18, this.width / 34)}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText(text, this.width / 2, this.height * yFactor);
    context.restore();
  }
}
