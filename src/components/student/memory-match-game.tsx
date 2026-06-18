import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { GameSubmission, MemoryPair } from "~/lib/lesson-games";
import { fisherYatesShuffle } from "~/lib/lesson-games";

type MemoryCard = {
  pairId: string;
  kind: "emoji" | "term";
  display: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const buildDeck = (pairs: MemoryPair[], seed: number): MemoryCard[] => {
  const cards: MemoryCard[] = [];
  for (const pair of pairs) {
    cards.push({
      pairId: pair.id,
      kind: "emoji",
      display: pair.emoji,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      pairId: pair.id,
      kind: "term",
      display: pair.term,
      isFlipped: false,
      isMatched: false,
    });
  }
  return fisherYatesShuffle(cards, seed);
};

export const MemoryMatchGame = component$(
  (props: {
    pairs: MemoryPair[];
    seed: number;
    disabled?: boolean;
    onSubmit$: (submission: Extract<GameSubmission, { kind: "memory_match" }>) => void;
  }) => {
    const cards = useSignal<MemoryCard[]>([]);
    const flippedIndices = useSignal<number[]>([]);
    const lock = useSignal(false);
    const solved = useSignal(0);
    const elapsed = useSignal(0);
    // Timeouts pendientes para voltear/emparejar cartas; se limpian al desmontar.
    const pendingTimers = useSignal<number[]>([]);

    useVisibleTask$(({ track }) => {
      track(() => props.pairs);
      track(() => props.seed);
      cards.value = buildDeck(props.pairs, props.seed);
      flippedIndices.value = [];
      lock.value = false;
      solved.value = 0;
      elapsed.value = 0;
    });

    useVisibleTask$(({ cleanup }) => {
      cleanup(() => {
        for (const id of pendingTimers.value) clearTimeout(id);
        pendingTimers.value = [];
      });
    });

    useVisibleTask$(({ track, cleanup }) => {
      track(() => props.disabled);
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

    const flipCard = $((index: number) => {
      if (props.disabled || lock.value) return;
      const card = cards.value[index];
      if (!card || card.isFlipped || card.isMatched) return;

      const nextCards = cards.value.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c,
      );
      cards.value = nextCards;

      const nextFlipped = [...flippedIndices.value, index];
      flippedIndices.value = nextFlipped;

      if (nextFlipped.length < 2) return;

      lock.value = true;
      const [i1, i2] = nextFlipped;
      const c1 = nextCards[i1];
      const c2 = nextCards[i2];
      const isMatch =
        c1.pairId === c2.pairId && c1.kind !== c2.kind;

      if (isMatch) {
        const id = setTimeout(() => {
          cards.value = cards.value.map((c, i) =>
            i === i1 || i === i2
              ? { ...c, isMatched: true, isFlipped: false }
              : c,
          );
          flippedIndices.value = [];
          lock.value = false;
          solved.value += 1;

          if (solved.value >= props.pairs.length) {
            props.onSubmit$({ kind: "memory_match" });
          }
        }, 500) as unknown as number;
        pendingTimers.value = [...pendingTimers.value, id];
      } else {
        const id = setTimeout(() => {
          cards.value = cards.value.map((c, i) =>
            i === i1 || i === i2 ? { ...c, isFlipped: false } : c,
          );
          flippedIndices.value = [];
          lock.value = false;
        }, 900) as unknown as number;
        pendingTimers.value = [...pendingTimers.value, id];
      }
    });

    const total = props.pairs.length;

    return (
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3">
          <p class="text-sm font-bold text-violet-800">
            Parejas encontradas: {solved.value}/{total}
          </p>
          <p class="text-sm font-mono font-bold text-violet-600">
            ⏱ {formatTime(elapsed.value)}
          </p>
        </div>

        <p class="text-center text-sm font-semibold text-violet-800">
          Une cada emoji con su palabra en inglés
        </p>

        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
          {cards.value.map((card, index) => {
            const isOpen = card.isFlipped || card.isMatched;
            return (
              <button
                key={`${card.pairId}-${card.kind}-${index}`}
                type="button"
                disabled={props.disabled || isOpen || lock.value}
                onClick$={() => flipCard(index)}
                class={[
                  "moa-memory-card aspect-square rounded-2xl border-2 transition-all duration-300",
                  isOpen
                    ? card.isMatched
                      ? "border-emerald-400 bg-emerald-50 moa-pop"
                      : "border-violet-300 bg-white moa-memory-open"
                    : "border-violet-200 bg-gradient-to-br from-violet-100 to-indigo-100 hover:border-violet-400 hover:shadow-md",
                  props.disabled ? "opacity-60" : "",
                ].join(" ")}
              >
                {isOpen ? (
                  <span
                    class={[
                      "flex h-full w-full items-center justify-center p-2 font-black text-slate-800",
                      card.kind === "emoji" ? "text-4xl" : "text-sm sm:text-base",
                    ].join(" ")}
                  >
                    {card.display}
                  </span>
                ) : (
                  <span class="text-3xl opacity-40">❓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
