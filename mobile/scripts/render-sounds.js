/**
 * Renders the web app's Web Audio synth (frontend/lib/use-mining-fx.ts) to
 * WAV files so the native app plays the very same cues.
 *
 *   node scripts/render-sounds.js
 *
 * mine.wav  — "mining strike": sub-bass pulse + C6 E6 G6 C7 triangle arpeggio
 *             + a high-passed noise crackle.
 * claim.wav — "claim reward": ascending six-note sine cascade.
 * win.wav   — the reward cascade with a longer tail (prize wheel win).
 * tick.wav  — one short click (wheel segment passing the pointer).
 */
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function buffer(seconds) {
  return new Float64Array(Math.ceil(seconds * RATE));
}

/** exponentialRampToValueAtTime between two points, per sample. */
function expRamp(from, to, t, duration) {
  if (t <= 0) return from;
  if (t >= duration) return to;
  return from * Math.pow(to / from, t / duration);
}

function addOsc(buf, { type, start, stop, freq, freqTo, freqRampDur, gain, decayTo = 0.001, decayDur }) {
  let phase = 0;
  const startIdx = Math.floor(start * RATE);
  const stopIdx = Math.min(buf.length, Math.floor(stop * RATE));
  for (let i = startIdx; i < stopIdx; i++) {
    const t = (i - startIdx) / RATE;
    const f = freqTo ? expRamp(freq, freqTo, t, freqRampDur) : freq;
    phase += (2 * Math.PI * f) / RATE;
    const env = expRamp(gain, decayTo, t, decayDur);
    let v;
    if (type === 'sine') v = Math.sin(phase);
    else {
      // triangle
      const p = (phase / (2 * Math.PI)) % 1;
      v = 4 * Math.abs(p - 0.5) - 1;
    }
    buf[i] += v * env;
  }
}

function addNoise(buf, { start, stop, gain, decayDur, highpassHz }) {
  const startIdx = Math.floor(start * RATE);
  const stopIdx = Math.min(buf.length, Math.floor(stop * RATE));
  // One-pole high-pass: y[n] = a * (y[n-1] + x[n] - x[n-1])
  const rc = 1 / (2 * Math.PI * highpassHz);
  const a = rc / (rc + 1 / RATE);
  let prevX = 0, prevY = 0;
  for (let i = startIdx; i < stopIdx; i++) {
    const t = (i - startIdx) / RATE;
    const x = Math.random() * 2 - 1;
    const y = a * (prevY + x - prevX);
    prevX = x; prevY = y;
    buf[i] += y * expRamp(gain, 0.001, t, decayDur);
  }
}

function writeWav(name, buf, peak = 0.9) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const scale = max > 0 ? peak / max : 1;
  const pcm = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i] * scale));
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, pcm]));
  console.log(`${name}: ${(buf.length / RATE).toFixed(2)}s`);
}

// ── mine.wav: playMiningStrike ──
{
  const buf = buffer(0.5);
  // A. sub-bass energy pulse, 140 → 320 Hz over 0.18 s, gain 0.35 → 0 by 0.28 s
  addOsc(buf, { type: 'sine', start: 0, stop: 0.3, freq: 140, freqTo: 320, freqRampDur: 0.18, gain: 0.35, decayDur: 0.28 });
  // B. metallic chime arpeggio C6 E6 G6 C7, 40 ms apart, gain 0.22 → 0 over 0.35 s
  [1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => {
    addOsc(buf, { type: 'triangle', start: i * 0.04, stop: i * 0.04 + 0.38, freq: f, gain: 0.22, decayDur: 0.35 });
  });
  // C. white-noise spark, high-passed at 3.5 kHz, 80 ms
  addNoise(buf, { start: 0, stop: 0.09, gain: 0.12, decayDur: 0.08, highpassHz: 3500 });
  writeWav('mine.wav', buf);
}

// ── claim.wav: playClaimReward ──
{
  const buf = buffer(0.9);
  [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
    addOsc(buf, { type: 'sine', start: i * 0.06, stop: i * 0.06 + 0.48, freq: f, gain: 0.28, decayDur: 0.45 });
  });
  writeWav('claim.wav', buf);
}

// ── win.wav: the same cascade, an octave brighter with a longer ring ──
{
  const buf = buffer(1.3);
  [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => {
    addOsc(buf, { type: 'sine', start: i * 0.07, stop: i * 0.07 + 0.8, freq: f, gain: 0.26, decayDur: 0.7 });
    addOsc(buf, { type: 'triangle', start: i * 0.07, stop: i * 0.07 + 0.4, freq: f * 2, gain: 0.05, decayDur: 0.3 });
  });
  writeWav('win.wav', buf);
}

// ── tick.wav: a 40 ms click for the prize wheel ──
{
  const buf = buffer(0.06);
  addOsc(buf, { type: 'triangle', start: 0, stop: 0.05, freq: 1800, freqTo: 900, freqRampDur: 0.03, gain: 0.3, decayDur: 0.035 });
  addNoise(buf, { start: 0, stop: 0.02, gain: 0.08, decayDur: 0.015, highpassHz: 4000 });
  writeWav('tick.wav', buf, 0.55);
}
