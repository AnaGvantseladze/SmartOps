let audioContext: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioContext ??= new Ctx();
  return audioContext;
}

export function unlockAlertSound() {
  const ctx = getAudioContext();
  if (!ctx || unlocked) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  unlocked = true;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume = 0.12) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  tone(ctx, 880, now, 0.18);
  tone(ctx, 1174, now + 0.2, 0.22);
}
