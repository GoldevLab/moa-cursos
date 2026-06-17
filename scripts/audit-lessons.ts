import {
  auditAllLessonContent,
  auditAllLessonGameplay,
  repairAllLessonContent,
} from "../src/lib/lesson-content";

const main = async () => {
  const repaired = await repairAllLessonContent();
  const contentIssues = await auditAllLessonContent();
  const gameplayIssues = await auditAllLessonGameplay();

  const issues = [...contentIssues, ...gameplayIssues];

  console.log(`Reparadas: ${repaired} lecciones`);
  if (issues.length === 0) {
    console.log(
      "OK: las 128 lecciones tienen preguntas coherentes y gameplay válido.",
    );
    return;
  }

  console.log(`Problemas restantes: ${issues.length}`);
  for (const issue of issues) {
    console.log(`- Lección ${issue.id_leccion} [${issue.segment}]: ${issue.message}`);
  }
  process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
