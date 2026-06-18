import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  LuCheck,
  LuLock,
  LuPlay,
  LuRotateCcw,
} from "@qwikest/icons/lucide";
import {
  BreadcrumbTrail,
  LAPSO_COLORS,
} from "~/components/student/student-ui";
import { NavLink } from "~/components/ui/nav-link";
import { MAX_POINTS_PER_LESSON } from "~/lib/constants";
import { getCurrentUsuario } from "~/lib/auth";
import {
  getEstudianteByUsuarioId,
  getLeccionesForCompetencia,
  isCompetenciaUnlocked,
} from "~/lib/progress";
import { routes } from "~/lib/routes";
import { getDbClient, rowInt, rowStr } from "~/lib/db";
import { ensureMoaSchema } from "~/lib/schema";

export const useCompetenciaPage = routeLoader$(async (event) => {
  await ensureMoaSchema();
  const idCompetencia = Number(event.params.idCompetencia);
  const user = await getCurrentUsuario(event);
  if (!user || user.rol !== "estudiante") return null;

  const perfil = await getEstudianteByUsuarioId(user.id_usuario);
  if (!perfil) return null;

  const client = getDbClient();
  const compRes = await client.execute({
    sql: "SELECT titulo, lapso, orden, id_grado FROM competencia WHERE id_competencia = ? LIMIT 1",
    args: [idCompetencia],
  });
  const comp = compRes.rows[0];
  if (!comp) return null;

  if (rowInt(comp.id_grado) !== perfil.id_gradoactual) {
    return { forbidden: true as const };
  }

  const competenciaDesbloqueada = await isCompetenciaUnlocked(
    perfil.id_estudiante,
    idCompetencia,
  );
  if (!competenciaDesbloqueada) {
    return { locked: true as const };
  }

  const lecciones = await getLeccionesForCompetencia(
    perfil.id_estudiante,
    idCompetencia,
  );

  const lessonUnlocks = await Promise.all(
    lecciones.map(async (lesson, index) => {
      if (index === 0) return true;
      return lecciones[index - 1]?.completada ?? false;
    }),
  );

  const totalPts = lecciones.reduce((sum, l) => sum + l.puntaje_total, 0);
  const maxPts = lecciones.length * MAX_POINTS_PER_LESSON;
  const completadas = lecciones.filter((l) => l.completada).length;

  return {
    competencia: {
      id_competencia: idCompetencia,
      titulo: rowStr(comp.titulo),
      lapso: Number(comp.lapso),
      orden: Number(comp.orden),
    },
    lecciones: lecciones.map((lesson, index) => ({
      ...lesson,
      unlocked: lessonUnlocks[index],
    })),
    stats: { totalPts, maxPts, completadas, total: lecciones.length },
  };
});

const LAPSO_ISLAND: Record<
  number,
  { emoji: string; gradient: string; subtitle: string }
> = {
  1: {
    emoji: "🏝️",
    gradient: "from-sky-500 via-cyan-500 to-teal-500",
    subtitle: "Isla del descubrimiento",
  },
  2: {
    emoji: "🌋",
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    subtitle: "Volcán del reto",
  },
  3: {
    emoji: "🏆",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    subtitle: "Camino al trofeo",
  },
};

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useCompetenciaPage);
  if (!data || "forbidden" in data || "locked" in data) {
    return { title: "Competencia | MOA" };
  }
  return {
    title: `${data.competencia.titulo} | MOA`,
  };
};

export default component$(() => {
  const data = useCompetenciaPage();
  if (!data.value) {
    return <p class="text-slate-600">Competencia no encontrada.</p>;
  }

  if ("forbidden" in data.value && data.value.forbidden) {
    return (
      <div class="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
        <p class="text-lg font-semibold">Competencia no disponible</p>
        <p class="mt-2 text-sm">
          Esta competencia no pertenece a tu grado actual.
        </p>
        <NavLink
          href={routes.estudiante.campus}
          class="mt-6 inline-flex rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </NavLink>
      </div>
    );
  }

  if ("locked" in data.value && data.value.locked) {
    return (
      <div class="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-700">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
          <LuLock class="h-6 w-6" />
        </div>
        <p class="mt-4 text-lg font-semibold text-slate-900">Competencia bloqueada</p>
        <p class="mt-2 text-sm">
          Debes completar todas las lecciones de la competencia anterior para
          desbloquear esta.
        </p>
        <NavLink
          href={routes.estudiante.campus}
          class="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </NavLink>
      </div>
    );
  }

  const { competencia, lecciones, stats } = data.value;
  const colors = LAPSO_COLORS[competencia.lapso] ?? LAPSO_COLORS[1];
  const island = LAPSO_ISLAND[competencia.lapso] ?? LAPSO_ISLAND[1];
  const pctComp =
    stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;

  return (
    <div class="space-y-8 moa-fade-up">
      <BreadcrumbTrail
        items={[
          { label: "Mi campus", href: routes.estudiante.campus },
          { label: competencia.titulo },
        ]}
      />

      <section
        class={[
          "relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8",
          `bg-gradient-to-br ${island.gradient}`,
        ].join(" ")}
      >
        <div class="pointer-events-none absolute -right-10 -top-10 text-[8rem] opacity-20">
          {island.emoji}
        </div>
        <div class="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div class="relative flex flex-wrap items-start justify-between gap-6">
          <div class="min-w-0">
            <p class="text-sm font-bold uppercase tracking-wide text-white/80">
              {island.subtitle} · Lapso {competencia.lapso}
            </p>
            <h1 class="mt-2 text-3xl font-black sm:text-4xl">
              {competencia.titulo}
            </h1>
            <p class="mt-3 max-w-lg text-white/90">
              {stats.completadas}/{stats.total} lecciones completadas ·{" "}
              {pctComp}% de la isla explorada
            </p>
          </div>
          <div class="flex flex-col items-center gap-2">
            <span class="text-6xl drop-shadow-lg">{island.emoji}</span>
            <span class="rounded-full bg-white/20 px-3 py-1 text-sm font-black backdrop-blur">
              {pctComp}%
            </span>
          </div>
        </div>

        <div class="relative mt-6">
          <div class="mb-2 flex justify-between text-sm font-bold text-white/90">
            <span>Puntos de la competencia</span>
            <span>{stats.totalPts}/{stats.maxPts}</span>
          </div>
          <div class="h-4 overflow-hidden rounded-full bg-white/20 ring-1 ring-white/30">
            <div
              class="h-full rounded-full bg-white/90 transition-all duration-700"
              style={{
                width: `${
                  stats.maxPts > 0
                    ? Math.round((stats.totalPts / stats.maxPts) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </section>

      <div class="relative space-y-0">
        {lecciones.map((lesson, index) => {
          const isLast = index === lecciones.length - 1;
          const pct = Math.round(
            (lesson.puntaje_total / MAX_POINTS_PER_LESSON) * 100,
          );

          return (
            <div key={lesson.id_leccion} class="relative flex gap-4 sm:gap-6">
              {!isLast ? (
                <div
                  class={[
                    "absolute left-[1.65rem] top-14 hidden h-[calc(100%-2rem)] w-0.5 sm:block",
                    lesson.completada ? "bg-emerald-300" : "bg-slate-200",
                  ].join(" ")}
                />
              ) : null}

              <div class="relative z-10 flex flex-col items-center pt-1">
                <div
                  class={[
                    "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ring-4 ring-white",
                    lesson.completada
                      ? "bg-emerald-500 text-white"
                      : lesson.unlocked
                        ? `bg-gradient-to-br ${colors.gradient} text-white`
                        : "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {lesson.completada ? (
                    <LuCheck class="h-5 w-5" />
                  ) : lesson.unlocked ? (
                    lesson.orden
                  ) : (
                    <LuLock class="h-4 w-4" />
                  )}
                </div>
              </div>

              <article
                class={[
                  "mb-4 flex-1 rounded-2xl border p-5 transition",
                  lesson.unlocked
                    ? "border-slate-200/80 bg-white/90 shadow-sm hover:border-indigo-200 hover:shadow-md"
                    : "border-slate-100 bg-slate-50/80 opacity-80",
                ].join(" ")}
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-bold text-slate-900">
                      {lesson.titulo}
                    </h2>
                    <p class="mt-1 text-sm text-slate-500">
                      Lección {lesson.orden} · {lesson.puntaje_total}/
                      {MAX_POINTS_PER_LESSON} pts
                    </p>
                  </div>

                  {lesson.unlocked ? (
                    <NavLink
                      href={routes.estudiante.leccion(lesson.id_leccion)}
                      class={[
                        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105",
                        lesson.completada
                          ? "bg-slate-700"
                          : `bg-gradient-to-r ${colors.gradient}`,
                      ].join(" ")}
                    >
                      {lesson.completada ? (
                        <>
                          <LuRotateCcw class="h-4 w-4" />
                          Repasar
                        </>
                      ) : (
                        <>
                          <LuPlay class="h-4 w-4" />
                          Empezar
                        </>
                      )}
                    </NavLink>
                  ) : (
                    <span class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500">
                      <LuLock class="h-4 w-4" />
                      Bloqueada
                    </span>
                  )}
                </div>

                <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class={[
                      "h-full rounded-full transition-all duration-500",
                      lesson.completada
                        ? "bg-emerald-500"
                        : `bg-gradient-to-r ${colors.gradient}`,
                    ].join(" ")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
});
