const MUTE_KEY = "moa-sounds-muted";

export const isLessonSoundsMuted = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
};

export const setLessonSoundsMuted = (muted: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
};

const playTone = (
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 0.12,
) => {
  if (typeof window === "undefined" || isLessonSoundsMuted()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000);
    setTimeout(() => ctx.close(), durationMs + 80);
  } catch {
    /* ignore audio errors */
  }
};

export const playCorrectSound = () => {
  playTone(523, 90, "sine", 0.1);
  setTimeout(() => playTone(784, 120, "sine", 0.1), 90);
};

export const playWrongSound = () => {
  playTone(220, 160, "triangle", 0.08);
};

export const playMissionCompleteSound = () => {
  playTone(440, 80, "sine", 0.1);
  setTimeout(() => playTone(554, 80, "sine", 0.1), 80);
  setTimeout(() => playTone(659, 140, "sine", 0.1), 160);
};

export const playVictorySound = () => {
  playTone(392, 100, "sine", 0.1);
  setTimeout(() => playTone(523, 100, "sine", 0.1), 100);
  setTimeout(() => playTone(659, 100, "sine", 0.1), 200);
  setTimeout(() => playTone(784, 200, "sine", 0.12), 300);
};

export const speakEnglish = (text: string) => {
  if (typeof window === "undefined" || isLessonSoundsMuted()) return;
  const trimmed = text.trim();
  if (!trimmed || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
};
