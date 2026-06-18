import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { LuVolume2 } from "@qwikest/icons/lucide";
import type { GameSubmission, MeaningChoiceOption } from "~/lib/lesson-games";
import { fisherYatesShuffle } from "~/lib/lesson-games";
import { speakWord } from "~/lib/lesson-sounds";

export const MeaningChoiceGame = component$(
  (props: {
    prompt: string;
    emoji: string;
    term: string;
    options: MeaningChoiceOption[];
    seed: number;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (submission: Extract<GameSubmission, { kind: "meaning_choice" }>) => void;
  }) => {
    const shuffled = useSignal<MeaningChoiceOption[]>([]);
    const selected = useSignal<string | null>(null);

    useTask$(({ track }) => {
      track(() => props.options);
      track(() => props.seed);
      shuffled.value = fisherYatesShuffle(props.options ?? [], props.seed);
      selected.value = null;
    });

    const submit = $(() => {
      if (!selected.value) return;
      props.onSubmit$({ kind: "meaning_choice", selectedMeaningId: selected.value });
    });

    return (
      <div class="space-y-5">
        <div class="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 px-4 py-5 text-center">
          <p class="text-6xl leading-none">{props.emoji}</p>
          <div class="mt-3 flex items-center justify-center gap-2">
            <p class="text-2xl font-black text-sky-900">{props.term}</p>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 transition hover:bg-sky-100"
              aria-label={`Escuchar ${props.term}`}
              onClick$={() => void speakWord(props.term, "en")}
            >
              <LuVolume2 class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-2 text-sm font-semibold text-sky-700">{props.prompt}</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          {(shuffled.value ?? []).map((opt, index) => {
            const isSelected = selected.value === opt.id;
            return (
              <button
                key={`${opt.id}-${index}`}
                type="button"
                disabled={props.disabled}
                onClick$={() => {
                  selected.value = opt.id;
                }}
                class={[
                  "rounded-2xl border-2 px-4 py-4 text-left text-base font-bold transition-all",
                  isSelected
                    ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200 scale-[1.01]"
                    : "border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/60",
                ].join(" ")}
              >
                {opt.meaning}
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
