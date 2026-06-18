import { SEGMENT_POINTS, type LessonSegment } from "./constants";
import { applyDistinctOptionEmojis, getOptionEmoji } from "./lesson-emojis";
import {
  COMPETENCY_THEMES,
  getLessonPlan,
  type VocabItem,
} from "./lesson-vocabulary";

export type LessonGameType =
  | "memory_match"
  | "match_pairs"
  | "picture_choice"
  | "spelling_build"
  | "meaning_choice"
  | "sentence_order";

/** @deprecated Use getSegmentGameType */
export type PracticeGameType = Exclude<
  LessonGameType,
  "meaning_choice" | "sentence_order"
>;

const slotForLesson = (idLeccion: number) => ((idLeccion - 1) % 8) + 1;

const PRESENTATION_GAMES: Record<number, LessonGameType> = {
  1: "match_pairs",
  2: "memory_match",
  3: "spelling_build",
  4: "meaning_choice",
  5: "match_pairs",
  6: "memory_match",
  7: "spelling_build",
  8: "meaning_choice",
};

const PRACTICE_GAMES: Record<number, LessonGameType> = {
  1: "picture_choice",
  2: "memory_match",
  3: "spelling_build",
  4: "match_pairs",
  5: "picture_choice",
  6: "memory_match",
  7: "spelling_build",
  8: "match_pairs",
};

const USE_GAMES: Record<number, LessonGameType> = {
  1: "sentence_order",
  2: "sentence_order",
  3: "picture_choice",
  4: "sentence_order",
  5: "sentence_order",
  6: "sentence_order",
  7: "picture_choice",
  8: "picture_choice",
};

const USE_GAME_FALLBACK: Partial<Record<LessonGameType, LessonGameType>> = {
  picture_choice: "sentence_order",
  spelling_build: "sentence_order",
  memory_match: "sentence_order",
  match_pairs: "picture_choice",
};

/** Si práctica repite el juego de presentación, usa otro tipo de actividad. */
const PRACTICE_GAME_FALLBACK: Partial<Record<LessonGameType, LessonGameType>> = {
  spelling_build: "picture_choice",
  memory_match: "match_pairs",
  match_pairs: "picture_choice",
  picture_choice: "match_pairs",
};

const PRACTICE_GAME_ALTERNATIVES: LessonGameType[] = [
  "picture_choice",
  "match_pairs",
  "memory_match",
  "spelling_build",
];

const resolvePracticeGameType = (slot: number): LessonGameType => {
  const presentation = PRESENTATION_GAMES[slot];
  let game = PRACTICE_GAMES[slot];
  if (game === presentation) {
    const preferred = PRACTICE_GAME_FALLBACK[game];
    if (preferred && preferred !== presentation) {
      game = preferred;
    } else {
      game =
        PRACTICE_GAME_ALTERNATIVES.find((candidate) => candidate !== presentation) ??
        game;
    }
  }
  return game;
};

const resolveUseGameType = (slot: number): LessonGameType => {
  let game = USE_GAMES[slot];
  const practice = resolvePracticeGameType(slot);
  if (game === practice) {
    game = USE_GAME_FALLBACK[game] ?? "sentence_order";
  }
  return game;
};

export const getSegmentGameType = (
  segment: LessonSegment,
  idLeccion: number,
): LessonGameType => {
  const slot = slotForLesson(idLeccion);
  if (segment === "presentation") return PRESENTATION_GAMES[slot];
  if (segment === "practice") return resolvePracticeGameType(slot);
  return resolveUseGameType(slot);
};

export const getPracticeGameType = (
  idLeccion: number,
): PracticeGameType | null => {
  const game = getSegmentGameType("practice", idLeccion);
  if (game === "meaning_choice" || game === "sentence_order") return null;
  return game;
};

export type MemoryPair = {
  id: string;
  emoji: string;
  term: string;
};

export type MatchPairItem = {
  id: string;
  emoji: string;
  term: string;
  meaning: string;
};

export type PictureChoiceOption = {
  id: string;
  emoji: string;
  term: string;
};

export type MeaningChoiceOption = {
  id: string;
  meaning: string;
};

export type SpellingRound = {
  answer: string;
  letters: string[];
  emoji: string;
  meaning: string;
  /** Letras de la respuesta en inglés (para el prompt). */
  letterCount: number;
  /** Si la pista en español podría confundir (se forma con letras del inglés). */
  suppressSpanishHint?: boolean;
  contextHint?: string;
  /** Pregunta principal, clara para niños. */
  prompt: string;
  /** Instrucción paso a paso debajo de la pregunta. */
  instruction: string;
};

export type SentenceOrderRound = {
  /** Instrucción sin repetir la pista ni la frase. */
  prompt: string;
  hintMeaning?: string;
  sentenceWithBlank: string;
  shuffledWords: string[];
  correctPhrase: string;
  emoji: string;
};

export type GameSubmission =
  | { kind: "match_pairs"; matches: Record<string, string> }
  | { kind: "memory_match" }
  | { kind: "picture_choice"; selectedTerm: string }
  | { kind: "meaning_choice"; selectedMeaningId: string }
  | { kind: "spelling_build"; built: string }
  | { kind: "sentence_order"; built: string };

const cap = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

const normalizeSpellTarget = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

const canSpellWithLetters = (target: string, letters: readonly string[]) => {
  const pool = letters.map((ch) => ch.toLowerCase());
  for (const ch of normalizeSpellTarget(target)) {
    const idx = pool.indexOf(ch);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
};

const buildSpellingLetterPool = (
  answer: string,
  meaning: string,
  seed: number,
): string[] => {
  const answerChars = answer.split("");
  const meaningNorm = normalizeSpellTarget(meaning);
  const forbiddenDecoys = new Set(
    meaningNorm.split("").filter((ch) => !answer.includes(ch)),
  );
  const decoyPool = "aeiourstlnm".split("").filter(
    (ch) => !answer.includes(ch) && !forbiddenDecoys.has(ch),
  );
  const extraCount = Math.min(3, Math.max(0, 8 - answer.length));

  for (let attempt = 0; attempt < 24; attempt++) {
    const decoys = fisherYatesShuffle(decoyPool, (seed + attempt * 17) >>> 0).slice(
      0,
      extraCount,
    );
    const letters = fisherYatesShuffle(
      [...answerChars, ...decoys],
      (seed ^ (attempt * 0x45d9f3b)) >>> 0,
    );
    if (
      meaningNorm === answer ||
      !canSpellWithLetters(meaningNorm, letters)
    ) {
      return letters;
    }
  }

  return fisherYatesShuffle(answerChars, seed);
};

export const fillUseSentenceBlank = (template: string, term: string): string =>
  template.replace(/___+/g, cap(term));

const SENTENCE_ORDER_PUNCT_ONLY = /^[.!?…,;:]+$/;

/** Palabras ordenables: sin fichas de puntuación sueltas ni signos al final. */
export const tokenizeSentenceOrderWords = (sentence: string): string[] => {
  const tokens = sentence.replace(/\s+/g, " ").trim().split(" ");
  const words: string[] = [];
  for (const token of tokens) {
    if (!token || SENTENCE_ORDER_PUNCT_ONLY.test(token)) continue;
    const word = token.replace(/[.!?…,;:]+$/g, "");
    if (word) words.push(word);
  }
  return words;
};

/** Plantilla sin puntuación final (el punto no se ordena ni se muestra). */
export const formatSentenceOrderTemplate = (template: string): string =>
  template
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+[.!?…,;:]+$/g, "")
    .replace(/[.!?…,;:]+$/g, "")
    .trim();

const pickThemeDistractor = (
  vocabulary: VocabItem[],
  themeIndex: number,
  lessonSlot: number,
) => {
  const lessonTerms = new Set(
    vocabulary.map((item) => item.term.toLowerCase()),
  );
  const theme = COMPETENCY_THEMES[themeIndex];
  const distractorSlot = (lessonSlot + 1) % 8;
  const distractorStart = distractorSlot * 3;
  return (
    theme.words
      .slice(distractorStart, distractorStart + 3)
      .find((item) => !lessonTerms.has(item.term.toLowerCase())) ??
    theme.words.find((item) => !lessonTerms.has(item.term.toLowerCase())) ??
    theme.words[0]
  );
};

export const buildMemoryPairs = (
  vocabulary: { term: string; meaning: string }[],
): MemoryPair[] =>
  applyDistinctOptionEmojis(
    vocabulary.map((item, index) => ({
      id: `m-${index}`,
      emoji: getOptionEmoji(item.term),
      term: cap(item.term),
    })),
  );

export const buildMatchPairs = (
  vocabulary: { term: string; meaning: string }[],
): MatchPairItem[] =>
  applyDistinctOptionEmojis(
    vocabulary.map((item, index) => ({
      id: `p-${index}`,
      emoji: getOptionEmoji(item.term),
      term: cap(item.term),
      meaning: item.meaning,
    })),
  );

export const buildPictureChoiceRound = (
  vocabulary: VocabItem[],
  focusIndex: number,
  themeIndex: number,
  lessonSlot: number,
  seed: number,
): {
  prompt: string;
  englishTerm: string;
  options: PictureChoiceOption[];
  correctTerm: string;
} => {
  const focus = vocabulary[focusIndex];
  const distractor = pickThemeDistractor(vocabulary, themeIndex, lessonSlot);

  const rawOptions: PictureChoiceOption[] = [
    ...vocabulary.map((item) => ({
      id: item.term.toLowerCase(),
      emoji: getOptionEmoji(item.term),
      term: cap(item.term),
    })),
    {
      id: distractor.term.toLowerCase(),
      emoji: getOptionEmoji(distractor.term),
      term: cap(distractor.term),
    },
  ];

  const options = applyDistinctOptionEmojis(
    fisherYatesShuffle(rawOptions, seed),
  );
  const english = cap(focus.term);
  return {
    prompt: "Elige la imagen correcta",
    englishTerm: english,
    options,
    correctTerm: focus.term.toLowerCase(),
  };
};

export const buildMeaningChoiceRound = (
  vocabulary: VocabItem[],
  focusIndex: number,
  themeIndex: number,
  lessonSlot: number,
  seed: number,
) => {
  const focus = vocabulary[focusIndex];
  const distractor = pickThemeDistractor(vocabulary, themeIndex, lessonSlot);
  const seen = new Set<string>();
  const rawOptions: MeaningChoiceOption[] = [];
  for (const item of vocabulary) {
    const id = item.meaning.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    rawOptions.push({ id, meaning: item.meaning });
  }
  const distractorId = distractor.meaning.toLowerCase();
  if (!seen.has(distractorId)) {
    rawOptions.push({
      id: distractorId,
      meaning: distractor.meaning,
    });
  }
  const options = fisherYatesShuffle(rawOptions, seed);
  return {
    prompt: "Elige su significado en español",
    emoji: getOptionEmoji(focus.term),
    term: cap(focus.term),
    options,
    correctMeaningId: focus.meaning.toLowerCase(),
  };
};

export const buildUsePictureRound = (
  vocabulary: VocabItem[],
  focusIndex: number,
  themeIndex: number,
  lessonSlot: number,
  seed: number,
  sentenceWithBlank: string,
  meaningHint: string,
) => {
  const focus = vocabulary[focusIndex];
  const distractor = pickThemeDistractor(vocabulary, themeIndex, lessonSlot);
  const rawOptions: PictureChoiceOption[] = [
    ...vocabulary.map((item) => ({
      id: item.term.toLowerCase(),
      emoji: getOptionEmoji(item.term),
      term: cap(item.term),
    })),
    {
      id: distractor.term.toLowerCase(),
      emoji: getOptionEmoji(distractor.term),
      term: cap(distractor.term),
    },
  ];
  const options = applyDistinctOptionEmojis(
    fisherYatesShuffle(rawOptions, seed),
  );
  return {
    prompt: "Elige la palabra correcta",
    sentence: formatSentenceOrderTemplate(sentenceWithBlank),
    hintMeaning: meaningHint,
    options,
    correctTerm: focus.term.toLowerCase(),
  };
};

const spellingLetterLabel = (count: number) =>
  count === 1 ? "1 letra" : `${count} letras`;

export const buildSpellingRound = (
  focus: VocabItem,
  seed: number,
  contextHint?: string,
): SpellingRound => {
  const answer = focus.term.toLowerCase();
  const meaningNorm = normalizeSpellTarget(focus.meaning);
  const letters = buildSpellingLetterPool(answer, focus.meaning, seed);
  const suppressSpanishHint =
    meaningNorm !== answer &&
    canSpellWithLetters(meaningNorm, answer.split(""));
  const letterCount = answer.length;
  const letterLabel = spellingLetterLabel(letterCount);

  let prompt: string;
  let instruction: string;

  if (contextHint) {
    prompt = "Completa la palabra en la frase";
    instruction = `Toca las letras de abajo para escribir la palabra en inglés (${letterLabel})`;
  } else if (suppressSpanishHint) {
    prompt = "Escribe la palabra en inglés";
    instruction = `Mira el emoji y toca las letras una por una (${letterLabel})`;
  } else {
    prompt = `¿Cómo se dice «${focus.meaning}» en inglés?`;
    instruction = `Toca las letras de abajo para armar la palabra (${letterLabel})`;
  }

  return {
    answer,
    letters,
    emoji: getOptionEmoji(focus.term),
    meaning: focus.meaning,
    letterCount,
    suppressSpanishHint,
    contextHint,
    prompt,
    instruction,
  };
};

export const buildSentenceOrderRound = (
  sentenceFilled: string,
  sentenceTemplate: string,
  focusTerm: string,
  meaning: string,
  seed: number,
): SentenceOrderRound => {
  const words = tokenizeSentenceOrderWords(sentenceFilled);
  return {
    prompt: "Ordena las palabras en inglés",
    hintMeaning: meaning,
    sentenceWithBlank: formatSentenceOrderTemplate(sentenceTemplate),
    shuffledWords: fisherYatesShuffle(words, seed),
    correctPhrase: words.join(" "),
    emoji: getOptionEmoji(focusTerm),
  };
};

export const fisherYatesShuffle = <T>(items: T[] | undefined | null, seed: number): T[] => {
  const arr = [...(items ?? [])];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Ordena columnas inglés/español de forma independiente (nunca alineadas). */
export const shuffleMatchColumnOrders = (
  ids: string[],
  seed: number,
): { left: string[]; right: string[] } => {
  if (ids.length <= 1) {
    return { left: [...ids], right: [...ids] };
  }
  const left = fisherYatesShuffle(ids, (seed ^ 0x9e3779b1) >>> 0);
  let right = fisherYatesShuffle(ids, (seed ^ 0x85ebca6b) >>> 0);
  for (
    let attempt = 0;
    attempt < 16 && left.every((id, index) => id === right[index]);
    attempt++
  ) {
    right = fisherYatesShuffle(
      ids,
      ((seed + attempt * 7919 + 1) ^ 0xc2b2ae35) >>> 0,
    );
  }
  return { left, right };
};

export const scoreFromRatio = (
  segment: LessonSegment,
  ratio: number,
): number => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const max = SEGMENT_POINTS[segment];
  return Math.round(max * clamped);
};

export const gradeMatchPairs = (
  pairs: MatchPairItem[],
  matchMap: Record<string, string> | undefined | null,
): number => {
  if (pairs.length === 0) return 0;
  const map = matchMap ?? {};
  let correct = 0;
  for (const pair of pairs) {
    if (map[pair.id] === pair.id) correct += 1;
  }
  return correct / pairs.length;
};

export const gradePictureChoice = (
  correctTerm: string,
  selectedTerm: string,
): number =>
  correctTerm.trim().toLowerCase() === selectedTerm.trim().toLowerCase()
    ? 1
    : 0;

export const gradeMeaningChoice = (
  correctMeaningId: string,
  selectedMeaningId: string,
): number =>
  correctMeaningId.trim().toLowerCase() ===
  selectedMeaningId.trim().toLowerCase()
    ? 1
    : 0;

export const gradeSpellingBuild = (
  expectedTerm: string,
  built: string,
): number => {
  const norm = (value: string) => value.trim().toLowerCase();
  return norm(built) === norm(expectedTerm) ? 1 : 0;
};

export const gradeSentenceOrder = (
  correctPhrase: string,
  built: string,
): number => {
  const norm = (value: string) =>
    tokenizeSentenceOrderWords(value).join(" ").toLowerCase();
  return norm(built) === norm(correctPhrase) ? 1 : 0;
};

export const gameSeedForLesson = (idLeccion: number, segment: LessonSegment) =>
  idLeccion * 97 + (segment === "presentation" ? 11 : segment === "practice" ? 31 : 53);

export const gradeGameSubmission = (
  segment: LessonSegment,
  gameType: LessonGameType,
  idLeccion: number,
  submission: GameSubmission,
  vocabulary: VocabItem[],
  useSentence?: string,
): number => {
  const plan = getLessonPlan(idLeccion);
  const seed = gameSeedForLesson(idLeccion, segment);

  if (gameType === "match_pairs") {
    if (submission.kind !== "match_pairs") return 0;
    return gradeMatchPairs(buildMatchPairs(vocabulary), submission.matches);
  }
  if (gameType === "memory_match") {
    if (submission.kind !== "memory_match") return 0;
    return 1;
  }
  if (gameType === "picture_choice") {
    if (submission.kind !== "picture_choice") return 0;
    if (segment === "use" && useSentence) {
      const round = buildUsePictureRound(
        vocabulary,
        plan.focusIndex,
        plan.themeIndex,
        plan.lessonSlot,
        seed,
        useSentence,
        plan.focus.meaning,
      );
      return gradePictureChoice(round.correctTerm, submission.selectedTerm);
    }
    const round = buildPictureChoiceRound(
      vocabulary,
      plan.focusIndex,
      plan.themeIndex,
      plan.lessonSlot,
      seed,
    );
    return gradePictureChoice(round.correctTerm, submission.selectedTerm);
  }
  if (gameType === "meaning_choice") {
    if (submission.kind !== "meaning_choice") return 0;
    const round = buildMeaningChoiceRound(
      vocabulary,
      plan.focusIndex,
      plan.themeIndex,
      plan.lessonSlot,
      seed,
    );
    return gradeMeaningChoice(
      round.correctMeaningId,
      submission.selectedMeaningId,
    );
  }
  if (gameType === "spelling_build") {
    if (submission.kind !== "spelling_build") return 0;
    return gradeSpellingBuild(plan.focus.term, submission.built);
  }
  if (gameType === "sentence_order") {
    if (submission.kind !== "sentence_order") return 0;
    if (!useSentence) return 0;
    const filled = fillUseSentenceBlank(useSentence, plan.focus.term);
    const round = buildSentenceOrderRound(
      filled,
      useSentence,
      plan.focus.term,
      plan.focus.meaning,
      seed,
    );
    return gradeSentenceOrder(round.correctPhrase, submission.built);
  }
  return 0;
};

export const isGameSubmissionPerfect = (
  segment: LessonSegment,
  gameType: LessonGameType,
  idLeccion: number,
  submission: GameSubmission,
  vocabulary: VocabItem[],
  useSentence?: string,
): boolean =>
  gradeGameSubmission(
    segment,
    gameType,
    idLeccion,
    submission,
    vocabulary,
    useSentence,
  ) >= 1;

const GAME_UI_BASE: Record<
  LessonGameType,
  { emoji: string; title: string; hint: string; badge: string }
> = {
  picture_choice: {
    emoji: "🖼️",
    title: "¡Elige la imagen!",
    hint: "Elige la imagen que corresponde",
    badge: "Palabra en inglés",
  },
  meaning_choice: {
    emoji: "💬",
    title: "¡Adivina el significado!",
    hint: "Elige su significado en español",
    badge: "Significado correcto",
  },
  memory_match: {
    emoji: "🧩",
    title: "¡Memoria MOA!",
    hint: "Voltea las tarjetas y une cada emoji con su palabra en inglés",
    badge: "Juego de memoria",
  },
  spelling_build: {
    emoji: "🔤",
    title: "¡Arma la palabra!",
    hint: "Toca las letras en orden para escribir la palabra en inglés",
    badge: "Ortografía",
  },
  match_pairs: {
    emoji: "🔗",
    title: "¡Empareja!",
    hint: "Toca una palabra en inglés y luego su significado en español",
    badge: "Une las parejas",
  },
  sentence_order: {
    emoji: "🧱",
    title: "¡Ordena la frase!",
    hint: "Toca las palabras en el orden correcto para formar la oración",
    badge: "Frase en orden",
  },
};

export const getSegmentGameUi = (
  segment: LessonSegment,
  gameType: LessonGameType,
) => {
  const base = GAME_UI_BASE[gameType];
  if (segment === "use" && gameType === "picture_choice") {
    return {
      ...base,
      title: "¡Completa la frase!",
      hint: "Lee la oración y elige la palabra en inglés que encaja",
      badge: "Completa la frase",
    };
  }
  if (segment === "practice" && gameType === "picture_choice") {
    return {
      ...base,
      title: "¡Encuentra la palabra!",
      hint: "Elige la imagen correcta",
    };
  }
  if (segment === "use" && gameType === "spelling_build") {
    return {
      ...base,
      title: "¡Escribe la palabra!",
      hint: "Completa la frase escribiendo la palabra en inglés con las letras",
    };
  }
  return base;
};

/** @deprecated Use getSegmentGameUi */
export const PRACTICE_GAME_UI: Record<
  PracticeGameType,
  { emoji: string; title: string; hint: string; badge: string }
> = {
  picture_choice: GAME_UI_BASE.picture_choice,
  memory_match: GAME_UI_BASE.memory_match,
  spelling_build: GAME_UI_BASE.spelling_build,
  match_pairs: GAME_UI_BASE.match_pairs,
};
