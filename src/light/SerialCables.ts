/**
 * Cables in, numbers out.
 *
 * The hardware version of the light reader: photoresistors on the ends of
 * cables, read by an Arduino and sent over USB as plain text. Chrome can open
 * that port straight from the page (Web Serial), so the same four numbers the
 * camera produces arrive from the room instead — and each cable can be placed
 * wherever its light should be read, which the camera's strips cannot.
 *
 * Protocol, one line per reading at 115200 baud:
 *
 *   512,300,900,120
 *
 * Four integers from 0 (dark) to 1023 (bright) — what analogRead gives —
 * left to right. Lines with more values are trimmed, with fewer are padded
 * with darkness; anything that does not parse is dropped. The wiring and the
 * sketch are in docs/cables.md.
 */

import { CABLE_COUNT } from "./LightReader";

const BAUD_RATE = 115200;

/** How fast the levels follow the readings, per frame. Same pace as the camera. */
const FOLLOW = 0.06;

/** A board that stops talking for this long counts as dark. */
const SILENCE_MS = 2000;

/** A line longer than this is not a reading; the buffer is thrown away. */
const MAX_LINE = 256;

// Web Serial is not in TypeScript's DOM library yet; this is the sliver used.
interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface SerialLike {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(): Promise<SerialPortLike>;
}

function serialOf(): SerialLike | undefined {
  return (navigator as Navigator & { serial?: SerialLike }).serial;
}

/** The browser has no Web Serial: Firefox and Safari, as of now. */
export class SerialUnsupportedError extends Error {
  constructor() {
    super("This browser cannot open serial ports");
    this.name = "SerialUnsupportedError";
  }
}

/** "512,300,900,120" → [0.5, 0.29, 0.88, 0.12]. Null when the line is not a reading. */
export function parseReading(line: string): number[] | null {
  const parts = line.trim().split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const values = parts.map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const levels = values.slice(0, CABLE_COUNT).map((value) => Math.min(1, Math.max(0, value / 1023)));
  while (levels.length < CABLE_COUNT) levels.push(0);
  return levels;
}

export class SerialCables {
  static get supported(): boolean {
    return serialOf() !== undefined;
  }

  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private targets: number[] = new Array<number>(CABLE_COUNT).fill(0);
  private levels: number[] = new Array<number>(CABLE_COUNT).fill(0);
  private lastReadingAt = 0;

  get connected(): boolean {
    return this.port !== null;
  }

  /**
   * Opens a port the player granted before without asking again; otherwise
   * shows the browser's port picker, which only opens from a click.
   */
  async connect(): Promise<void> {
    const serial = serialOf();
    if (!serial) throw new SerialUnsupportedError();
    if (this.port) return;

    const [remembered] = await serial.getPorts();
    const port = remembered ?? (await serial.requestPort());
    await port.open({ baudRate: BAUD_RATE });
    this.port = port;
    void this.pump(port);
  }

  /** Reads lines for as long as the port stays open. */
  private async pump(port: SerialPortLike) {
    const decoder = new TextDecoder();
    let buffer = "";

    while (this.port === port && port.readable) {
      const reader = port.readable.getReader();
      this.reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            const reading = parseReading(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            if (reading) {
              this.targets = reading;
              this.lastReadingAt = performance.now();
            }
            newline = buffer.indexOf("\n");
          }
          if (buffer.length > MAX_LINE) buffer = "";
        }
      } catch {
        // A glitch on the wire. The stream survives it and is read again; if
        // the board was unplugged, `readable` goes null and the loop ends.
      } finally {
        reader.releaseLock();
      }
    }
  }

  /** One level per cable, smoothed. Call it every frame. */
  read(): number[] {
    const silent = performance.now() - this.lastReadingAt > SILENCE_MS;
    for (let i = 0; i < CABLE_COUNT; i++) {
      const target = silent ? 0 : this.targets[i];
      this.levels[i] += (target - this.levels[i]) * FOLLOW;
    }
    return this.levels;
  }

  async disconnect(): Promise<void> {
    const port = this.port;
    this.port = null;
    try {
      await this.reader?.cancel();
      await port?.close();
    } catch {
      // Already gone.
    }
    this.targets.fill(0);
  }
}
