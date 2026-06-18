import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  routeLoader$,
  server$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  LuPartyPopper,
  LuSkipForward,
} from "@qwikest/icons/lucide";
import {
  LessonCelebrateBurst,
  LessonFeedbackBanner,
  LessonGameHeader,
  LessonGameStepper,
  LessonMissionCompleteOverlay,
  LessonSummaryCard,
  LessonTrophyToast,
  LessonVictoryModal,
  LessonVocabReveal,
} from "~/components/student/lesson-play";
import {
  buildSegmentGameRounds,
  LessonSegmentGameArena,
} from "~/components/student/lesson-segment-games";
import { NavLink } from "~/components/ui/nav-link";
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
import { routes } from "~/lib/routes";
import {
  getLessonContent,
  getLessonUseContext,
} from "~/lib/lesson-content";
import { getLessonPlan } from "~/lib/lesson-vocabulary";
import {
  gameSeedForLesson,
  getSegmentGameType,
  gradeGameSubmission,
  isGameSubmissionPerfect,
  scoreFromRatio,
  type GameSubmission,
} from "~/lib/lesson-games";
import { ServerAuthError, requireEstudianteProfile } from "~/lib/server-auth";
import { ensureMoaSchema } from "~/lib/schema";

const LESSON_FRESH_START_KEY = "moa-lesson-fresh-start";

const markLessonFreshStart = (idLeccion: number) => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(LESSON_FRESH_START_KEY, String(idLeccion));
  }
};

const consumeLessonFreshStart = (idLeccion: number): boolean => {
  if (typeof sessionStorage === "undefined") return false;
  const stored = sessionStorage.getItem(LESSON_FRESH_START_KEY);
  if (stored !== String(idLeccion)) return false;
  sessionStorage.removeItem(LESSON_FRESH_START_KEY);
  return true;
};

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

  const titulo = rowStr(row.titulo);
  const progressRes = await client.execute({
    sql: `SELECT presentation_completada, practice_completada, use_completada,
                 presentation_score, practice_score, use_score,
                 puntaje_total, completada, es_perfecta
          FROM progreso_leccion
          WHERE id_estudiante = ? AND id_leccion = ? LIMIT 1`,
    args: [perfil.id_estudiante, idLeccion],
  });

  const [normalizedProgress, content, nextLesson] = await Promise.all([
    reconcileLessonProgressInDb(perfil.id_estudiante, idLeccion).then(
      (reconciled) =>
        reconciled ?? normalizeLessonProgress(progressRes.rows[0] ?? {}),
    ),
    getLessonContent(idLeccion, titulo),
    getNextLessonInfo(idLeccion),
  ]);
  const useSentence = getLessonUseContext(idLeccion).sentence;

  return {
    locked: false as const,
    id_estudiante: perfil.id_estudiante,
    lesson: {
      id_leccion: idLeccion,
      titulo,
      competencia: rowStr(row.competencia),
      id_competencia: rowInt(row.id_competencia),
      orden: rowInt(row.orden),
    },
    progress: normalizedProgress,
    content,
    use_sentence: useSentence,
    next_lesson: nextLesson,
  };
});

const saveGameProgressAction = server$(async function (
  idLeccion: number,
  segment: LessonSegment,
  submission: GameSubmission,
) {
  try {
    const { perfil } = await requireEstudianteProfile(this);
    const unlocked = await isLessonUnlocked(perfil.id_estudiante, idLeccion);
    if (!unlocked) {
      return { ok: false as const, reason: "locked" as const };
    }
    const gameType = getSegmentGameType(segment, idLeccion);

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
    const useSentence =
      segment === "use"
        ? getLessonUseContext(idLeccion).sentence
        : undefined;

    const ratio = gradeGameSubmission(
      segment,
      gameType,
      idLeccion,
      submission,
      content.presentation.vocabulary,
      useSentence,
    );

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

const reviewFeedbackMessage = (
  submission: GameSubmission,
  gameType: ReturnType<typeof getSegmentGameType>,
): string => {
  if (submission.kind === "match_pairs") {
    return "Una o más parejas no coinciden. Revísalas y vuelve a intentar.";
  }
  if (submission.kind === "spelling_build") {
    return "La palabra no es correcta. Revisa las letras e intenta otra vez.";
  }
  if (submission.kind === "sentence_order") {
    return "El orden no es correcto. Revisa las palabras e intenta otra vez.";
  }
  if (submission.kind === "meaning_choice" || gameType === "meaning_choice") {
    return "Ese no era el significado correcto. ¡Intenta otra vez!";
  }
  if (submission.kind === "picture_choice" || gameType === "picture_choice") {
    return "Esa no era la opción correcta. ¡Intenta otra vez!";
  }
  return "Casi perfecto. ¡Inténtalo otra vez!";
};

export default component$(() => {
  const data = useLessonPage();
  const loc = useLocation();
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
  const prevLessonId = useSignal<number | null>(null);

  useTask$(({ track }) => {
    const page = data.value;
    if (!page || page.locked) return;
    track(() => page.lesson.id_leccion);
    track(() => loc.url.searchParams.get("fresh"));

    const id = page.lesson.id_leccion;
    const urlFreshStart = loc.url.searchParams.get("fresh") === "1";

    if (urlFreshStart && typeof history !== "undefined") {
      history.replaceState({}, "", loc.url.pathname);
    }

    if (consumeLessonFreshStart(id) || urlFreshStart) {
      victoryOpen.value = false;
      localProgress.value = null;
      selected.value = null;
      feedback.value = "";
      feedbackOk.value = null;
      celebrate.value = false;
      saving.value = false;
      missionOverlay.value = null;
      trophyLapsos.value = [];
      segment.value = "presentation";
      prevLessonId.value = id;
      segmentReady.value = true;
      return;
    }

    const navigatedFromAnotherLesson =
      prevLessonId.value !== null && prevLessonId.value !== id;

    prevLessonId.value = id;

    if (navigatedFromAnotherLesson) {
      victoryOpen.value = false;
      segmentReady.value = false;
      localProgress.value = null;
      selected.value = null;
      feedback.value = "";
      feedbackOk.value = null;
      celebrate.value = false;
      saving.value = false;
      missionOverlay.value = null;
      trophyLapsos.value = [];
      segment.value = "presentation";
      segmentReady.value = true;
      return;
    }

    if (segmentReady.value) return;

    const p = page.progress;
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
        <NavLink
          href={routes.estudiante.campus}
          class="mt-6 inline-flex rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </NavLink>
      </div>
    );
  }

  const page = data.value;
  const progress = localProgress.value ?? page.progress;
  const isReviewMode = progress.completada;
  const nextLessonHref = page.next_lesson
    ? routes.estudiante.leccion(page.next_lesson.id_leccion, { fresh: true })
    : null;

  const lessonPlan = getLessonPlan(page.lesson.id_leccion);
  const segmentGameType = getSegmentGameType(
    segment.value,
    page.lesson.id_leccion,
  );
  const segmentGameSeed = gameSeedForLesson(
    page.lesson.id_leccion,
    segment.value,
  );
  const gameRounds = buildSegmentGameRounds({
    segment: segment.value,
    gameType: segmentGameType,
    gameSeed: segmentGameSeed,
    vocabulary: page.content.presentation.vocabulary,
    focusIndex: lessonPlan.focusIndex,
    themeIndex: lessonPlan.themeIndex,
    lessonSlot: lessonPlan.lessonSlot,
    focus: lessonPlan.focus,
    useSentence: segment.value === "use" ? page.use_sentence : undefined,
  });

  const submitGameSegment = $(
    async (submission: GameSubmission) => {
      if (saving.value) return;

      const pageData = data.value;
      if (!pageData || pageData.locked) return;

      saving.value = true;
      primeLessonAudio();

      try {
        const currentSegment = segment.value;
        const currentProgress = localProgress.value ?? pageData.progress;
        const reviewMode = currentProgress.completada;
        const vocabulary = pageData.content.presentation.vocabulary;
        const useSentence =
          currentSegment === "use" ? pageData.use_sentence : undefined;
        const currentGameType = getSegmentGameType(
          currentSegment,
          pageData.lesson.id_leccion,
        );
        const perfect = isGameSubmissionPerfect(
          currentSegment,
          currentGameType,
          pageData.lesson.id_leccion,
          submission,
          vocabulary,
          useSentence,
        );

        if (reviewMode) {
          const autoAdvanceSegment =
            perfect && currentSegment !== "use"
              ? currentSegment === "presentation"
                ? "practice"
                : "use"
              : null;

          if (autoAdvanceSegment) {
            celebrate.value = false;
            feedback.value = "";
            feedbackOk.value = null;
          } else {
            feedbackOk.value = perfect;
            feedback.value = perfect
              ? "¡Excelente! (modo repaso — no afecta tu puntaje)"
              : reviewFeedbackMessage(submission, currentGameType);
            celebrate.value = perfect && !victoryOpen.value;
          }

          if (perfect) playCorrectSound();
          else playWrongSound();

          if (perfect) {
            if (currentSegment === "use" && pageData.next_lesson) {
              celebrate.value = false;
              feedback.value = "";
              feedbackOk.value = null;
              playVictorySound();
              victoryOpen.value = true;
            } else if (currentSegment === "use") {
              playMissionCompleteSound();
              missionOverlay.value = {
                segment: currentSegment,
                xp: 0,
                next: null,
                review: true,
                nextLabel: "Ver más lecciones →",
              };
            } else if (autoAdvanceSegment) {
              playMissionCompleteSound();
              segment.value = autoAdvanceSegment;
            }
          }
          return;
        }

        feedback.value = "";
        feedbackOk.value = null;
        celebrate.value = false;

        const result = await saveGameProgressAction(
          pageData.lesson.id_leccion,
          currentSegment,
          submission,
        );

        if (!result.ok) {
          feedbackOk.value = false;
          feedback.value =
            result.reason === "locked"
              ? "Esta lección está bloqueada."
              : result.reason === "order"
                ? "Primero completa la misión anterior."
                : "No tienes permiso para guardar este progreso.";
          return;
        }

        const passed = result.segment_xp > 0;
        feedbackOk.value = result.correct;
        feedback.value = result.correct
          ? "¡Genial! Misión perfecta."
          : passed
            ? `¡Bien! Llevas ${result.segment_xp} XP en esta misión. Repite para el máximo.`
            : reviewFeedbackMessage(submission, currentGameType);
        celebrate.value = result.correct;

        localProgress.value = {
          puntaje_total: result.puntaje_total,
          completada: result.completada,
          es_perfecta: result.es_perfecta,
          presentation_completada:
            result.presentation_completada ||
            (currentSegment === "presentation" && result.segment_perfect) ||
            currentProgress.presentation_completada,
          practice_completada:
            result.practice_completada ||
            (currentSegment === "practice" && result.segment_perfect) ||
            currentProgress.practice_completada,
          use_completada:
            result.use_completada ||
            (currentSegment === "use" && result.segment_perfect) ||
            currentProgress.use_completada,
          presentation_perfect:
            currentProgress.presentation_perfect ||
            (currentSegment === "presentation" && result.segment_perfect),
          practice_perfect:
            currentProgress.practice_perfect ||
            (currentSegment === "practice" && result.segment_perfect),
          use_perfect:
            currentProgress.use_perfect ||
            (currentSegment === "use" && result.segment_perfect),
        };

        if (result.trophies_awarded.length > 0) {
          trophyLapsos.value = result.trophies_awarded;
        }

        if (passed) playCorrectSound();
        else playWrongSound();

        if (result.newly_completed) {
          celebrate.value = false;
          playVictorySound();
          victoryOpen.value = true;
        } else if (passed) {
          playMissionCompleteSound();
          missionOverlay.value = {
            segment: currentSegment,
            xp: result.segment_xp,
            next:
              currentSegment === "presentation"
                ? "practice"
                : currentSegment === "practice"
                  ? "use"
                  : null,
          };
        }
      } finally {
        saving.value = false;
      }
    },
  );

  const selectSegment = $((next: LessonSegment) => {
    const pageData = data.value;
    if (!pageData || pageData.locked) return;
    const p = localProgress.value ?? pageData.progress;
    const review = p.completada;

    if (!review) {
      const presPassed = p.presentation_completada || p.presentation_perfect;
      const pracPassed = p.practice_completada || p.practice_perfect;
      if (next === "practice" && !presPassed) return;
      if (next === "use" && !pracPassed) return;
    }
    segment.value = next;
    selected.value = null;
    feedback.value = "";
    feedbackOk.value = null;
    celebrate.value = false;
    missionOverlay.value = null;
  });

  const dismissMissionOverlay = $(() => {
    const overlay = missionOverlay.value;
    if (!overlay) return;
    if (overlay.next) {
      segment.value = overlay.next;
      selected.value = null;
      feedback.value = "";
      feedbackOk.value = null;
      celebrate.value = false;
    }
    missionOverlay.value = null;
  });

  return (
    <>
      {nextLessonHref ? (
        <div class="hidden" aria-hidden="true">
          <NavLink href={nextLessonHref} prefetch={true}>
            {page.next_lesson!.titulo}
          </NavLink>
        </div>
      ) : null}

      <div class="space-y-3 moa-fade-up">
      <LessonGameHeader
        competencia={page.lesson.competencia}
        titulo={page.lesson.titulo}
        orden={page.lesson.orden}
        score={progress.puntaje_total}
        esPerfecta={progress.es_perfecta}
        completada={progress.completada}
        reviewMode={isReviewMode && !victoryOpen.value}
      />

      <LessonGameStepper
        current={segment.value}
        presentationDone={progress.presentation_completada}
        practiceDone={progress.practice_completada}
        useDone={progress.use_completada}
        presentationPerfect={progress.presentation_perfect}
        practicePerfect={progress.practice_perfect}
        usePerfect={progress.use_perfect}
        reviewMode={isReviewMode}
        onSelect$={selectSegment}
      />

      <section class="moa-lesson-arena relative rounded-2xl border border-indigo-100/80 p-3 shadow-md sm:p-4">
        <LessonCelebrateBurst active={celebrate.value && !victoryOpen.value} />

        {segment.value === "presentation" && !isReviewMode ? (
          <LessonSummaryCard
            summary={page.content.presentation.summary}
            englishTerms={page.content.presentation.vocabulary.map((v) => v.term)}
          />
        ) : null}

        {!victoryOpen.value ? (
          <LessonSegmentGameArena
            key={`${segment.value}-${segmentGameType}-${segmentGameSeed}`}
            segment={segment.value}
            gameType={segmentGameType}
            gameSeed={segmentGameSeed}
            disabled={saving.value}
            saving={saving.value}
            pictureRound={gameRounds.pictureRound}
            meaningRound={gameRounds.meaningRound}
            memoryPairs={gameRounds.memoryPairs}
            matchPairs={gameRounds.matchPairs}
            spellingRound={gameRounds.spellingRound}
            sentenceRound={gameRounds.sentenceRound}
            onSubmit$={submitGameSegment}
          />
        ) : null}

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
          <div class="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p class="text-xs font-black text-indigo-800">📚 Vocabulario</p>
            <LessonVocabReveal items={page.content.presentation.vocabulary} />
          </div>
        ) : null}
      </section>

      {isReviewMode && !victoryOpen.value ? (
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 sm:p-4">
          <p class="text-sm font-black text-emerald-900">
            <LuPartyPopper class="mr-1 inline h-4 w-4" />
            Siguiente lección desbloqueada
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <NavLink
              href={routes.estudiante.competencia(page.lesson.id_competencia)}
              class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Ver más lecciones
            </NavLink>
            {page.next_lesson && nextLessonHref ? (
              <NavLink
                href={nextLessonHref}
                class="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <LuSkipForward class="h-3.5 w-3.5" />
                Siguiente: {page.next_lesson.titulo}
              </NavLink>
            ) : null}
            <NavLink
              href={routes.estudiante.campus}
              class="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"
            >
              Campus
            </NavLink>
          </div>
        </div>
      ) : null}
      </div>

      {missionOverlay.value ? (
        <LessonMissionCompleteOverlay
          segment={missionOverlay.value.segment}
          xp={missionOverlay.value.xp}
          reviewMode={missionOverlay.value.review ?? isReviewMode}
          nextLabel={missionOverlay.value.nextLabel}
          externalHref={
            missionOverlay.value.review && !missionOverlay.value.next
              ? routes.estudiante.competencia(page.lesson.id_competencia)
              : undefined
          }
          onContinue$={dismissMissionOverlay}
        />
      ) : null}

      {victoryOpen.value ? (
        <LessonVictoryModal
          titulo={page.lesson.titulo}
          score={progress.puntaje_total}
          esPerfecta={progress.es_perfecta}
          nextLesson={page.next_lesson}
          nextLessonHref={nextLessonHref}
          campusHref={routes.estudiante.campus}
          competenciaHref={routes.estudiante.competencia(page.lesson.id_competencia)}
        />
      ) : null}

      <LessonTrophyToast
        lapsos={trophyLapsos.value}
        onDismiss$={$(() => {
          trophyLapsos.value = [];
        })}
      />
    </>
  );
});
