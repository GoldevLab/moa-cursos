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
import {
  BreadcrumbTrail,
} from "~/components/student/student-ui";
import { MAX_POINTS_PER_LESSON } from "~/lib/constants";
import type { LessonSegment } from "~/lib/constants";
import { getCurrentUsuario } from "~/lib/auth";
import { getDbClient, rowInt, rowStr } from "~/lib/db";
import {
  playCorrectSound,
  playMissionCompleteSound,
  playVictorySound,
  playWrongSound,
} from "~/lib/lesson-sounds";
import {
  getEstudianteByUsuarioId,
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
  correctIndex: number,
) {
  try {
    const { perfil } = await requireEstudianteProfile(this);
    const unlocked = await isLessonUnlocked(perfil.id_estudiante, idLeccion);
    if (!unlocked) {
      return { ok: false as const, reason: "locked" as const };
    }

    const correct = selectedIndex === correctIndex;
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
    next: LessonSegment;
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

  const submitSegment = $(async (selectedIndex: number, correctIndex: number) => {
    const exercise =
      segment.value === "presentation"
        ? page.content.presentation.quiz
        : segment.value === "practice"
          ? page.content.practice
          : page.content.use;
    const correctAnswer = exercise.options[correctIndex] ?? "";

    if (isReviewMode) {
      const correct = selectedIndex === correctIndex;
      feedbackOk.value = correct;
      feedback.value = correct
        ? "¡Correcto! (modo repaso — no afecta tu puntaje)"
        : `Incorrecto. La respuesta correcta es "${correctAnswer}". (modo repaso)`;
      celebrate.value = correct;
      if (correct) playCorrectSound();
      else playWrongSound();
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
        correctIndex,
      );

      if (!result.ok) {
        feedbackOk.value = false;
        feedback.value =
          result.reason === "locked"
            ? "Esta lección está bloqueada."
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
        presentation_completada:
          progress.presentation_completada ||
          (currentSegment === "presentation" && result.correct),
        practice_completada:
          progress.practice_completada ||
          (currentSegment === "practice" && result.correct),
        use_completada:
          progress.use_completada ||
          (currentSegment === "use" && result.correct),
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
  });

  const exercise =
    segment.value === "presentation"
      ? page.content.presentation.quiz
      : segment.value === "practice"
        ? page.content.practice
        : page.content.use;
  const segmentDone =
    segment.value === "presentation"
      ? progress.presentation_completada
      : segment.value === "practice"
        ? progress.practice_completada
        : progress.use_completada;
  const segmentLocked = segmentDone && !isReviewMode;
  const answered = feedback.value.length > 0;

  const dismissMissionOverlay = $(() => {
    const overlay = missionOverlay.value;
    if (!overlay) return;
    segment.value = overlay.next;
    selected.value = null;
    feedback.value = "";
    feedbackOk.value = null;
    celebrate.value = false;
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

      {isReviewMode ? (
        <p class="rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
          🎮 Modo repaso: practica sin perder tu puntaje.
        </p>
      ) : null}

      <section class="moa-lesson-arena relative rounded-3xl border border-indigo-100/80 p-6 shadow-lg sm:p-8">
        <LessonCelebrateBurst active={celebrate.value} />
        <LessonSegmentIntro segment={segment.value} />

        {segment.value === "presentation" ? (
          <div class="mb-6">
            <LessonSummaryCard summary={page.content.presentation.summary} />
          </div>
        ) : null}

        <LessonExerciseArena
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
            void submitSegment(selected.value, exercise.correctIndex);
          }}
        />

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
        !feedback.value &&
        page.content.presentation.vocabulary.length > 0 ? (
          <div class="mt-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 p-4">
            <p class="text-sm font-black text-indigo-800">📚 Vocabulario de la lección</p>
            <LessonVocabReveal items={page.content.presentation.vocabulary} />
          </div>
        ) : null}
      </section>

      {isReviewMode ? (
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
