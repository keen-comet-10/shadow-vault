// Tiny WebAudio synth: no audio files, every effect is an oscillator blip.
// Created lazily on first user gesture so browsers allow it; in screenshot
// mode it stays silent and is never constructed.
export function createAudio() {
  let ctx = null;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, gain, slideTo) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  return {
    unlock() { ensure(); },
    coin() { tone(1320, 0.09, 'square', 0.04); setTimeout(() => tone(1760, 0.12, 'square', 0.04), 55); },
    gem() { tone(880, 0.1, 'triangle', 0.07); setTimeout(() => tone(1318, 0.16, 'triangle', 0.07), 70); },
    spotted() { tone(220, 0.22, 'sawtooth', 0.06, 110); },
    caught() { tone(160, 0.5, 'sawtooth', 0.09, 55); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.07), i * 90)); },
    click() { tone(660, 0.05, 'sine', 0.04); },
  };
}
