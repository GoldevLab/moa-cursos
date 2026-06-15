import type { LessonSegment } from "./constants";
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

const useTemplates: ((set: readonly VocabItem[]) => LessonExercise)[] = [
  () => ({
    prompt: `Completa la frase: "___ , how are you?"`,
    options: ["Hello", "Goodbye", "Please", "Thanks"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I read a ___ every day."`,
    options: [
      cap(set[0].term),
      cap(set[1].term),
      cap(set[2].term),
      "School",
    ],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I love my ___ ."`,
    options: [
      cap(set[0].term),
      cap(set[1].term),
      cap(set[2].term),
      "Hello",
    ],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I drink ___ every morning."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Book"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "My favorite color is ___ ."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Hello"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I have a pet ___ ."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Teacher"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "My ___ is very kind."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "School"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "The ___ is open."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Friend"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "The ___ is shining today."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Rain"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I feel ___ today."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "School"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "See you this ___ ."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Book"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I eat an ___ for lunch."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Water"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "We go to school by ___ ."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Walk"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I can count to ___ ."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Four"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "I like to ___ in the park."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Read"],
    correctIndex: 0,
  }),
  (set) => ({
    prompt: `Completa la frase: "In class, I ___ carefully."`,
    options: [cap(set[0].term), cap(set[1].term), cap(set[2].term), "Run"],
    correctIndex: 0,
  }),
];

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

  const setIndex = (idLeccion - 1) % vocabularySets.length;
  const set = vocabularySets[setIndex];
  const quizTarget = (idLeccion - 1) % 3;
  const practiceTarget = (idLeccion + 1) % 3;

  const quizIssue = validateExercise(
    payload.quiz,
    set[quizTarget].meaning,
    "quiz",
  );
  if (quizIssue) {
    issues.push({ id_leccion: idLeccion, segment: "quiz", message: quizIssue });
  }
  if (!payload.quiz.prompt.includes(set[quizTarget].term)) {
    issues.push({
      id_leccion: idLeccion,
      segment: "quiz",
      message: `la pregunta no menciona "${set[quizTarget].term}"`,
    });
  }

  const practiceIssue = validateExercise(
    payload.practice,
    set[practiceTarget].term,
    "practice",
  );
  if (practiceIssue) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: practiceIssue,
    });
  }
  if (!payload.practice.prompt.includes(set[practiceTarget].meaning)) {
    issues.push({
      id_leccion: idLeccion,
      segment: "practice",
      message: `la pregunta no menciona "${set[practiceTarget].meaning}"`,
    });
  }

  const expectedUse = useTemplates[setIndex](set);
  const useIssue = validateExercise(
    payload.use,
    expectedUse.options[expectedUse.correctIndex],
    "use",
  );
  if (useIssue) {
    issues.push({ id_leccion: idLeccion, segment: "use", message: useIssue });
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
): LessonContentPayload => {
  const setIndex = (idLeccion - 1) % vocabularySets.length;
  const set = vocabularySets[setIndex];
  const quizTarget = (idLeccion - 1) % 3;
  const practiceTarget = (idLeccion + 1) % 3;
  const focus = set[quizTarget];

  return {
    summary: `En esta lección practicarás vocabulario básico en inglés. Objetivo: dominar ${focus.term} y expresiones relacionadas.`,
    vocabulary: set.map((item) => ({ ...item })),
    quiz: {
      prompt: `Selecciona el significado correcto de "${set[quizTarget].term}":`,
      options: set.map((item) => item.meaning),
      correctIndex: quizTarget,
    },
    practice: {
      prompt: `¿Cuál palabra en inglés corresponde a "${set[practiceTarget].meaning}"?`,
      options: set.map((item) => item.term),
      correctIndex: practiceTarget,
    },
    use: useTemplates[setIndex](set),
  };
};

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

    if (!stored || issues.length > 0) {
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
  const issues = validateLessonPayloadStructure(idLeccion, payload);
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
