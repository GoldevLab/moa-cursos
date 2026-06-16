import { component$ } from "@builder.io/qwik";
import { LAPSO_COLORS } from "./student-ui";

const LAPSO_EMOJI: Record<number, string> = {
  1: "🏝️",
  2: "🌋",
  3: "🏆",
};

export const CampusJourneyMap = component$(
  (props: {
    lapsos: readonly number[];
    competencias: Array<{
      lapso: number;
      completada: boolean;
      desbloqueada: boolean;
    }>;
    trofeos: { lapso1: boolean; lapso2: boolean; lapso3: boolean };
  }) => {
    const total = props.competencias.length;
    const done = props.competencias.filter((c) => c.completada).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <section class="rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-black text-slate-800">🗺️ Tu mapa de aventura</p>
          <span class="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            {done}/{total} islas · {pct}%
          </span>
        </div>

        <div class="mt-4 h-5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80 relative">
          <div
            class="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 transition-all duration-700 moa-xp-bar"
            style={{ width: `${pct}%` }}
          />
          {total > 0
            ? props.competencias.map((comp, i) => {
                const pos = ((i + 0.5) / total) * 100;
                return (
                  <span
                    key={i}
                    class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-sm drop-shadow"
                    style={{ left: `${pos}%` }}
                  >
                    {comp.completada ? "⭐" : comp.desbloqueada ? "🏝️" : "🔒"}
                  </span>
                );
              })
            : null}
        </div>

        <div class="mt-4 grid gap-2 sm:grid-cols-3">
          {props.lapsos.map((lapso) => {
            const items = props.competencias.filter((c) => c.lapso === lapso);
            const lapsoDone = items.filter((c) => c.completada).length;
            const colors = LAPSO_COLORS[lapso] ?? LAPSO_COLORS[1];
            const trophy =
              lapso === 1
                ? props.trofeos.lapso1
                : lapso === 2
                  ? props.trofeos.lapso2
                  : props.trofeos.lapso3;

            return (
              <div
                key={lapso}
                class={[
                  "rounded-xl border p-3 text-center",
                  colors.bg,
                  "border-white/80",
                ].join(" ")}
              >
                <p class="text-2xl">{LAPSO_EMOJI[lapso] ?? "🌟"}</p>
                <p class={["mt-1 text-xs font-black uppercase", colors.text].join(" ")}>
                  Lapso {lapso}
                </p>
                <p class="text-sm font-bold text-slate-700">
                  {lapsoDone}/{items.length}
                </p>
                {trophy ? (
                  <p class="mt-1 text-xs font-bold text-amber-600">🏆 Trofeo</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  },
);
