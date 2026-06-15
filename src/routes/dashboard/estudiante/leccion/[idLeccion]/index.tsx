import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  LuBookOpen,
  LuCheck,
  LuCheckCircle2,
  LuCircle,
  LuPartyPopper,
  LuSkipForward,
} from "@qwikest/icons/lucide";
import {
  BreadcrumbTrail,
  PerfectBadge,
  ScoreBar,
  SEGMENT_LABELS,
  SegmentStepper,
} from "~/components/student/student-ui";
import { MAX_POINTS_PER_LESSON, SEGMENT_POINTS } from "~/lib/constants";
import type { LessonSegment } from "~/lib/constants";
import { getCurrentUsuario } from "~/lib/auth";
import { getDbClient, rowInt, rowStr } from "~/lib/db";
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
      return;
    }

    saving.value = true;
    feedback.value = "";
    feedbackOk.value = null;
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
        ? "¡Excelente! Tu mejor puntaje se guardó."
        : "Casi — puedes reintentar. Tu mejor puntaje se conserva.";

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

      if (result.correct) {
        if (currentSegment === "presentation") segment.value = "practice";
        else if (currentSegment === "practice") segment.value = "use";
        selected.value = null;
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

      <section class="moa-lesson-glow overflow-hidden rounded-3xl border border-indigo-100/80 bg-white/95 p-6 backdrop-blur-sm sm:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {page.lesson.competencia}
            </p>
            <h1 class="mt-1 text-3xl font-bold text-slate-900">
              {page.lesson.titulo}
            </h1>
            <p class="mt-2 text-slate-600">
              Lección {page.lesson.orden} · {SEGMENT_LABELS.presentation} (
              {SEGMENT_POINTS.presentation}) + {SEGMENT_LABELS.practice} (
              {SEGMENT_POINTS.practice}) + {SEGMENT_LABELS.use} ({SEGMENT_POINTS.use})
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            {progress.es_perfecta ? <PerfectBadge /> : null}
            {progress.completada ? (
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <LuCheckCircle2 class="h-3.5 w-3.5" />
                Completada
              </span>
            ) : null}
          </div>
        </div>
        <div class="mt-6">
          <ScoreBar score={progress.puntaje_total} label="Tu puntaje en esta lección" />
        </div>
      </section>

      <SegmentStepper
        current={segment.value}
        presentationDone={progress.presentation_completada}
        practiceDone={progress.practice_completada}
        useDone={progress.use_completada}
        reviewMode={isReviewMode}
        onSelect$={selectSegment}
      />

      {isReviewMode ? (
        <p class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Modo repaso activo: puedes practicar de nuevo sin cambiar tu puntaje.
        </p>
      ) : null}

      <section class="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm sm:p-8">
        {segment.value === "presentation" ? (
          <div class="mb-6 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <LuBookOpen class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">
                {SEGMENT_LABELS.presentation}
              </h2>
              <p class="text-sm text-slate-500">
                Lee el objetivo y demuestra lo que sabes
              </p>
            </div>
          </div>
        ) : null}

        {segment.value === "practice" ? (
          <div class="mb-6">
            <h2 class="text-xl font-bold text-slate-900">
              {SEGMENT_LABELS.practice}
            </h2>
            <p class="text-sm text-slate-500">Elige la respuesta correcta</p>
          </div>
        ) : null}

        {segment.value === "use" ? (
          <div class="mb-6">
            <h2 class="text-xl font-bold text-slate-900">{SEGMENT_LABELS.use}</h2>
            <p class="text-sm text-slate-500">Aplica lo aprendido en contexto</p>
          </div>
        ) : null}

        {segment.value === "presentation" ? (
          <p class="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-5 text-lg leading-relaxed text-slate-700">
            {page.content.presentation.summary}
          </p>
        ) : null}

        {(() => {
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
          const isReviewMode = progress.completada;
          const segmentLocked = segmentDone && !isReviewMode;

          return (
            <div class={segment.value === "presentation" ? "mt-6" : ""}>
              <p class="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-lg font-medium text-slate-800">
                {exercise.prompt}
              </p>

              <div
                class="mt-5 grid gap-3"
                role="radiogroup"
                aria-label={exercise.prompt}
              >
                {exercise.options.map((option, index) => {
                  const isSelected = selected.value === index;
                  return (
                    <button
                      key={`${segment.value}-${option}`}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={saving.value || segmentLocked}
                      onClick$={() => {
                        selected.value = index;
                      }}
                      class={[
                        "flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition",
                        isSelected
                          ? "border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-200"
                          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30",
                        segmentLocked ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <span
                        class={[
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {OPTION_LABELS[index] ?? index + 1}
                      </span>
                      <span class="font-medium text-slate-800">{option}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={
                  saving.value ||
                  selected.value === null ||
                  (segmentLocked && !isReviewMode)
                }
                onClick$={() => {
                  if (selected.value === null) return;
                  void submitSegment(selected.value, exercise.correctIndex);
                }}
                class="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:opacity-60"
              >
                {saving.value ? (
                  "Guardando..."
                ) : segmentLocked && !isReviewMode ? (
                  <>
                    <LuCheck class="h-5 w-5" />
                    {SEGMENT_LABELS[segment.value]} completada
                  </>
                ) : isReviewMode ? (
                  "Verificar respuesta"
                ) : (
                  "Comprobar respuesta"
                )}
              </button>
            </div>
          );
        })()}

        {feedback.value ? (
          <div
            role="status"
            aria-live="polite"
            class={[
              "mt-6 flex items-start gap-3 rounded-2xl px-4 py-4 text-sm",
              feedbackOk.value
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-amber-200 bg-amber-50 text-amber-900",
            ].join(" ")}
          >
            {feedbackOk.value ? (
              <LuCheck class="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <LuCircle class="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p>{feedback.value}</p>
              {segment.value === "presentation" &&
              feedbackOk.value &&
              page.content.presentation.vocabulary.length > 0 ? (
                <ul class="mt-3 grid gap-2 sm:grid-cols-2">
                  {page.content.presentation.vocabulary.map((item) => (
                    <li
                      key={item.term}
                      class="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2"
                    >
                      <span class="font-semibold text-indigo-700">
                        {item.term}
                      </span>
                      <span class="text-emerald-800"> — {item.meaning}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        {segment.value === "presentation" &&
        progress.presentation_completada &&
        !feedback.value &&
        page.content.presentation.vocabulary.length > 0 ? (
          <div class="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p class="text-sm font-semibold text-indigo-800">Vocabulario de la lección</p>
            <ul class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {page.content.presentation.vocabulary.map((item) => (
                <li
                  key={item.term}
                  class="rounded-xl border border-indigo-100 bg-white px-3 py-2"
                >
                  <span class="font-semibold text-indigo-700">{item.term}</span>
                  <span class="text-slate-600"> — {item.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {isReviewMode ? (
        <div class="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 sm:p-8">
          <p class="inline-flex items-center gap-2 text-lg font-bold text-emerald-900">
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
    </div>
  );
});

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
