import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  LuCheck,
  LuLock,
  LuPlay,
  LuRotateCcw,
  LuStar,
} from "@qwikest/icons/lucide";
import {
  BreadcrumbTrail,
  LAPSO_COLORS,
  ScoreBar,
} from "~/components/student/student-ui";
import { MAX_POINTS_PER_LESSON } from "~/lib/constants";
import { getCurrentUsuario } from "~/lib/auth";
import {
  getEstudianteByUsuarioId,
  getLeccionesForCompetencia,
  isCompetenciaUnlocked,
} from "~/lib/progress";
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
        <Link
          href="/dashboard/estudiante/"
          class="mt-6 inline-flex rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </Link>
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
        <Link
          href="/dashboard/estudiante/"
          class="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al campus
        </Link>
      </div>
    );
  }

  const { competencia, lecciones, stats } = data.value;
  const colors = LAPSO_COLORS[competencia.lapso] ?? LAPSO_COLORS[1];

  return (
    <div class="space-y-8 moa-fade-up">
      <BreadcrumbTrail
        items={[
          { label: "Mi campus", href: "/dashboard/estudiante/" },
          { label: competencia.titulo },
        ]}
      />

      <section class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              class={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1",
                colors.bg,
                colors.text,
                colors.ring,
              ].join(" ")}
            >
              <LuStar class="h-3.5 w-3.5" />
              Lapso {competencia.lapso}
            </span>
            <h1 class="mt-3 text-3xl font-bold text-slate-900">
              {competencia.titulo}
            </h1>
            <p class="mt-2 text-slate-600">
              {stats.completadas}/{stats.total} lecciones completadas en esta
              competencia
            </p>
          </div>
          <div class="min-w-[200px] flex-1 sm:max-w-xs">
            <ScoreBar
              label="Puntos de la competencia"
              score={stats.totalPts}
              max={stats.maxPts}
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
                    <Link
                      href={`/dashboard/estudiante/leccion/${lesson.id_leccion}/`}
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
                    </Link>
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
