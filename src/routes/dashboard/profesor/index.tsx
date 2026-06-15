import { $, component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { LuArrowRight, LuBarChart3, LuBookOpen, LuPenLine, LuUsers } from "@qwikest/icons/lucide";
import { listCompetenciasWithLessons } from "~/lib/lesson-content";
import { getProfessorStats } from "~/lib/progress";

export const head: DocumentHead = {
  title: "Panel docente | MOA",
};

export const useProfesorDashboard = routeLoader$(async () => {
  const [competencias, stats] = await Promise.all([
    listCompetenciasWithLessons(),
    getProfessorStats(),
  ]);
  const totalLecciones = competencias.reduce((s, c) => s + c.total_lecciones, 0);
  const conContenido = competencias.reduce((s, c) => s + c.con_contenido, 0);
  return { competencias, totalLecciones, conContenido, stats };
});

export default component$(() => {
  const data = useProfesorDashboard();

  return (
    <div class="space-y-6">
      <section class="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
        <h1 class="text-3xl font-bold text-slate-900">Panel docente</h1>
        <p class="mt-2 text-slate-600">
          Gestiona el contenido educativo de las 128 lecciones. Los cambios se
          guardan en la base de datos y los estudiantes los ven al instante.
        </p>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl bg-violet-50 p-4">
            <p class="text-xs font-semibold uppercase text-violet-600">Lecciones</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {data.value.totalLecciones}
            </p>
          </div>
          <div class="rounded-2xl bg-indigo-50 p-4">
            <p class="text-xs font-semibold uppercase text-indigo-600">Con contenido</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {data.value.conContenido}
            </p>
          </div>
          <div class="rounded-2xl bg-emerald-50 p-4">
            <p class="text-xs font-semibold uppercase text-emerald-600">Competencias</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {data.value.competencias.length}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/profesor/contenido/"
          class="moa-card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <LuBookOpen class="h-8 w-8 text-violet-600" />
          <h2 class="mt-3 font-bold text-slate-900">Explorar contenido</h2>
          <p class="mt-2 text-sm text-slate-600">
            Ver competencias y editar lecciones por lapso.
          </p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600">
            Ir al editor <LuArrowRight class="h-4 w-4" />
          </span>
        </Link>
        <Link
          href="/dashboard/profesor/estadisticas/"
          class="moa-card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <LuBarChart3 class="h-8 w-8 text-sky-600" />
          <h2 class="mt-3 font-bold text-slate-900">Estadísticas</h2>
          <p class="mt-2 text-sm text-slate-600">
            {data.value.stats.estudiantes_activos} activos ·{" "}
            {data.value.stats.tasa_completado}% completado
          </p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
            Ver reportes <LuArrowRight class="h-4 w-4" />
          </span>
        </Link>
        <Link
          href="/dashboard/profesor/estudiantes/"
          class="moa-card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <LuUsers class="h-8 w-8 text-emerald-600" />
          <h2 class="mt-3 font-bold text-slate-900">Estudiantes</h2>
          <p class="mt-2 text-sm text-slate-600">
            {data.value.stats.total_estudiantes} registrados · progreso individual
          </p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
            Ver lista <LuArrowRight class="h-4 w-4" />
          </span>
        </Link>
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <LuPenLine class="h-8 w-8 text-indigo-600" />
          <h2 class="mt-3 font-bold text-slate-900">Cómo editar</h2>
          <ol class="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. Elige una competencia</li>
            <li>2. Abre la lección que quieras modificar</li>
            <li>3. Edita vocabulario, preguntas y opciones</li>
            <li>4. Guarda — los estudiantes verán el contenido actualizado</li>
          </ol>
        </article>
      </section>
    </div>
  );
});
