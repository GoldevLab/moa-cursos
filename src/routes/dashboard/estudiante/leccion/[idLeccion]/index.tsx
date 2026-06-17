import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  LuPartyPopper,
  LuSkipForward,
} from "@qwikest/icons/lucide";
import {
  LessonCelebrateBurst,
  LessonExerciseArena,
  LessonFeedbackBanner,
  LessonGameHeader,
  LessonGameStepper,
  LessonMissionCompleteOverlay,
  LessonSegmentIntro,
  LessonSummaryCard,
  LessonTrophyToast,
  LessonVictoryModal,
  LessonVocabReveal,
} from "~/components/student/lesson-play";
import { MatchPairsGame } from "~/components/student/match-pairs-game";
import { MemoryMatchGame } from "~/components/student/memory-match-game";
import {
  BreadcrumbTrail,
} from "~/components/student/student-ui";
import { MAX_POINTS_PER_LESSON, SEGMENT_POINTS } from "~/lib/constants";
import type { LessonSegment } from "~/lib/constants";
import { getCurrentUsuario } from "~/lib/auth";
import { getDbClient, rowInt, rowStr } from "~/lib/db";
import {
  playCorrectSound,
  playMissionCompleteSound,
  playVictorySound,
  playWrongSound,
  primeLessonAudio,
} from "~/lib/lesson-sounds";
import {
  getEstudianteByUsuarioId,
  getLessonSegmentState,
  getNextLessonInfo,
  isLessonUnlocked,
  normalizeLessonProgress,
  reconcileLessonProgressInDb,
  saveSegmentProgress,
} from "~/lib/progress";
import {
  getLessonContent,
  scoreForSegment,
} from "~/lib/lesson-content";
import { gradeLessonAnswer, resolveSegmentExercise } from "~/lib/lesson-grading";
import {
  PRACTICE_GAME_UI,
  buildMatchPairs,
  buildMemoryPairs,
  getPracticeGameType,
  gradeMatchPairs,
  scoreFromRatio,
} from "~/lib/lesson-games";
import { ServerAuthError, requireEstudianteProfile } from "~/lib/server-auth";
import { ensureMoaSchema } from "~/lib/schema";

export const useLessonPage = routeLoader$(async (event) => {
  await ensureMoaSchema();
  const idLeccion = Number(event.params.idLeccion);
  const user = await getCurrentUsuario(event);
  if (!user || user.rol !== "estudiante") return null;

  const perfil = await getEstudianteByUsuarioId(user.id_usuario);
  if (!perfil) return null;

  const unlocked = await isLessonUnlocked(perfil.id_estudiante, idLeccion);
  if (!unlocked) return { locked: true as const };

  const client = getDbClient();
  const lessonRes = await client.execute({
    sql: `SELECT l.id_leccion, l.titulo, l.orden, c.titulo AS competencia,
                 c.id_competencia
          FROM leccion l
          JOIN competencia c ON c.id_competencia = l.id_competencia
          WHERE l.id_leccion = ? LIMIT 1`,
    args: [idLeccion],
  });
  const row = lessonRes.rows[0];
  if (!row) return null;

  const progressRes = await client.execute({
    sql: `SELECT presentation_completada, practice_completada, use_completada,
                 presentation_score, practice_score, use_score,
                 puntaje_total, completada, es_perfecta
          FROM progreso_leccion
          WHERE id_estudiante = ? AND id_leccion = ? LIMIT 1`,
    args: [perfil.id_estudiante, idLeccion],
  });
  const progress = progressRes.rows[0];
  const normalizedProgress =
    (await reconcileLessonProgressInDb(perfil.id_estudiante, idLeccion)) ??
    normalizeLessonProgress(progress ?? {});

  const content = await getLessonContent(idLeccion, rowStr(row.titulo));
  const nextLesson = await getNextLessonInfo(idLeccion);

  return {
    locked: false as const,
    id_estudiante: perfil.id_estudiante,
    lesson: {
      id_leccion: idLeccion,
      titulo: rowStr(row.titulo),
      competencia: rowStr(row.competencia),
      id_competencia: rowInt(row.id_competencia),
      orden: rowInt(row.orden),
    },
    progress: normalizedProgress,
    content,
    next_lesson: nextLesson,
  };
});

const saveProgressAction = server$(async function (
  idLeccion: number,
  segment: LessonSegment,
  selectedIndex: number,
) {
  try {
    const { perfil } = await requireEstudianteProfile(this);
    const unlocked = await isLessonUnlocked(perfil.id_estudiante, idLeccion);
    if (!unlocked) {
      return { ok: false as const, reason: "locked" as const };
    }

    // Respeta el orden de misiones: práctica exige presentación, uso exige práctica.
    const prev = await getLessonSegmentState(perfil.id_estudiante, idLeccion);
    if (segment === "practice" && !prev.presentation_completada) {
      return { ok: false as const, reason: "order" as const };
    }
    if (segment === "use" && !prev.practice_completada) {
      return { ok: false as const, reason: "order" as const };
    }

    const client = getDbClient();
    const lessonRes = await client.execute({
      sql: "SELECT titulo FROM leccion WHERE id_leccion = ? LIMIT 1",
      args: [idLeccion],
    });
    const titulo = rowStr(lessonRes.rows[0]?.titulo) || `Lección ${idLeccion}`;
    const content = await getLessonContent(idLeccion, titulo);
    const grade = gradeLessonAnswer(content, segment, selectedIndex);
    if (!grade) {
      return { ok: false as const, reason: "invalid" as const };
    }

    const correct = grade.correct;
    const score = scoreForSegment(segment, correct);
    const result = await saveSegmentProgress({
      idEstudiante: perfil.id_estudiante,
      idLeccion,
      segment,
      score,
    });
    return { ok: true as const, ...result, correct };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

const saveGameProgressAction = server$(async function (
  idLeccion: number,
  matches: Record<string, string> | null,
) {
  try {
    const { perfil } = await requireEstudianteProfile(this);
    const unlocked = await isLessonUnlocked(perfil.id_estudiante, idLeccion);
    if (!unlocked) {
      return { ok: false as const, reason: "locked" as const };
    }
    const gameType = getPracticeGameType(idLeccion);
    if (!gameType) {
      return { ok: false as const, reason: "invalid" as const };
    }

    // El juego está en Práctica: exige Presentación previa.
    const prev = await getLessonSegmentState(perfil.id_estudiante, idLeccion);
    if (!prev.presentation_completada) {
      return { ok: false as const, reason: "order" as const };
    }

    const segment: LessonSegment = "practice";
    const client = getDbClient();
    const lessonRes = await client.execute({
      sql: "SELECT titulo FROM leccion WHERE id_leccion = ? LIMIT 1",
      args: [idLeccion],
    });
    const titulo = rowStr(lessonRes.rows[0]?.titulo) || `Lección ${idLeccion}`;
    const content = await getLessonContent(idLeccion, titulo);

    // El servidor recalcula el puntaje; nunca confía en un ratio del cliente.
    let ratio: number;
    if (gameType === "match_pairs") {
      const pairs = buildMatchPairs(content.presentation.vocabulary);
      ratio = gradeMatchPairs(pairs, matches ?? {});
    } else {
      // memory_match: solo se completa al encontrar todas las parejas.
      ratio = 1;
    }

    const score = scoreFromRatio(segment, ratio);
    const correct = score >= SEGMENT_POINTS[segment];
    const result = await saveSegmentProgress({
      idEstudiante: perfil.id_estudiante,
      idLeccion,
      segment,
      score,
    });
    return { ok: true as const, ...result, correct };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useLessonPage);
  if (!data || data.locked) return { title: "Lección | MOA" };
  return { title: `${data.lesson.titulo} | MOA` };
};

export default component$(() => {
  const data = useLessonPage();
  const nav = useNavigate();
  const segment = useSignal<LessonSegment>("presentation");
  const segmentReady = useSignal(false);
  const selected = useSignal<number | null>(null);
  const feedback = useSignal("");
  const feedbackOk = useSignal<boolean | null>(null);
  const saving = useSignal(false);
  const celebrate = useSignal(false);
  const missionOverlay = useSignal<{
    segment: LessonSegment;
    xp: number;
    next: LessonSegment | null;
    review?: boolean;
    nextLabel?: string;
  } | null>(null);
  const victoryOpen = useSignal(false);
  const trophyLapsos = useSignal<number[]>([]);
  const localProgress = useSignal<{
    puntaje_total: number;
    completada: boolean;
    es_perfecta: boolean;
    presentation_completada: boolean;
    practice_completada: boolean;
    use_completada: boolean;
    presentation_perfect: boolean;
    practice_perfect: boolean;
    use_perfect: boolean;
  } | null>(null);

  useTask$(({ track }) => {
    track(() => data.value);
    if (!data.value || data.value.locked || segmentReady.value) return;

    const p = data.value.progress;
    if (p.completada) {
      segment.value = "presentation";
    } else if (!p.presentation_completada) {
      segment.value = "presentation";
    } else if (!p.practice_completada) {
      segment.value = "practice";
    } else if (!p.use_completada) {
      segment.value = "use";
    } else {
      segment.value = "presentation";
    }
    segmentReady.value = true;
  });

  if (!data.value) {
    return <p class="text-slate-600">Lección no encontrada.</p>;
  }

  if (data.value.locked) {
    return (
      <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
        <p class="text-lg font-semibold">Lección bloqueada</p>
        <p class="mt-2 text-sm">
          Completa la lección anterior para desbloquear esta actividad.
        </p>
        <Link
          href="/dashboard/estudiante/"
          class="mt-6 inline-flex rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </Link>
      </div>
    );
  }

  const page = data.value;
  const progress = localProgress.value ?? page.progress;
  const isReviewMode = progress.completada;

  const getExerciseForSegment = (seg: LessonSegment) =>
    resolveSegmentExercise(page.content, seg);

  const submitSegment = $(async (selectedIndex: number) => {
    // Desbloquea el audio dentro del gesto del usuario, antes de cualquier await.
    primeLessonAudio();
    const grade = gradeLessonAnswer(page.content, segment.value, selectedIndex);
    if (!grade) {
      feedbackOk.value = false;
      feedback.value = "Respuesta no válida. Recarga la página e intenta de nuevo.";
      return;
    }

    const correctIndex = grade.correctIndex;
    const correctAnswer = grade.correctAnswer;

    if (isReviewMode) {
      const correct = grade.correct;
      feedbackOk.value = correct;
      feedback.value = correct
        ? "¡Correcto! (modo repaso — no afecta tu puntaje)"
        : `Incorrecto. La respuesta correcta es "${correctAnswer}". (modo repaso)`;
      celebrate.value = correct;
      if (correct) playCorrectSound();
      else playWrongSound();

      if (correct) {
        const current = segment.value;
        if (current === "presentation") {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: current,
            xp: 0,
            next: "practice",
            review: true,
          };
        } else if (current === "practice") {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: current,
            xp: 0,
            next: "use",
            review: true,
          };
        } else if (page.next_lesson) {
          playVictorySound();
          victoryOpen.value = true;
        } else {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: current,
            xp: 0,
            next: null,
            review: true,
            nextLabel: "Ver más lecciones →",
          };
        }
      }
      return;
    }

    saving.value = true;
    feedback.value = "";
    feedbackOk.value = null;
    celebrate.value = false;
    try {
      const result = await saveProgressAction(
        page.lesson.id_leccion,
        segment.value,
        selectedIndex,
      );

      if (!result.ok) {
        feedbackOk.value = false;
        feedback.value =
          result.reason === "locked"
            ? "Esta lección está bloqueada."
            : result.reason === "invalid"
              ? "Respuesta no válida. Recarga la página e intenta de nuevo."
              : "No tienes permiso para guardar este progreso.";
        return;
      }

      feedbackOk.value = result.correct;
      feedback.value = result.correct
        ? "¡Genial! Ganaste XP en esta misión."
        : "Casi — intenta otra opción. Tu mejor puntaje se conserva.";
      celebrate.value = result.correct;

      if (result.correct) playCorrectSound();
      else playWrongSound();

      const currentSegment = segment.value;
      localProgress.value = {
        puntaje_total: result.puntaje_total,
        completada: result.completada,
        es_perfecta: result.es_perfecta,
        presentation_completada: result.presentation_completada,
        practice_completada: result.practice_completada,
        use_completada: result.use_completada,
        presentation_perfect:
          progress.presentation_perfect ||
          (currentSegment === "presentation" && result.segment_perfect),
        practice_perfect:
          progress.practice_perfect ||
          (currentSegment === "practice" && result.segment_perfect),
        use_perfect:
          progress.use_perfect ||
          (currentSegment === "use" && result.segment_perfect),
      };

      if (result.trophies_awarded.length > 0) {
        trophyLapsos.value = result.trophies_awarded;
      }

      if (result.correct) {
        if (result.newly_completed) {
          playVictorySound();
          victoryOpen.value = true;
        } else {
          playMissionCompleteSound();
          const nextSegment: LessonSegment =
            currentSegment === "presentation" ? "practice" : "use";
          missionOverlay.value = {
            segment: currentSegment,
            xp: result.segment_xp,
            next: nextSegment,
          };
        }
      }
    } finally {
      saving.value = false;
    }
  });

  const submitGameSegment = $(
    async (scoreRatio: number, matches: Record<string, string> | null) => {
      primeLessonAudio();
      const perfect = scoreRatio >= 1;

      if (isReviewMode) {
        feedbackOk.value = perfect;
        feedback.value = perfect
          ? "¡Excelente! (modo repaso — no afecta tu puntaje)"
          : `Casi perfecto — ${Math.round(scoreRatio * 100)}% correcto. (modo repaso)`;
        celebrate.value = perfect;
        if (perfect) playCorrectSound();
        else playWrongSound();

        if (perfect) {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: "practice",
            xp: 0,
            next: "use",
            review: true,
          };
        }
        return;
      }

      saving.value = true;
      feedback.value = "";
      feedbackOk.value = null;
      celebrate.value = false;
      try {
        const result = await saveGameProgressAction(
          page.lesson.id_leccion,
          matches,
        );

        if (!result.ok) {
          feedbackOk.value = false;
          feedback.value =
            result.reason === "locked"
              ? "Esta lección está bloqueada."
              : result.reason === "order"
                ? "Primero completa la misión anterior."
                : result.reason === "invalid"
                  ? "No se pudo guardar el juego. Recarga la página."
                  : "No tienes permiso para guardar este progreso.";
          return;
        }

        const passed = result.segment_xp > 0;
        feedbackOk.value = result.correct;
        feedback.value = result.correct
          ? "¡Genial! Misión perfecta."
          : passed
            ? `¡Bien! Llevas ${result.segment_xp} XP en esta misión. Repite para el máximo.`
            : "Revisa las parejas e intenta otra vez.";
        celebrate.value = result.correct;

        localProgress.value = {
          puntaje_total: result.puntaje_total,
          completada: result.completada,
          es_perfecta: result.es_perfecta,
          presentation_completada: result.presentation_completada,
          practice_completada: result.practice_completada,
          use_completada: result.use_completada,
          presentation_perfect: progress.presentation_perfect,
          practice_perfect:
            progress.practice_perfect || result.segment_perfect,
          use_perfect: progress.use_perfect,
        };

        if (result.trophies_awarded.length > 0) {
          trophyLapsos.value = result.trophies_awarded;
        }

        if (passed) playCorrectSound();
        else playWrongSound();

        if (result.newly_completed) {
          playVictorySound();
          victoryOpen.value = true;
        } else if (passed) {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: "practice",
            xp: result.segment_xp,
            next: "use",
          };
        }
      } finally {
        saving.value = false;
      }
    },
  );

  const selectSegment = $((next: LessonSegment) => {
    if (!isReviewMode) {
      if (next === "practice" && !progress.presentation_completada) return;
      if (next === "use" && !progress.practice_completada) return;
    }
    segment.value = next;
    selected.value = null;
    feedback.value = "";
    feedbackOk.value = null;
    celebrate.value = false;
    missionOverlay.value = null;
  });

  const exercise = getExerciseForSegment(segment.value);
  const practiceGameType = getPracticeGameType(page.lesson.id_leccion);
  const isPracticeGame =
    segment.value === "practice" && practiceGameType !== null;
  const practiceGameUi = practiceGameType
    ? PRACTICE_GAME_UI[practiceGameType]
    : null;
  const gameSeed = page.lesson.id_leccion * 97 + 31;
  const memoryPairs = buildMemoryPairs(page.content.presentation.vocabulary);
  const matchPairs = buildMatchPairs(page.content.presentation.vocabulary);
  // Un segmento se bloquea solo cuando ya está perfecto (puntaje máximo).
  // Así se puede reintentar un juego parcial sin perder el mejor puntaje.
  const segmentPerfect =
    segment.value === "presentation"
      ? progress.presentation_perfect
      : segment.value === "practice"
        ? progress.practice_perfect
        : progress.use_perfect;
  const segmentLocked = segmentPerfect && !isReviewMode;
  const answered = feedback.value.length > 0;

  const dismissMissionOverlay = $(() => {
    const overlay = missionOverlay.value;
    if (!overlay) return;
    if (overlay.next) {
      segment.value = overlay.next;
      selected.value = null;
      feedback.value = "";
      feedbackOk.value = null;
      celebrate.value = false;
    } else if (overlay.review) {
      nav(`/dashboard/estudiante/competencia/${page.lesson.id_competencia}/`);
    }
    missionOverlay.value = null;
  });

  return (
    <div class="space-y-6 moa-fade-up">
      <BreadcrumbTrail
        items={[
          { label: "Mi campus", href: "/dashboard/estudiante/" },
          {
            label: page.lesson.competencia,
            href: `/dashboard/estudiante/competencia/${page.lesson.id_competencia}/`,
          },
          { label: page.lesson.titulo },
        ]}
      />

      <LessonGameHeader
        competencia={page.lesson.competencia}
        titulo={page.lesson.titulo}
        orden={page.lesson.orden}
        score={progress.puntaje_total}
        esPerfecta={progress.es_perfecta}
        completada={progress.completada}
      />

      <LessonGameStepper
        current={segment.value}
        presentationDone={progress.presentation_completada}
        practiceDone={progress.practice_completada}
        useDone={progress.use_completada}
        reviewMode={isReviewMode}
        onSelect$={selectSegment}
      />

      {isReviewMode && !victoryOpen.value ? (
        <p class="rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
          🎮 Modo repaso: practica las 3 misiones y al terminar Uso podrás ir a la
          siguiente lección.
        </p>
      ) : null}

      <section class="moa-lesson-arena relative rounded-3xl border border-indigo-100/80 p-6 shadow-lg sm:p-8">
        <LessonCelebrateBurst active={celebrate.value} />
        <LessonSegmentIntro
          key={segment.value}
          segment={segment.value}
          gameEmoji={isPracticeGame ? practiceGameUi?.emoji : undefined}
          gameTitle={isPracticeGame ? practiceGameUi?.title : undefined}
          gameHint={isPracticeGame ? practiceGameUi?.hint : undefined}
        />

        {segment.value === "presentation" ? (
          <div class="mb-6">
            <LessonSummaryCard
              summary={page.content.presentation.summary}
              englishTerms={page.content.presentation.vocabulary.map((v) => v.term)}
            />
          </div>
        ) : null}

        {isPracticeGame && practiceGameType === "memory_match" ? (
          <div class="rounded-2xl border-2 border-violet-200/80 bg-white/90 p-5 sm:p-6">
            <p class="mb-4 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-800">
              {practiceGameUi?.badge}
            </p>
            <MemoryMatchGame
              key={`memory-${gameSeed}`}
              pairs={memoryPairs}
              seed={gameSeed}
              disabled={saving.value || segmentLocked}
              onComplete$={() => void submitGameSegment(1, null)}
            />
          </div>
        ) : isPracticeGame && practiceGameType === "match_pairs" ? (
          <div class="rounded-2xl border-2 border-violet-200/80 bg-white/90 p-5 sm:p-6">
            <p class="mb-4 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-800">
              {practiceGameUi?.badge}
            </p>
            <MatchPairsGame
              key={`match-${gameSeed}`}
              pairs={matchPairs}
              seed={gameSeed}
              disabled={(segmentLocked && !isReviewMode) || saving.value}
              saving={saving.value}
              onSubmit$={(ratio, matches) =>
                void submitGameSegment(ratio, matches)
              }
            />
          </div>
        ) : (
          <LessonExerciseArena
            key={`${segment.value}-${exercise.prompt}`}
            segment={segment.value}
            prompt={exercise.prompt}
            options={exercise.options}
            selected={selected.value}
            correctIndex={exercise.correctIndex}
            answered={answered}
            answerCorrect={feedbackOk.value}
            disabled={saving.value || segmentLocked}
            saving={saving.value}
            segmentLocked={segmentLocked}
            isReviewMode={isReviewMode}
            celebrate={celebrate.value}
            onSelect$={(index) => {
              selected.value = index;
              feedback.value = "";
              feedbackOk.value = null;
              celebrate.value = false;
            }}
            onSubmit$={() => {
              if (selected.value === null) return;
              void submitSegment(selected.value);
            }}
          />
        )}

        <LessonFeedbackBanner
          message={feedback.value}
          ok={feedbackOk.value}
          vocab={
            segment.value === "presentation" && feedbackOk.value
              ? page.content.presentation.vocabulary
              : undefined
          }
        />

        {segment.value === "presentation" &&
        progress.presentation_completada &&
        !progress.practice_completada &&
        !feedback.value &&
        page.content.presentation.vocabulary.length > 0 ? (
          <div class="mt-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 p-4">
            <p class="text-sm font-black text-indigo-800">📚 Vocabulario de la lección</p>
            <LessonVocabReveal items={page.content.presentation.vocabulary} />
          </div>
        ) : null}
      </section>

      {isReviewMode && !victoryOpen.value ? (
        <div class="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-6 sm:p-8 moa-pop">
          <div class="absolute -right-4 -top-4 text-6xl opacity-20">🏆</div>
          <p class="inline-flex items-center gap-2 text-xl font-black text-emerald-900">
            <LuPartyPopper class="h-6 w-6" />
            ¡Lección completada!
          </p>
          <p class="mt-2 text-emerald-800">
            La siguiente lección ya está desbloqueada. Tu progreso se guardó y no
            retrocederá.
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              onClick$={() =>
                nav(
                  `/dashboard/estudiante/competencia/${page.lesson.id_competencia}/`,
                )
              }
            >
              Ver más lecciones
            </button>
            {page.next_lesson ? (
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                onClick$={() =>
                  nav(
                    `/dashboard/estudiante/leccion/${page.next_lesson!.id_leccion}/`,
                  )
                }
              >
                <LuSkipForward class="h-4 w-4" />
                Siguiente: {page.next_lesson.titulo}
              </button>
            ) : null}
            <button
              type="button"
              class="rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              onClick$={() => nav("/dashboard/estudiante/")}
            >
              Ir al campus
            </button>
          </div>
        </div>
      ) : null}

      {missionOverlay.value ? (
        <LessonMissionCompleteOverlay
          segment={missionOverlay.value.segment}
          xp={missionOverlay.value.xp}
          reviewMode={missionOverlay.value.review}
          nextLabel={missionOverlay.value.nextLabel}
          onContinue$={dismissMissionOverlay}
        />
      ) : null}

      {victoryOpen.value ? (
        <LessonVictoryModal
          titulo={page.lesson.titulo}
          score={progress.puntaje_total}
          esPerfecta={progress.es_perfecta}
          nextLesson={page.next_lesson}
          idCompetencia={page.lesson.id_competencia}
          onCampus$={() => nav("/dashboard/estudiante/")}
          onNext$={() =>
            nav(
              `/dashboard/estudiante/leccion/${page.next_lesson!.id_leccion}/`,
            )
          }
          onCompetencia$={() =>
            nav(
              `/dashboard/estudiante/competencia/${page.lesson.id_competencia}/`,
            )
          }
        />
      ) : null}

      <LessonTrophyToast
        lapsos={trophyLapsos.value}
        onDismiss$={$(() => {
          trophyLapsos.value = [];
        })}
      />
    </div>
  );
});
