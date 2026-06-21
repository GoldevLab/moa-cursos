type VocabItem = { term: string; meaning: string };

const parseWords = (entries: string[]): VocabItem[] =>
  entries.map((entry) => {
    const sep = entry.indexOf(":");
    return {
      term: entry.slice(0, sep),
      meaning: entry.slice(sep + 1),
    };
  });

/** Word bank completo MOA A1C1 — Competencia 1, 1.er grado. */
export const COMPETENCY_1_WORD_BANK = parseWords([
  // Possessive adjectives
  "my:mi",
  "your:tu",
  "her:su (de ella)",
  "his:su (de él)",
  "its:su (de eso)",
  "our:nuestro",
  "their:su (de ellos)",
  // Wild animals
  "lion:león",
  "monkey:mono",
  "shark:tiburón",
  "snake:serpiente",
  "kangaroo:canguro",
  "wolf:lobo",
  // Family members
  "mother:madre",
  "father:padre",
  "parents:padres",
  "sister:hermana",
  "brother:hermano",
  "siblings:hermanos",
  "son:hijo",
  "daughter:hija",
  "grandmother:abuela",
  "grandfather:abuelo",
  "grandma:abuela",
  "grandpa:abuelo",
  "uncle:tío",
  "aunt:tía",
  "cousin:primo",
  // Colors
  "red:rojo",
  "blue:azul",
  "orange:naranja",
  "yellow:amarillo",
  "green:verde",
  // Countries
  "venezuela:Venezuela",
  "colombia:Colombia",
  "italy:Italia",
  "china:China",
  "syria:Siria",
  "usa:Estados Unidos",
  "canada:Canadá",
  "uk:Reino Unido",
  "france:Francia",
  "germany:Alemania",
  "japan:Japón",
  "lebanon:Líbano",
  "india:India",
  "peru:Perú",
  "argentina:Argentina",
  // Nationalities
  "venezuelan:venezolano",
  "colombian:colombiano",
  "italian:italiano",
  "chinese:chino",
  "syrian:sirio",
  "american:estadounidense",
  "canadian:canadiense",
  "british:británico",
  "french:francés",
  "german:alemán",
  "japanese:japonés",
  "lebanese:libanés",
  "indian:indio",
  "peruvian:peruano",
  "argentinian:argentino",
  // Grammar & lesson support (workbook blocks)
  "hello:hola",
  "name:nombre",
  "nice:agradable",
  "meet:conocer",
  "from:de",
  "country:país",
  "nationality:nacionalidad",
  "flag:bandera",
  "family:familia",
  "beautiful:hermoso",
]);

/** Vocabulario por bloque del workbook (3 palabras foco por lección). */
export const COMPETENCY_1_LESSON_TERMS: Record<number, readonly [string, string, string]> = {
  1: ["hello", "name", "nice"],
  2: ["from", "nationality", "blue"],
  3: ["lion", "snake", "shark"],
  4: ["father", "mother", "his"],
  5: ["grandma", "grandpa", "aunt"],
  6: ["brother", "sister", "her"],
  7: ["cousin", "their", "colombian"],
  8: ["monkey", "venezuelan", "wolf"],
};

/** 1.er grado: 16 competencias × 8 lecciones = 128 lecciones con el mismo word bank MOA A1C1. */
export const FIRST_GRADE_LESSONS = 128;
export const FIRST_GRADE_COMPETENCIES = 16;

export const isFirstGradeLesson = (idLeccion: number): boolean =>
  idLeccion >= 1 && idLeccion <= FIRST_GRADE_LESSONS;

/** Bloque del workbook B1–B8 (cicla en cada competencia). */
export const firstGradeWorkbookBlock = (idLeccion: number): number =>
  ((idLeccion - 1) % 8) + 1;

export const FIRST_GRADE_COMPETENCY_TITLE =
  "Información personal, familia y otros";

export const COMPETENCY_1_LESSON_TITLES: Record<number, string> = {
  1: "Hello & my name",
  2: "Country & nationality",
  3: "Wild animals",
  4: "My family",
  5: "Review",
  6: "Brothers & sisters",
  7: "My cousins",
  8: "Final review",
};

export const COMPETENCY_1_SUMMARIES: Record<number, string> = {
  1: "En esta lección saludarás y te presentarás: Hello! My name is… Nice to meet you. I am ___ years old.",
  2: "Practicarás país y nacionalidad: I am from… My nationality is… The flag of my country is… (colors).",
  3: "Aprenderás animales salvajes y colores: Lions are wild animals. My favorite wild animal is…",
  4: "Conocerás la familia: My family is beautiful. I have a father / mother…",
  5: "Repasarás vocabulario de la competencia: familia, colores y saludos.",
  6: "Hablarás de hermanos y hermanas: I have two brothers and one sister. Her / their favorite wild animal…",
  7: "Practicarás primos, países y nacionalidades: My cousins are from… Their names are…",
  8: "Repaso final: información personal, familia, nacionalidad y animales salvajes.",
};

export type { VocabItem };

const bankByTerm = new Map(
  COMPETENCY_1_WORD_BANK.map((item) => [item.term.toLowerCase(), item]),
);

export const lookupCompetency1Term = (term: string): VocabItem | undefined =>
  bankByTerm.get(term.toLowerCase());

/** Términos exigidos por el chart del workbook (para auditoría). */
export const COMPETENCY_1_REQUIRED_TERMS = [
  "my",
  "your",
  "her",
  "his",
  "its",
  "our",
  "their",
  "lion",
  "monkey",
  "shark",
  "snake",
  "kangaroo",
  "wolf",
  "mother",
  "father",
  "parents",
  "sister",
  "brother",
  "siblings",
  "son",
  "daughter",
  "grandmother",
  "grandfather",
  "grandma",
  "grandpa",
  "uncle",
  "aunt",
  "cousin",
  "red",
  "blue",
  "orange",
  "yellow",
  "green",
  "venezuela",
  "venezuelan",
  "colombia",
  "colombian",
  "italy",
  "italian",
  "china",
  "chinese",
  "syria",
  "syrian",
  "usa",
  "american",
  "canada",
  "canadian",
  "uk",
  "british",
  "france",
  "french",
  "germany",
  "german",
  "japan",
  "japanese",
  "lebanon",
  "lebanese",
  "india",
  "indian",
  "peru",
  "peruvian",
  "argentina",
  "argentinian",
] as const;

export const auditCompetency1WordBank = (): string[] => {
  const issues: string[] = [];
  const bankTerms = new Set(
    COMPETENCY_1_WORD_BANK.map((item) => item.term.toLowerCase()),
  );

  for (const term of COMPETENCY_1_REQUIRED_TERMS) {
    if (!bankTerms.has(term)) {
      issues.push(`falta en word bank: ${term}`);
    }
  }

  for (let lesson = 1; lesson <= 8; lesson++) {
    const terms = COMPETENCY_1_LESSON_TERMS[lesson];
    for (const term of terms) {
      if (!bankTerms.has(term)) {
        issues.push(`lección ${lesson}: término "${term}" no está en word bank`);
      }
    }
  }

  return issues;
};
