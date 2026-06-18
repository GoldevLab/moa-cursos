import type { LessonSegment } from "./constants";

const MUTE_KEY = "moa-sounds-muted";

const SPANISH_LANG_PRIORITY = ["es-MX", "es-ES", "es-US", "es-419", "es"];
const ENGLISH_LANG_PRIORITY = ["en-US", "en-GB", "en"];

export type SpeechLang = "es" | "en";

export type SpeechChunk = { lang: SpeechLang; text: string };

export type SpeechAuditIssue = {
  id_leccion: number;
  segment: string;
  field: string;
  message: string;
};

export const isLessonSoundsMuted = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
};

export const setLessonSoundsMuted = (muted: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
};

// Un único AudioContext compartido. Crear uno por tono dejaba el contexto en
// estado "suspended" cuando el sonido se dispara tras un await (se pierde el
// gesto del usuario). Reutilizarlo y reanudarlo permite que suene igualmente.
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedAudioContext.state === "suspended") {
    void sharedAudioContext.resume().catch(() => undefined);
  }
  return sharedAudioContext;
};

/**
 * Desbloquea el audio en el primer gesto del usuario. Llamar desde un handler
 * de click/touch para que los sonidos posteriores (incluso tras un await) suenen.
 */
export const primeLessonAudio = () => {
  getAudioContext();
};

const playTone = (
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 0.12,
) => {
  if (typeof window === "undefined" || isLessonSoundsMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
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

const normalizeLang = (lang: string) => lang.toLowerCase().replace("_", "-");

const pickVoice = (
  voices: SpeechSynthesisVoice[],
  priorities: string[],
): SpeechSynthesisVoice | null => {
  for (const preferred of priorities) {
    const match = voices.find((voice) => {
      const lang = normalizeLang(voice.lang);
      return lang === preferred || lang.startsWith(`${preferred}-`);
    });
    if (match) return match;
  }
  const prefix = priorities[priorities.length - 1];
  return voices.find((voice) => normalizeLang(voice.lang).startsWith(prefix)) ?? null;
};

const pickSpanishVoice = (voices: SpeechSynthesisVoice[]) =>
  pickVoice(voices, SPANISH_LANG_PRIORITY);

const pickEnglishVoice = (voices: SpeechSynthesisVoice[]) =>
  pickVoice(voices, ENGLISH_LANG_PRIORITY);

const loadSpeechVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = finish;
    setTimeout(finish, 300);
  });
};

const INSTRUCTION_SPEECH_RULES: Array<{
  match: RegExp;
  speech: (groups: RegExpMatchArray) => string;
}> = [
  {
    match: /^Choose the correct image$/,
    speech: () => "Elige la imagen correcta",
  },
  {
    match: /^Choose the correct image of "(.+)"$/,
    speech: (m) => `Elige la imagen correcta de "${m[1]}"`,
  },
  {
    match: /^Choose the correct meaning in Spanish$/,
    speech: () => "Elige su significado en español",
  },
  {
    match: /^Choose the correct meaning in Spanish of "(.+)"$/,
    speech: (m) => `Elige el significado correcto en español de "${m[1]}"`,
  },
  {
    match: /^Choose the correct word$/,
    speech: () => "Elige la palabra correcta",
  },
  {
    match: /^Choose the correct word for «(.+)»$/,
    speech: (m) => `Elige la palabra correcta para «${m[1]}»`,
  },
  {
    match: /^Complete the word in the sentence$/,
    speech: () => "Completa la palabra en la frase",
  },
  {
    match: /^Write the word in English$/,
    speech: () => "Escribe la palabra en inglés",
  },
  {
    match: /^Put the words in English order$/,
    speech: () => "Ordena las palabras en inglés",
  },
  {
    match: /^How do you say «(.+)» in English\?$/,
    speech: (m) => `¿Cómo se dice «${m[1]}» en inglés?`,
  },
  {
    match: /^Select the correct meaning of "(.+)":$/,
    speech: (m) => `Selecciona el significado correcto de "${m[1]}":`,
  },
  {
    match: /^What does "(.+)" mean in Spanish\?$/,
    speech: (m) => `¿Qué significa "${m[1]}" en español?`,
  },
  {
    match: /^Choose the correct translation of "(.+)":$/,
    speech: (m) => `Elige la traducción correcta de "${m[1]}":`,
  },
  {
    match: /^Which English word matches "(.+)"\?$/,
    speech: (m) => `¿Cuál palabra en inglés corresponde a "${m[1]}"?`,
  },
  {
    match: /^How do you say "(.+)" in English\?$/,
    speech: (m) => `¿Cómo se dice "${m[1]}" en inglés?`,
  },
  {
    match: /^Choose the English word for "(.+)":$/,
    speech: (m) => `Elige la palabra en inglés para "${m[1]}":`,
  },
  {
    match: /^Use «(.+)» in English\. Complete: "(.+)"$/,
    speech: (m) => `Usa «${m[1]}» en inglés. Completa: "${m[2]}"`,
  },
];

/** UI instructions are shown in English but read aloud in Spanish. */
export const instructionSpeechText = (displayText: string): string => {
  const trimmed = displayText.trim();
  for (const rule of INSTRUCTION_SPEECH_RULES) {
    const match = trimmed.match(rule.match);
    if (match) return rule.speech(match);
  }
  return trimmed;
};

/** Returns true when display text has a Spanish speech mapping. */
export const hasInstructionSpeechMapping = (displayText: string): boolean =>
  instructionSpeechText(displayText.trim()) !== displayText.trim();

const ENGLISH_HINT =
  /\b(I|you|he|she|we|they|my|your|the|a|an|is|are|am|do|don't|can|will|have|how|what|see|every|day|today|this|love|read|drink|feel|go|school|by|count|like|in|class|carefully|open|shining|morning|afternoon|pet|favorite|color|hello|goodbye|thank|please|choose|select|which|complete|write|put|order|tap|match|flip|pick|find|build|guess|sentence|word|image|meaning|english|spanish)\b/i;

const SPANISH_HINT =
  /\b(el|la|los|las|de|del|que|un|una|es|son|con|por|para|muy|hola|gracias|cuál|qué|selecciona|completa|corresponde|significado|frase|palabra|inglés|español|objetivo|practicarás|dominar)\b/i;

const cleanQuotedSpeech = (quoted: string): string =>
  quoted
    .replace(/_+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();

const detectTextLanguage = (text: string): SpeechLang => {
  const t = text.trim();
  if (!t) return "es";
  if (/[áéíóúñü¿¡]/i.test(t)) return "es";
  if (SPANISH_HINT.test(t)) return "es";
  if (ENGLISH_HINT.test(t)) return "en";
  if (/^[a-zA-Z][a-zA-Z\s'.,!?-]*$/.test(t)) return "en";
  return "es";
};

const quotedLangForSegment = (
  segment: LessonSegment,
  quoted: string,
): SpeechLang => {
  if (segment === "presentation") return "en";
  if (segment === "practice") return "es";
  return detectTextLanguage(quoted);
};

const isAudibleChunk = (chunk: SpeechChunk): boolean => {
  const text = chunk.text.trim();
  return text.length > 0 && !/^[.,!?;:]+$/.test(text);
};

const parseLessonPrompt = (
  text: string,
  segment?: LessonSegment,
): SpeechChunk[] => {
  const chunks: SpeechChunk[] = [];
  const quotePattern = /"([^"]*)"|'([^']*)'/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = quotePattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) chunks.push({ lang: "es", text: before });

    const quoted = cleanQuotedSpeech(match[1] ?? match[2] ?? "");
    if (quoted) {
      const lang = segment
        ? quotedLangForSegment(segment, quoted)
        : detectTextLanguage(quoted);
      chunks.push({ lang, text: quoted });
    }

    lastIndex = quotePattern.lastIndex;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) chunks.push({ lang: "es", text: tail });

  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      lang: segment ? (segment === "presentation" ? "es" : detectTextLanguage(text)) : detectTextLanguage(text),
      text: text.trim(),
    });
  }

  return chunks;
};

export const parseSummarySpeechChunks = (
  summary: string,
  englishTerms: string[],
): SpeechChunk[] => {
  const trimmed = summary.trim();
  if (!trimmed) return [];

  const uniqueTerms = [...new Set(englishTerms.map((t) => t.trim()).filter(Boolean))];
  if (uniqueTerms.length === 0) {
    return [{ lang: "es", text: trimmed }];
  }

  const escaped = uniqueTerms
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  const chunks: SpeechChunk[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(trimmed)) !== null) {
    const before = trimmed.slice(lastIndex, match.index).trim();
    if (before) chunks.push({ lang: "es", text: before });
    chunks.push({ lang: "en", text: match[1] });
    lastIndex = pattern.lastIndex;
  }

  const tail = trimmed.slice(lastIndex).trim();
  if (tail) chunks.push({ lang: "es", text: tail });

  if (chunks.length === 0) {
    return [{ lang: "es", text: trimmed }];
  }

  return chunks;
};

export const getOptionSpeechLang = (segment: LessonSegment): SpeechLang =>
  segment === "presentation" ? "es" : "en";

export const parseLessonPromptChunks = (
  text: string,
  segment: LessonSegment,
): SpeechChunk[] => parseLessonPrompt(text, segment);

export const auditSpeechText = (
  text: string,
  segment: LessonSegment,
  field: string,
): string[] => {
  const issues: string[] = [];
  if (!text.trim()) {
    issues.push(`${field}: vacío`);
    return issues;
  }

  const chunks = parseLessonPrompt(instructionSpeechText(text), segment);
  const audible = chunks.filter(isAudibleChunk);
  if (audible.length === 0) {
    issues.push(`${field}: sin contenido audible`);
  }

  if (segment === "presentation") {
    const hasEnglish = audible.some((c) => c.lang === "en");
    if (!hasEnglish && text.includes('"')) {
      issues.push(`${field}: falta palabra en inglés entre comillas`);
    }
  }

  if (segment === "practice") {
    const wronglyEnglish = audible.filter(
      (c) => c.lang === "en" && !ENGLISH_HINT.test(c.text),
    );
    if (wronglyEnglish.length > 0) {
      issues.push(
        `${field}: significado en español leído como inglés (${wronglyEnglish.map((c) => c.text).join(", ")})`,
      );
    }
  }

  return issues;
};

export const auditSummarySpeech = (
  summary: string,
  englishTerms: string[],
): string[] => {
  const issues: string[] = [];
  if (!summary.trim()) {
    issues.push("summary: vacío");
    return issues;
  }

  const chunks = parseSummarySpeechChunks(summary, englishTerms);
  if (chunks.filter(isAudibleChunk).length === 0) {
    issues.push("summary: sin contenido audible");
  }

  const termsInSummary = englishTerms.filter((term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      summary,
    ),
  );
  const englishChunks = chunks.filter((c) => c.lang === "en");
  if (termsInSummary.length > 0 && englishChunks.length === 0) {
    issues.push(
      `summary: vocabulario en inglés no detectado (${termsInSummary.join(", ")})`,
    );
  }

  return issues;
};

const speakOneChunk = (
  chunk: SpeechChunk,
  spanishVoice: SpeechSynthesisVoice | null,
  englishVoice: SpeechSynthesisVoice | null,
): Promise<void> =>
  new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    if (chunk.lang === "en") {
      utterance.lang = englishVoice?.lang ?? "en-US";
      if (englishVoice) utterance.voice = englishVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.02;
    } else {
      utterance.lang = spanishVoice?.lang ?? "es-MX";
      if (spanishVoice) utterance.voice = spanishVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1;
    }

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(failSafe);
      resolve();
    };

    // Salvaguarda: algunos navegadores no disparan onend de forma fiable y la
    // cola quedaría bloqueada. Estimamos una duración máxima por longitud.
    const estimatedMs = Math.min(15000, 1200 + chunk.text.length * 90);
    const failSafe = setTimeout(done, estimatedMs);

    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });

const speakChunks = async (chunks: SpeechChunk[]) => {
  if (typeof window === "undefined" || isLessonSoundsMuted()) return;
  if (!window.speechSynthesis) return;

  const voices = await loadSpeechVoices();
  const spanishVoice = pickSpanishVoice(voices);
  const englishVoice = pickEnglishVoice(voices);

  window.speechSynthesis.cancel();

  for (const chunk of chunks) {
    if (!isAudibleChunk(chunk)) continue;
    await speakOneChunk(chunk, spanishVoice, englishVoice);
  }
};

/** Prompt: Spanish instructions + English/Spanish in quotes per mission. */
export const speakLessonText = async (
  text: string,
  segment: LessonSegment,
) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  const speechText = instructionSpeechText(trimmed);
  await speakChunks(parseLessonPrompt(speechText, segment));
};

/** Opción de respuesta según misión (presentación=es, práctica/uso=en). */
export const speakWord = async (text: string, lang: SpeechLang) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  await speakChunks([{ lang, text: trimmed }]);
};

/** Resumen de misión: español + vocabulario en inglés. */
export const speakLessonSummary = async (
  summary: string,
  englishTerms: string[],
) => {
  const trimmed = summary.trim();
  if (!trimmed) return;
  await speakChunks(parseSummarySpeechChunks(trimmed, englishTerms));
};
