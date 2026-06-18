/**
 * Web Audio API sound manager — generates sounds programmatically.
 * No audio file dependencies.
 */

let audioCtx: AudioContext | null = null;
let _muted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as Record<string, unknown>)['webkitAudioContext'] as typeof AudioContext)();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean): void {
  _muted = muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  return _muted;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  delay = 0,
): void {
  if (_muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Audio not available (e.g., SSR, autoplay policy)
  }
}

function playSequence(
  notes: Array<{ freq: number; dur: number; delay?: number }>,
  type: OscillatorType = 'sine',
  volume = 0.3,
): void {
  if (_muted) return;
  let time = 0;
  for (const note of notes) {
    playTone(note.freq, note.dur, type, volume, time + (note.delay || 0));
    time += note.dur + (note.delay || 0);
  }
}

// ---- Sound Effects ----

/** Rising tone sequence — task completion */
export function playTaskComplete(): void {
  playSequence([
    { freq: 523, dur: 0.1 },
    { freq: 659, dur: 0.1 },
    { freq: 784, dur: 0.1 },
    { freq: 1047, dur: 0.25 },
  ], 'triangle', 0.25);
}

/** Coin chime — points earned */
export function playPointsEarned(): void {
  playSequence([
    { freq: 1319, dur: 0.08 },
    { freq: 1568, dur: 0.15 },
  ], 'sine', 0.2);
}

/** Ascending arpeggio — level up */
export function playLevelUp(): void {
  playSequence([
    { freq: 523, dur: 0.1 },
    { freq: 659, dur: 0.1 },
    { freq: 784, dur: 0.1 },
    { freq: 1047, dur: 0.1 },
    { freq: 1319, dur: 0.1 },
    { freq: 1568, dur: 0.3 },
  ], 'triangle', 0.3);
}

/** Fanfare — achievement unlocked */
export function playAchievement(): void {
  const notes: Array<{ freq: number; dur: number; delay?: number }> = [];
  const base = [523, 659, 784, 1047, 1319];
  for (const freq of base) {
    notes.push({ freq, dur: 0.12 });
  }
  notes.push({ freq: 1568, dur: 0.4 });
  playSequence(notes, 'triangle', 0.3);
}

/** Suspense then reveal — chest open */
export function playChestOpen(): void {
  // Suspense
  playSequence([
    { freq: 200, dur: 0.3 },
    { freq: 250, dur: 0.3 },
    { freq: 300, dur: 0.3 },
  ], 'sawtooth', 0.08);
  // Reveal (after 1s delay)
  playSequence([
    { freq: 523, dur: 0.1, delay: 0.9 },
    { freq: 784, dur: 0.1 },
    { freq: 1047, dur: 0.15 },
    { freq: 1568, dur: 0.3 },
  ], 'triangle', 0.3);
}

/** Gentle ping — timer warning */
export function playTimerWarning(): void {
  playTone(880, 0.15, 'sine', 0.2);
}

/** Alarm — timer expired */
export function playTimerExpired(): void {
  playSequence([
    { freq: 880, dur: 0.2 },
    { freq: 660, dur: 0.2 },
    { freq: 880, dur: 0.2 },
    { freq: 660, dur: 0.3 },
  ], 'square', 0.15);
}

/** Soft pop — button click */
export function playButtonClick(): void {
  playTone(600, 0.05, 'sine', 0.1);
}

/** Daily spin — wheel tick + reveal */
export function playSpinTick(): void {
  playTone(1200, 0.03, 'sine', 0.08);
}

/** Spin complete — celebration */
export function playSpinResult(): void {
  playSequence([
    { freq: 659, dur: 0.1 },
    { freq: 784, dur: 0.1 },
    { freq: 1047, dur: 0.2 },
  ], 'sine', 0.25);
}
