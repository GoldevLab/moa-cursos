import { SEGMENT_POINTS, type LessonSegment } from "./constants";
import { getDbClient, rowInt, rowStr } from "./db";
import { ensureMoaSchema } from "./schema";

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

const vocabularySets = [
  [
    { term: "hello", meaning: "hola" },
    { term: "goodbye", meaning: "adiós" },
    { term: "please", meaning: "por favor" },
  ],
  [
    { term: "book", meaning: "libro" },
    { term: "teacher", meaning: "profesor" },
    { term: "student", meaning: "estudiante" },
  ],
  [
    { term: "family", meaning: "familia" },
    { term: "friend", meaning: "amigo" },
    { term: "school", meaning: "escuela" },
  ],
  [
    { term: "water", meaning: "agua" },
    { term: "food", meaning: "comida" },
    { term: "milk", meaning: "leche" },
  ],
  [
    { term: "red", meaning: "rojo" },
    { term: "blue", meaning: "azul" },
    { term: "green", meaning: "verde" },
  ],
  [
    { term: "cat", meaning: "gato" },
    { term: "dog", meaning: "perro" },
    { term: "bird", meaning: "pájaro" },
  ],
  [
    { term: "mother", meaning: "madre" },
    { term: "father", meaning: "padre" },
    { term: "sister", meaning: "hermana" },
  ],
  [
    { term: "house", meaning: "casa" },
    { term: "room", meaning: "habitación" },
    { term: "door", meaning: "puerta" },
  ],
  [
    { term: "sun", meaning: "sol" },
    { term: "rain", meaning: "lluvia" },
    { term: "wind", meaning: "viento" },
  ],
  [
    { term: "happy", meaning: "feliz" },
    { term: "sad", meaning: "triste" },
    { term: "tired", meaning: "cansado" },
  ],
  [
    { term: "morning", meaning: "mañana" },
    { term: "night", meaning: "noche" },
    { term: "today", meaning: "hoy" },
  ],
  [
    { term: "apple", meaning: "manzana" },
    { term: "bread", meaning: "pan" },
    { term: "rice", meaning: "arroz" },
  ],
  [
    { term: "car", meaning: "carro" },
    { term: "bus", meaning: "autobús" },
    { term: "bike", meaning: "bicicleta" },
  ],
  [
    { term: "one", meaning: "uno" },
    { term: "two", meaning: "dos" },
    { term: "three", meaning: "tres" },
  ],
  [
    { term: "run", meaning: "correr" },
    { term: "walk", meaning: "caminar" },
    { term: "play", meaning: "jugar" },
  ],
  [
    { term: "read", meaning: "leer" },
    { term: "write", meaning: "escribir" },
    { term: "listen", meaning: "escuchar" },
  ],
] as const;

type VocabItem = { term: string; meaning: string };

/** Reparte vocabulario y palabra foco; `variant` desambigua lecciones que comparten set. */
export const getLessonPlan = (idLeccion: number) => {
  const slot = idLeccion - 1;
  const setIndex = Math.floor(slot / 3) % vocabularySets.length;
  const focusIndex = slot % 3;
  const variant = Math.floor(slot / 45) % 3;
  const set = vocabularySets[setIndex];
  return { slot, setIndex, focusIndex, variant, set, focus: set[focusIndex] };
};

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
): LessonExercise => ({
  prompt,
  options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), distractor],
  correctIndex: focusIndex,
});

/** Frases donde solo encaja una palabra del set; [set][foco][variante]. */
const USE_CLUES: { sentence: string; distractor: string }[][][] = [
  [
    [
      { sentence: "___ , how are you?", distractor: "Thanks" },
      { sentence: "I say ___ when I meet friends.", distractor: "Thanks" },
      { sentence: "___ , my name is Ana.", distractor: "Thanks" },
    ],
    [
      { sentence: "Before I leave, I say ___ .", distractor: "Thanks" },
      { sentence: "At night I wave and say ___ .", distractor: "Thanks" },
      { sentence: "Time to go! I say ___ .", distractor: "Thanks" },
    ],
    [
      { sentence: "Can I have water, ___ ?", distractor: "Thanks" },
      { sentence: "___ pass me the book.", distractor: "Thanks" },
      { sentence: "May I sit here? ___ ?", distractor: "Thanks" },
    ],
  ],
  [
    [
      { sentence: "I read a ___ every day.", distractor: "School" },
      { sentence: "This ___ has many stories.", distractor: "School" },
      { sentence: "I borrow a ___ from the library.", distractor: "School" },
    ],
    [
      { sentence: "My ___ helps me learn.", distractor: "Hello" },
      { sentence: "The ___ writes on the board.", distractor: "Hello" },
      { sentence: "Our ___ is very kind.", distractor: "Hello" },
    ],
    [
      { sentence: "I am a ___ at school.", distractor: "Hello" },
      { sentence: "Every ___ has a backpack.", distractor: "Hello" },
      { sentence: "The ___ raises a hand to speak.", distractor: "Hello" },
    ],
  ],
  [
    [
      { sentence: "I love my ___ .", distractor: "Hello" },
      { sentence: "We eat dinner with our ___ .", distractor: "Hello" },
      { sentence: "My whole ___ is funny.", distractor: "Hello" },
    ],
    [
      { sentence: "My best ___ is kind.", distractor: "Hello" },
      { sentence: "I play soccer with my ___ .", distractor: "Hello" },
      { sentence: "A good ___ listens to you.", distractor: "Hello" },
    ],
    [
      { sentence: "We learn at ___ .", distractor: "Hello" },
      { sentence: "The bell rings at ___ .", distractor: "Hello" },
      { sentence: "Children go to ___ every day.", distractor: "Hello" },
    ],
  ],
  [
    [
      { sentence: "I drink ___ every morning.", distractor: "Book" },
      { sentence: "Please give me cold ___ .", distractor: "Book" },
      { sentence: "Plants need ___ to grow.", distractor: "Book" },
    ],
    [
      { sentence: "I eat healthy ___ .", distractor: "Book" },
      { sentence: "Warm ___ smells delicious.", distractor: "Book" },
      { sentence: "We share ___ at lunch.", distractor: "Book" },
    ],
    [
      { sentence: "The baby drinks ___ .", distractor: "Book" },
      { sentence: "Cereal with ___ is yummy.", distractor: "Book" },
      { sentence: "White ___ is in the glass.", distractor: "Book" },
    ],
  ],
  [
    [
      { sentence: "Apples can be ___ .", distractor: "Hello" },
      { sentence: "Strawberries are ___ .", distractor: "Hello" },
      { sentence: "The stop sign is ___ .", distractor: "Hello" },
    ],
    [
      { sentence: "The sky is ___ .", distractor: "Hello" },
      { sentence: "The ocean is ___ .", distractor: "Hello" },
      { sentence: "My backpack is ___ .", distractor: "Hello" },
    ],
    [
      { sentence: "Grass is ___ .", distractor: "Hello" },
      { sentence: "Leaves are ___ .", distractor: "Hello" },
      { sentence: "Frogs can be ___ .", distractor: "Hello" },
    ],
  ],
  [
    [
      { sentence: "It says meow. It is a ___ .", distractor: "Teacher" },
      { sentence: "It likes milk. It is a ___ .", distractor: "Teacher" },
      { sentence: "It climbs trees. It is a ___ .", distractor: "Teacher" },
    ],
    [
      { sentence: "It says woof. It is a ___ .", distractor: "Teacher" },
      { sentence: "It wags its tail. It is a ___ .", distractor: "Teacher" },
      { sentence: "It fetches balls. It is a ___ .", distractor: "Teacher" },
    ],
    [
      { sentence: "It can fly. It is a ___ .", distractor: "Teacher" },
      { sentence: "It sings in the morning. It is a ___ .", distractor: "Teacher" },
      { sentence: "It has feathers. It is a ___ .", distractor: "Teacher" },
    ],
  ],
  [
    [
      { sentence: "My ___ cooks dinner.", distractor: "School" },
      { sentence: "I hug my ___ goodnight.", distractor: "School" },
      { sentence: "My ___ reads me stories.", distractor: "School" },
    ],
    [
      { sentence: "My ___ reads the newspaper.", distractor: "School" },
      { sentence: "My ___ fixes my bike.", distractor: "School" },
      { sentence: "My ___ drives the car.", distractor: "School" },
    ],
    [
      { sentence: "My ___ is my best friend.", distractor: "School" },
      { sentence: "I share toys with my ___ .", distractor: "School" },
      { sentence: "My ___ braids my hair.", distractor: "School" },
    ],
  ],
  [
    [
      { sentence: "We live in a ___ .", distractor: "Friend" },
      { sentence: "Our ___ has a red roof.", distractor: "Friend" },
      { sentence: "I play in my ___ .", distractor: "Friend" },
    ],
    [
      { sentence: "I sleep in my ___ .", distractor: "Friend" },
      { sentence: "My toys are in my ___ .", distractor: "Friend" },
      { sentence: "The lamp is in my ___ .", distractor: "Friend" },
    ],
    [
      { sentence: "Please close the ___ .", distractor: "Friend" },
      { sentence: "Knock on the ___ first.", distractor: "Friend" },
      { sentence: "The ___ is made of wood.", distractor: "Friend" },
    ],
  ],
  [
    [
      { sentence: "The ___ is shining today.", distractor: "Rain" },
      { sentence: "The ___ is very bright.", distractor: "Rain" },
      { sentence: "We see the ___ in the sky.", distractor: "Rain" },
    ],
    [
      { sentence: "It is ___ outside.", distractor: "Sun" },
      { sentence: "Take an umbrella. It is ___ .", distractor: "Sun" },
      { sentence: "Puddles form when it is ___ .", distractor: "Sun" },
    ],
    [
      { sentence: "The ___ is blowing hard.", distractor: "Sun" },
      { sentence: "The kite flies in the ___ .", distractor: "Sun" },
      { sentence: "The trees move in the ___ .", distractor: "Sun" },
    ],
  ],
  [
    [
      { sentence: "I feel ___ today.", distractor: "School" },
      { sentence: "Birthdays make me ___ .", distractor: "School" },
      { sentence: "I smile when I am ___ .", distractor: "School" },
    ],
    [
      { sentence: "She looks ___ .", distractor: "School" },
      { sentence: "He cries when he is ___ .", distractor: "School" },
      { sentence: "The movie was ___ .", distractor: "School" },
    ],
    [
      { sentence: "I am very ___ after running.", distractor: "School" },
      { sentence: "Bedtime! I am ___ .", distractor: "School" },
      { sentence: "Long walks make me ___ .", distractor: "School" },
    ],
  ],
  [
    [
      { sentence: "Good ___ , class!", distractor: "Book" },
      { sentence: "We wake up in the ___ .", distractor: "Book" },
      { sentence: "The ___ sun is orange.", distractor: "Book" },
    ],
    [
      { sentence: "Good ___ , sleep well!", distractor: "Book" },
      { sentence: "Stars come out at ___ .", distractor: "Book" },
      { sentence: "We read stories at ___ .", distractor: "Book" },
    ],
    [
      { sentence: "See you ___ !", distractor: "Book" },
      { sentence: "___ is Monday.", distractor: "Book" },
      { sentence: "What day is ___ ?", distractor: "Book" },
    ],
  ],
  [
    [
      { sentence: "I eat an ___ for lunch.", distractor: "Water" },
      { sentence: "This ___ is red and sweet.", distractor: "Water" },
      { sentence: "An ___ a day is healthy.", distractor: "Water" },
    ],
    [
      { sentence: "I eat ___ with butter.", distractor: "Water" },
      { sentence: "Warm ___ smells good.", distractor: "Water" },
      { sentence: "We buy fresh ___ at the store.", distractor: "Water" },
    ],
    [
      { sentence: "We eat ___ with chicken.", distractor: "Water" },
      { sentence: "White ___ is in the bowl.", distractor: "Water" },
      { sentence: "Asian food often has ___ .", distractor: "Water" },
    ],
  ],
  [
    [
      { sentence: "We go to school by ___ .", distractor: "Walk" },
      { sentence: "Dad drives the ___ .", distractor: "Walk" },
      { sentence: "The family ___ is blue.", distractor: "Walk" },
    ],
    [
      { sentence: "We ride the ___ to town.", distractor: "Walk" },
      { sentence: "Many students take the ___ .", distractor: "Walk" },
      { sentence: "The yellow ___ stops here.", distractor: "Walk" },
    ],
    [
      { sentence: "I ride my ___ to the park.", distractor: "Walk" },
      { sentence: "My ___ has two wheels.", distractor: "Walk" },
      { sentence: "I pedal my ___ fast.", distractor: "Walk" },
    ],
  ],
  [
    [
      { sentence: "I can count to ___ .", distractor: "Four" },
      { sentence: "I have ___ nose.", distractor: "Four" },
      { sentence: "___ plus zero is ___ .", distractor: "Four" },
    ],
    [
      { sentence: "I have ___ pencils.", distractor: "Four" },
      { sentence: "Birds have ___ wings.", distractor: "Four" },
      { sentence: "___ shoes make a pair.", distractor: "Four" },
    ],
    [
      { sentence: "I see ___ birds.", distractor: "Four" },
      { sentence: "___ little pigs in the story.", distractor: "Four" },
      { sentence: "Traffic lights have ___ colors.", distractor: "Four" },
    ],
  ],
  [
    [
      { sentence: "I like to ___ in the park.", distractor: "Read" },
      { sentence: "Dogs ___ very fast.", distractor: "Read" },
      { sentence: "Athletes ___ in races.", distractor: "Read" },
    ],
    [
      { sentence: "I ___ to school every day.", distractor: "Read" },
      { sentence: "We ___ on the sidewalk.", distractor: "Read" },
      { sentence: "Grandma likes to ___ slowly.", distractor: "Read" },
    ],
    [
      { sentence: "We ___ soccer after class.", distractor: "Read" },
      { sentence: "Kids ___ games at recess.", distractor: "Read" },
      { sentence: "Let's ___ outside!", distractor: "Read" },
    ],
  ],
  [
    [
      { sentence: "In class, I ___ carefully.", distractor: "Run" },
      { sentence: "I ___ books before bed.", distractor: "Run" },
      { sentence: "We ___ stories together.", distractor: "Run" },
    ],
    [
      { sentence: "I ___ a story in my notebook.", distractor: "Run" },
      { sentence: "Please ___ your name here.", distractor: "Run" },
      { sentence: "We ___ letters to friends.", distractor: "Run" },
    ],
    [
      { sentence: "I ___ to the teacher.", distractor: "Run" },
      { sentence: "Good students ___ in class.", distractor: "Run" },
      { sentence: "Please ___ to the instructions.", distractor: "Run" },
    ],
  ],
];

const buildUseExercise = (
  set: readonly VocabItem[],
  setIndex: number,
  focusIndex: number,
  variant: number,
): LessonExercise => {
  const clue = USE_CLUES[setIndex][focusIndex][variant];
  const focus = set[focusIndex];
  return vocabUseExercise(
    set,
    focusIndex,
    `Usa «${focus.meaning}» en inglés. Completa: "${clue.sentence}"`,
    clue.distractor,
  );
};

const buildExpectedContentPayload = (idLeccion: number): LessonContentPayload => {
  const { setIndex, focusIndex, variant, set, focus } = getLessonPlan(idLeccion);
  return {
    summary: `En esta lección practicarás vocabulario básico en inglés. Objetivo: dominar ${focus.term} y expresiones relacionadas.`,
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
    use: buildUseExercise(set, setIndex, focusIndex, variant),
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

  return issues;
};

export const validateLessonPayload = (
  idLeccion: number,
  payload: LessonContentPayload,
): LessonContentIssue[] => {
  const issues = validateLessonPayloadStructure(idLeccion, payload);
  if (issues.length > 0) return issues;

  const { setIndex, focusIndex, variant, set, focus } = getLessonPlan(idLeccion);

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

  const { setIndex, focusIndex, variant, set, focus } = getLessonPlan(idLeccion);

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

  const expectedUse = buildUseExercise(set, setIndex, focusIndex, variant);
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
    const issues = validateLessonPayload(
      idLeccion,
      stored ?? expected,
    );
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
  const payload =
    (await fetchContentPayload(idLeccion)) ??
    generateDefaultContentPayload(idLeccion);
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
