import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { PictureChoiceOption } from "~/lib/lesson-games";
import { fisherYatesShuffle } from "~/lib/lesson-games";

export const PictureChoiceGame = component$(
  (props: {
    prompt: string;
    options: PictureChoiceOption[];
    seed: number;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (selectedTerm: string) => void;
  }) => {
    const shuffled = useSignal<PictureChoiceOption[]>([]);
    const selected = useSignal<string | null>(null);

    useVisibleTask$(({ track }) => {
      track(() => props.options);
      track(() => props.seed);
      shuffled.value = fisherYatesShuffle(props.options, props.seed);
      selected.value = null;
    });

    const submit = $(() => {
      if (!selected.value) return;
      props.onSubmit$(selected.value);
    });

    return (
      <div class="space-y-5">
        <p class="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-center text-lg font-black text-sky-900">
          {props.prompt}
        </p>

        <div class="grid grid-cols-2 gap-4">
          {shuffled.value.map((opt) => {
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
                    ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200 scale-[1.02]"
                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50",
                ].join(" ")}
              >
                <span class="text-6xl leading-none">{opt.emoji}</span>
                {isSelected ? (
                  <span class="mt-2 text-xs font-bold uppercase tracking-wide text-sky-600">
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
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-600 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50 sm:w-auto"
        >
          {props.saving ? "Guardando..." : "¡Comprobar!"}
        </button>
      </div>
    );
  },
);
