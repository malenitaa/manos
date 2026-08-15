/**
 * English strings. This file is the source of truth: its keys define the type
 * every other language has to satisfy, so a missing translation is a build
 * error rather than a blank label.
 */

export const enDictionary = {
  "app.tagline":
    "An instrument you play in the air. The camera watches your hands and the browser makes the sound — nothing is uploaded anywhere.",
  "app.privacy": "Needs camera access. The first run downloads the hand-tracking model, about 8 MB.",
  "app.start": "Start",
  "app.starting": "starting…",
  "app.waiting": "waiting",
  "app.error.camera": "Camera access is needed to see your hands.",
  "app.error.generic": "Could not start: {message}",

  "panel.toggle": "controls",
  "panel.scale": "Scale",
  "panel.key": "Key",
  "panel.tuning": "Tuning",
  "panel.timbre": "Timbre",
  "panel.effects": "Effects",
  "panel.response": "Response",
  "panel.hands": "Hands",
  "panel.language": "Language",

  "group.simple": "Straightforward",
  "group.modes": "Modes",
  "group.world": "Around the world",
  "group.tones": "Fixed frequencies",
  "group.free": "No scale",

  "tuning.440": "440 Hz — standard",
  "tuning.432": "432 Hz — lower",
  "tuning.hint":
    "The reference every other note is measured against. 432 sits slightly below concert pitch and is common in meditation music. Fixed-frequency scales ignore it.",

  "mode.guided": "Guided",
  "mode.guided.hint": "Five chords that sound good in any order. You cannot get it wrong.",
  "mode.major": "Major",
  "mode.major.hint": "All seven degrees of a major key, with their roman numerals.",
  "mode.minor": "Minor",
  "mode.minor.hint": "All seven degrees of a minor key. Darker, more wistful.",
  "mode.harmonicMinor": "Harmonic minor",
  "mode.harmonicMinor.hint":
    "Minor with the seventh raised: the dramatic minor. Its V chord is major and pulls home hard.",
  "mode.pentatonicMinor": "Minor pentatonic",
  "mode.pentatonicMinor.hint": "Five notes, the blues and rock ones. Also impossible to get wrong.",
  "mode.blues": "Blues",
  "mode.blues.hint":
    "The minor pentatonic plus the blue note. Its own chords come out open; lean right for the dominant sevenths blues really runs on.",
  "mode.dorian": "Dorian",
  "mode.dorian.hint": "Minor with one note lifted. Sad but not defeated — the folk and jazz minor.",
  "mode.phrygian": "Phrygian",
  "mode.phrygian.hint": "Minor with a lowered second. Spanish, brooding, a little dangerous.",
  "mode.lydian": "Lydian",
  "mode.lydian.hint": "Major with a raised fourth. Floating, wide open, film-score bright.",
  "mode.mixolydian": "Mixolydian",
  "mode.mixolydian.hint": "Major with a lowered seventh. The rock and blues major.",
  "mode.hirajoshi": "Hirajoshi",
  "mode.hirajoshi.hint": "A Japanese koto tuning. Five notes, spare and open.",
  "mode.hijaz": "Hijaz",
  "mode.hijaz.hint": "The maqam behind much Arabic and Andalusian music. The wide step is the whole flavour.",
  "mode.solfeggio": "Solfeggio",
  "mode.solfeggio.hint":
    "The nine solfeggio frequencies, 174 to 963 Hz, used in sound baths and meditation. Not a key: leaning the hand thickens the tone with octaves and fifths instead of changing chord. The thumb combinations reach the top tones.",
  "mode.free": "Free",
  "mode.free.hint":
    "No scale and no steps: move sideways and the pitch follows. Fingers stack extra notes on top.",

  "timbre.pad": "Pad",
  "timbre.pad.desc": "Sustained and enveloping. It sounds for as long as your hand is up.",
  "timbre.pluck": "Pluck",
  "timbre.pluck.desc": "Each gesture fires a note that decays on its own, like a plucked string.",
  "timbre.bells": "Bells",
  "timbre.bells.desc": "Metallic and bright. Its partials are not whole multiples, which is why it rings.",
  "timbre.strings": "Strings",
  "timbre.strings.desc": "A slow attack, like a bow settling onto the string. With vibrato.",
  "timbre.choir": "Choir",
  "timbre.choir.desc": "Voices. The narrow filter stands in for a throat, which is also a filter.",
  "timbre.organ": "Organ",
  "timbre.organ.desc": "Starts and stops flat. Pure sine waves stacked in octaves and fifths.",
  "timbre.rhodes": "Rhodes",
  "timbre.rhodes.desc": "Electric piano, sweet and a little jazzy. Same trick as the bells, gentler.",
  "timbre.sub": "Sub",
  "timbre.sub.desc": "Low and round. Good for holding the bottom while something moves above.",
  "timbre.glass": "Glass",
  "timbre.glass.desc": "A long crystalline texture with barely any pitch. For standing still.",
  "timbre.bowl": "Bowl",
  "timbre.bowl.desc": "A singing bowl. Two tones fight each other and produce that slow pulse.",
  "timbre.drone": "Drone",
  "timbre.drone.desc": "Never decays and lets go slowly. Made to sit underneath everything else.",

  "fx.reverb": "Reverb",
  "fx.delay": "Delay",
  "fx.chorus": "Chorus",
  "fx.drive": "Drive",

  "response.smoothness": "Smoothness",
  "response.smoothness.hint":
    "Left is immediate and can twitch; right glides but answers a beat later. Pads and bowls like it high, plucks and organ like it low.",
  "response.glide": "Glide between chords",
  "response.glide.hint":
    "Chords slide into each other instead of being struck again. Beautiful on sustained sounds, strange on percussive ones.",

  "hands.duo": "Duet — each hand plays its own voice",
  "hands.swap": "Swap which hand plays the chord",
  "hands.skeleton": "Draw the hands",

  "legend.title": "How to play",
  "legend.degrees": "**1 to 4 fingers** — the degree: I, II, III, IV",
  "legend.thumb": "**Thumb out** — adds five: V, VI, VII",
  "legend.tilt": "**Lean the hand** — minor ← plain → seventh",
  "legend.octave": "**Raise or lower** — the octave",
  "legend.fist": "**Fist** — silence",
  "legend.other": "**Other hand** — height is volume, opening it is brightness",
  "legend.family": "**Other hand: 2 fingers** — sevenths",
  "legend.colors": "**Other hand: 1 finger** — colours",
  "legend.edge": "**Hand at the edge** — ♭ on the left, ♯ on the right",
  "legend.show": "Show the gesture guide",

  "feedback.label": "report a bug or an idea",
  "feedback.subject": "manos — bug or idea",
  "feedback.body":
    "Tell me what happened (or what you wished happened):\n\n\n\n— Please leave the technical details below, they help a lot —\n{info}",

  "family.sevenths": "sevenths",
  "family.colors": "colours",

  "voicing.chords": "Chords",
  "voicing.notes": "Single notes",
  "voicing.hint": "Single notes: each gesture is one note of the scale, for melodies. Slower than an instrument with keys — good for calm lines, not fast runs.",

  "map.show": "Show the chord map",

  "panel.midi": "MIDI",
  "midi.enable": "Send MIDI to your instruments",
  "midi.hint":
    "Your gestures play your own synths — GarageBand, Ableton, hardware. On a Mac, turn on the IAC Driver in Audio MIDI Setup, pick it below, and add a software-instrument track in your DAW. Volume rides CC7 and brightness CC74. Drums stay internal.",
  "midi.output": "Output",
  "midi.mute": "Mute the built-in sound",
  "midi.unsupported": "This browser cannot send MIDI — Chrome and Edge can.",
  "midi.none": "No MIDI outputs found. Open your DAW or enable the IAC Driver, then toggle this off and on.",

  "panel.rhythm": "Rhythm",
  "rhythm.enable": "Drums — the other hand conducts them",
  "rhythm.tempo": "Tempo",
  "rhythm.hint":
    "The pattern keeps time on its own; the other hand conducts it. Fingers choose how busy it is (1 to 4), height is its volume, a fist mutes it without losing the bar. While drums are on, that hand no longer picks chord families.",

  "timbregroup.sustained": "Pads & voices",
  "timbregroup.struck": "Keys & plucks",
  "timbregroup.resonant": "Bells & glass",
  "timbregroup.low": "Bass & drones",

  "timbre.hand.left": "Left hand",
  "timbre.hand.right": "Right hand",
  "timbre.perhand.hint": "In duet mode each hand has its own instrument.",

  "help.rhythm.title": "The drums",
  "help.rhythm.body":
    "The beat runs on its own clock, always in time, and your hand conducts it: fingers for how busy, height for volume, a fist to mute it right on the bar. Conducting instead of striking is deliberate — camera latency would make every struck drum land late, but a conducted pattern is always tight. Turn it on under Rhythm.",

  "gesture.finger.one": "1 finger",
  "gesture.fingers": "{n} fingers",
  "gesture.thumb": "thumb",
  "gesture.thumb.plus": "thumb + {n}",
  "gesture.family.sevenths": "other hand: 2 fingers",
  "gesture.family.colors": "other hand: 1 finger",
  "gesture.shift.flat": "at the left edge",
  "gesture.shift.sharp": "at the right edge",
  "gesture.tilt.min7": "leaned ⟸",
  "gesture.tilt.min": "leaned ←",
  "gesture.tilt.maj": "leaned →",
  "gesture.tilt.dom7": "leaned ⟹",

  "song.open": "song",
  "song.title": "Play a song",
  "song.intro":
    "Paste the chords of whatever you are reading — chords alone or chords over lyrics, both work. The app picks the key where the song needs the fewest tricks, and shows the gesture for every chord.",
  "song.placeholder": "C  G  Am  F\nC  G  F  C",
  "song.load": "Read the chords",
  "song.clear": "Remove the song",
  "song.key": "Chosen key: {key}",
  "song.key.direct": "{direct} of {total} chords fall out of the fingers directly.",
  "song.override": "Play it in another key",
  "song.chords.title": "Chord by chord",
  "song.approx": "written {written}, played as {played}",
  "song.bass": "the /{bass} bass will not sound",
  "song.unplayable": "not reachable in this key",
  "song.none": "No chords found there.",
  "song.skipped": "Could not read: {tokens}",

  "hint.raise": "raise a hand in front of the camera",
  "hint.open": "open your hand to make it sound",
  "hint.second": "add your other hand for volume and brightness",

  "record.open": "record",
  "record.start": "Start recording",
  "record.stop": "Stop and save",
  "record.unavailable": "Recording is not available in this browser.",
  "record.saved": "saved {name}",
  "record.audio": "Sound (WAV)",
  "record.audioVoice": "Sound + my voice (WAV)",
  "record.video": "Video of the take",
  "record.videoVoice": "Video + my voice",
  "record.voice.hint": "With headphones the voice comes out clean; on speakers the mic also hears the instrument.",
  "record.mic.denied": "microphone permission is needed to record your voice",

  "help.open": "how to play",
  "help.close": "Close",
  "help.title": "How to play",
  "help.intro":
    "This does not imitate a guitar or a piano. Reading chord shapes off a webcam is fragile and does not mean much anyway — a D is a different shape on every instrument. What a camera reads well is countable, positional things, so those are what the instrument is built from.",

  "help.gestures.title": "The gestures",
  "help.hands.title": "Which hand does what",
  "help.hands.body":
    "With one hand on screen, that hand plays. With two, one holds the chord and the other shapes it: raise it to play louder, open it to brighten the sound, close it into a fist to cut. Turn on duet mode and both hands play instead, each with its own voice — which also means two people can play at once.",

  "help.modes.title": "The scales",
  "help.modes.body":
    "Guided and minor pentatonic cannot sound wrong: whatever you play fits. The major and minor keys give you all seven degrees and show their roman numerals, which is where the theory becomes something you feel rather than study. The modes and world scales change the mood without changing the gestures. Free mode drops the scale entirely and lets the pitch slide, like a theremin — that one is for someone who already plays.",

  "help.record.title": "Recording",
  "help.record.body":
    "The record button captures exactly what you hear and saves it as a WAV file, ready to drop into any editor or DAW. It stops on its own after ten minutes. Nothing is uploaded — the file is put together in the browser and saved straight to your machine.",

  "help.tips.title": "If it is not reading you well",
  "help.tips.body":
    "Light on your hands matters more than a good camera: face a window or a lamp rather than having it behind you. Keep your hand about an arm's length away and turn your palm towards the lens. A busy background is fine, but hands passing behind each other will confuse it for a moment. If it feels twitchy or feels a beat behind, the smoothness slider under Response is the one to move.",

  "help.privacy.title": "Where your camera goes",
  "help.privacy.body":
    "Nowhere. The model runs inside your browser, there is no server, no account and no analytics, and no image ever leaves your machine.",

  "status.running": "{fps} fps · {voices} voices",
  "status.recording": "recording {time}",
  "label.key": "in {key} {mode}",
  "label.free": "{note} · {voices} · free",
  "label.voices.one": "1 voice",
  "label.voices.many": "{count} voices",
} as const;

export type TranslationKey = keyof typeof enDictionary;
export type Dictionary = Record<TranslationKey, string>;
