import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { SpellingRound } from "~/lib/lesson-games";

export const SpellingBuildGame = component$(
  (props: {
    round: SpellingRound;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (built: string) => void;
  }) => {
    const built = useSignal("");
    const available = useSignal<string[]>([]);
    const elapsed = useSignal(0);

    useVisibleTask$(({ track }) => {
      track(() => props.round);
      built.value = "";
      available.value = [...props.round.letters];
      elapsed.value = 0;
    });

    useVisibleTask$(({ track, cleanup }) => {
      track(() => props.disabled);
      if (props.disabled) return;
      const timer = setInterval(() => {
        elapsed.value += 1;
      }, 1000);
      cleanup(() => clearInterval(timer));
    });

    const addLetter = $((index: number) => {
      if (props.disabled) return;
      const maxLen = props.round.answer.length;
      if (built.value.length >= maxLen) return;
      const next = [...available.value];
      const letter = next.splice(index, 1)[0];
      available.value = next;
      built.value += letter;
    });

    const removeLast = $(() => {
      if (props.disabled || !built.value) return;
      const last = built.value.slice(-1);
      built.value = built.value.slice(0, -1);
      available.value = [...available.value, last];
    });

    const submit = $(() => {
      props.onSubmit$(built.value);
    });

    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const complete = built.value.length >= props.round.answer.length;

    return (
      <div class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-5xl">{props.round.emoji}</span>
            <div>
              {props.round.contextHint ? (
                <p class="text-sm font-bold text-amber-900">
                  Completa:{" "}
                  <span class="font-black">{props.round.contextHint}</span>
                </p>
              ) : null}
              <p class="text-sm font-bold text-amber-800">
                Escribe en inglés ({props.round.letterCount}{" "}
                {props.round.letterCount === 1 ? "letra" : "letras"})
              </p>
              {props.round.suppressSpanishHint ? (
                <p class="text-xs font-semibold text-amber-700/90">
                  Usa solo letras en inglés — no escribas en español
                </p>
              ) : (
                <p class="text-xs font-semibold text-amber-700/90">
                  Pista: significa «{props.round.meaning}» — no escribas en español
                </p>
              )}
            </div>
          </div>
          <p class="text-sm font-mono font-bold text-amber-600">
            ⏱ {formatTime(elapsed.value)}
          </p>
        </div>

        <div class="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-5 text-center">
          <p class="text-3xl font-black uppercase tracking-[0.35em] text-slate-800">
            {built.value || "___"}
          </p>
        </div>

        <div class="flex flex-wrap justify-center gap-2">
          {available.value.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              type="button"
              disabled={props.disabled || built.value.length >= props.round.answer.length}
              onClick$={() => addLetter(index)}
              class="rounded-xl border-2 border-amber-200 bg-white px-4 py-2 text-xl font-black uppercase text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-40"
            >
              {letter}
            </button>
          ))}
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={props.disabled || !built.value}
            onClick$={removeLast}
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Borrar letra
          </button>
          <button
            type="button"
            disabled={props.disabled || props.saving || !complete}
            onClick$={submit}
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50 sm:flex-none"
          >
            {props.saving ? "Guardando..." : "¡Comprobar palabra!"}
          </button>
        </div>
      </div>
    );
  },
);
