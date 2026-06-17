import { getDbClient, rowInt, rowStr } from "./db";
import { getLessonContent } from "./lesson-content";
import {
  auditSpeechText,
  auditSummarySpeech,
  getOptionSpeechLang,
} from "./lesson-sounds";
import { ensureMoaSchema } from "./schema";

export type LessonSpeechAuditIssue = {
  id_leccion: number;
  segment: string;
  field: string;
  message: string;
};

export const auditAllLessonSpeech = async (): Promise<LessonSpeechAuditIssue[]> => {
  await ensureMoaSchema();
  const client = getDbClient();

  const lessonsRes = await client.execute({
    sql: "SELECT id_leccion, titulo FROM leccion ORDER BY id_leccion",
  });

  const issues: LessonSpeechAuditIssue[] = [];

  for (const row of lessonsRes.rows) {
    const idLeccion = rowInt(row.id_leccion);
    const titulo = rowStr(row.titulo);
    const content = await getLessonContent(idLeccion, titulo);
    const englishTerms = content.presentation.vocabulary.map((v) => v.term);

    for (const msg of auditSummarySpeech(content.presentation.summary, englishTerms)) {
      issues.push({
        id_leccion: idLeccion,
        segment: "presentation",
        field: "summary",
        message: msg,
      });
    }

    for (const msg of auditSpeechText(
      content.presentation.quiz.prompt,
      "presentation",
      "quiz_prompt",
    )) {
      issues.push({
        id_leccion: idLeccion,
        segment: "presentation",
        field: "quiz_prompt",
        message: msg,
      });
    }

    for (const option of content.presentation.quiz.options) {
      if (!option.trim()) {
        issues.push({
          id_leccion: idLeccion,
          segment: "presentation",
          field: "quiz_option",
          message: "opción vacía",
        });
      }
    }

    for (const msg of auditSpeechText(
      content.practice.prompt,
      "practice",
      "practice_prompt",
    )) {
      issues.push({
        id_leccion: idLeccion,
        segment: "practice",
        field: "practice_prompt",
        message: msg,
      });
    }

    for (const option of content.practice.options) {
      if (!option.trim()) {
        issues.push({
          id_leccion: idLeccion,
          segment: "practice",
          field: "practice_option",
          message: "opción vacía",
        });
      }
    }

    for (const msg of auditSpeechText(
      content.use.prompt,
      "use",
      "use_prompt",
    )) {
      issues.push({
        id_leccion: idLeccion,
        segment: "use",
        field: "use_prompt",
        message: msg,
      });
    }

    for (const option of content.use.options) {
      if (!option.trim()) {
        issues.push({
          id_leccion: idLeccion,
          segment: "use",
          field: "use_option",
          message: "opción vacía",
        });
      }
    }

    const optionLangPresentation = getOptionSpeechLang("presentation");
    const optionLangPractice = getOptionSpeechLang("practice");
    const optionLangUse = getOptionSpeechLang("use");
    if (
      optionLangPresentation !== "es" ||
      optionLangPractice !== "en" ||
      optionLangUse !== "en"
    ) {
      issues.push({
        id_leccion: idLeccion,
        segment: "config",
        field: "option_lang",
        message: "idioma de opciones incorrecto",
      });
    }
  }

  return issues;
};
