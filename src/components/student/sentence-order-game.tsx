import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import type { GameSubmission, SentenceOrderRound } from "~/lib/lesson-games";

export const SentenceOrderGame = component$(
  (props: {
    round: SentenceOrderRound;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (submission: Extract<GameSubmission, { kind: "sentence_order" }>) => void;
  }) => {
    const built = useSignal<string[]>([]);
    const pool = useSignal<string[]>([]);
    const targetWords = props.round.shuffledWords ?? [];

    useTask$(({ track }) => {
      track(() => props.round.shuffledWords);
      track(() => props.round.correctPhrase);
      built.value = [];
      pool.value = [...(props.round.shuffledWords ?? [])];
    });

    const addWord = $((index: number) => {
      if (props.disabled) return;
      const words = pool.value ?? [];
      const maxLen = targetWords.length;
      if (built.value.length >= maxLen) return;
      const next = [...words];
      const word = next.splice(index, 1)[0];
      pool.value = next;
      built.value = [...built.value, word];
    });

    const removeLast = $(() => {
      if (props.disabled || built.value.length === 0) return;
      const nextBuilt = [...built.value];
      const last = nextBuilt.pop()!;
      built.value = nextBuilt;
      pool.value = [...(pool.value ?? []), last];
    });

    const reset = $(() => {
      if (props.disabled) return;
      pool.value = [...targetWords];
      built.value = [];
    });

    const submit = $(() => {
      props.onSubmit$({ kind: "sentence_order", built: built.value.join(" ") });
    });

    const wordCount = targetWords.length;
    const complete = built.value.length === wordCount && wordCount > 0;
    const poolWords = pool.value ?? [];

    return (
      <div class="space-y-5">
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-5">
          <div class="flex items-start gap-3">
            <span class="text-4xl">{props.round.emoji}</span>
            <div>
              <p class="text-sm font-bold text-amber-800">{props.round.prompt}</p>
              <p class="mt-2 text-xl font-black text-amber-950">
                {props.round.sentenceWithBlank}
              </p>
            </div>
          </div>
        </div>

        <div class="min-h-[4.5rem] rounded-2xl border-2 border-dashed border-amber-300 bg-white px-4 py-4">
          <p class="text-lg font-bold leading-relaxed text-slate-800">
            {built.value.length > 0 ? built.value.join(" ") : "Toca las palabras abajo…"}
          </p>
        </div>

        <div class="flex flex-wrap justify-center gap-2">
          {poolWords.map((word, index) => (
            <button
              key={`${word}-${index}`}
              type="button"
              disabled={props.disabled}
              onClick$={() => addWord(index)}
              class="rounded-xl border-2 border-amber-200 bg-white px-4 py-2 text-base font-black text-amber-900 transition hover:border-amber-400 hover:bg-amber-50"
            >
              {word}
            </button>
          ))}
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={props.disabled || built.value.length === 0}
            onClick$={removeLast}
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Quitar última
          </button>
          <button
            type="button"
            disabled={props.disabled || built.value.length === 0}
            onClick$={reset}
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Reiniciar
          </button>
          <button
            type="button"
            disabled={props.disabled || props.saving || !complete}
            onClick$={submit}
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50 sm:flex-none"
          >
            {props.saving ? "Guardando..." : "¡Comprobar frase!"}
          </button>
        </div>
      </div>
    );
  },
);
