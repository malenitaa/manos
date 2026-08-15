/**
 * Recording the take as a video: what you see — camera, hand skeleton, wave,
 * labels — with what you hear, in a file ready to share.
 *
 * The picture comes from a canvas the app composes each frame (the browser
 * cannot film the page itself); the sound is tapped from the same node the WAV
 * recorder uses, so video takes carry exactly the final mix — drums, limiter
 * and, when asked, the microphone. Encoding is the browser's own MediaRecorder:
 * MP4 where supported (best for sharing), WebM otherwise.
 */

/** Stop on our own after this long, matching the WAV recorder's guard. */
export const MAX_VIDEO_SECONDS = 10 * 60;

const CANDIDATES: { mime: string; extension: string }[] = [
  { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
  { mime: "video/mp4", extension: "mp4" },
  { mime: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mime: "video/webm", extension: "webm" },
];

function pickType(): { mime: string; extension: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mime)) return candidate;
  }
  return null;
}

export class VideoRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private destination: MediaStreamAudioDestinationNode | null = null;
  private extraAudio: AudioNode | null = null;
  private startedAt = 0;
  private mime = "";

  /** The extension of the last (or current) take: "mp4" or "webm". */
  extension = "mp4";

  constructor(
    private context: AudioContext,
    /** The final mix — same tap as the WAV recorder. */
    private source: AudioNode,
  ) {}

  static get supported(): boolean {
    return pickType() !== null;
  }

  get isRecording(): boolean {
    return this.recorder !== null && this.recorder.state === "recording";
  }

  get seconds(): number {
    return this.isRecording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  /**
   * Starts recording the given canvas stream, with the mix as audio and,
   * optionally, the microphone on top. Returns whether it could start.
   */
  start(video: MediaStream, microphone: AudioNode | null = null): boolean {
    const type = pickType();
    if (!type || this.recorder) return false;
    this.mime = type.mime;
    this.extension = type.extension;

    this.destination = this.context.createMediaStreamDestination();
    this.source.connect(this.destination);
    if (microphone) {
      microphone.connect(this.destination);
      this.extraAudio = microphone;
    }

    const stream = new MediaStream([
      ...video.getVideoTracks(),
      ...this.destination.stream.getAudioTracks(),
    ]);
    this.recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 6_000_000 });
    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(1000);
    this.startedAt = performance.now();
    return true;
  }

  /** Stops and hands back the finished file. Null if nothing was recorded. */
  stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder) return Promise.resolve(null);
    this.recorder = null;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        if (this.destination) {
          this.source.disconnect(this.destination);
          this.extraAudio?.disconnect(this.destination);
        }
        this.destination = null;
        this.extraAudio = null;
        resolve(this.chunks.length > 0 ? new Blob(this.chunks, { type: this.mime }) : null);
      };
      recorder.stop();
    });
  }
}
