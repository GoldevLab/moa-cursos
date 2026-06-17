import {
  auditAllLessonContent,
  auditAllLessonGameplay,
  auditLessonUniqueness,
  repairAllLessonContent,
} from "../src/lib/lesson-content";
import { auditAllLessonSpeech } from "../src/lib/lesson-speech-audit";

const main = async () => {
  const repaired = await repairAllLessonContent();

  const contentIssues = await auditAllLessonContent();
  const gameplayIssues = await auditAllLessonGameplay();
  const uniquenessIssues = await auditLessonUniqueness();
  const speechIssues = await auditAllLessonSpeech();

  const allIssues = [
    ...contentIssues.map((i) => ({
      kind: "contenido",
      ...i,
    })),
    ...gameplayIssues.map((i) => ({
      kind: "gameplay",
      ...i,
    })),
    ...uniquenessIssues.map((i) => ({
      kind: "unicidad",
      ...i,
    })),
    ...speechIssues.map((i) => ({
      kind: "escuchar",
      id_leccion: i.id_leccion,
      segment: i.segment,
      message: `${i.field}: ${i.message}`,
    })),
  ];

  console.log(`Reparadas: ${repaired} lecciones`);
  if (allIssues.length === 0) {
    console.log(
      "OK: las 128 lecciones pasan auditoría de contenido, gameplay y Escuchar.",
    );
    return;
  }

  console.log(`Problemas: ${allIssues.length}`);
  for (const issue of allIssues) {
    console.log(
      `- [${issue.kind}] Lección ${issue.id_leccion} [${issue.segment}]: ${issue.message}`,
    );
  }
  process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
