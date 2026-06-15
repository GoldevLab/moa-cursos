import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { LuFlame, LuStar, LuTrophy } from "@qwikest/icons/lucide";
import { BreadcrumbTrail, LAPSO_COLORS, ScoreBar } from "~/components/student/student-ui";
import { MAX_POINTS_PER_LESSON } from "~/lib/constants";
import { getStudentProgressDetail } from "~/lib/progress";

export const useStudentDetail = routeLoader$(async (event) => {
  const idEstudiante = Number(event.params.idEstudiante);
  return getStudentProgressDetail(idEstudiante);
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useStudentDetail);
  if (!data) return { title: "Estudiante | MOA" };
  return { title: `${data.nombres} ${data.apellidos} | MOA` };
};

export default component$(() => {
  const data = useStudentDetail();

  if (!data.value) {
    return (
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p class="font-semibold text-amber-900">Estudiante no encontrado</p>
        <Link
          href="/dashboard/profesor/estudiantes/"
          class="mt-4 inline-block text-sm font-semibold text-amber-800 underline"
        >
          Volver a la lista
        </Link>
      </div>
    );
  }

  const student = data.value;
  const totalLecciones = student.competencias.reduce((s, c) => s + c.total, 0);
  const completadas = student.competencias.reduce((s, c) => s + c.completadas, 0);
  const maxPuntos = totalLecciones * MAX_POINTS_PER_LESSON;
  const trofeoCount = [
    student.trofeos.lapso1,
    student.trofeos.lapso2,
    student.trofeos.lapso3,
  ].filter(Boolean).length;

  return (
    <div class="space-y-8">
      <BreadcrumbTrail
        items={[
          { label: "Panel docente", href: "/dashboard/profesor/" },
          { label: "Estudiantes", href: "/dashboard/profesor/estudiantes/" },
          { label: `${student.nombres} ${student.apellidos}` },
        ]}
      />

      <section class="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 sm:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">
              {student.nombres} {student.apellidos}
            </h1>
            <p class="mt-1 text-slate-600">
              @{student.username} · {student.grado} · {student.escuela}
            </p>
            {student.ultima_actividad ? (
              <p class="mt-2 text-sm text-slate-500">
                Última actividad: {student.ultima_actividad}
              </p>
            ) : (
              <p class="mt-2 text-sm text-slate-500">Sin actividad registrada</p>
            )}
          </div>
          {trofeoCount > 0 ? (
            <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800">
              <LuTrophy class="h-4 w-4" />
              {trofeoCount} trofeo{trofeoCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase text-slate-500">Puntos</p>
            <p class="text-2xl font-bold text-slate-900">{student.puntos_totales}</p>
          </div>
          <div class="rounded-2xl bg-white/80 p-4">
            <p class="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
              <LuFlame class="h-3.5 w-3.5" /> Racha
            </p>
            <p class="text-2xl font-bold text-slate-900">
              {student.racha_actual}d
            </p>
            <p class="text-xs text-slate-500">Mejor: {student.mejor_racha}d</p>
          </div>
          <div class="rounded-2xl bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase text-slate-500">Lecciones</p>
            <p class="text-2xl font-bold text-slate-900">
              {completadas}/{totalLecciones}
            </p>
          </div>
        </div>

        <div class="mt-4">
          <ScoreBar
            score={student.puntos_totales}
            max={maxPuntos}
            label="Progreso de puntos"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Progreso por competencia</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          {student.competencias.map((comp) => {
            const colors = LAPSO_COLORS[comp.lapso] ?? LAPSO_COLORS[1];
            const pct =
              comp.total > 0 ? Math.round((comp.completadas / comp.total) * 100) : 0;
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
                  Lapso {comp.lapso}
                </span>
                <p class="mt-2 font-semibold text-slate-900">{comp.titulo}</p>
                <p class="text-xs text-slate-500">
                  {comp.completadas}/{comp.total} lecciones · {comp.puntos} pts
                </p>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class={["h-full rounded-full bg-gradient-to-r", colors.gradient].join(
                      " ",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Actividad reciente</h2>
        {student.actividad.length === 0 ? (
          <p class="mt-4 text-sm text-slate-500">Sin intentos registrados.</p>
        ) : (
          <ul class="mt-4 divide-y divide-slate-100">
            {student.actividad.map((item, i) => (
              <li
                key={`${item.fecha}-${i}`}
                class="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p class="font-medium text-slate-800">{item.leccion}</p>
                  <p class="text-slate-500">
                    {item.fecha.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-slate-900">{item.puntaje} pts</p>
                  <p
                    class={[
                      "text-xs font-semibold",
                      item.completada ? "text-emerald-600" : "text-amber-600",
                    ].join(" ")}
                  >
                    {item.completada ? "Completada" : "En curso"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
});
