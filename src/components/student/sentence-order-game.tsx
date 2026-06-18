import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { LuVolume2 } from "@qwikest/icons/lucide";
import type { GameSubmission, SentenceOrderRound } from "~/lib/lesson-games";
import { speakWord } from "~/lib/lesson-sounds";

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
    const showHeader =
      Boolean(props.round.prompt) ||
      Boolean(props.round.hintMeaning) ||
      Boolean(props.round.sentenceWithBlank);

    return (
      <div class="space-y-5">
        {showHeader ? (
          <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-5">
            <div class="flex items-start gap-3">
              <span class="text-4xl">{props.round.emoji}</span>
              <div class="min-w-0 flex-1 text-left">
                {props.round.sentenceWithBlank ? (
                  <p class="text-xl font-black text-amber-950">
                    {props.round.sentenceWithBlank}
                  </p>
                ) : null}
                {props.round.hintMeaning ? (
                  <div
                    class={[
                      "flex items-center gap-2",
                      props.round.sentenceWithBlank ? "mt-2" : "",
                    ].join(" ")}
                  >
                    <p class="text-sm font-semibold text-amber-900">
                      Pista: «{props.round.hintMeaning}»
                    </p>
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                      aria-label={`Escuchar «${props.round.hintMeaning}»`}
                      onClick$={() => void speakWord(props.round.hintMeaning!, "es")}
                    >
                      <LuVolume2 class="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {props.round.prompt ? (
                  <p
                    class={[
                      "text-sm font-bold text-amber-800",
                      props.round.sentenceWithBlank || props.round.hintMeaning
                        ? "mt-2"
                        : "",
                    ].join(" ")}
                  >
                    {props.round.prompt}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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
