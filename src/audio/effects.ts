/**
 * The effects, each one a small graph of Web Audio nodes.
 *
 * All three are built the same way: the dry signal is sent into them through a
 * gain node whose level is the "amount" knob, and their output is mixed back
 * into the master. Nothing here changes the notes themselves — it changes the
 * space they seem to be played in.
 */

export interface Effect {
  /** Where the signal goes in. Its gain is the amount knob. */
  send: GainNode;
  /** Where the wet signal comes out. */
  output: AudioNode;
}

/**
 * Reverb: the sound bouncing around an imaginary room.
 *
 * A convolver replays the signal through a recording of a real space. Instead
 * of a recording, this generates noise that fades out over a few seconds, which
 * is mathematically what such a recording mostly is.
 */
export function createReverb(context: AudioContext, seconds = 3.2, decay = 2.4, amount = 0.35): Effect {
  const send = context.createGain();
  send.gain.value = amount;

  const convolver = context.createConvolver();
  convolver.buffer = createImpulse(context, seconds, decay);
  send.connect(convolver);

  return { send, output: convolver };
}

function createImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = context.createBuffer(2, length, rate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

/**
 * Delay: the same signal repeated, quieter each time.
 *
 * The output is fed back into its own input, which is literally what an echo
 * is. A low-pass in the feedback path makes each repeat darker than the last,
 * the way distance takes the highs out of a real sound.
 */
export function createDelay(context: AudioContext, time = 0.38, feedback = 0.34, amount = 0.12) {
  const send = context.createGain();
  send.gain.value = amount;

  const delay = context.createDelay(2);
  delay.delayTime.value = time;

  const loop = context.createGain();
  loop.gain.value = feedback;

  const damping = context.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = 2600;

  send.connect(delay);
  delay.connect(damping);
  damping.connect(loop);
  loop.connect(delay);

  return { send, output: delay, delay, feedback: loop };
}

/**
 * Chorus: two copies delayed by a few thousandths of a second, with the delay
 * slowly wandering. The tiny drift makes one instrument sound like several
 * playing together, because that is exactly what several players do.
 */
export function createChorus(context: AudioContext, amount = 0.25): Effect {
  const send = context.createGain();
  send.gain.value = amount;

  const output = context.createGain();

  const voices: [number, number, number][] = [
    [0.012, 0.33, -0.6],
    [0.019, 0.47, 0.6],
  ];

  for (const [time, rate, pan] of voices) {
    const delay = context.createDelay(0.1);
    delay.delayTime.value = time;

    const lfo = context.createOscillator();
    lfo.frequency.value = rate;
    const depth = context.createGain();
    depth.gain.value = 0.004;
    lfo.connect(depth);
    depth.connect(delay.delayTime);
    lfo.start();

    const panner = context.createStereoPanner();
    panner.pan.value = pan;

    send.connect(delay);
    delay.connect(panner);
    panner.connect(output);
  }

  return { send, output };
}

/**
 * A soft clipper. At zero it does nothing; turned up it rounds off the peaks,
 * which adds harmonics and makes the sound feel louder and grittier.
 */
export function createDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount * 60;
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}
