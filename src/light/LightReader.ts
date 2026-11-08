/**
 * Light in, numbers out.
 *
 * A webcam is a few million light sensors in a grid. This reads it as four:
 * the frame is split into vertical strips and each one reports how bright it
 * is, from 0 (dark) to 1 (full light). That is the same thing a photoresistor
 * on the end of a cable would say — which is why anything that produces the
 * same four numbers (an Arduino over a serial port, say) can stand in for the
 * camera later.
 *
 * The frame is sampled at a tiny size: brightness is an average, so the pixels
 * thrown away were never going to change the answer.
 */

export const CABLE_COUNT = 4;

const SAMPLE_WIDTH = 64;
const SAMPLE_HEIGHT = 36;

/**
 * Below this a strip counts as dark, and dark is silence — not a very quiet
 * note. A webcam in an unlit room still reports a dim grey, so the floor sits
 * above true black.
 */
const DARK = 0.1;
/** Where the reading saturates. Daylight on a wall gets here easily. */
const BRIGHT = 0.8;

/**
 * How fast the levels follow the light, per frame. Low on purpose: a cloud
 * crossing the sun is the kind of change this is for, and the sound should
 * move the way a cloud does.
 */
const FOLLOW = 0.06;

export class LightReader {
  private canvas = document.createElement("canvas");
  private context: CanvasRenderingContext2D;
  private levels: number[] = new Array<number>(CABLE_COUNT).fill(0);

  constructor(private video: HTMLVideoElement) {
    this.canvas.width = SAMPLE_WIDTH;
    this.canvas.height = SAMPLE_HEIGHT;
    const context = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot give a 2D canvas context.");
    this.context = context;
  }

  /** One level per strip, left to right as the player sees them on screen. */
  read(): number[] {
    if (this.video.readyState < 2) return this.levels;

    this.context.drawImage(this.video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = this.context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

    const sums = new Array<number>(CABLE_COUNT).fill(0);
    const stripWidth = SAMPLE_WIDTH / CABLE_COUNT;
    for (let y = 0; y < SAMPLE_HEIGHT; y++) {
      for (let x = 0; x < SAMPLE_WIDTH; x++) {
        const i = (y * SAMPLE_WIDTH + x) * 4;
        // Perceived brightness: green counts for most of it, blue for little.
        const luminance = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        // The camera is shown mirrored, so the strip on the player's left is
        // the right-hand side of the raw frame.
        const strip = CABLE_COUNT - 1 - Math.floor(x / stripWidth);
        sums[strip] += luminance;
      }
    }

    const pixelsPerStrip = SAMPLE_HEIGHT * stripWidth;
    for (let strip = 0; strip < CABLE_COUNT; strip++) {
      const mean = sums[strip] / pixelsPerStrip;
      const target = Math.min(1, Math.max(0, (mean - DARK) / (BRIGHT - DARK)));
      this.levels[strip] += (target - this.levels[strip]) * FOLLOW;
    }
    return this.levels;
  }
}
