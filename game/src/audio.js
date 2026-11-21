// Shadow Step — all sound is WebAudio oscillators. No audio files.
export function makeAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;

  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sfx = {
    step() { tone(180 + Math.random() * 60, 0.06, 'triangle', 0.03); },
    pickup() { tone(660, 0.09, 'sine', 0.12); tone(990, 0.12, 'sine', 0.1, 0.08); },
    key() { tone(520, 0.1, 'square', 0.07); tone(780, 0.14, 'square', 0.07, 0.09); tone(1040, 0.18, 'sine', 0.08, 0.18); },
    door() { tone(220, 0.25, 'sawtooth', 0.06, 0, 110); tone(440, 0.2, 'sine', 0.07, 0.1); },
    pebble() { tone(900, 0.05, 'square', 0.08); tone(1400, 0.04, 'square', 0.05, 0.05); },
    ping() { tone(1200, 0.3, 'sine', 0.09, 0, 700); },
    suspicious() { tone(330, 0.18, 'triangle', 0.1, 0, 260); },
    alarm() { tone(880, 0.16, 'square', 0.11); tone(660, 0.16, 'square', 0.11, 0.16); tone(880, 0.16, 'square', 0.11, 0.32); },
    caught() { tone(440, 0.4, 'sawtooth', 0.12, 0, 110); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.11)); },
    click() { tone(700, 0.05, 'square', 0.06); },
  };

  // Quiet low drone + sparse pluck while playing (starts on first user gesture).
  function startMusic() {
    if (musicTimer || muted) return;
    const c = ac();
    if (!c) return;
    const notes = [110, 130.8, 98, 146.8];
    let i = 0;
    musicTimer = setInterval(() => {
      if (muted) return;
      tone(notes[i % notes.length], 1.6, 'sine', 0.025);
      if (i % 2 === 0) tone(notes[(i + 2) % notes.length] * 2, 0.5, 'triangle', 0.015);
      i++;
    }, 900);
  }

  return {
    sfx,
    startMusic,
    toggleMute() {
      muted = !muted;
      if (muted && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      return muted;
    },
    get muted() { return muted; },
    unlock() { ac(); startMusic(); },
  };
}
