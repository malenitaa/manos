import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Recorder } from "./Recorder";

/**
 * Web Audio doesn't exist in Node, so the worklet node is a stand-in whose port
 * the test drives by hand — exactly what the audio thread does in the browser.
 */
class FakeWorkletNode {
  static last: FakeWorkletNode | null = null;
  port = {
    onmessage: null as ((event: { data: { left: Float32Array; right: Float32Array } }) => void) | null,
    postMessage: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
  constructor() {
    FakeWorkletNode.last = this;
  }
}

// A low rate keeps ten minutes of audio small: 100 frames a second.
const SAMPLE_RATE = 100;
const CHUNK = 128;

function fakeContext() {
  return {
    sampleRate: SAMPLE_RATE,
    audioWorklet: { addModule: vi.fn(async () => {}) },
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn() }),
    destination: {},
  } as unknown as AudioContext;
}

/** Sends chunks from the "audio thread" until `seconds` have been offered. */
function feed(node: FakeWorkletNode, seconds: number) {
  const chunks = Math.ceil((seconds * SAMPLE_RATE) / CHUNK);
  for (let i = 0; i < chunks; i++) {
    node.port.onmessage?.({ data: { left: new Float32Array(CHUNK), right: new Float32Array(CHUNK) } });
  }
}

describe("Recorder at the ten-minute limit", () => {
  beforeEach(() => vi.stubGlobal("AudioWorkletNode", FakeWorkletNode));
  afterEach(() => vi.unstubAllGlobals());

  async function recording() {
    const source = { connect: vi.fn() } as unknown as AudioNode;
    const recorder = new Recorder(fakeContext(), source);
    await recorder.prepare();
    const node = FakeWorkletNode.last!;
    const mic = { connect: vi.fn(), disconnect: vi.fn() };
    recorder.attachSource(mic as unknown as AudioNode);
    recorder.start();
    return { recorder, node, mic };
  }

  it("keeps the take past the limit, so stopping it returns the file and detaches the mic", async () => {
    const { recorder, node, mic } = await recording();
    expect(mic.connect).toHaveBeenCalledWith(node);

    feed(node, 11 * 60);

    // Still recording: the take is not thrown away on its own.
    expect(recorder.isFull).toBe(true);
    expect(recorder.isRecording).toBe(true);

    // What App.stopTake() does when it sees isFull.
    const take = recorder.stop();
    recorder.detachSource(mic as unknown as AudioNode);

    expect(take).toBeInstanceOf(Blob);
    expect(take!.type).toBe("audio/wav");
    expect(mic.disconnect).toHaveBeenCalledWith(node);
    expect(recorder.isRecording).toBe(false);
  });

  it("stops capturing at the limit, so a forgotten take cannot grow", async () => {
    const { recorder, node } = await recording();

    feed(node, 10 * 60);
    const atLimit = recorder.seconds;
    feed(node, 5 * 60);

    expect(atLimit).toBeGreaterThanOrEqual(10 * 60);
    expect(recorder.seconds).toBe(atLimit);
    // 44-byte header plus 2 channels × 3 bytes per frame.
    expect(recorder.stop()!.size).toBe(44 + Math.round(atLimit * SAMPLE_RATE) * 6);
  });

  it("is not full below the limit", async () => {
    const { recorder, node } = await recording();
    feed(node, 9 * 60);
    expect(recorder.isFull).toBe(false);
  });
});
