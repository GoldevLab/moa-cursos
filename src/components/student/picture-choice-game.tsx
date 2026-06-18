import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import type { GameSubmission, PictureChoiceOption } from "~/lib/lesson-games";
import { fisherYatesShuffle } from "~/lib/lesson-games";

export const PictureChoiceGame = component$(
  (props: {
    prompt: string;
    options: PictureChoiceOption[];
    seed: number;
    englishTerm?: string;
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

    return (
      <div class="space-y-5">
        <div
          class={[
            "rounded-2xl border px-4 py-4 text-center",
            props.showTermLabels
              ? "border-amber-200 bg-amber-50/80"
              : "border-violet-200 bg-violet-50/80",
          ].join(" ")}
        >
          <p
            class={[
              "text-sm font-bold",
              props.showTermLabels ? "text-amber-800" : "text-violet-800",
            ].join(" ")}
          >
            {props.prompt}
          </p>
          {props.englishTerm ? (
            <p class="mt-2 text-3xl font-black tracking-wide text-slate-900">
              {props.englishTerm}
            </p>
          ) : null}
          {props.hintMeaning ? (
            <p class="mt-2 text-sm font-semibold text-slate-600">
              💡 Pista: {props.hintMeaning}
            </p>
          ) : null}
        </div>

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
                    Elegida
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
