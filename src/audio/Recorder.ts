/**
 * Recording what you play, and handing it back as a WAV file.
 *
 * WAV rather than MP3 or webm because the point is that a producer can drop the
 * file straight into a session. It is written as 24-bit PCM, which every DAW,
 * phone and browser opens without asking questions.
 *
 * Nothing is uploaded: the file is assembled in memory and saved by the browser
 * itself.
 */

import workletUrl from "./recorder-processor.js?url";

/** Stop on our own after this long, so a forgotten recording cannot eat the tab. */
const MAX_SECONDS = 10 * 60;

const BYTES_PER_SAMPLE = 3; // 24-bit
const CHANNELS = 2;

export type RecorderState = "idle" | "ready" | "recording";

export class Recorder {
  private node: AudioWorkletNode | null = null;
  private left: Float32Array[] = [];
  private right: Float32Array[] = [];
  private frames = 0;
  private state: RecorderState = "idle";

  constructor(
    private context: AudioContext,
    private source: AudioNode,
  ) {}

  get isRecording(): boolean {
    return this.state === "recording";
  }

  /** Seconds captured so far. */
  get seconds(): number {
    return this.frames / this.context.sampleRate;
  }

  /** Loads the worklet. Safe to call more than once. */
  async prepare(): Promise<void> {
    if (this.node) return;
    await this.context.audioWorklet.addModule(workletUrl);

    const node = new AudioWorkletNode(this.context, "recorder-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [CHANNELS],
    });
    node.port.onmessage = (event: MessageEvent<{ left: Float32Array; right: Float32Array }>) => {
      if (this.state !== "recording") return;
      this.left.push(event.data.left);
      this.right.push(event.data.right);
      this.frames += event.data.left.length;
      if (this.seconds >= MAX_SECONDS) this.stop();
    };

    this.source.connect(node);
    // The worklet produces no sound of its own, but a node with no destination
    // is allowed to be optimised away, so it is parked on a silent gain.
    const sink = this.context.createGain();
    sink.gain.value = 0;
    node.connect(sink);
    sink.connect(this.context.destination);

    this.node = node;
    this.state = "ready";
  }

  start() {
    if (!this.node || this.state === "recording") return;
    this.left = [];
    this.right = [];
    this.frames = 0;
    this.state = "recording";
    this.node.port.postMessage("start");
  }

  /** Stops and returns the take, or null if nothing was captured. */
  stop(): Blob | null {
    if (this.state !== "recording") return null;
    this.state = "ready";
    this.node?.port.postMessage("stop");
    if (this.frames === 0) return null;

    const blob = encodeWav(flatten(this.left, this.frames), flatten(this.right, this.frames), this.context.sampleRate);
    this.left = [];
    this.right = [];
    return blob;
  }

  dispose() {
    this.node?.port.postMessage("stop");
    this.node?.disconnect();
    this.node = null;
    this.state = "idle";
  }
}

function flatten(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Writes a RIFF/WAVE file by hand. The header is 44 bytes of sizes and rates,
 * and after it the samples simply follow, interleaved left-right-left-right.
 */
function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const frames = left.length;
  const dataBytes = frames * CHANNELS * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // size of this chunk
  view.setUint16(20, 1, true); // 1 means uncompressed PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * BYTES_PER_SAMPLE, true); // bytes per second
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true); // bytes per frame
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    offset = writeSample(view, offset, left[i]);
    offset = writeSample(view, offset, right[i]);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/** One 24-bit little-endian sample, clipped to the range the format allows. */
function writeSample(view: DataView, offset: number, sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  const value = Math.round(clamped * 8388607);
  view.setUint8(offset, value & 0xff);
  view.setUint8(offset + 1, (value >> 8) & 0xff);
  view.setUint8(offset + 2, (value >> 16) & 0xff);
  return offset + 3;
}

/** Hands the file to the browser to save. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the save before revoking the handle.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A filename that sorts by date and never collides. */
export function takeFilename(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `manos-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}.wav`;
}
