/**
 * Where the three halves meet: what the camera sees, what is heard, and what is
 * drawn. Every animation frame does the same four things.
 *
 *   1. Read the hands.
 *   2. Turn gestures into an intent, and the intent into notes.
 *   3. Tell the synth which notes should be sounding right now.
 *   4. Draw the wave and the label.
 */

import { downloadBlob, DrumMachine, MAX_VIDEO_SECONDS, Recorder, Synth, takeFilename, VideoRecorder } from "../audio";
import type { TimbreId } from "../audio";
import type { TakeKind } from "../ui/Overlay";
import { expressionFromHand, familyFromHand, GestureReader, type Family, type PlayIntent } from "../gesture/mapping";
import { Steady } from "../gesture/Steady";
import { createTranslator, LOCALES, type Translate, type TranslationKey } from "../i18n";
import { MidiOut } from "../midi/MidiOut";
import { buildChord, buildNote, freePitch, freeStack, type Chord } from "../music";
import { LETTER_NAMES, SCALES, SOLFEGE_NAMES, type ScaleId } from "../music/theory";
import { NEUTRAL, paletteFor, type Palette } from "../render/palette";
import { Visuals, type LabelContent } from "../render/Visuals";
import { ChordMap } from "../ui/ChordMap";
import { Help } from "../ui/Help";
import { Overlay } from "../ui/Overlay";
import { Panel } from "../ui/Panel";
import { SongPanel } from "../ui/SongPanel";
import { requireElement } from "../ui/dom";
import { HandTracker } from "../vision/HandTracker";
import { remap } from "../vision/landmarks";
import type { HandReading } from "../vision/types";
import { buildFeedbackLink } from "./feedback";
import { loadSettings, responseFor, saveSettings, type SettingKey, type Settings } from "./settings";

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** Seconds as m:ss. */
function clock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export class App {
  private settings: Settings = loadSettings();
  private t: Translate = createTranslator(this.settings.language);

  private video = requireElement<HTMLVideoElement>("video");
  private canvas = requireElement<HTMLCanvasElement>("canvas");

  private synth = new Synth();
  private midi = new MidiOut();
  private drums = new DrumMachine(this.synth.context, this.synth.createExternalInput());
  private recorder = new Recorder(this.synth.context, this.synth.output);
  private videoRecorder = new VideoRecorder(this.synth.context, this.synth.output);
  /** The frame being encoded during a video take: camera plus everything drawn. */
  private takeCanvas = document.createElement("canvas");
  private takeKind: TakeKind | null = null;
  private micStream: MediaStream | null = null;
  private micNode: AudioNode | null = null;
  /** The conducted density, steadied so a finger mid-move cannot stutter the beat. */
  private drumDensity = new Steady<number>(2, 4);
  private visuals = new Visuals(this.canvas, this.synth.analyser);
  private tracker = new HandTracker(this.video);
  private gestures = new GestureReader();
  private overlay = new Overlay();
  private panel: Panel;
  private help: Help;
  private song: SongPanel;
  private chordMap = new ChordMap(requireElement("chordmap"));

  /** Which colour family the expression hand is holding, steadied over frames. */
  private familySteady = new Steady<Family>("classic", 4);
  private family: Family = "classic";

  private volume = 0;
  private brightness = 0.6;
  private response = responseFor(this.settings.smoothness);
  private running = false;
  /** Set briefly after saving a take, so the status line can say so. */
  private notice = "";
  private noticeUntil = 0;

  constructor() {
    this.panel = new Panel(
      requireElement("panel"),
      requireElement<HTMLButtonElement>("panel-toggle"),
      this.settings,
      (key) => this.onSettingChanged(key),
      () => this.midi.devices,
      () => MidiOut.supported,
    );
    this.help = new Help(
      requireElement("help"),
      requireElement("help-card"),
      requireElement<HTMLButtonElement>("help-toggle"),
    );
    // When a song is loaded, the whole instrument moves to its key.
    this.song = new SongPanel((root, scaleId) => {
      this.settings.root = root;
      this.settings.mode = scaleId;
      saveSettings(this.settings);
      this.synth.releaseAll();
      this.renderInterface();
    });

    this.renderInterface();
    this.applyAudioSettings();
    this.applyResponse();

    this.song.whenChanged(() => this.applyLegendVisibility());
    this.overlay.setVideoSupported(VideoRecorder.supported);
    this.overlay.whenStarted(() => void this.start());
    this.overlay.whenRecordToggled(() => {
      // Recording? The button stops it. Otherwise it opens the what-to-record menu.
      if (this.takeKind) void this.stopTake();
      else this.overlay.toggleRecordMenu();
    });
    this.overlay.whenTakeChosen((kind) => void this.startTake(kind));
    this.overlay.whenFeedback(() => {
      // A new tab: the issue form must not tear the player away from the take.
      window.open(buildFeedbackLink(this.t, { settings: this.settings, fps: this.tracker.fps }), "_blank", "noopener");
    });
    this.overlay.setRecordAvailable(false);
    window.addEventListener("resize", () => this.visuals.resize());
  }

  private renderInterface() {
    document.documentElement.lang = this.settings.language;
    this.panel.render(this.t);
    this.overlay.render(this.t);
    this.help.render(this.t);
    this.song.render(this.t, this.settings.language);
    this.chordMap.render(this.settings, this.family, this.t);
    this.applyLegendVisibility();
  }

  /**
   * The checkbox is the only authority. There used to be a second rule that
   * hid the guide whenever a song was loaded — clever, and wrong: it made the
   * checkbox look dead, because toggling it changed nothing on screen.
   */
  private applyLegendVisibility() {
    this.overlay.setLegendVisible(this.settings.showLegend);
  }

  /** Pushes every audio-related setting into the engine at once. */
  private applyAudioSettings() {
    this.synth.setTimbre(this.settings.timbre);
    this.synth.setSend("reverb", this.settings.reverb);
    this.synth.setSend("delay", this.settings.delay);
    this.synth.setSend("chorus", this.settings.chorus);
    this.synth.setDrive(this.settings.drive);
  }

  /**
   * One slider, three places. Smoothing the landmarks alone is not enough: the
   * roughness people feel comes as much from the chord chasing a wobbling
   * finger count as from the points themselves moving.
   */
  private applyResponse() {
    this.response = responseFor(this.settings.smoothness);
    this.tracker.setSmoothing(this.response.minCutoff, this.response.beta);
    this.gestures.setFramesNeeded(this.response.framesNeeded);
  }

  private onSettingChanged(key: SettingKey) {
    switch (key) {
      case "language":
        this.t = createTranslator(this.settings.language);
        this.renderInterface();
        break;
      case "timbre":
        this.synth.setTimbre(this.settings.timbre);
        break;
      case "reverb":
      case "delay":
      case "chorus":
        this.synth.setSend(key, this.settings[key]);
        break;
      case "drive":
        this.synth.setDrive(this.settings.drive);
        break;
      case "smoothness":
        this.applyResponse();
        break;
      case "drums":
        if (this.settings.drums && this.running) this.drums.start();
        else this.drums.stop();
        break;
      case "midi":
        if (this.settings.midi) void this.enableMidi();
        else {
          this.midi.disable();
          this.panel.render(this.t);
        }
        break;
      case "midiOutput":
        this.midi.setOutput(this.settings.midiOutput);
        break;
      case "midiMute":
        break;
      case "tempo":
        this.drums.setTempo(this.settings.tempo);
        break;
      case "duo":
        // The timbre section grows a hand picker in duet mode.
        this.synth.releaseAll();
        this.panel.render(this.t);
        break;
      case "glide":
        // The two paths key their voices differently, so anything still
        // sounding has to be let go before switching.
        this.synth.releaseAll();
        break;
      case "mode":
      case "root":
      case "tuning":
        this.synth.releaseAll();
        this.chordMap.render(this.settings, this.family, this.t);
        break;
      case "voicing":
      case "showMap":
        this.synth.releaseAll();
        this.chordMap.render(this.settings, this.family, this.t);
        break;
      case "showLegend":
        this.applyLegendVisibility();
        break;
      default:
        break;
    }
    saveSettings(this.settings);
  }

  async start() {
    if (this.running) return;
    this.overlay.setStarting(true);
    this.overlay.showError("");
    try {
      await this.synth.resume();
      await this.tracker.start();
      this.overlay.hideStart();
      this.visuals.resize();
      this.running = true;
      requestAnimationFrame((time) => this.frame(time));
    } catch (error) {
      this.overlay.setStarting(false);
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      this.overlay.showError(
        denied
          ? this.t("app.error.camera")
          : this.t("app.error.generic", { message: error instanceof Error ? error.message : String(error) }),
      );
      return;
    }

    // The recorder needs the audio thread running, so it is set up after start.
    try {
      await this.recorder.prepare();
      this.overlay.setRecordAvailable(true);
    } catch {
      this.overlay.setRecordAvailable(false);
    }

    this.drums.setTempo(this.settings.tempo);
    if (this.settings.drums) this.drums.start();
    if (this.settings.midi) void this.enableMidi();
  }

  /** Asks for MIDI access, connects, and re-renders the panel with the devices. */
  private async enableMidi() {
    await this.midi.enable(this.settings.midiOutput || undefined);
    this.panel.render(this.t);
  }

  /** Opens the microphone in music mode: no echo cancelling, no suppression. */
  private async openMic(): Promise<AudioNode | null> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      return null;
    }
    this.micNode = this.synth.context.createMediaStreamSource(this.micStream);
    return this.micNode;
  }

  /** Releases the microphone so the browser's recording light goes off. */
  private closeMic() {
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micNode?.disconnect();
    this.micStream = null;
    this.micNode = null;
  }

  private showNotice(text: string) {
    this.notice = text;
    this.noticeUntil = performance.now() + 4000;
  }

  private async startTake(kind: TakeKind) {
    if (this.takeKind) return;

    let microphone: AudioNode | null = null;
    if (kind.voice) {
      microphone = await this.openMic();
      if (!microphone) {
        this.showNotice(this.t("record.mic.denied"));
        return;
      }
    }

    if (kind.video) {
      // Even dimensions, because H.264 refuses odd ones.
      this.takeCanvas.width = Math.min(1920, Math.floor(window.innerWidth / 2) * 2);
      this.takeCanvas.height = Math.min(1080, Math.floor(window.innerHeight / 2) * 2);
      const stream = this.takeCanvas.captureStream(30);
      if (!this.videoRecorder.start(stream, microphone)) {
        this.closeMic();
        this.showNotice(this.t("record.unavailable"));
        return;
      }
    } else {
      if (microphone) this.recorder.attachSource(microphone);
      this.recorder.start();
    }

    this.takeKind = kind;
    this.overlay.setRecording(true);
  }

  private async stopTake() {
    const kind = this.takeKind;
    if (!kind) return;
    this.takeKind = null;
    this.overlay.setRecording(false);

    let take: Blob | null = null;
    let extension = "wav";
    if (kind.video) {
      take = await this.videoRecorder.stop();
      extension = this.videoRecorder.extension;
    } else {
      take = this.recorder.stop();
      if (this.micNode) this.recorder.detachSource(this.micNode);
    }
    this.closeMic();

    if (take) {
      const name = takeFilename(extension);
      downloadBlob(take, name);
      this.showNotice(this.t("record.saved", { name }));
    }
  }

  /**
   * One composed frame for the video take: the camera the way the player sees
   * it — mirrored, dimmed — with everything the app draws on top. The browser
   * cannot film the page itself, so the film is made by hand.
   */
  private drawTakeFrame() {
    const context = this.takeCanvas.getContext("2d");
    if (!context) return;
    const w = this.takeCanvas.width;
    const h = this.takeCanvas.height;

    context.fillStyle = "#08070b";
    context.fillRect(0, 0, w, h);

    if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
      // The same object-fit: cover crop the stage shows.
      const scale = Math.max(w / this.video.videoWidth, h / this.video.videoHeight);
      const dw = this.video.videoWidth * scale;
      const dh = this.video.videoHeight * scale;
      context.save();
      context.filter = "saturate(0.55) brightness(0.5) contrast(1.05)";
      context.translate(w, 0);
      context.scale(-1, 1);
      context.drawImage(this.video, (w - dw) / 2, (h - dh) / 2, dw, dh);
      context.restore();
    }

    context.drawImage(this.canvas, 0, 0, w, h);
  }

  private frame(time: number) {
    if (!this.running) return;
    requestAnimationFrame((next) => this.frame(next));

    // Sorted left to right so hand roles stay put when both are on screen.
    const hands = this.tracker.read(time).sort((a, b) => a.palm.x - b.palm.x);
    this.gestures.keepOnly(hands.map((hand) => hand.id));

    const { playing, expression } = this.assignRoles(hands);

    // With drums on, the expression hand becomes the conductor: its fingers
    // set the density, its height the drum volume, its fist mutes the beat.
    // It stops picking chord families and shaping the synth while it does.
    const drumming = this.settings.drums && !this.settings.duo;
    if (drumming && expression) {
      this.drums.setDensity(this.drumDensity.push(expression.fingerCount === 0 ? 0 : expression.longFingerCount));
      this.drums.setVolume(remap(expression.palm.y, 0.88, 0.12, 0.15, 1));
    }
    const shapingHand = drumming ? undefined : expression;

    // The expression hand's fingers pick the colour family. When it changes,
    // the chord map is redrawn so the chips always name what you would get.
    const family = familyFromHand(this.settings.duo ? undefined : shapingHand, this.familySteady);
    if (family !== this.family) {
      this.family = family;
      this.chordMap.render(this.settings, family, this.t);
    }

    const { frequencies, groups, chords, label, glide, activeDegree } = this.collectNotes(playing);

    this.chordMap.setActive(frequencies.length > 0 ? activeDegree : 0);
    this.song.follow(
      chords.length > 0 && frequencies.length > 0
        ? { rootPc: chords[0].rootPc, shape: chords[0].shape }
        : null,
    );

    this.applyExpression(shapingHand, frequencies.length > 0);

    if (frequencies.length === 0) {
      this.synth.releaseAll();
    } else if (glide || this.settings.glide) {
      // Gliding matches voices up by slot, so the notes have to arrive in a
      // stable order — otherwise a chord change would shuffle which voice
      // slides where and the movement would sound random.
      this.synth.glideNotes([...frequencies].sort((a, b) => a - b));
    } else {
      this.synth.setNoteGroups(groups);
    }

    // Everything sounding is mirrored as MIDI, so the same gestures can play
    // an external synth instead of — or alongside — the built-in one.
    if (this.settings.midi) this.midi.setNotes(frequencies, this.settings.tuning);

    this.draw(hands, chords, label, frequencies.length > 0, expression !== undefined);

    // A video take films every frame right after it is drawn.
    if (this.takeKind?.video) {
      this.drawTakeFrame();
      if (this.videoRecorder.seconds >= MAX_VIDEO_SECONDS) void this.stopTake();
    }

    this.overlay.setStatus(this.statusLine(time));
  }

  private statusLine(time: number): string {
    if (this.takeKind) {
      const seconds = this.takeKind.video ? this.videoRecorder.seconds : this.recorder.seconds;
      return this.t("status.recording", { time: clock(seconds) });
    }
    if (time < this.noticeUntil) return this.notice;
    const base = this.t("status.running", { fps: this.tracker.fps, voices: this.synth.voiceCount });
    return this.drums.running ? `${base} · ${this.settings.tempo} bpm` : base;
  }

  /**
   * Who does what. With one hand on screen, it plays. With two, one holds the
   * chord and the other shapes it — unless duet mode is on, where both play.
   */
  private assignRoles(hands: HandReading[]): { playing: HandReading[]; expression?: HandReading } {
    if (this.settings.duo || hands.length <= 1) return { playing: hands };

    const wanted = this.settings.swap ? "left" : "right";
    const chordHand = hands.find((hand) => hand.side === wanted) ?? hands[hands.length - 1];
    return { playing: [chordHand], expression: hands.find((hand) => hand !== chordHand) };
  }

  /** Which instrument a hand plays: in duet mode each side has its own. */
  private timbreFor(index: number, count: number): TimbreId {
    if (!this.settings.duo || count < 2) return this.settings.timbre;
    // Hands arrive sorted left to right, so the first one is the left hand.
    return index === 0 ? this.settings.timbreLeft : this.settings.timbre;
  }

  private collectNotes(playing: HandReading[]): {
    frequencies: number[];
    groups: { timbre: TimbreId; frequencies: number[] }[];
    chords: Chord[];
    label: LabelContent | null;
    glide: boolean;
    activeDegree: number;
  } {
    const frequencies: number[] = [];
    const groups: { timbre: TimbreId; frequencies: number[] }[] = [];
    const chords: Chord[] = [];
    let label: LabelContent | null = null;
    let activeDegree = 0;
    const free = this.settings.mode === "free";
    const melody = this.settings.voicing === "notes";

    playing.forEach((hand, index) => {
      const intent = this.gestures.read(hand);
      if (free) {
        frequencies.push(...this.freeNotes(intent));
        label ??= this.freeLabel(intent);
        return;
      }
      if (intent.degree === 0) return;

      const input = {
        scale: SCALES[this.settings.mode as ScaleId],
        root: this.settings.root,
        degree: intent.degree,
        quality: intent.quality,
        octave: intent.octave,
        tuning: this.settings.tuning,
        family: this.family,
        shift: intent.shift,
      };
      const chord = melody ? buildNote(input) : buildChord(input);
      chords.push(chord);
      frequencies.push(...chord.frequencies);
      groups.push({ timbre: this.timbreFor(index, playing.length), frequencies: chord.frequencies });
      activeDegree = intent.degree;
    });

    if (!free && chords.length > 0) label = this.chordLabel(chords);
    return { frequencies, groups, chords, label, glide: free, activeDegree };
  }

  private freeNotes(intent: PlayIntent): number[] {
    const note = freePitch(intent.position, intent.octave, this.settings.tuning);
    return freeStack(note.frequency, intent.voices);
  }

  private freeLabel(intent: PlayIntent): LabelContent {
    const note = freePitch(intent.position, intent.octave, this.settings.tuning);
    const letterFirst = LOCALES[this.settings.language].notation === "letter";
    const voices =
      intent.voices === 1 ? this.t("label.voices.one") : this.t("label.voices.many", { count: intent.voices });
    return {
      name: letterFirst ? note.name : note.solfege,
      detail: `${note.cents >= 0 ? "+" : ""}${note.cents}`,
      caption: this.t("label.free", { note: letterFirst ? note.solfege : note.name, voices }),
    };
  }

  private chordLabel(chords: Chord[]): LabelContent {
    const letterFirst = LOCALES[this.settings.language].notation === "letter";
    const primary = chords.map((chord) => (letterFirst ? chord.name : chord.solfege));
    const modeName = this.t(`mode.${this.settings.mode}`).toLowerCase();

    // Fixed-frequency scales have no key to name, and both of their names are
    // the same number of hertz, so the caption just names the scale.
    if (SCALES[this.settings.mode as ScaleId]?.kind === "tones") {
      return {
        name: primary.join("  ·  "),
        detail: chords.map((chord) => chord.numeral).join(" · "),
        caption: modeName,
      };
    }

    const secondary = chords.map((chord) => (letterFirst ? chord.solfege : chord.name));
    const keyName = letterFirst ? LETTER_NAMES[this.settings.root] : SOLFEGE_NAMES[this.settings.root];

    // Name the family when it is not the plain one, so you can see why the
    // same lean is suddenly giving maj7s.
    const familyNote = this.family === "classic" ? "" : ` · ${this.t(`family.${this.family}` as TranslationKey)}`;

    return {
      name: primary.join("  ·  "),
      detail: chords.map((chord) => chord.numeral).join(" · "),
      caption: `${secondary.join(" · ")} — ${this.t("label.key", { key: keyName, mode: modeName })}${familyNote}`,
    };
  }

  private applyExpression(hand: HandReading | undefined, sounding: boolean) {
    const intent = expressionFromHand(hand);
    const targetVolume = sounding ? intent.volume : 0;
    const glide = this.response.expressionGlide;
    this.volume = lerp(this.volume, targetVolume, glide);
    this.brightness = lerp(this.brightness, intent.brightness, glide * 0.85);
    // With MIDI on and the built-in sound muted, the external synth is the
    // instrument — the local engine just goes quiet.
    const muted = this.settings.midi && this.settings.midiMute;
    this.synth.setVolume(muted ? 0 : this.volume);
    this.synth.setBrightness(this.brightness);
    if (this.settings.midi) this.midi.setControls(this.volume, this.brightness);
  }

  private draw(
    hands: HandReading[],
    chords: Chord[],
    label: LabelContent | null,
    sounding: boolean,
    hasExpressionHand: boolean,
  ) {
    const palette: Palette = chords.length > 0 ? paletteFor(chords[0].flavour, chords[0].tension) : NEUTRAL;
    document.documentElement.style.setProperty("--accent", palette.main);

    this.visuals.clear();
    if (this.settings.skeleton) this.visuals.drawHands(hands, palette);
    this.visuals.drawWave(palette);
    if (label) this.visuals.drawLabel(label, palette);

    const hint = this.hintFor(hands, sounding, hasExpressionHand);
    // With a song loaded the strip owns the top of the frame, so the hint
    // moves below it instead of disappearing behind the cards.
    if (hint) this.visuals.drawHint(hint, this.song.hasSong ? 0.26 : 0.14);
  }

  private hintFor(hands: HandReading[], sounding: boolean, hasExpressionHand: boolean): string {
    if (hands.length === 0) return this.t("hint.raise");
    if (!sounding) return this.t("hint.open");
    if (!hasExpressionHand && !this.settings.duo && hands.length === 1) return this.t("hint.second");
    return "";
  }
}
