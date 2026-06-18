import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { LuVolume2 } from "@qwikest/icons/lucide";
import type { SpellingRound } from "~/lib/lesson-games";
import { speakWord } from "~/lib/lesson-sounds";

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
    const slots = Array.from({ length: props.round.answer.length });

    return (
      <div class="space-y-4">
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-4 text-center">
          <p class="text-5xl leading-none">{props.round.emoji}</p>

          {props.round.contextHint ? (
            <p class="mt-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-lg font-black text-amber-950">
              {props.round.contextHint}
            </p>
          ) : null}

          <p class="mt-3 text-lg font-black leading-snug text-amber-950 sm:text-xl">
            {props.round.prompt}
          </p>

          {!props.round.suppressSpanishHint && !props.round.contextHint ? (
            <div class="mt-2 flex items-center justify-center gap-2">
              <p class="text-base font-bold text-amber-800">
                En español: «{props.round.meaning}»
              </p>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                aria-label={`Escuchar «${props.round.meaning}»`}
                onClick$={() => void speakWord(props.round.meaning, "es")}
              >
                <LuVolume2 class="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <p class="mt-2 text-sm font-semibold text-amber-800/90">
            {props.round.instruction}
          </p>
        </div>

        <div class="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-4">
          <p class="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
            Tu palabra en inglés
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            {slots.map((_, index) => {
              const letter = built.value[index] ?? "";
              return (
                <div
                  key={index}
                  class={[
                    "flex h-12 w-10 items-center justify-center rounded-xl border-2 text-2xl font-black uppercase sm:h-14 sm:w-12 sm:text-3xl",
                    letter
                      ? "border-amber-400 bg-white text-amber-900 shadow-sm"
                      : "border-dashed border-slate-300 bg-white/60 text-slate-300",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {letter || "·"}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p class="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
            Toca una letra
          </p>
          <div class="flex flex-wrap justify-center gap-1.5">
            {available.value.map((letter, index) => (
              <button
                key={`${letter}-${index}`}
                type="button"
                disabled={
                  props.disabled || built.value.length >= props.round.answer.length
                }
                onClick$={() => addLetter(index)}
                class="rounded-lg border-2 border-amber-200 bg-white px-3 py-1.5 text-lg font-black uppercase text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xl"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={props.disabled || !built.value}
            onClick$={removeLast}
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Borrar última
          </button>
          <p class="ml-auto text-xs font-mono font-bold text-slate-400">
            {formatTime(elapsed.value)}
          </p>
          <button
            type="button"
            disabled={props.disabled || props.saving || !complete}
            onClick$={submit}
            class="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-base font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:flex-1"
          >
            {props.saving ? "Guardando..." : "¡Comprobar!"}
          </button>
        </div>
      </div>
    );
  },
);
