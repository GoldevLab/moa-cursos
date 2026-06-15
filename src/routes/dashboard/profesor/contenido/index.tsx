import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { LuArrowRight, LuStar } from "@qwikest/icons/lucide";
import { LAPSO_COLORS } from "~/components/student/student-ui";
import { listCompetenciasWithLessons } from "~/lib/lesson-content";

export const head: DocumentHead = {
  title: "Contenido | MOA Profesor",
};

export const useContenidoPage = routeLoader$(async () => {
  const competencias = await listCompetenciasWithLessons();
  return { competencias };
});

export default component$(() => {
  const data = useContenidoPage();

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Contenido por competencia</h1>
        <p class="mt-2 text-slate-600">
          Selecciona una competencia para ver y editar sus lecciones.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        {data.value.competencias.map((comp) => {
          const colors = LAPSO_COLORS[comp.lapso] ?? LAPSO_COLORS[1];
          const pct =
            comp.total_lecciones > 0
              ? Math.round((comp.con_contenido / comp.total_lecciones) * 100)
              : 0;

          return (
            <Link
              key={comp.id_competencia}
              href={`/dashboard/profesor/contenido/${comp.id_competencia}/`}
              class="moa-card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span
                    class={[
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase ring-1",
                      colors.bg,
                      colors.text,
                      colors.ring,
                    ].join(" ")}
                  >
                    <LuStar class="h-3 w-3" />
                    Lapso {comp.lapso}
                  </span>
                  <h2 class="mt-2 text-lg font-bold text-slate-900">{comp.titulo}</h2>
                  <p class="mt-1 text-sm text-slate-500">
                    {comp.grado} · {comp.con_contenido}/{comp.total_lecciones}{" "}
                    lecciones con contenido
                  </p>
                </div>
                <span class="text-sm font-bold text-indigo-600">{pct}%</span>
              </div>
              <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  class={["h-full rounded-full bg-gradient-to-r", colors.gradient].join(
                    " ",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                Ver lecciones <LuArrowRight class="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
