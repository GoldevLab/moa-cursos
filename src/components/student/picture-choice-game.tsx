import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { LuVolume2 } from "@qwikest/icons/lucide";
import type { GameSubmission, PictureChoiceOption } from "~/lib/lesson-games";
import { fisherYatesShuffle } from "~/lib/lesson-games";
import { speakLessonText } from "~/lib/lesson-sounds";

export const PictureChoiceGame = component$(
  (props: {
    prompt: string;
    options: PictureChoiceOption[];
    seed: number;
    englishTerm?: string;
    spanishMeaning?: string;
    hintMeaning?: string;
    showTermLabels?: boolean;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (submission: Extract<GameSubmission, { kind: "picture_choice" }>) => void;
  }) => {
    const shuffled = useSignal<PictureChoiceOption[]>([]);
    const selected = useSignal<string | null>(null);

    useTask$(({ track }) => {
      track(() => props.options);
      track(() => props.seed);
      shuffled.value = fisherYatesShuffle(props.options ?? [], props.seed);
      selected.value = null;
    });

    const submit = $(() => {
      if (!selected.value) return;
      props.onSubmit$({ kind: "picture_choice", selectedTerm: selected.value });
    });

    const showHeader =
      (props.englishTerm && !props.showTermLabels) ||
      Boolean(props.prompt) ||
      Boolean(props.hintMeaning);

    return (
      <div class="space-y-5">
        {showHeader ? (
        <div
          class={[
            "rounded-2xl border px-4 py-4 text-center",
            props.showTermLabels
              ? "border-amber-200 bg-amber-50/80"
              : "border-violet-200 bg-violet-50/80",
          ].join(" ")}
        >
          {props.englishTerm && !props.showTermLabels ? (
            <div class="flex items-center justify-center gap-2">
              <p class="text-3xl font-black tracking-wide text-slate-900">
                {props.englishTerm}
              </p>
              {props.englishTerm && !props.showTermLabels ? (
                <button
                  type="button"
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-100"
                  aria-label={`Listen: ${props.prompt} of ${props.englishTerm}`}
                  onClick$={() =>
                    void speakLessonText(
                      `Choose the correct image of "${props.englishTerm}"`,
                      "presentation",
                    )
                  }
                >
                  <LuVolume2 class="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : null}
          <p
            class={[
              props.englishTerm && !props.showTermLabels ? "mt-2" : "",
              "text-sm font-bold",
              props.showTermLabels ? "text-amber-800" : "text-violet-800",
            ].join(" ")}
          >
            {props.prompt}
          </p>
          {props.hintMeaning ? (
            <p class="mt-2 text-sm font-semibold text-slate-600">
              💡 Hint: {props.hintMeaning}
            </p>
          ) : null}
        </div>
        ) : null}

        <div class="grid grid-cols-2 gap-4">
          {(shuffled.value ?? []).map((opt) => {
            const isSelected = selected.value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={props.disabled}
                onClick$={() => {
                  selected.value = opt.id;
                }}
                class={[
                  "flex min-h-[8rem] flex-col items-center justify-center rounded-3xl border-2 p-4 transition-all",
                  isSelected
                    ? props.showTermLabels
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200 scale-[1.02]"
                      : "border-violet-500 bg-violet-50 ring-2 ring-violet-200 scale-[1.02]"
                    : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50",
                ].join(" ")}
              >
                <span class="text-6xl leading-none">{opt.emoji}</span>
                {props.showTermLabels ? (
                  <span class="mt-2 text-base font-black text-slate-800">
                    {opt.term}
                  </span>
                ) : isSelected ? (
                  <span class="mt-2 text-xs font-bold uppercase tracking-wide text-violet-600">
                    Selected
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={props.disabled || props.saving || !selected.value}
          onClick$={submit}
          class={[
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50 sm:w-auto",
            props.showTermLabels
              ? "bg-gradient-to-r from-amber-500 to-orange-600"
              : "bg-gradient-to-r from-violet-500 to-indigo-600",
          ].join(" ")}
        >
          {props.saving ? "Guardando..." : "¡Comprobar!"}
        </button>
      </div>
    );
  },
);
