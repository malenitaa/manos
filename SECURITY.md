# Security notes

manos is a static site with no server component: the code your browser
downloads is the whole product, and this document describes exactly what that
code touches. Every claim here comes from reading the source, not from
intentions.

## What it touches

| Surface | Access | Written by |
| --- | --- | --- |
| Camera | Read, live, while the instrument runs (`getUserMedia`, video only) | Nothing — frames are drawn to a local canvas and discarded |
| Microphone | Read, **only** while a "with my voice" recording is running | Nothing — the audio is mixed into the file you save, never played to the speakers |
| `localStorage["manos.settings.v1"]` | Read/write | The app — your control-panel choices |
| `localStorage["manos.song.v1"]` | Read/write | The app — the chord chart you pasted and your chosen key |
| Your disk | Write, only when you stop a recording | The WAV or video file, through the browser's ordinary download flow |
| MIDI outputs | Write (notes and control changes), only when you tick the MIDI box; SysEx is disabled | — |

That is the complete list — verified by reading every `getUserMedia`, storage,
download and MIDI call in the source.

## Network

Exactly one request leaves your machine: the hand-tracking model (~8 MB) is
fetched once from Google's MediaPipe CDN (`storage.googleapis.com`) and cached
by the browser. Everything else is served from the site's own origin. There
are no audio files (every sound is synthesized live), no web fonts, and no
third-party scripts.

This is enforced rather than promised: the deployed site ships a
Content-Security-Policy whose `connect-src` allows only the site itself and
that single host. A future feature that tried to phone anywhere else would
fail loudly until the policy was consciously widened.

## What it never does

- No analytics, no telemetry, no cookies, no accounts.
- The camera image and microphone audio are never uploaded, stored, or kept
  after the tab closes.
- The microphone is never opened outside a voice recording, and its signal is
  never routed to the speakers — that is also what makes feedback loops
  impossible.
- Feedback has no hidden channel. The 🐛 button opens a public GitHub issue,
  pre-filled in front of you; you see every character before you choose to
  submit. It used to be a `mailto:` and was deliberately changed so that no
  personal address ships inside the code.

## Untrusted input

Foreign text enters in two places, and neither can inject anything:

- **Pasted chord charts** are parsed with a strict grammar and rendered
  exclusively through `createElement`/`textContent`. The code base contains
  zero `innerHTML` — a chart is data, never markup.
- **`localStorage` is treated as hostile.** Every stored field is validated
  against whitelists and clamped ranges when loaded; anything malformed falls
  back to defaults instead of being trusted.

**A warning for future editors:** keep it that way. All DOM construction goes
through `src/ui/dom.ts`; the first string-built markup added anywhere creates
exactly the injection this design rules out. A second trap: the audio worklet
must remain a real file — inlined as a `data:` URL it works in development and
dies against the CSP in production (this happened once; the build config now
pins it).

## Less proven

- Chrome and Edge are the tested browsers. Safari runs but can stutter under
  load — the start screen says so. Firefox lacks Web MIDI.
- MIDI out is verified against a virtual output, not yet against a hardware
  rig.
- Phones render the site but frame two hands poorly; playing is a desktop
  experience and the start screen is honest about it.

## Reporting

Found something? Open an issue at
[github.com/malenitaa/manos/issues](https://github.com/malenitaa/manos/issues)
— they are enabled and public. No bounty program, just gratitude and a fast
fix.
