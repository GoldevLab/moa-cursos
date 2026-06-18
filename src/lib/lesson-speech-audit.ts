import { getDbClient, rowInt, rowStr } from "./db";
import { getLessonContent, getLessonUseContext } from "./lesson-content";
import type { LessonSegment } from "./constants";
import {
  buildMeaningChoiceRound,
  buildPictureChoiceRound,
  buildSentenceOrderRound,
  buildSpellingRound,
  buildUsePictureRound,
  fillUseSentenceBlank,
  formatSentenceOrderTemplate,
  gameSeedForLesson,
  getSegmentGameType,
  type LessonGameType,
} from "./lesson-games";
import { getLessonPlan } from "./lesson-vocabulary";
import {
  auditSpeechText,
  auditSummarySpeech,
  getOptionSpeechLang,
  hasInstructionSpeechMapping,
} from "./lesson-sounds";
import { ensureMoaSchema } from "./schema";

export type LessonSpeechAuditIssue = {
  id_leccion: number;
  segment: string;
  field: string;
  message: string;
};

const gamePromptsForAudit = (
  segment: LessonSegment,
  gameType: LessonGameType,
  idLeccion: number,
  vocabulary: { term: string; meaning: string }[],
  focusIndex: number,
  themeIndex: number,
  lessonSlot: number,
  focus: { term: string; meaning: string },
  useSentence?: string,
): string[] => {
  const seed = gameSeedForLesson(idLeccion, segment);
  const prompts: string[] = [];

  switch (gameType) {
    case "meaning_choice": {
      const round = buildMeaningChoiceRound(
        vocabulary,
        focusIndex,
        themeIndex,
        lessonSlot,
        seed,
      );
      prompts.push(`Choose the correct meaning in Spanish of "${round.term}"`);
      break;
    }
    case "picture_choice": {
      const round =
        segment === "use" && useSentence
          ? buildUsePictureRound(
              vocabulary,
              focusIndex,
              themeIndex,
              lessonSlot,
              seed,
              useSentence,
              focus.meaning,
            )
          : buildPictureChoiceRound(
              vocabulary,
              focusIndex,
              themeIndex,
              lessonSlot,
              seed,
            );
      if (segment === "practice") {
        prompts.push(`Choose the correct image of "${round.englishTerm}"`);
      } else if (round.hintMeaning) {
        prompts.push(`Choose the correct word for «${round.hintMeaning}»`);
      } else {
        prompts.push(round.prompt);
      }
      break;
    }
    case "spelling_build": {
      const round = buildSpellingRound(
        focus,
        seed,
        segment === "use" && useSentence
          ? formatSentenceOrderTemplate(useSentence)
          : undefined,
      );
      prompts.push(round.prompt);
      break;
    }
    case "sentence_order": {
      if (!useSentence) break;
      const filled = fillUseSentenceBlank(useSentence, focus.term);
      const round = buildSentenceOrderRound(
        filled,
        useSentence,
        focus.term,
        focus.meaning,
        seed,
      );
      prompts.push(round.prompt);
      break;
    }
    default:
      break;
  }

  return prompts.filter(Boolean);
};

export const auditAllLessonGameSpeech = (): LessonSpeechAuditIssue[] => {
  const issues: LessonSpeechAuditIssue[] = [];
  const segments: LessonSegment[] = ["presentation", "practice", "use"];

  for (let idLeccion = 1; idLeccion <= 128; idLeccion++) {
    const { themeIndex, lessonSlot, focusIndex, set, focus } =
      getLessonPlan(idLeccion);
    const useSentence = getLessonUseContext(idLeccion).sentence;

    for (const segment of segments) {
      const gameType = getSegmentGameType(segment, idLeccion);
      const prompts = gamePromptsForAudit(
        segment,
        gameType,
        idLeccion,
        set,
        focusIndex,
        themeIndex,
        lessonSlot,
        focus,
        useSentence,
      );

      for (const prompt of prompts) {
        if (!hasInstructionSpeechMapping(prompt)) {
          issues.push({
            id_leccion: idLeccion,
            segment,
            field: `game_${gameType}_prompt`,
            message: `sin traducción Escuchar para "${prompt}"`,
          });
        }
      }
    }
  }

  return issues;
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

  return [...issues, ...auditAllLessonGameSpeech()];
};
