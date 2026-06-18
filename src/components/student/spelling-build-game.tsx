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
      <div class="space-y-3">
        <div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
          <span class="text-2xl leading-none">{props.round.emoji}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-amber-900">
              {props.round.letterCount}{" "}
              {props.round.letterCount === 1 ? "letra" : "letras"} en inglés
              {!props.round.suppressSpanishHint ? (
                <span class="font-semibold text-amber-800/90">
                  {" "}
                  · «{props.round.meaning}»
                </span>
              ) : null}
            </p>
          </div>
          <p class="shrink-0 text-xs font-mono font-bold text-amber-600">
            {formatTime(elapsed.value)}
          </p>
        </div>

        <div class="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <p class="text-2xl font-black uppercase tracking-[0.3em] text-slate-800 sm:text-3xl">
            {built.value || "___"}
          </p>
        </div>

        <div class="flex flex-wrap justify-center gap-1.5">
          {available.value.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              type="button"
              disabled={props.disabled || built.value.length >= props.round.answer.length}
              onClick$={() => addLetter(index)}
              class="rounded-lg border-2 border-amber-200 bg-white px-3 py-1.5 text-lg font-black uppercase text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xl"
            >
              {letter}
            </button>
          ))}
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={props.disabled || !built.value}
            onClick$={removeLast}
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Borrar
          </button>
          <button
            type="button"
            disabled={props.disabled || props.saving || !complete}
            onClick$={submit}
            class="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-base font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {props.saving ? "Guardando..." : "¡Comprobar!"}
          </button>
        </div>
      </div>
    );
  },
);
