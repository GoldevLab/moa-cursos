import { component$ } from "@builder.io/qwik";
import { NavLink } from "~/components/ui/nav-link";
import {
  LuCheck,
  LuCircle,
  LuLock,
  LuSparkles,
  LuStar,
  LuVolume2,
  LuZap,
} from "@qwikest/icons/lucide";
import {
  MAX_POINTS_PER_LESSON,
  SEGMENT_POINTS,
  type LessonSegment,
} from "~/lib/constants";
import {
  getDistinctOptionEmojisForChoices,
  getOptionEmoji,
  SEGMENT_MASCOT,
} from "~/lib/lesson-emojis";
import { speakLessonSummary, speakLessonText, speakWord } from "~/lib/lesson-sounds";
import { SEGMENT_LABELS } from "./student-ui";

export const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

const MISSION_DIRECTION: Record<
  LessonSegment,
  { badge: string; subtitle: string }
> = {
  presentation: {
    badge: "Inglés → Español",
    subtitle: "Elige el significado correcto en español",
  },
  practice: {
    badge: "Español → Inglés",
    subtitle: "Elige la palabra correcta en inglés",
  },
  use: {
    badge: "Completa la frase",
    subtitle: "Usa la pista en español y elige la palabra en inglés que encaja",
  },
};

const SEGMENT_THEME: Record<
  LessonSegment,
  { gradient: string; ring: string; glow: string; chip: string }
> = {
  presentation: {
    gradient: "from-sky-500 to-cyan-500",
    ring: "ring-sky-300",
    glow: "shadow-sky-500/30",
    chip: "bg-sky-100 text-sky-800",
  },
  practice: {
    gradient: "from-violet-500 to-indigo-600",
    ring: "ring-violet-300",
    glow: "shadow-violet-500/30",
    chip: "bg-violet-100 text-violet-800",
  },
  use: {
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-300",
    glow: "shadow-amber-500/30",
    chip: "bg-amber-100 text-amber-900",
  },
};

const BUBBLES: Array<{
  size: string;
  top: string;
  left?: string;
  right?: string;
  delay: string;
  color: string;
}> = [
  { size: "h-16 w-16", top: "8%", left: "6%", delay: "0s", color: "bg-sky-300/30" },
  { size: "h-24 w-24", top: "70%", left: "4%", delay: "1.2s", color: "bg-violet-300/25" },
  { size: "h-20 w-20", top: "15%", right: "8%", delay: "0.6s", color: "bg-amber-300/30" },
  { size: "h-12 w-12", top: "82%", right: "12%", delay: "1.8s", color: "bg-emerald-300/25" },
];

export const LessonArenaDecor = component$(() => (
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {BUBBLES.map((bubble, i) => (
      <div
        key={i}
        class={[
          "moa-float-bubble absolute rounded-full blur-sm",
          bubble.size,
          bubble.color,
        ].join(" ")}
        style={{
          top: bubble.top,
          left: bubble.left,
          right: bubble.right,
          animationDelay: bubble.delay,
        }}
      />
    ))}
    <div class="absolute -top-8 right-8 text-4xl opacity-20 moa-wiggle">⭐</div>
    <div class="absolute bottom-6 left-10 text-3xl opacity-20 moa-float-bubble">🎮</div>
  </div>
));

export const LessonCelebrateBurst = component$((props: { active: boolean }) => {
  if (!props.active) return null;
  const particles = ["⭐", "✨", "🎉", "💫", "🌟", "✨", "⭐", "🎊"];
  return (
    <div class="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {particles.map((emoji, i) => (
        <span
          key={i}
          class="absolute text-2xl"
          style={{
            left: `${10 + (i * 11)}%`,
            top: `${15 + ((i % 3) * 20)}%`,
            animation: `moa-star-burst 0.9s ease-out ${i * 0.05}s both`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
});

export const LessonGameHeader = component$(
  (props: {
    competencia: string;
    titulo: string;
    orden: number;
    score: number;
    esPerfecta: boolean;
    completada: boolean;
  }) => {
    const pct = Math.min(
      100,
      Math.round((props.score / MAX_POINTS_PER_LESSON) * 100),
    );
    const stars =
      props.score >= MAX_POINTS_PER_LESSON
        ? 3
        : props.score >= 75
          ? 2
          : props.score >= 25
            ? 1
            : 0;

    return (
      <section class="moa-lesson-glow relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-white/95 p-6 backdrop-blur-sm sm:p-8">
        <LessonArenaDecor />
        <div class="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide text-indigo-600">
              {props.competencia}
            </p>
            <h1 class="mt-1 text-3xl font-black text-slate-900">{props.titulo}</h1>
            <p class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                Lección {props.orden}
              </span>
              <span>3 misiones · hasta {MAX_POINTS_PER_LESSON} XP</span>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            {props.esPerfecta ? (
              <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 ring-2 ring-amber-200">
                <LuSparkles class="h-3.5 w-3.5" />
                PERFECTO
              </span>
            ) : null}
            {props.completada ? (
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                <LuCheck class="h-3.5 w-3.5" />
                Completada
              </span>
            ) : null}
          </div>
        </div>

        <div class="relative z-10 mt-6">
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-bold text-slate-700">Tu energía MOA</span>
            <span class="flex items-center gap-2 font-black text-slate-900">
              {Array.from({ length: 3 }).map((_, i) => (
                <LuStar
                  key={i}
                  class={[
                    "h-4 w-4",
                    i < stars ? "fill-amber-400 text-amber-400" : "text-slate-300",
                  ].join(" ")}
                />
              ))}
              <span>{props.score}/{MAX_POINTS_PER_LESSON} XP</span>
            </span>
          </div>
          <div class="moa-xp-bar h-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
            <div
              class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>
    );
  },
);

export const LessonGameStepper = component$(
  (props: {
    current: LessonSegment;
    presentationDone: boolean;
    practiceDone: boolean;
    useDone: boolean;
    presentationPerfect?: boolean;
    practicePerfect?: boolean;
    usePerfect?: boolean;
    reviewMode?: boolean;
    onSelect$: (segment: LessonSegment) => void;
  }) => {
    const segments: LessonSegment[] = ["presentation", "practice", "use"];
    const passed = {
      presentation:
        props.presentationDone || props.presentationPerfect === true,
      practice: props.practiceDone || props.practicePerfect === true,
      use: props.useDone || props.usePerfect === true,
    };
    const unlocked = {
      presentation: true,
      practice: props.reviewMode || passed.presentation,
      use: props.reviewMode || passed.practice,
    };
    const done = {
      presentation: passed.presentation,
      practice: passed.practice,
      use: passed.use,
    };

    return (
      <div class="grid gap-3 sm:grid-cols-3">
        {segments.map((key, index) => {
          const theme = SEGMENT_THEME[key];
          const mascot = SEGMENT_MASCOT[key];
          const isActive = props.current === key;
          const isUnlocked = unlocked[key];
          const isDone = done[key];

          return (
            <button
              key={key}
              type="button"
              disabled={!isUnlocked}
              onClick$={() => props.onSelect$(key)}
              class={[
                "relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300",
                isActive
                  ? `border-transparent bg-gradient-to-br ${theme.gradient} text-white shadow-lg ${theme.glow} scale-[1.02]`
                  : isUnlocked
                    ? "border-slate-200 bg-white text-slate-800 hover:-translate-y-1 hover:shadow-lg"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400",
              ].join(" ")}
            >
              {isActive ? (
                <div class="absolute inset-0 bg-white/10" aria-hidden="true" />
              ) : null}
              <div class="relative flex items-center justify-between gap-2">
                <span
                  class={[
                    "flex h-9 w-9 items-center justify-center rounded-xl text-lg",
                    isActive ? "bg-white/20" : isDone ? "bg-emerald-100" : "bg-slate-100",
                  ].join(" ")}
                >
                  {isDone ? <LuCheck class="h-4 w-4 text-emerald-600" /> : mascot.emoji}
                </span>
                {!isUnlocked ? <LuLock class="h-4 w-4 opacity-60" /> : null}
              </div>
              <p class="relative mt-3 text-base font-black">{SEGMENT_LABELS[key]}</p>
              <p
                class={[
                  "relative mt-1 text-xs font-semibold",
                  isActive ? "text-white/85" : "text-slate-500",
                ].join(" ")}
              >
                {SEGMENT_POINTS[key]} XP
                {!isUnlocked ? " · bloqueado" : isDone ? " · ¡listo!" : ""}
              </p>
              <p
                class={[
                  "relative mt-1 hidden text-[11px] sm:block",
                  isActive ? "text-white/75" : "text-slate-400",
                ].join(" ")}
              >
                Misión {index + 1}
              </p>
            </button>
          );
        })}
      </div>
    );
  },
);

export const LessonSegmentIntro = component$(
  (props: {
    segment: LessonSegment;
    gameEmoji?: string;
    gameTitle?: string;
    gameHint?: string;
  }) => {
    const mascot = SEGMENT_MASCOT[props.segment];
    const theme = SEGMENT_THEME[props.segment];
    const title = props.gameTitle ?? mascot.title;
    const hint = props.gameHint ?? mascot.hint;
    const emoji = props.gameEmoji ?? mascot.emoji;

    return (
      <div class="mb-6 flex items-center gap-4">
        <div
          class={[
            "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg ring-4 ring-white",
            `bg-gradient-to-br ${theme.gradient}`,
            theme.glow,
          ].join(" ")}
        >
          {emoji}
        </div>
        <div>
          <h2 class="text-2xl font-black text-slate-900">{title}</h2>
          <p class="text-sm font-medium text-slate-500">{hint}</p>
        </div>
      </div>
    );
  },
);

export const LessonSummaryCard = component$(
  (props: { summary: string; englishTerms?: string[] }) => (
    <div class="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <p class="text-xs font-black uppercase tracking-widest text-sky-600">
          Misión del día
        </p>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
          aria-label="Escuchar misión"
          onClick$={() =>
            void speakLessonSummary(props.summary, props.englishTerms ?? [])
          }
        >
          <LuVolume2 class="h-3.5 w-3.5" />
          Escuchar
        </button>
      </div>
      <p class="mt-2 text-lg font-medium leading-relaxed text-slate-700">
        {props.summary}
      </p>
    </div>
  ),
);

export const LessonExerciseArena = component$(
  (props: {
    segment: LessonSegment;
    prompt: string;
    options: string[];
    selected: number | null;
    correctIndex: number;
    answered: boolean;
    answerCorrect: boolean | null;
    disabled: boolean;
    saving: boolean;
    segmentLocked: boolean;
    isReviewMode: boolean;
    celebrate: boolean;
    onSelect$: (index: number) => void;
    onSubmit$: () => void;
  }) => {
    const theme = SEGMENT_THEME[props.segment];
    const optionLang = props.segment === "presentation" ? "es" : "en";
    const optionEmojis = getDistinctOptionEmojisForChoices(props.options);

    return (
      <div class="relative">
        <LessonCelebrateBurst active={props.celebrate} />

        <div
          class={[
            "rounded-2xl border-2 p-5 sm:p-6",
            props.answered && props.answerCorrect
              ? "border-emerald-300 bg-emerald-50/80 moa-pop"
              : props.answered && props.answerCorrect === false
                ? "border-amber-300 bg-amber-50/80 moa-shake"
                : "border-slate-200/80 bg-white/90",
          ].join(" ")}
        >
          <p
            class={[
              "mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              theme.chip,
            ].join(" ")}
          >
            {MISSION_DIRECTION[props.segment].badge}
          </p>
          <p class="mb-2 text-sm font-semibold text-slate-500">
            {MISSION_DIRECTION[props.segment].subtitle}
          </p>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <p class="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
              {props.prompt}
            </p>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
              aria-label="Escuchar pregunta"
              onClick$={() => void speakLessonText(props.prompt, props.segment)}
            >
              <LuVolume2 class="h-4 w-4" />
              Escuchar
            </button>
          </div>
        </div>

        <div
          class="mt-5 grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label={props.prompt}
        >
          {props.options.map((option, index) => {
            const isSelected = props.selected === index;
            const isCorrectOption = props.answered && index === props.correctIndex;
            const isWrongPick =
              props.answered && isSelected && index !== props.correctIndex;

            return (
              <button
                key={`${props.segment}-${option}-${index}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={props.disabled}
                onClick$={() => props.onSelect$(index)}
                class={[
                  "moa-option-card group relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 text-center",
                  isCorrectOption
                    ? "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-300/40 moa-pop"
                    : isWrongPick
                      ? "border-red-400 bg-red-50 ring-4 ring-red-300/30"
                      : isSelected
                        ? `border-transparent bg-gradient-to-br ${theme.gradient} text-white shadow-lg ${theme.glow} ring-4 ${theme.ring}`
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40",
                  props.segmentLocked && !props.isReviewMode ? "opacity-70" : "",
                ].join(" ")}
              >
                <span class="text-3xl drop-shadow-sm transition-transform group-hover:scale-110">
                  {optionEmojis[index]}
                </span>
                <span
                  class={[
                    "text-base font-black tracking-wide",
                    isSelected && !isWrongPick && !isCorrectOption
                      ? "text-white"
                      : "text-slate-800",
                  ].join(" ")}
                >
                  {option}
                </span>
                <span
                  class={[
                    "absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black",
                    isSelected && !isWrongPick && !isCorrectOption
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {OPTION_LABELS[index] ?? index + 1}
                </span>
                {isCorrectOption ? (
                  <span class="absolute right-3 top-3 text-lg">✅</span>
                ) : null}
                {isWrongPick ? (
                  <span class="absolute right-3 top-3 text-lg">💫</span>
                ) : null}
                <span
                  role="button"
                  tabIndex={0}
                  class={[
                    "absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition",
                    isSelected && !isWrongPick && !isCorrectOption
                      ? "bg-white/25 text-white hover:bg-white/35"
                      : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700",
                  ].join(" ")}
                  aria-label={`Escuchar ${option}`}
                  onClick$={(e) => {
                    e.stopPropagation();
                    void speakWord(option, optionLang);
                  }}
                  onKeyDown$={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.stopPropagation();
                    e.preventDefault();
                    void speakWord(option, optionLang);
                  }}
                >
                  <LuVolume2 class="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={
            props.saving ||
            props.selected === null ||
            (props.segmentLocked && !props.isReviewMode)
          }
          onClick$={props.onSubmit$}
          class={[
            "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-black text-white shadow-xl transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60 sm:w-auto",
            `bg-gradient-to-r ${theme.gradient}`,
            theme.glow,
          ].join(" ")}
        >
          {props.saving ? (
            <>
              <span class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Guardando...
            </>
          ) : props.segmentLocked && !props.isReviewMode ? (
            <>
              <LuCheck class="h-5 w-5" />
              {SEGMENT_LABELS[props.segment]} completada
            </>
          ) : (
            <>
              <LuZap class="h-5 w-5" />
              {props.isReviewMode ? "Verificar respuesta" : "¡Comprobar!"}
            </>
          )}
        </button>
      </div>
    );
  },
);

export const LessonFeedbackBanner = component$(
  (props: {
    message: string;
    ok: boolean | null;
    vocab?: { term: string; meaning: string }[];
  }) => {
    if (!props.message) return null;

    return (
      <div
        role="status"
        aria-live="polite"
        class={[
          "mt-6 flex items-start gap-3 rounded-2xl px-4 py-4 text-sm moa-pop",
          props.ok
            ? "border-2 border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-2 border-amber-300 bg-amber-50 text-amber-900",
        ].join(" ")}
      >
        {props.ok ? (
          <span class="text-2xl">🎉</span>
        ) : (
          <LuCircle class="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div class="min-w-0 flex-1">
          <p>{props.message}</p>
          {props.ok && props.vocab && props.vocab.length > 0 ? (
            <LessonVocabReveal items={props.vocab} />
          ) : null}
        </div>
      </div>
    );
  },
);

export const LessonVocabReveal = component$(
  (props: {
    items: { term: string; meaning: string }[];
    title?: string;
  }) => (
    <ul class="mt-3 grid gap-2 sm:grid-cols-2">
      {props.items.map((item) => (
        <li
          key={item.term}
          class="moa-pop flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-3 shadow-sm"
        >
          <span class="text-2xl">{getOptionEmoji(item.term)}</span>
          <div>
            <p class="font-black text-indigo-700">{item.term}</p>
            <p class="text-sm font-medium text-emerald-800">{item.meaning}</p>
          </div>
        </li>
      ))}
    </ul>
  ),
);

export const LessonMissionCompleteOverlay = component$(
  (props: {
    segment: LessonSegment;
    xp: number;
    reviewMode?: boolean;
    nextLabel?: string;
    externalHref?: string;
    onContinue$: () => void;
  }) => {
    const theme = SEGMENT_THEME[props.segment];
    const mascot = SEGMENT_MASCOT[props.segment];
    const nextSegment: LessonSegment =
      props.segment === "presentation" ? "practice" : "use";
    const defaultNextLabel = props.reviewMode
      ? `Ir a ${SEGMENT_LABELS[nextSegment]} →`
      : "Siguiente misión →";

    return (
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-complete-title"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-white/20 bg-white p-6 text-center shadow-2xl moa-pop sm:p-8">
          <div class="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-20">
            {mascot.emoji}
          </div>
          <p class="text-5xl">{mascot.emoji}</p>
          <h2
            id="mission-complete-title"
            class="mt-3 text-2xl font-black text-slate-900"
          >
            {props.reviewMode ? "¡Correcto en repaso!" : "¡Misión completada!"}
          </h2>
          <p class="mt-2 text-slate-600">
            {props.reviewMode
              ? `${SEGMENT_LABELS[props.segment]} repasada — sigue explorando`
              : `${SEGMENT_LABELS[props.segment]} superada`}
          </p>
          {!props.reviewMode ? (
            <p
              class={[
                "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-black",
                theme.chip,
              ].join(" ")}
            >
              <LuZap class="h-5 w-5" />
              +{props.xp} XP
            </p>
          ) : null}
          {props.externalHref ? (
            <NavLink
              href={props.externalHref}
              class={[
                "mt-6 block w-full rounded-2xl px-6 py-4 text-lg font-black text-white shadow-xl transition hover:brightness-105",
                `bg-gradient-to-r ${theme.gradient}`,
              ].join(" ")}
            >
              {props.nextLabel ?? defaultNextLabel}
            </NavLink>
          ) : (
            <button
              type="button"
              onClick$={props.onContinue$}
              class={[
                "mt-6 w-full rounded-2xl px-6 py-4 text-lg font-black text-white shadow-xl transition hover:brightness-105",
                `bg-gradient-to-r ${theme.gradient}`,
              ].join(" ")}
            >
              {props.nextLabel ?? defaultNextLabel}
            </button>
          )}
        </div>
      </div>
    );
  },
);

export const LessonVictoryModal = component$(
  (props: {
    titulo: string;
    score: number;
    esPerfecta: boolean;
    nextLesson?: { id_leccion: number; titulo: string } | null;
    campusHref: string;
    competenciaHref: string;
    onNext$: () => void;
  }) => (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div class="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-2xl moa-pop sm:p-8">
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {["⭐", "🎉", "🏆", "✨", "🌟"].map((e, i) => (
            <span
              key={i}
              class="absolute text-2xl opacity-30"
              style={{ left: `${10 + i * 18}%`, top: `${8 + (i % 2) * 12}%` }}
            >
              {e}
            </span>
          ))}
        </div>
        <div class="relative text-center">
          <p class="text-6xl">🏆</p>
          <h2 id="victory-title" class="mt-3 text-3xl font-black text-emerald-900">
            ¡Lección completada!
          </h2>
          <p class="mt-2 text-lg font-bold text-slate-800">{props.titulo}</p>
          <p class="mt-3 text-slate-600">
            Ganaste{" "}
            <span class="font-black text-indigo-700">{props.score} XP</span>
            {props.esPerfecta ? (
              <span class="mt-2 block font-black text-amber-600">
                ⭐ ¡Puntaje perfecto!
              </span>
            ) : null}
          </p>
          <div class="mt-6 flex flex-col gap-3">
            {props.nextLesson ? (
              <button
                type="button"
                onClick$={props.onNext$}
                class="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-lg font-black text-white shadow-lg"
              >
                Siguiente: {props.nextLesson.titulo}
              </button>
            ) : null}
            <NavLink
              href={props.competenciaHref}
              class="block w-full rounded-2xl border-2 border-emerald-300 bg-white px-6 py-3 text-center text-base font-bold text-emerald-800"
            >
              Ver más lecciones
            </NavLink>
            <NavLink
              href={props.campusHref}
              class="block w-full rounded-2xl px-6 py-3 text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Ir al campus
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  ),
);

export const LessonTrophyToast = component$(
  (props: { lapsos: number[]; onDismiss$: () => void }) => {
    if (props.lapsos.length === 0) return null;

    return (
      <div
        class="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md lg:bottom-6"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-xl moa-pop">
          <span class="text-3xl">🏆</span>
          <div class="min-w-0 flex-1">
            <p class="font-black text-amber-900">¡Trofeo de lapso!</p>
            <p class="text-sm text-amber-800">
              Completaste el lapso{" "}
              {props.lapsos.map((l) => l).join(", ")}. ¡Increíble trabajo!
            </p>
          </div>
          <button
            type="button"
            onClick$={props.onDismiss$}
            class="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-amber-700 hover:bg-amber-100"
          >
            OK
          </button>
        </div>
      </div>
    );
  },
);
