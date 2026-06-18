import { SEGMENT_POINTS, type LessonSegment } from "./constants";
import { getDbClient, rowInt, rowStr } from "./db";
import { ensureMoaSchema } from "./schema";
import {
  COMPETENCY_THEMES,
  WORDS_PER_LESSON,
  getLessonPlan,
  type VocabItem,
} from "./lesson-vocabulary";

export { getLessonPlan };

export type LessonExercise = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type LessonContent = {
  id_leccion: number;
  titulo: string;
  presentation: {
    summary: string;
    vocabulary: { term: string; meaning: string }[];
    quiz: LessonExercise;
  };
  practice: LessonExercise;
  use: LessonExercise;
};

export type LessonContentPayload = {
  summary: string;
  vocabulary: { term: string; meaning: string }[];
  quiz: LessonExercise;
  practice: LessonExercise;
  use: LessonExercise;
};

/** Reparte vocabulario temático: ver lesson-vocabulary.ts */

const QUIZ_PROMPTS = [
  (term: string) => `Selecciona el significado correcto de "${term}":`,
  (term: string) => `¿Qué significa "${term}" en español?`,
  (term: string) => `Elige la traducción correcta de "${term}":`,
] as const;

const PRACTICE_PROMPTS = [
  (meaning: string) => `¿Cuál palabra en inglés corresponde a "${meaning}"?`,
  (meaning: string) => `¿Cómo se dice "${meaning}" en inglés?`,
  (meaning: string) => `Elige la palabra en inglés para "${meaning}":`,
] as const;

const vocabUseExercise = (
  set: readonly VocabItem[],
  focusIndex: number,
  prompt: string,
  distractor: string,
): LessonExercise => {
  const options = [cap(set[0].term), cap(set[1].term), cap(set[2].term)];
  const used = new Set(options.map((option) => option.toLowerCase()));
  const extra = used.has(distractor.toLowerCase())
    ? pickFallbackDistractor(used)
    : distractor;
  if (!used.has(extra.toLowerCase())) {
    options.push(extra);
  } else {
    const fallback = pickFallbackDistractor(used);
    if (!used.has(fallback.toLowerCase())) options.push(fallback);
  }
  return {
    prompt,
    options,
    correctIndex: focusIndex,
  };
};

const VERB_TERMS = new Set([
  "read",
  "write",
  "learn",
  "study",
  "cook",
  "eat",
  "meet",
  "help",
  "wear",
  "live",
  "open",
  "close",
  "clean",
  "wash",
  "brush",
  "hurt",
  "feel",
  "cry",
  "laugh",
  "grin",
  "wink",
  "bake",
  "sweep",
  "wipe",
  "clap",
  "lock",
  "tidy",
  "fold",
  "drive",
  "ride",
  "stop",
  "honk",
  "park",
  "grow",
  "run",
  "walk",
  "play",
  "jump",
  "swim",
  "climb",
  "dance",
  "sing",
  "draw",
  "push",
  "pull",
  "throw",
  "catch",
  "kick",
  "sit",
  "stand",
  "sleep",
  "wake",
  "shout",
]);

const GREETING_ONLY = new Set([
  "hello",
  "goodbye",
  "please",
  "thanks",
  "sorry",
  "welcome",
  "how",
  "excuse",
  "sure",
  "see you",
  "yes",
  "no",
]);

const TIME_WORDS = new Set([
  "today",
  "tomorrow",
  "yesterday",
  "dawn",
  "dusk",
  "week",
  "month",
  "year",
  "hour",
  "minute",
  "second",
  "past",
  "future",
  "weekday",
  "weekend",
  "morning",
  "night",
]);

const FREQ_ADV = new Set(["always", "never", "often", "sometimes"]);

const WHEN_ADV = new Set(["early", "late", "soon", "later", "now"]);

const UNCOUNTABLE = new Set([
  "water",
  "milk",
  "rice",
  "bread",
  "soup",
  "cheese",
  "meat",
  "fish",
  "food",
  "sugar",
  "salt",
  "gasoline",
  "traffic",
  "homework",
  "fruit",
  "juice",
  "sand",
  "grass",
  "rice",
  "weather",
  "nature",
  "earth",
  "ocean",
]);

const ABSTRACT_NOUNS = new Set([
  "love",
  "care",
  "hope",
  "peace",
  "mood",
  "joy",
  "help",
]);

const PLURAL_NOUNS = new Set([
  "parents",
  "kids",
  "socks",
  "shoes",
  "gloves",
  "boots",
  "stairs",
]);

/** Frases fijas para palabras que no encajan en plantillas genéricas. */
const USE_SENTENCE_OVERRIDE: Record<string, readonly [string, string, string]> = {
  meet: ["Nice to ___ you.", "Happy to ___ you.", "I want to ___ you."],
  how: ["___ are you?", "___ old are you?", "___ is the weather?"],
  gift: ["This is a ___ for you.", "I got a ___ today.", "What a nice ___ !"],
  excuse: ["___ me!", "___ me, teacher.", "___ me, please."],
  sure: ["___ , I will help.", "Are you ___ ?", "___ thing!"],
  name: ["My ___ is Ana.", "What is your ___ ?", "Write your ___ here."],
  morning: ["Good ___ !", "I wake up in the ___ .", "See you this ___ !"],
  night: ["Good ___ !", "The stars shine at ___ .", "Sleep well at ___ !"],
  later: ["See you ___ !", "Come back ___ .", "Maybe ___ today."],
  good: ["Very ___ !", "That is ___ .", "Sounds ___ to me!"],
  okay: ["It is ___ .", "Are you ___ ?", "That is ___ with me."],
  fine: ["I am ___ .", "That is ___ .", "Very ___ , thanks!"],
  nice: ["Very ___ !", "That is ___ .", "Have a ___ day!"],
  ready: ["I am ___ .", "Are you ___ ?", "Get ___ , please!"],
  dear: ["Hello, ___ friend!", "My ___ teacher.", "You are ___ to me."],
  hour: ["Wait one ___ .", "One more ___ , please!", "An ___ has sixty minutes."],
  minute: ["Wait a ___ .", "Just one ___ !", "A ___ is very short."],
  second: ["One ___ , please.", "Wait a ___ !", "Every ___ counts."],
  dawn: ["The sun rises at ___ .", "Birds sing at ___ .", "It is early at ___ ."],
  dusk: ["The sun sets at ___ .", "The sky is orange at ___ .", "We go home at ___ ."],
  weekday: ["Every ___ I study.", "It is a busy ___ .", "Today is a ___ ."],
  weekend: ["I play on the ___ .", "No school on the ___ !", "Happy ___ !"],
  parents: ["I love my ___ .", "My ___ are kind.", "I live with my ___ ."],
  tag: ["Read the ___ on the shirt.", "Check the size ___ .", "The ___ says medium."],
  clap: ["___ your hands!", "Let's ___ together.", "___ once, please."],
  honk: ["Do not ___ the horn.", "They ___ at the car.", "I ___ once."],
  round: ["The ball is ___ .", "It is ___ like a circle.", "Draw a ___ shape."],
  square: ["It is a ___ shape.", "Draw a ___ .", "The box is ___ ."],
};

const USE_GREETING_PATTERNS = [
  ["I say ___ .", "We say ___ together.", "___ , how are you?"],
  ["Before I leave, I say ___ .", "I wave and say ___ .", "Time to go! ___ !"],
  ["Can I say ___ ?", "Please say ___ with me.", "Let's practice: ___ !"],
] as const;

const USE_ADJ_PATTERNS = [
  ["It is ___ .", "I feel ___ .", "That looks ___ ."],
  ["She is ___ .", "He feels ___ .", "We are ___ ."],
  ["Very ___ !", "So ___ today.", "How ___ !"],
] as const;

const USE_TIME_PATTERNS = [
  ["___ is a school day.", "See you ___ !", "Maybe ___ ."],
  ["Come back ___ .", "Right ___ !", "Not now — ___ !"],
  ["Until ___ , bye!", "It is ___ .", "Every ___ counts."],
] as const;

const USE_FREQ_PATTERNS = [
  ["I ___ brush my teeth.", "We ___ play outside.", "She ___ sings songs."],
  ["They ___ come here.", "I am ___ happy.", "We ___ have fun."],
  ["He ___ runs fast.", "It is ___ sunny.", "You can ___ try again."],
] as const;

const USE_WHEN_PATTERNS = [
  ["Please come ___ .", "I am ___ today.", "See you ___ !"],
  ["Do it ___ , please.", "Wake up ___ !", "We leave ___ ."],
  ["Be ___ for class.", "Call me ___ .", "Not now — ___ !"],
] as const;

const USE_UNCOUNTABLE_PATTERNS = [
  ["I drink ___ .", "I eat ___ .", "We need ___ ."],
  ["There is no ___ .", "I want some ___ .", "More ___ , please."],
  ["Do you have ___ ?", "Pass the ___ , please.", "The ___ is fresh."],
] as const;

const USE_ABSTRACT_PATTERNS = [
  ["I need ___ .", "We share ___ .", "Full of ___ !"],
  ["So much ___ !", "With ___ and joy.", "Give me ___ ."],
  ["___ is important.", "Always show ___ .", "Thank you for ___ ."],
] as const;

const USE_PLURAL_PATTERNS = [
  ["I love my ___ .", "These are my ___ .", "Look at my ___ !"],
  ["Where are my ___ ?", "I need new ___ .", "My ___ are here."],
  ["I wash my ___ .", "Put on your ___ .", "Clean ___ , please."],
] as const;

const USE_NOUN_PATTERNS = [
  ["I see the ___ .", "This is my ___ .", "Look at the ___ !"],
  ["I like my ___ .", "We need the ___ .", "Where is the ___ ?"],
  ["I have a ___ .", "It is a ___ .", "Can you find the ___ ?"],
] as const;

const USE_VERB_PATTERNS = [
  ["I like to ___ .", "We can ___ .", "Let's ___ !"],
  ["I want to ___ .", "Time to ___ !", "Please ___ now."],
  ["They ___ every day.", "I will ___ soon.", "Can you ___ ?"],
] as const;

type UsePatternKind =
  | "override"
  | "greeting"
  | "verb"
  | "adj"
  | "time"
  | "freq"
  | "when"
  | "uncountable"
  | "abstract"
  | "plural"
  | "noun";

const PATTERN_BY_KIND: Record<
  Exclude<UsePatternKind, "override">,
  readonly (readonly string[])[]
> = {
  greeting: USE_GREETING_PATTERNS,
  verb: USE_VERB_PATTERNS,
  adj: USE_ADJ_PATTERNS,
  time: USE_TIME_PATTERNS,
  freq: USE_FREQ_PATTERNS,
  when: USE_WHEN_PATTERNS,
  uncountable: USE_UNCOUNTABLE_PATTERNS,
  abstract: USE_ABSTRACT_PATTERNS,
  plural: USE_PLURAL_PATTERNS,
  noun: USE_NOUN_PATTERNS,
};

const getUsePatternKind = (term: string): UsePatternKind => {
  const t = term.toLowerCase();
  if (USE_SENTENCE_OVERRIDE[t]) return "override";
  if (VERB_TERMS.has(t)) return "verb";
  if (GREETING_ONLY.has(t)) return "greeting";
  if (FREQ_ADV.has(t)) return "freq";
  if (WHEN_ADV.has(t)) return "when";
  if (TIME_WORDS.has(t)) return "time";
  if (UNCOUNTABLE.has(t)) return "uncountable";
  if (ABSTRACT_NOUNS.has(t)) return "abstract";
  if (PLURAL_NOUNS.has(t)) return "plural";
  if (ADJ_TERMS.has(t)) return "adj";
  return "noun";
};

const ADJ_TERMS = new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "orange",
  "purple",
  "pink",
  "brown",
  "gray",
  "happy",
  "sad",
  "tired",
  "angry",
  "scared",
  "excited",
  "bored",
  "surprised",
  "proud",
  "shy",
  "calm",
  "worried",
  "brave",
  "kind",
  "funny",
  "lonely",
  "hot",
  "cold",
  "warm",
  "cool",
  "big",
  "small",
  "long",
  "short",
  "tall",
  "hungry",
  "thirsty",
  "sick",
  "fast",
  "slow",
  "sweet",
  "sour",
  "bright",
  "dark",
  "light",
  "clean",
  "dirty",
  "new",
  "old",
  "dry",
  "wet",
  "windy",
  "stormy",
  "sunny",
  "cloudy",
  "ripe",
  "fresh",
]);

const FALLBACK_DISTRACTORS = ["Thanks", "Please", "Hello", "Sorry", "Welcome"];

const pickFallbackDistractor = (usedLabels: Set<string>): string => {
  for (const word of FALLBACK_DISTRACTORS) {
    const label = cap(word);
    if (!usedLabels.has(label.toLowerCase())) return label;
  }
  return "Thanks";
};

const pickUseDistractor = (
  set: readonly VocabItem[],
  themeIndex: number,
  lessonSlot: number,
  variant: number,
  usedLabels: Set<string>,
): string => {
  const lessonTerms = new Set(set.map((item) => item.term.toLowerCase()));
  const pool = COMPETENCY_THEMES[themeIndex].words.filter(
    (item) => !lessonTerms.has(item.term.toLowerCase()),
  );
  for (let i = 0; i < pool.length; i++) {
    const candidate = cap(
      pool[(lessonSlot + variant + 1 + i) % pool.length].term,
    );
    if (!usedLabels.has(candidate.toLowerCase())) return candidate;
  }
  return pickFallbackDistractor(usedLabels);
};

const pickUseSentence = (
  term: string,
  focusIndex: number,
  variant: number,
): string => {
  const override = USE_SENTENCE_OVERRIDE[term.toLowerCase()];
  if (override) return override[variant % override.length];
  const kind = getUsePatternKind(term);
  if (kind === "override") {
    return USE_NOUN_PATTERNS[variant % USE_NOUN_PATTERNS.length][
      focusIndex % WORDS_PER_LESSON
    ];
  }
  const patterns = PATTERN_BY_KIND[kind];
  return patterns[variant % patterns.length][focusIndex % WORDS_PER_LESSON];
};

export const getLessonUseContext = (idLeccion: number) => {
  const plan = getLessonPlan(idLeccion);
  const sentence = pickUseSentence(
    plan.focus.term,
    plan.focusIndex,
    plan.variant,
  );
  return {
    sentence,
    focus: plan.focus,
    focusIndex: plan.focusIndex,
    themeIndex: plan.themeIndex,
    lessonSlot: plan.lessonSlot,
    set: plan.set,
  };
};

const buildUseExercise = (
  set: readonly VocabItem[],
  focusIndex: number,
  variant: number,
  themeIndex: number,
  lessonSlot: number,
): LessonExercise => {
  const focus = set[focusIndex];
  const sentence = pickUseSentence(focus.term, focusIndex, variant);
  const usedLabels = new Set(
    set.map((item) => cap(item.term).toLowerCase()),
  );
  const distractor = pickUseDistractor(
    set,
    themeIndex,
    lessonSlot,
    variant,
    usedLabels,
  );
  return vocabUseExercise(
    set,
    focusIndex,
    `Usa «${focus.meaning}» en inglés. Completa: "${sentence}"`,
    distractor,
  );
};

const buildExpectedContentPayload = (idLeccion: number): LessonContentPayload => {
  const { theme, themeIndex, lessonSlot, focusIndex, variant, set, focus } =
    getLessonPlan(idLeccion);
  return {
    summary: `En esta lección practicarás vocabulario de ${theme.title}. Objetivo: dominar ${focus.term} y expresiones relacionadas.`,
    vocabulary: set.map((item) => ({ ...item })),
    quiz: {
      prompt: QUIZ_PROMPTS[variant](focus.term),
      options: set.map((item) => item.meaning),
      correctIndex: focusIndex,
    },
    practice: {
      prompt: PRACTICE_PROMPTS[variant](focus.meaning),
      options: set.map((item) => item.term),
      correctIndex: focusIndex,
    },
    use: buildUseExercise(set, focusIndex, variant, themeIndex, lessonSlot),
  };
};

export type LessonContentIssue = {
  id_leccion: number;
  segment: "quiz" | "practice" | "use" | "vocabulary";
  message: string;
};

const validateExercise = (
  exercise: LessonExercise,
  expectedAnswer: string,
  segment: LessonContentIssue["segment"],
): string | null => {
  if (!exercise.prompt.trim()) return `${segment}: pregunta vacía`;
  if (exercise.options.length < 2) return `${segment}: faltan opciones`;
  if (exercise.correctIndex < 0 || exercise.correctIndex >= exercise.options.length) {
    return `${segment}: índice correcto fuera de rango`;
  }
  const normalizedExpected = expectedAnswer.trim().toLowerCase();
  const normalizedCorrect =
    exercise.options[exercise.correctIndex]?.trim().toLowerCase() ?? "";
  if (normalizedCorrect !== normalizedExpected) {
    return `${segment}: respuesta correcta esperada "${expectedAnswer}", guardada "${exercise.options[exercise.correctIndex]}"`;
  }
  return null;
};

const validateExerciseStructure = (
  exercise: LessonExercise,
  segment: LessonContentIssue["segment"],
): string | null => {
  if (!exercise.prompt.trim()) return `${segment}: pregunta vacía`;
  if (exercise.options.length < 2) return `${segment}: faltan opciones`;
  if (exercise.correctIndex < 0 || exercise.correctIndex >= exercise.options.length) {
    return `${segment}: índice correcto fuera de rango`;
  }
  if (!exercise.options[exercise.correctIndex]?.trim()) {
    return `${segment}: la opción marcada como correcta está vacía`;
  }
  return null;
};

export const validateOptionUniqueness = (
  idLeccion: number,
  payload: LessonContentPayload,
): LessonContentIssue[] => {
  const issues: LessonContentIssue[] = [];
  for (const [segment, exercise] of [
    ["quiz", payload.quiz],
    ["practice", payload.practice],
    ["use", payload.use],
  ] as const) {
    const normalized = exercise.options.map((option) =>
      option.trim().toLowerCase(),
    );
    if (normalized.length !== new Set(normalized).size) {
      issues.push({
        id_leccion: idLeccion,
        segment,
        message: `opciones duplicadas: ${exercise.options.join(", ")}`,
      });
    }
  }
  return issues;
};

export const validateLessonPayloadStructure = (
  idLeccion: number,
  payload: LessonContentPayload,
): LessonContentIssue[] => {
  const issues: LessonContentIssue[] = [];

  if (payload.vocabulary.length < 1) {
    issues.push({
      id_leccion: idLeccion,
      segment: "vocabulary",
      message: "vocabulario vacío",
    });
  }

  for (const [segment, exercise] of [
    ["quiz", payload.quiz],
    ["practice", payload.practice],
    ["use", payload.use],
  ] as const) {
    const issue = validateExerciseStructure(exercise, segment);
    if (issue) {
      issues.push({ id_leccion: idLeccion, segment, message: issue });
    }
  }

  issues.push(...validateOptionUniqueness(idLeccion, payload));

  return issues;
};

export const validateLessonPayload = (
  idLeccion: number,
  payload: LessonContentPayload,
): LessonContentIssue[] => {
  const issues = validateLessonPayloadStructure(idLeccion, payload);
  if (issues.length > 0) return issues;

  const { themeIndex, lessonSlot, focusIndex, variant, set, focus } =
    getLessonPlan(idLeccion);

  const quizIssue = validateExercise(
    payload.quiz,
    focus.meaning,
    "quiz",
  );
  if (quizIssue) {
    issues.push({ id_leccion: idLeccion, segment: "quiz", message: quizIssue });
  }
  if (!payload.quiz.prompt.includes(focus.term)) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: `la pregunta no menciona "${focus.term}"`,
    });
  }

  const practiceIssue = validateExercise(
    payload.practice,
    focus.term,
    "practice",
  );
  if (practiceIssue) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: practiceIssue,
    });
  }
  if (!payload.practice.prompt.includes(focus.meaning)) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: `la pregunta no menciona "${focus.meaning}"`,
    });
  }

  const vocabTerms = new Set(set.map((item) => item.term.toLowerCase()));
  const vocabMeanings = new Set(set.map((item) => item.meaning.toLowerCase()));
  const practiceLooksLikeQuiz =
    payload.practice.options.length === payload.quiz.options.length &&
    payload.practice.options.every((option) =>
      vocabMeanings.has(option.toLowerCase()),
    );
  if (practiceLooksLikeQuiz) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: "las opciones de práctica son significados en español (deberían ser palabras en inglés)",
    });
  }
  const quizLooksLikePractice =
    payload.quiz.options.every((option) => vocabTerms.has(option.toLowerCase()));
  if (quizLooksLikePractice) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: "las opciones del quiz son palabras en inglés (deberían ser significados en español)",
    });
  }

  const expected = buildExpectedContentPayload(idLeccion);

  const expectedUse = expected.use;
  const useIssue = validateExercise(
    payload.use,
    expectedUse.options[expectedUse.correctIndex],
    "use",
  );
  if (useIssue) {
    issues.push({ id_leccion: idLeccion, segment: "use", message: useIssue });
  }
  if (payload.quiz.prompt.trim() !== expected.quiz.prompt.trim()) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: "el prompt del quiz no coincide con el contenido esperado",
    });
  }
  if (payload.practice.prompt.trim() !== expected.practice.prompt.trim()) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: "el prompt de práctica no coincide con el contenido esperado",
    });
  }
  if (payload.use.prompt.trim() !== expected.use.prompt.trim()) {
    issues.push({
      id_leccion: idLeccion,
      segment: "use",
      message: "el prompt de uso no coincide con el contenido esperado",
    });
  }

  return issues;
};

/** Evita que quiz y práctica sean la misma pregunta u opciones invertidas. */
export const validateLessonSegmentDirections = (
  idLeccion: number,
  payload: LessonContentPayload,
): LessonContentIssue[] => {
  const issues: LessonContentIssue[] = [];

  if (payload.quiz.prompt.trim() === payload.practice.prompt.trim()) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: "el prompt de práctica es idéntico al del quiz",
    });
  }

  const { set } = getLessonPlan(idLeccion);
  const vocabTerms = new Set(set.map((item) => item.term.toLowerCase()));
  const vocabMeanings = new Set(set.map((item) => item.meaning.toLowerCase()));

  const practiceLooksLikeQuiz =
    payload.practice.options.length > 0 &&
    payload.practice.options.every((option) =>
      vocabMeanings.has(option.toLowerCase()),
    );
  if (practiceLooksLikeQuiz) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message:
        "las opciones de práctica son significados en español (deberían ser palabras en inglés)",
    });
  }

  const quizLooksLikePractice =
    payload.quiz.options.length > 0 &&
    payload.quiz.options.every((option) => vocabTerms.has(option.toLowerCase()));
  if (quizLooksLikePractice) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message:
        "las opciones del quiz son palabras en inglés (deberían ser significados en español)",
    });
  }

  return issues;
};

/** Valida contenido ya mezclado (como lo ve el estudiante). */
export const auditLessonGameplay = (
  idLeccion: number,
  content: LessonContent,
): LessonContentIssue[] => {
  const issues: LessonContentIssue[] = [];
  const quiz = content.presentation.quiz;
  const practice = content.practice;
  const use = content.use;

  for (const [segment, exercise] of [
    ["quiz", quiz],
    ["practice", practice],
    ["use", use],
  ] as const) {
    const issue = validateExerciseStructure(exercise, segment);
    if (issue) {
      issues.push({ id_leccion: idLeccion, segment, message: issue });
    }
  }

  if (quiz.prompt.trim() === practice.prompt.trim()) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: "tras mezclar, quiz y práctica tienen el mismo prompt",
    });
  }

  const { themeIndex, lessonSlot, focusIndex, variant, set, focus } =
    getLessonPlan(idLeccion);

  const quizAnswerIssue = validateExercise(quiz, focus.meaning, "quiz");
  if (quizAnswerIssue) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: `tras mezclar: ${quizAnswerIssue}`,
    });
  }

  const practiceAnswerIssue = validateExercise(
    practice,
    focus.term,
    "practice",
  );
  if (practiceAnswerIssue) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: `tras mezclar: ${practiceAnswerIssue}`,
    });
  }

  const expectedUse = buildUseExercise(
    set,
    focusIndex,
    variant,
    themeIndex,
    lessonSlot,
  );
  const useAnswerIssue = validateExercise(
    use,
    expectedUse.options[expectedUse.correctIndex],
    "use",
  );
  if (useAnswerIssue) {
    issues.push({
      id_leccion: idLeccion,
      segment: "use",
      message: `tras mezclar: ${useAnswerIssue}`,
    });
  }

  const vocabTerms = new Set(set.map((item) => item.term.toLowerCase()));
  const vocabMeanings = new Set(set.map((item) => item.meaning.toLowerCase()));

  if (
    practice.options.length > 0 &&
    practice.options.every((option) => vocabMeanings.has(option.toLowerCase()))
  ) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: "tras mezclar: práctica muestra opciones en español",
    });
  }

  if (
    quiz.options.length > 0 &&
    quiz.options.every((option) => vocabTerms.has(option.toLowerCase()))
  ) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: "tras mezclar: quiz muestra opciones en inglés",
    });
  }

  return issues;
};

export const auditAllLessonContent = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const lessons = await client.execute({
    sql: "SELECT id_leccion FROM leccion ORDER BY id_leccion",
    args: [],
  });

  const issues: LessonContentIssue[] = [];
  for (const row of lessons.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const payload =
      (await fetchContentPayload(idLeccion)) ??
      generateDefaultContentPayload(idLeccion);
    issues.push(...validateLessonPayload(idLeccion, payload));
  }

  return issues;
};

export const auditAllLessonGameplay = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const lessons = await client.execute({
    sql: "SELECT id_leccion, titulo FROM leccion ORDER BY id_leccion",
    args: [],
  });

  const issues: LessonContentIssue[] = [];
  for (const row of lessons.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const titulo = rowStr(row.titulo);
    const content = await getLessonContent(idLeccion, titulo);
    issues.push(...auditLessonGameplay(idLeccion, content));
  }

  return issues;
};

/** Detecta lecciones con el mismo contenido (misma competencia u otras). */
export const auditLessonUniqueness = async (): Promise<LessonContentIssue[]> => {
  await ensureMoaSchema();
  const client = getDbClient();
  const lessons = await client.execute({
    sql: "SELECT id_leccion FROM leccion ORDER BY id_leccion",
    args: [],
  });

  const byFingerprint = new Map<string, number[]>();
  for (const row of lessons.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const payload =
      (await fetchContentPayload(idLeccion)) ??
      generateDefaultContentPayload(idLeccion);
    const fingerprint = [
      payload.quiz.prompt,
      payload.practice.prompt,
      payload.use.prompt,
      payload.vocabulary.map((v) => v.term).join(","),
    ].join("||");
    const group = byFingerprint.get(fingerprint) ?? [];
    group.push(idLeccion);
    byFingerprint.set(fingerprint, group);
  }

  const issues: LessonContentIssue[] = [];
  for (const ids of byFingerprint.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      issues.push({
        id_leccion: id,
        segment: "vocabulary",
        message: `contenido duplicado con lección(es) ${ids.filter((x) => x !== id).join(", ")}`,
      });
    }
  }
  return issues;
};

const segmentSeedOffset: Record<LessonSegment, number> = {
  presentation: 11,
  practice: 29,
  use: 47,
};

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const seededShuffle = <T>(items: T[], seed: number): T[] => {
  const arr = [...items];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const shuffleExercise = (
  exercise: LessonExercise,
  seed: number,
): LessonExercise => {
  const tagged = exercise.options.map((option, index) => ({
    option,
    isCorrect: index === exercise.correctIndex,
  }));
  const shuffled = seededShuffle(tagged, seed);
  return {
    prompt: exercise.prompt,
    options: shuffled.map((item) => item.option),
    correctIndex: shuffled.findIndex((item) => item.isCorrect),
  };
};

export const generateDefaultContentPayload = (
  idLeccion: number,
): LessonContentPayload => buildExpectedContentPayload(idLeccion);

export const repairAllLessonContent = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const lessons = await client.execute({
    sql: "SELECT id_leccion FROM leccion ORDER BY id_leccion",
    args: [],
  });

  let repaired = 0;
  for (const row of lessons.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const expected = generateDefaultContentPayload(idLeccion);
    const stored = await fetchContentPayload(idLeccion);
    const issues = [
      ...validateLessonPayload(idLeccion, stored ?? expected),
      ...validateOptionUniqueness(idLeccion, stored ?? expected),
    ];
    const directionIssues = validateLessonSegmentDirections(
      idLeccion,
      stored ?? expected,
    );

    if (!stored || issues.length > 0 || directionIssues.length > 0) {
      await saveLessonContentPayload(idLeccion, expected);
      repaired += 1;
    }
  }

  return repaired;
};

export const repairLegacyUseExercises = async () => {
  const repaired = await repairAllLessonContent();
  return repaired;
};

const payloadToLessonContent = (
  idLeccion: number,
  titulo: string,
  payload: LessonContentPayload,
): LessonContent => ({
  id_leccion: idLeccion,
  titulo,
  presentation: {
    summary: payload.summary,
    vocabulary: payload.vocabulary,
    quiz: shuffleExercise(
      payload.quiz,
      idLeccion * 97 + segmentSeedOffset.presentation,
    ),
  },
  practice: shuffleExercise(
    payload.practice,
    idLeccion * 97 + segmentSeedOffset.practice,
  ),
  use: shuffleExercise(payload.use, idLeccion * 97 + segmentSeedOffset.use),
});

const rowToPayload = (row: Record<string, unknown>): LessonContentPayload => ({
  summary: rowStr(row.summary),
  vocabulary: JSON.parse(rowStr(row.vocabulary_json)) as {
    term: string;
    meaning: string;
  }[],
  quiz: {
    prompt: rowStr(row.quiz_prompt),
    options: JSON.parse(rowStr(row.quiz_options_json)) as string[],
    correctIndex: rowInt(row.quiz_correct_index),
  },
  practice: {
    prompt: rowStr(row.practice_prompt),
    options: JSON.parse(rowStr(row.practice_options_json)) as string[],
    correctIndex: rowInt(row.practice_correct_index),
  },
  use: {
    prompt: rowStr(row.use_prompt),
    options: JSON.parse(rowStr(row.use_options_json)) as string[],
    correctIndex: rowInt(row.use_correct_index),
  },
});

export const fetchContentPayload = async (
  idLeccion: number,
): Promise<LessonContentPayload | null> => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: "SELECT * FROM contenido_leccion WHERE id_leccion = ? LIMIT 1",
    args: [idLeccion],
  });
  const row = res.rows[0];
  if (!row) return null;
  return rowToPayload(row);
};

export const getLessonContent = async (
  idLeccion: number,
  titulo: string,
): Promise<LessonContent> => {
  const expected = generateDefaultContentPayload(idLeccion);
  const stored = await fetchContentPayload(idLeccion);

  if (!stored) {
    await saveLessonContentPayload(idLeccion, expected);
    return payloadToLessonContent(idLeccion, titulo, expected);
  }

  const issues = [
    ...validateLessonPayload(idLeccion, stored),
    ...validateLessonSegmentDirections(idLeccion, stored),
    ...validateOptionUniqueness(idLeccion, stored),
  ];

  const payload = issues.length > 0 ? expected : stored;
  if (issues.length > 0) {
    await saveLessonContentPayload(idLeccion, expected);
  }

  return payloadToLessonContent(idLeccion, titulo, payload);
};

export const saveLessonContentPayload = async (
  idLeccion: number,
  payload: LessonContentPayload,
) => {
  const issues = [
    ...validateLessonPayloadStructure(idLeccion, payload),
    ...validateLessonSegmentDirections(idLeccion, payload),
  ];
  if (issues.length > 0) {
    throw new Error(
      `Contenido inválido: ${issues.map((i) => i.message).join("; ")}`,
    );
  }

  await ensureMoaSchema();
  const client = getDbClient();
  await client.execute({
    sql: `INSERT INTO contenido_leccion
          (id_leccion, summary, vocabulary_json,
           quiz_prompt, quiz_options_json, quiz_correct_index,
           practice_prompt, practice_options_json, practice_correct_index,
           use_prompt, use_options_json, use_correct_index, actualizado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id_leccion) DO UPDATE SET
            summary = excluded.summary,
            vocabulary_json = excluded.vocabulary_json,
            quiz_prompt = excluded.quiz_prompt,
            quiz_options_json = excluded.quiz_options_json,
            quiz_correct_index = excluded.quiz_correct_index,
            practice_prompt = excluded.practice_prompt,
            practice_options_json = excluded.practice_options_json,
            practice_correct_index = excluded.practice_correct_index,
            use_prompt = excluded.use_prompt,
            use_options_json = excluded.use_options_json,
            use_correct_index = excluded.use_correct_index,
            actualizado_en = datetime('now')`,
    args: [
      idLeccion,
      payload.summary,
      JSON.stringify(payload.vocabulary),
      payload.quiz.prompt,
      JSON.stringify(payload.quiz.options),
      payload.quiz.correctIndex,
      payload.practice.prompt,
      JSON.stringify(payload.practice.options),
      payload.practice.correctIndex,
      payload.use.prompt,
      JSON.stringify(payload.use.options),
      payload.use.correctIndex,
    ],
  });
};

export const seedAllLessonContent = async () => {
  const client = getDbClient();
  const lessons = await client.execute({
    sql: "SELECT id_leccion FROM leccion ORDER BY id_leccion",
    args: [],
  });

  for (const row of lessons.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const existing = await fetchContentPayload(idLeccion);
    if (existing) continue;
    await saveLessonContentPayload(
      idLeccion,
      generateDefaultContentPayload(idLeccion),
    );
  }
};

export const listCompetenciasWithLessons = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT c.id_competencia, c.titulo, c.orden, c.lapso, g.nombre AS grado,
                 COUNT(l.id_leccion) AS total_lecciones,
                 SUM(CASE WHEN cl.id_leccion IS NOT NULL THEN 1 ELSE 0 END) AS con_contenido
          FROM competencia c
          JOIN grado g ON g.id_grado = c.id_grado
          JOIN leccion l ON l.id_competencia = c.id_competencia
          LEFT JOIN contenido_leccion cl ON cl.id_leccion = l.id_leccion
          GROUP BY c.id_competencia
          ORDER BY c.orden`,
    args: [],
  });

  return res.rows.map((row) => ({
    id_competencia: rowInt(row.id_competencia),
    titulo: rowStr(row.titulo),
    orden: rowInt(row.orden),
    lapso: rowInt(row.lapso),
    grado: rowStr(row.grado),
    total_lecciones: rowInt(row.total_lecciones),
    con_contenido: rowInt(row.con_contenido),
  }));
};

export const listLeccionesWithContent = async (idCompetencia: number) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT l.id_leccion, l.titulo, l.orden,
                 CASE WHEN cl.id_leccion IS NOT NULL THEN 1 ELSE 0 END AS tiene_contenido,
                 cl.actualizado_en
          FROM leccion l
          LEFT JOIN contenido_leccion cl ON cl.id_leccion = l.id_leccion
          WHERE l.id_competencia = ?
          ORDER BY l.orden`,
    args: [idCompetencia],
  });

  return res.rows.map((row) => ({
    id_leccion: rowInt(row.id_leccion),
    titulo: rowStr(row.titulo),
    orden: rowInt(row.orden),
    tiene_contenido: rowInt(row.tiene_contenido) === 1,
    actualizado_en: row.actualizado_en ? rowStr(row.actualizado_en) : null,
  }));
};

export const getLessonEditorData = async (idLeccion: number) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT l.id_leccion, l.titulo, l.orden, l.id_competencia,
                 c.titulo AS competencia
          FROM leccion l
          JOIN competencia c ON c.id_competencia = l.id_competencia
          WHERE l.id_leccion = ? LIMIT 1`,
    args: [idLeccion],
  });
  const row = res.rows[0];
  if (!row) return null;

  const stored = await fetchContentPayload(idLeccion);
  const payload = stored ?? generateDefaultContentPayload(idLeccion);

  return {
    id_leccion: idLeccion,
    titulo: rowStr(row.titulo),
    orden: rowInt(row.orden),
    id_competencia: rowInt(row.id_competencia),
    competencia: rowStr(row.competencia),
    content: payload,
    persisted: stored !== null,
  };
};

export const updateLessonTitle = async (idLeccion: number, titulo: string) => {
  await ensureMoaSchema();
  const client = getDbClient();
  await client.execute({
    sql: "UPDATE leccion SET titulo = ? WHERE id_leccion = ?",
    args: [titulo.trim(), idLeccion],
  });
};

export const updateCompetenciaTitle = async (
  idCompetencia: number,
  titulo: string,
) => {
  await ensureMoaSchema();
  const client = getDbClient();
  await client.execute({
    sql: "UPDATE competencia SET titulo = ? WHERE id_competencia = ?",
    args: [titulo.trim(), idCompetencia],
  });
};

export const scoreForSegment = (
  segment: LessonSegment,
  correct: boolean,
): number => {
  if (!correct) return 0;
  if (segment === "presentation") return 25;
  if (segment === "practice") return 50;
  return 50;
};
