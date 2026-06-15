import { $, component$ } from "@builder.io/qwik";
import { Link, routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import {
  LuActivity,
  LuDownload,
  LuFlame,
  LuStar,
  LuTrophy,
  LuUsers,
} from "@qwikest/icons/lucide";
import { LAPSO_COLORS } from "~/components/student/student-ui";
import { buildStudentsCsv, getProfessorStats } from "~/lib/progress";
import { requireProfesorOrAdmin, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Estadísticas | MOA Profesor",
};

export const useProfessorStats = routeLoader$(async () => getProfessorStats());

const exportCsvAction = server$(async function () {
  try {
    await requireProfesorOrAdmin(this);
    const csv = await buildStudentsCsv();
    return { ok: true as const, csv };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const };
    }
    throw error;
  }
});

export default component$(() => {
  const stats = useProfessorStats();

  const downloadCsv = $(async () => {
    const result = await exportCsvAction();
    if (!result.ok) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moa-reporte-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  return (
    <div class="space-y-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Estadísticas del campus</h1>
          <p class="mt-2 text-slate-600">
            Progreso agregado de todos los estudiantes registrados.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Link
            href="/dashboard/profesor/estudiantes/"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <LuUsers class="h-4 w-4" />
            Ver estudiantes
          </Link>
          <button
            type="button"
            onClick$={downloadCsv}
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <LuDownload class="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/profesor/estudiantes/"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200"
        >
          <p class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            <LuUsers class="h-4 w-4" /> Estudiantes
          </p>
          <p class="mt-2 text-3xl font-bold text-slate-900">
            {stats.value.total_estudiantes}
          </p>
          <p class="text-sm text-slate-500">
            {stats.value.estudiantes_activos} con actividad
          </p>
        </Link>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            <LuActivity class="h-4 w-4" /> Lecciones completadas
          </p>
          <p class="mt-2 text-3xl font-bold text-slate-900">
            {stats.value.lecciones_completadas}
          </p>
          <p class="text-sm text-slate-500">
            de {stats.value.total_lecciones * stats.value.total_estudiantes} posibles
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            <LuTrophy class="h-4 w-4" /> Tasa de completado
          </p>
          <p class="mt-2 text-3xl font-bold text-slate-900">
            {stats.value.tasa_completado}%
          </p>
        </div>
        <Link
          href="/dashboard/profesor/contenido/"
          class="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm transition hover:border-violet-300"
        >
          <p class="text-xs font-semibold uppercase text-violet-600">Contenido</p>
          <p class="mt-2 text-lg font-bold text-violet-900">Editar lecciones</p>
          <p class="text-sm text-violet-700">Ir al editor →</p>
        </Link>
      </div>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="font-bold text-slate-900">Top estudiantes por puntos</h2>
          <ul class="mt-4 space-y-3">
            {stats.value.top_students.length === 0 ? (
              <li class="text-sm text-slate-500">Aún no hay datos de progreso.</li>
            ) : (
              stats.value.top_students.map((student, i) => (
                <li key={student.username}>
                  <Link
                    href={`/dashboard/profesor/estudiantes/${student.id_estudiante}/`}
                    class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-violet-50"
                  >
                    <div class="flex items-center gap-3">
                      <span class="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p class="font-medium text-slate-900">
                          {student.nombres} {student.apellidos}
                        </p>
                        <p class="text-xs text-slate-500">
                          @{student.username} · {student.grado}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-bold text-slate-900">{student.puntos_totales} pts</p>
                      <p class="inline-flex items-center gap-0.5 text-xs text-orange-600">
                        <LuFlame class="h-3 w-3" />
                        {student.racha_actual}d
                      </p>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="font-bold text-slate-900">Actividad reciente</h2>
          <ul class="mt-4 space-y-2">
            {stats.value.actividad_reciente.length === 0 ? (
              <li class="text-sm text-slate-500">Sin intentos registrados.</li>
            ) : (
              stats.value.actividad_reciente.map((item, i) => (
                <li
                  key={`${item.fecha}-${i}`}
                  class="rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
                >
                  <p class="font-medium text-slate-800">
                    {item.nombres} {item.apellidos}
                  </p>
                  <p class="text-slate-500">
                    {item.leccion} · {item.puntaje} pts ·{" "}
                    {item.fecha.slice(0, 16).replace("T", " ")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Progreso por competencia</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.value.competencias.map((comp) => {
            const colors = LAPSO_COLORS[comp.lapso] ?? LAPSO_COLORS[1];
            return (
              <div
                key={comp.id_competencia}
                class="rounded-xl border border-slate-100 p-4"
              >
                <span
                  class={[
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                    colors.bg,
                    colors.text,
                  ].join(" ")}
                >
                  <LuStar class="h-3 w-3" />
                  L{comp.lapso}
                </span>
                <p class="mt-2 font-semibold text-slate-900">{comp.titulo}</p>
                <p class="text-xs text-slate-500">
                  {comp.completadas} completadas · {comp.tasa}%
                </p>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class={["h-full rounded-full bg-gradient-to-r", colors.gradient].join(
                      " ",
                    )}
                    style={{ width: `${comp.tasa}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
});
