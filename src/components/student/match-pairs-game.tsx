import { $, component$, useSignal, useTask$, useVisibleTask$ } from "@builder.io/qwik";
import { LuArrowRight } from "@qwikest/icons/lucide";
import type { GameSubmission, MatchPairItem } from "~/lib/lesson-games";
import { shuffleMatchColumnOrders } from "~/lib/lesson-games";

const MATCH_COLORS = [
  { dot: "bg-sky-500", ring: "ring-sky-200", border: "border-sky-200" },
  { dot: "bg-violet-500", ring: "ring-violet-200", border: "border-violet-200" },
  { dot: "bg-amber-500", ring: "ring-amber-200", border: "border-amber-200" },
  { dot: "bg-emerald-500", ring: "ring-emerald-200", border: "border-emerald-200" },
];

export const MatchPairsGame = component$(
  (props: {
    pairs: MatchPairItem[];
    seed: number;
    disabled?: boolean;
    saving?: boolean;
    onSubmit$: (submission: Extract<GameSubmission, { kind: "match_pairs" }>) => void;
  }) => {
    const leftOrder = useSignal<string[]>([]);
    const rightOrder = useSignal<string[]>([]);
    const selectedLeftId = useSignal<string | null>(null);
    const matchMap = useSignal<Record<string, string>>({});
    const checked = useSignal(false);
    const elapsed = useSignal(0);

    useTask$(({ track }) => {
      track(() => props.pairs);
      track(() => props.seed);
      const ids = (props.pairs ?? []).map((p) => p.id);
      const { left, right } = shuffleMatchColumnOrders(ids, props.seed);
      leftOrder.value = left;
      rightOrder.value = right;
      selectedLeftId.value = null;
      matchMap.value = {};
      checked.value = false;
      elapsed.value = 0;
    });

    useVisibleTask$(({ cleanup }) => {
      if (props.disabled) return;
      const timer = setInterval(() => {
        elapsed.value += 1;
      }, 1000);
      cleanup(() => clearInterval(timer));
    });

    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const colorForLeft = (leftId: string) => {
      const idx = leftOrder.value.indexOf(leftId);
      return MATCH_COLORS[idx % MATCH_COLORS.length];
    };

    const selectLeft = $((id: string) => {
      if (props.disabled) return;
      checked.value = false;
      selectedLeftId.value = id;
    });

    const linkRight = $((rightId: string) => {
      if (props.disabled) return;
      const leftId = selectedLeftId.value;
      if (!leftId) return;
      checked.value = false;

      const next: Record<string, string> = { ...matchMap.value };
      for (const [key, value] of Object.entries(next)) {
        if (value === rightId) delete next[key];
      }
      next[leftId] = rightId;
      matchMap.value = next;
      selectedLeftId.value = null;
    });

    const linkedCount = Object.keys(matchMap.value).length;
    const pairList = props.pairs ?? [];
    const allLinked = linkedCount >= pairList.length;

    const allCorrect =
      pairList.length > 0 &&
      pairList.every((pair) => matchMap.value[pair.id] === pair.id);

    const submit = $(() => {
      const matches: Record<string, string> = {};
      for (const [key, value] of Object.entries(matchMap.value)) {
        matches[key] = value;
      }
      checked.value = true;
      props.onSubmit$({ kind: "match_pairs", matches });
    });

    const isCorrectLink = (leftId: string) => matchMap.value[leftId] === leftId;

    const pairById = (id: string) => pairList.find((p) => p.id === id);

    return (
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3">
          <p class="text-sm font-bold text-violet-800">
            Parejas: {linkedCount}/{pairList.length}
          </p>
          <p class="text-sm font-mono font-bold text-violet-600">
            ⏱ {formatTime(elapsed.value)}
          </p>
        </div>

        <p class="text-center text-sm font-semibold text-violet-800">
          Toca una palabra en inglés y luego su significado en español
        </p>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
              Inglés
            </p>
            <div class="space-y-2">
              {leftOrder.value.map((id) => {
                const pair = pairById(id);
                if (!pair) return null;
                const selected = selectedLeftId.value === id;
                const linkedRightId = matchMap.value[id];
                const linkedPair = linkedRightId ? pairById(linkedRightId) : null;
                const color = colorForLeft(id);
                const correct = linkedRightId ? isCorrectLink(id) : null;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={props.disabled}
                    onClick$={() => selectLeft(id)}
                    class={[
                      "w-full rounded-xl border-2 p-3 text-left transition-all",
                      selected
                        ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                        : linkedRightId
                          ? correct
                            ? "border-emerald-300 bg-emerald-50/50"
                            : "border-red-300 bg-red-50/50"
                          : `${color.border} bg-white hover:border-violet-300 hover:bg-violet-50/40`,
                    ].join(" ")}
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">{pair.emoji}</span>
                      <div class="min-w-0 flex-1">
                        <p class="font-black text-slate-800">{pair.term}</p>
                        {linkedPair ? (
                          <p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                            <span
                              class={`inline-block h-2 w-2 rounded-full ${correct ? "bg-emerald-500" : "bg-red-500"}`}
                            />
                            {linkedPair.meaning}
                          </p>
                        ) : (
                          <p class="mt-1 text-xs text-slate-400">
                            {selected ? "Ahora elige el significado →" : "Toca para elegir"}
                          </p>
                        )}
                      </div>
                      {linkedRightId ? (
                        <span
                          class={[
                            "text-xs font-bold",
                            correct ? "text-emerald-600" : "text-red-600",
                          ].join(" ")}
                        >
                          {correct ? "✓" : "✗"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
              Español
            </p>
            <div class="space-y-2">
              {rightOrder.value.map((id) => {
                const pair = pairById(id);
                if (!pair) return null;
                const isTaken = Object.values(matchMap.value).includes(id);

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={props.disabled || !selectedLeftId.value}
                    onClick$={() => linkRight(id)}
                    class={[
                      "w-full rounded-xl border-2 p-3 text-left font-bold transition-all",
                      isTaken
                        ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                        : selectedLeftId.value
                          ? "border-slate-200 hover:border-violet-400 hover:bg-violet-50"
                          : "border-slate-100 bg-slate-50 text-slate-400",
                    ].join(" ")}
                  >
                    <span class="flex items-center justify-between gap-2">
                      <span>{pair.meaning}</span>
                      {selectedLeftId.value && !isTaken ? (
                        <LuArrowRight class="h-4 w-4 shrink-0 text-violet-500" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {checked.value && !allCorrect ? (
          <p class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-800">
            Hay parejas incorrectas (marca ✗). Corrígelas y vuelve a comprobar.
          </p>
        ) : null}

        <button
          type="button"
          disabled={props.disabled || props.saving || !allLinked}
          onClick$={submit}
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:brightness-105 disabled:opacity-50 sm:w-auto"
        >
          {props.saving ? "Guardando..." : "¡Comprobar parejas!"}
        </button>
      </div>
    );
  },
);
