import { auditAllLessonSpeech } from "../src/lib/lesson-speech-audit";

const main = async () => {
  const issues = await auditAllLessonSpeech();
  const total = 128;

  console.log(`Auditadas lecciones (Escuchar: prompt, summary, opciones)`);

  if (issues.length === 0) {
    console.log(
      `OK: las ${total} lecciones tienen audio Escuchar coherente (es/en).`,
    );
    return;
  }

  console.log(`Problemas de Escuchar: ${issues.length}`);
  for (const issue of issues) {
    console.log(
      `- Lección ${issue.id_leccion} [${issue.segment}/${issue.field}]: ${issue.message}`,
    );
  }
  process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
