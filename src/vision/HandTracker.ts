/**
 * Camera in, hands out.
 *
 * The model is MediaPipe Hands, which runs entirely inside the browser on the
 * GPU. Nothing is uploaded: the video never leaves the machine. The first load
 * fetches the model file (~8 MB) and the browser caches it from then on.
 */

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { centroid, PALM, type Point3 } from "./landmarks";
import { extensionState, flatFallback, mirror, readHand } from "./readHand";
import { HandSmootherPool } from "./smoothing";
import type { HandReading } from "./types";

/** Copied out of node_modules by the `copy-wasm` script, so it works offline. */
const WASM_PATH = "/mediapipe";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/**
 * How long a hand keeps playing after the model loses it. Detection drops for a
 * frame or two all the time — a blink of bad light, a hand turning edge on. If
 * the sound cut out every time, the instrument would stutter constantly.
 */
const GRACE_MS = 220;

export interface TrackerOptions {
  maxHands?: number;
  detectionConfidence?: number;
  trackingConfidence?: number;
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  private smoothers = new HandSmootherPool(2);
  private lastReadings: HandReading[] = [];
  private lastSeenAt = 0;
  private frameTimes: number[] = [];
  /** Which fingers each tracked hand had up last frame, for the hysteresis. */
  private extensions = new Map<number, boolean[]>();

  /** Frames per second actually going through the model. */
  fps = 0;

  constructor(
    private video: HTMLVideoElement,
    private options: TrackerOptions = {},
  ) {}

  get ready(): boolean {
    return this.landmarker !== null;
  }

  /**
   * How closely the landmarks follow the hand. Higher values react faster and
   * jitter more; lower ones glide. Retunes the filters already running.
   */
  setSmoothing(minCutoff: number, beta: number) {
    this.smoothers.tune(minCutoff, beta);
  }

  /** Asks for the camera and loads the model. Throws if either is refused. */
  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();

    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: this.options.maxHands ?? 2,
      minHandDetectionConfidence: this.options.detectionConfidence ?? 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: this.options.trackingConfidence ?? 0.5,
    });
  }

  /** Reads the current video frame. Safe to call more often than the camera runs. */
  read(nowMs: number): HandReading[] {
    if (!this.landmarker || this.video.readyState < 2) return [];

    // Feeding the same frame twice makes the model throw.
    if (this.video.currentTime === this.lastVideoTime) {
      return this.withGrace(nowMs);
    }
    this.lastVideoTime = this.video.currentTime;

    const result = this.landmarker.detectForVideo(this.video, nowMs);
    this.trackFps(nowMs);

    // The field was renamed between releases of the package.
    const raw = result as unknown as {
      handedness?: { categoryName: string; score: number }[][];
      handednesses?: { categoryName: string; score: number }[][];
      worldLandmarks?: Point3[][];
    };
    const labels = raw.handedness ?? raw.handednesses ?? [];

    const claimed = new Set<number>();
    const readings: HandReading[] = [];

    for (let i = 0; i < result.landmarks.length; i++) {
      const mirrored = mirror(result.landmarks[i]);
      const palm = centroid(mirrored, PALM);
      const { points, slot } = this.smoothers.smooth(mirrored, palm, nowMs, claimed);

      // Real-space landmarks are what make finger shape survive a turned hand.
      // If a build of the model ever stops providing them, the flat ones stand
      // in and everything still runs, just less reliably off-axis.
      const world = raw.worldLandmarks?.[i] ?? flatFallback(points);

      const reading = readHand({
        points,
        world,
        rawSide: labels[i]?.[0]?.categoryName ?? "Right",
        confidence: labels[i]?.[0]?.score ?? 1,
        id: slot,
        previous: this.extensions.get(slot),
      });
      this.extensions.set(slot, extensionState(reading));
      readings.push(reading);
    }

    if (readings.length > 0) {
      this.lastReadings = readings;
      this.lastSeenAt = nowMs;
      return readings;
    }
    return this.withGrace(nowMs);
  }

  /** Holds the last good reading for a moment so a dropped frame is not a cut. */
  private withGrace(nowMs: number): HandReading[] {
    if (nowMs - this.lastSeenAt < GRACE_MS) return this.lastReadings;
    this.lastReadings = [];
    return [];
  }

  private trackFps(nowMs: number) {
    this.frameTimes.push(nowMs);
    while (this.frameTimes.length > 30) this.frameTimes.shift();
    if (this.frameTimes.length > 1) {
      const span = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
      if (span > 0) this.fps = Math.round(((this.frameTimes.length - 1) / span) * 1000);
    }
  }

  stop() {
    const stream = this.video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.lastReadings = [];
  }
}
