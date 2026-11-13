let audioCtx: AudioContext | null = null;

export function playKeyClick(variant: 'digit' | 'operator' | 'equals' | 'clear' = 'digit'): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freqMap = {
      digit: 520,
      operator: 440,
      equals: 660,
      clear: 340,
    };

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqMap[variant], now);
    osc.frequency.exponentialRampToValueAtTime(freqMap[variant] * 0.45, now + 0.028);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}
