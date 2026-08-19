<div align="center">

# manos

**An instrument you don't have to buy, hold or tune — your bare hands in the
air play chords, melodies and drums, and nothing you do ever leaves your
machine.**

[![License: MIT](https://img.shields.io/badge/license-MIT-d9b45f)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-any%20modern%20browser-1f2430)](https://manos-instrument.vercel.app)
[![Network](https://img.shields.io/badge/network-one%20model%20download-2b6e4f)](SECURITY.md)

![The gesture language: one hand builds the chord, the other shapes the sound](docs/gestures.svg)

**Play it now → [manos-instrument.vercel.app](https://manos-instrument.vercel.app)**
— open it in Chrome or Edge and allow the camera.

</div>

## How it plays

It does not imitate a guitar or a piano — a D chord is a different shape on
every instrument anyway. Instead, your hands control the *music itself*:

| Gesture | What it does |
| --- | --- |
| **1–4 fingers** | The scale degree: I, II, III, IV |
| **Thumb out** | Adds five: V, VI, VII |
| **Lean the hand** | minor ← plain → seventh |
| **Raise / lower** | The octave |
| **Fist** | Silence |
| **Other hand** | Height is volume, opening it is brightness |
| **Other hand: 2 fingers** | Sevenths family — maj7, m9, 9 |
| **Other hand: 1 finger** | Colours — sus2, sus4, 6, m6 |
| **Slide to the edge** | ♭ on the left, ♯ on the right — chords outside the key |

The same lean that plays an A major turns it into Am, A7 or Amaj7. That is the
move a musician makes when they want a chord to ache — turned into something
you feel with your wrist.

## What's inside

- **Play any song.** Paste a chord chart — chords alone or over lyrics. It
  picks the key where the song needs the fewest tricks, shows the gesture for
  every chord, lights up green when you nail one, and follows you as you play.
- **13 scales** — from a guided five-note scale where nothing can clash,
  through harmonic minor, blues and the church modes, hirajoshi and hijaz, to
  the nine solfeggio frequencies (174–963 Hz) for sound-bath work. Tuning at
  440 or 432 Hz.
- **11 synthesized sounds** in four families — pads and voices, keys and
  plucks, bells and glass, bass and drones. In duet mode each hand can be a
  different instrument.
- **Conducted drums.** The beat keeps time on its own clock; your hand conducts
  it — fingers for density, height for volume, a fist mutes it right on the bar.
- **Record your take** — sound as 24-bit WAV ready for any DAW, or a shareable
  video of the whole performance, each with or without your own voice from the
  microphone. Headphones keep the voice clean. Nothing is uploaded; files save
  straight to disk.
- **MIDI out** (Chrome/Edge) — the gestures play *your* synths: GarageBand,
  Ableton, hardware. Volume rides CC7, brightness CC74. On a Mac, enable the
  IAC Driver in Audio MIDI Setup and pick it as the output.
- **Melody mode**, a live chord map, reverb / delay / chorus / drive, and an
  adjustable response feel. English and Spanish.

## Things that look like bugs and are not

- **The first visit hangs for a few seconds.** It is downloading the
  hand-tracking model (~8 MB) once; your browser caches it after that.
- **A held chord re-strikes on its own** with plucks, bells and glass. Sounds
  that decay are re-struck by design — it reads as tremolo, or strumming.
- **The sound answers a beat after your hand.** That is the Smoothness slider
  trading speed for glide; pull it left for immediate response.
- **"the /B bass will not sound"** on a song card: slash basses are not
  playable yet — the chord itself is complete. Chords that sound identical in
  a row (G · G/A · G/B) share one card that shows every name.
- **Your fist is not being ignored** — it just doesn't need to be tight.
  Fingers curled loosely toward the palm count as a fist.
- **The MIDI checkbox says your browser can't.** Only Chrome and Edge ship
  Web MIDI; the built-in sounds work everywhere.

## Privacy

- Everything runs inside your browser. The camera image and your audio are
  never uploaded — there is no server to upload to.
- No accounts, no analytics, no cookies. Your settings and pasted song live in
  your browser's local storage, on your machine.
- The only network request is the one-time download of the hand-tracking
  model. That claim is enforced by policy, not just promised — details in
  [SECURITY.md](SECURITY.md).
- Recordings are assembled locally and saved straight to your disk.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3004 and allow the camera (it needs HTTPS or localhost).
`npm run build` produces a static `dist/` that deploys to any static host.

## Feedback

The 🐛 button in the app opens a GitHub issue with the technical details
already filled in — or just [open one here](https://github.com/malenitaa/manos/issues).

## Enjoyed it?

If this was useful and you'd like to support the project:

- [Cafecito](https://cafecito.app/rezamalena)
- [Ko-fi](https://ko-fi.com/malenitaa)

## License

[MIT](LICENSE)
