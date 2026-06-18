import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  LuArrowRight,
  LuFlame,
  LuLock,
  LuPlay,
  LuStar,
  LuTarget,
  LuTrophy,
  LuZap,
} from "@qwikest/icons/lucide";
import { LAPSO_COLORS } from "~/components/student/student-ui";
import { CampusJourneyMap } from "~/components/student/campus-journey";
import { NavLink } from "~/components/ui/nav-link";
import { routes } from "~/lib/routes";
import { getCurrentUsuario } from "~/lib/auth";
import {
  getEstudianteByUsuarioId,
  getContinueLesson,
  getStudentDashboard,
} from "~/lib/progress";

export const head: DocumentHead = {
  title: "Mi campus | MOA",
};

export const useStudentDashboard = routeLoader$(async (event) => {
  const user = await getCurrentUsuario(event);
  if (!user || user.rol !== "estudiante") return null;

  const perfil = await getEstudianteByUsuarioId(user.id_usuario);
  if (!perfil) return null;

  const dashboard = await getStudentDashboard(perfil.id_estudiante);
  const continuar = await getContinueLesson(perfil.id_estudiante);
  return { user, perfil, dashboard, continuar };
});

export default component$(() => {
  const data = useStudentDashboard();

  if (!data.value) {
    return (
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        No se encontró el perfil de estudiante para esta cuenta.
      </div>
    );
  }

  const { user, perfil, dashboard, continuar } = data.value;
  const lapsos = [1, 2, 3] as const;
  const totalLecciones = dashboard?.total_lecciones ?? 0;
  const leccionesCompletadas = dashboard?.lecciones_completadas ?? 0;
  const progresoGlobal =
    totalLecciones > 0
      ? Math.round((leccionesCompletadas / totalLecciones) * 100)
      : 0;
  const trofeos = [
    perfil.trofeo_lapso1,
    perfil.trofeo_lapso2,
    perfil.trofeo_lapso3,
  ].filter((t) => t === 1).length;

  return (
    <div class="space-y-8 moa-fade-up">
      <section class="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
        <div class="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div class="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />

        <div class="relative">
          <p class="text-sm font-medium text-indigo-100">
            {perfil.escuela_nombre} · {perfil.grado_nombre}
          </p>
          <h1 class="mt-1 text-3xl font-bold sm:text-4xl">
            ¡Hola, {user.nombres}!
          </h1>
          <p class="mt-2 max-w-xl text-indigo-100">
            Sigue tu ruta de aprendizaje: Presentación, Práctica y Uso en cada
            lección. Tu progreso nunca retrocede.
          </p>

          {trofeos > 0 ? (
            <p class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-100">
              <LuTrophy class="h-4 w-4" />
              {trofeos} trofeo{trofeos === 1 ? "" : "s"} de lapso
            </p>
          ) : null}

          <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p class="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-indigo-100">
                <LuZap class="h-4 w-4" /> Puntos
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums">
                {dashboard?.puntos_totales ?? 0}
              </p>
            </div>
            <div class="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p class="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-indigo-100">
                <LuFlame class="h-4 w-4" /> Racha
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums">
                {dashboard?.racha_actual ?? 0} días
              </p>
            </div>
            <div class="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p class="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-indigo-100">
                <LuTrophy class="h-4 w-4" /> Mejor racha
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums">
                {dashboard?.mejor_racha ?? 0}
              </p>
            </div>
            <div class="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p class="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-indigo-100">
                <LuTarget class="h-4 w-4" /> Lecciones completadas
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums">
                {leccionesCompletadas}/{totalLecciones}
              </p>
              <p class="text-xs text-indigo-100">{progresoGlobal}% del curso</p>
            </div>
          </div>
        </div>
      </section>

      {dashboard?.competencias.length ? (
        <CampusJourneyMap
          lapsos={lapsos}
          competencias={dashboard.competencias}
          trofeos={{
            lapso1: perfil.trofeo_lapso1 === 1,
            lapso2: perfil.trofeo_lapso2 === 1,
            lapso3: perfil.trofeo_lapso3 === 1,
          }}
        />
      ) : null}

      {continuar ? (
        <NavLink
          href={routes.estudiante.leccion(continuar.id_leccion)}
          class="moa-card-hover flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 shadow-sm"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-indigo-600">
              Continuar donde quedaste
            </p>
            <p class="mt-1 text-lg font-bold text-slate-900">{continuar.titulo}</p>
            <p class="text-sm text-slate-600">{continuar.competencia}</p>
          </div>
          <span class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
            <LuPlay class="h-4 w-4" />
            Seguir lección
          </span>
        </NavLink>
      ) : null}

      {lapsos.map((lapso) => {
        const items =
          dashboard?.competencias.filter((c) => c.lapso === lapso) ?? [];
        if (items.length === 0) return null;

        const colors = LAPSO_COLORS[lapso] ?? LAPSO_COLORS[1];

        return (
          <section key={lapso} class="space-y-4">
            <div class="flex items-center gap-3">
              <span
                class={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1",
                  colors.bg,
                  colors.text,
                  colors.ring,
                ].join(" ")}
              >
                <LuStar class="h-3.5 w-3.5" />
                Lapso {lapso}
                {lapso === 1 && perfil.trofeo_lapso1 ? (
                  <LuTrophy class="h-3.5 w-3.5 text-amber-500" />
                ) : null}
                {lapso === 2 && perfil.trofeo_lapso2 ? (
                  <LuTrophy class="h-3.5 w-3.5 text-amber-500" />
                ) : null}
                {lapso === 3 && perfil.trofeo_lapso3 ? (
                  <LuTrophy class="h-3.5 w-3.5 text-amber-500" />
                ) : null}
              </span>
              <p class="text-sm text-slate-500">
                {items.filter((c) => c.completada).length}/{items.length}{" "}
                competencias completadas
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              {items.map((comp) => {
                const pct =
                  comp.total_lecciones > 0
                    ? Math.round(
                        (comp.lecciones_completadas / comp.total_lecciones) *
                          100,
                      )
                    : 0;
                return comp.desbloqueada ? (
                  <NavLink
                    key={comp.id_competencia}
                    href={routes.estudiante.competencia(comp.id_competencia)}
                    class="moa-card-hover group flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <h2 class="text-lg font-bold text-slate-900 group-hover:text-indigo-700">
                          {comp.titulo}
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                          {comp.lecciones_completadas}/{comp.total_lecciones}{" "}
                          lecciones · {comp.puntos_competencia} pts
                        </p>
                      </div>
                      <div
                        class={[
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-md",
                          colors.gradient,
                        ].join(" ")}
                      >
                        {pct}%
                      </div>
                    </div>

                    <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class={[
                          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                          colors.gradient,
                        ].join(" ")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div class="mt-4 flex items-center justify-between">
                      <span
                        class={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          comp.completada
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-50 text-indigo-700",
                        ].join(" ")}
                      >
                        {comp.completada ? "Completada" : "En curso"}
                      </span>
                      <span class="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                        Continuar
                        <LuArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </NavLink>
                ) : (
                  <div
                    key={comp.id_competencia}
                    class="flex flex-col rounded-2xl border border-slate-200/60 bg-slate-50/80 p-5 opacity-90"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <h2 class="text-lg font-bold text-slate-500">{comp.titulo}</h2>
                        <p class="mt-1 text-sm text-slate-400">
                          {comp.lecciones_completadas}/{comp.total_lecciones}{" "}
                          lecciones · {comp.puntos_competencia} pts
                        </p>
                      </div>
                      <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                        <LuLock class="h-5 w-5" />
                      </div>
                    </div>

                    <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-slate-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div class="mt-4 flex items-center justify-between">
                      <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Bloqueada
                      </span>
                      <span class="text-sm text-slate-400">
                        Completa la competencia anterior
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
});
