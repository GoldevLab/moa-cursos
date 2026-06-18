import { component$ } from "@builder.io/qwik";
import { NavLink } from "~/components/ui/nav-link";
import {
  LuCheck,
  LuChevronRight,
  LuLock,
  LuSparkles,
} from "@qwikest/icons/lucide";
import { MAX_POINTS_PER_LESSON, SEGMENT_POINTS, type LessonSegment } from "~/lib/constants";

export const LAPSO_COLORS: Record<
  number,
  { bg: string; text: string; ring: string; gradient: string }
> = {
  1: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    gradient: "from-sky-500 to-cyan-500",
  },
  2: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
    gradient: "from-violet-500 to-indigo-500",
  },
  3: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    gradient: "from-amber-500 to-orange-500",
  },
};

export const SEGMENT_LABELS: Record<LessonSegment, string> = {
  presentation: "Presentación",
  practice: "Práctica",
  use: "Uso",
};

export const SegmentStepper = component$(
  (props: {
    current: LessonSegment;
    presentationDone: boolean;
    practiceDone: boolean;
    useDone: boolean;
    reviewMode?: boolean;
    onSelect$: (segment: LessonSegment) => void;
  }) => {
    const segments: LessonSegment[] = ["presentation", "practice", "use"];
    const unlocked = {
      presentation: true,
      practice: props.reviewMode || props.presentationDone,
      use: props.reviewMode || props.practiceDone,
    };
    const done = {
      presentation: props.presentationDone,
      practice: props.practiceDone,
      use: props.useDone,
    };

    return (
      <div class="grid gap-3 sm:grid-cols-3">
        {segments.map((key, index) => {
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
                "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                isActive
                  ? "border-indigo-300 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : isUnlocked
                    ? "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:shadow-md"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400",
              ].join(" ")}
            >
              <div class="flex items-center justify-between gap-2">
                <span
                  class={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {isDone ? <LuCheck class="h-4 w-4" /> : index + 1}
                </span>
                {!isUnlocked ? <LuLock class="h-4 w-4 opacity-60" /> : null}
              </div>
              <p class="mt-3 font-semibold">{SEGMENT_LABELS[key]}</p>
              <p
                class={[
                  "mt-1 text-xs",
                  isActive ? "text-indigo-100" : "text-slate-500",
                ].join(" ")}
              >
                {SEGMENT_POINTS[key]} pts
                {!isUnlocked ? " · bloqueado" : ""}
              </p>
            </button>
          );
        })}
      </div>
    );
  },
);

export const ScoreBar = component$(
  (props: { score: number; max?: number; label?: string }) => {
    const max = props.max ?? MAX_POINTS_PER_LESSON;
    const pct = Math.min(100, Math.round((props.score / max) * 100));
    return (
      <div>
        {props.label ? (
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-slate-600">{props.label}</span>
            <span class="font-bold text-slate-900">
              {props.score}/{max}
            </span>
          </div>
        ) : null}
        <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  },
);

export const BreadcrumbTrail = component$(
  (props: { items: { label: string; href?: string }[] }) => (
    <nav
      aria-label="Ruta"
      class="flex flex-wrap items-center gap-1 text-sm text-slate-500"
    >
      {props.items.map((item, i) => (
        <span key={item.label} class="inline-flex items-center gap-1">
          {i > 0 ? <LuChevronRight class="h-3.5 w-3.5 text-slate-300" /> : null}
          {item.href ? (
            <NavLink
              href={item.href}
              class="font-medium text-indigo-600 hover:underline"
            >
              {item.label}
            </NavLink>
          ) : (
            <span class="font-medium text-slate-800">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  ),
);

export const PerfectBadge = component$(() => (
  <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
    <LuSparkles class="h-3.5 w-3.5" />
    PERFECTO
  </span>
));
