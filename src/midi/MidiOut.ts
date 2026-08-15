/**
 * MIDI out: the gestures playing *your* instruments instead of these ones.
 *
 * Everything the synth is told to sound is mirrored as MIDI notes on channel 1,
 * and the expression hand rides two controllers — volume on CC7, brightness on
 * CC74, which most synths map to their filter. Point it at GarageBand, Ableton
 * or a hardware synth and manos becomes a controller.
 *
 * Same philosophy as the audio engine: this is told *state*, the full set of
 * notes that should be sounding, and it works out which noteOn/noteOff
 * messages make that true. Web MIDI works in Chrome and Edge; Safari has
 * never shipped it.
 */

export interface MidiDevice {
  id: string;
  name: string;
}

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CONTROL = 0xb0;
const CC_VOLUME = 7;
const CC_BRIGHTNESS = 74;
const CC_ALL_NOTES_OFF = 123;
const VELOCITY = 100;

export class MidiOut {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private active = new Set<number>();
  private lastVolume = -1;
  private lastBrightness = -1;

  get ready(): boolean {
    return this.output !== null;
  }

  static get supported(): boolean {
    return "requestMIDIAccess" in navigator;
  }

  get devices(): MidiDevice[] {
    if (!this.access) return [];
    return [...this.access.outputs.values()].map((output) => ({
      id: output.id,
      name: output.name ?? output.id,
    }));
  }

  /**
   * Asks the browser for MIDI access (one-time permission prompt) and connects
   * to the first output. Returns whether any output was found.
   */
  async enable(preferredId?: string): Promise<boolean> {
    if (!MidiOut.supported) return false;
    try {
      this.access ??= await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      return false;
    }
    const outputs = [...this.access.outputs.values()];
    this.output = outputs.find((output) => output.id === preferredId) ?? outputs[0] ?? null;
    return this.output !== null;
  }

  setOutput(id: string) {
    if (!this.access) return;
    const next = [...this.access.outputs.values()].find((output) => output.id === id) ?? null;
    if (next === this.output) return;
    this.allOff();
    this.output = next;
    this.lastVolume = -1;
    this.lastBrightness = -1;
  }

  disable() {
    this.allOff();
    this.output = null;
  }

  /**
   * Makes exactly these frequencies sound as MIDI notes. Frequencies are
   * rounded to the nearest note against the current tuning reference, so 432
   * playing lands on the same note numbers as 440 — MIDI has no way to say
   * "432" itself; that is the receiving synth's business.
   */
  setNotes(frequencies: number[], reference = 440) {
    if (!this.output) return;
    const wanted = new Set<number>();
    for (const frequency of frequencies) {
      const note = Math.round(69 + 12 * Math.log2(frequency / reference));
      if (note >= 0 && note <= 127) wanted.add(note);
    }
    for (const note of this.active) {
      if (!wanted.has(note)) {
        this.output.send([NOTE_OFF, note, 0]);
        this.active.delete(note);
      }
    }
    for (const note of wanted) {
      if (!this.active.has(note)) {
        this.output.send([NOTE_ON, note, VELOCITY]);
        this.active.add(note);
      }
    }
  }

  /** The expression hand, as controllers. Sent only when the value moves. */
  setControls(volume: number, brightness: number) {
    if (!this.output) return;
    const vol = Math.round(Math.min(1, Math.max(0, volume)) * 127);
    const bright = Math.round(Math.min(1, Math.max(0, brightness)) * 127);
    if (vol !== this.lastVolume) {
      this.output.send([CONTROL, CC_VOLUME, vol]);
      this.lastVolume = vol;
    }
    if (bright !== this.lastBrightness) {
      this.output.send([CONTROL, CC_BRIGHTNESS, bright]);
      this.lastBrightness = bright;
    }
  }

  allOff() {
    if (!this.output) return;
    for (const note of this.active) this.output.send([NOTE_OFF, note, 0]);
    this.active.clear();
    // Belt and braces: some synths hold notes through missed noteOffs.
    this.output.send([CONTROL, CC_ALL_NOTES_OFF, 0]);
  }
}
