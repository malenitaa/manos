# Cables: light sensors on an Arduino

Light mode reads the camera as four light sensors, one per strip of the
frame. Cable mode reads four real sensors instead, each on the end of a
cable, so every instrument can be placed where its light should be read: one
by the window, one under a lamp, one in your hand.

The page talks to the board itself through Web Serial, so there is nothing to
install on the computer. It works in Chrome and Edge only. Choose **Cables**
in the controls, press start, and pick the board's port when the browser
asks; the choice is remembered for next time.

## Hardware

- An Arduino or compatible board with four analog inputs (Uno, Nano,
  SparkFun RedBoard, …).
- Four photoresistors (LDRs), one per cable.
- Four 10 kΩ resistors.
- Cable as long as you like between the board and each sensor.

Each sensor is a voltage divider:

```
5V ──┤ LDR ├──┬── A0 (A1, A2, A3)
              │
             10k
              │
             GND
```

More light, lower LDR resistance, higher reading at the pin.

## Protocol

One line per reading, at 115200 baud: four integers from 0 (dark) to 1023
(bright), separated by commas, ending in a newline.

```
512,300,900,120
```

Left to right, the values are the bass, the drone, the strings and the voice.
Lines with more values are trimmed; with fewer, the missing cables count as
dark. Anything that does not parse is ignored. If the board goes quiet for two
seconds, every cable falls silent.

## Sketch

```cpp
// manos — cables: four photoresistors to the computer, one line at a time.

const int PINS[4] = {A0, A1, A2, A3};

// What your sensors read in the dark and in full light. Open the Serial
// Monitor, cover and uncover a sensor, and copy the numbers you see: the
// stretch between them becomes the whole 0–1023 range.
const int DARK = 80;
const int BRIGHT = 900;

void setup() {
  Serial.begin(115200);
}

void loop() {
  for (int i = 0; i < 4; i++) {
    int raw = analogRead(PINS[i]);
    int level = constrain(map(raw, DARK, BRIGHT, 0, 1023), 0, 1023);
    Serial.print(level);
    Serial.print(i < 3 ? "," : "\n");
  }
  delay(33); // about thirty readings a second
}
```

Any other board or program that writes the same lines to a serial port works
the same way — the page only ever sees the four numbers.
