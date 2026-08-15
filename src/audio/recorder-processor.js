/**
 * Runs on the audio thread and copies every sample it is handed back to the
 * main thread.
 *
 * This has to be an AudioWorklet rather than ordinary code: the audio thread
 * runs on its own clock, and anything that reads samples from the main thread
 * would drop blocks the moment the browser is busy drawing a frame. Recording
 * from here is sample-accurate no matter what the rest of the page is doing.
 *
 * Plain JavaScript on purpose — worklet modules are loaded as-is by the
 * browser, outside the bundler's module graph.
 */
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.port.onmessage = (event) => {
      if (event.data === "start") this.recording = true;
      if (event.data === "stop") this.recording = false;
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!this.recording || !input || input.length === 0) return true;

    // The buffers handed in are reused by the browser, so they must be copied
    // before being sent anywhere.
    const left = input[0];
    const right = input.length > 1 ? input[1] : input[0];
    if (!left || left.length === 0) return true;

    this.port.postMessage({ left: new Float32Array(left), right: new Float32Array(right) });
    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
