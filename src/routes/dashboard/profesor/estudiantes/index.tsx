import { $, component$, useComputed$, useSignal } from "@builder.io/qwik";
import { Link, routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuDownload, LuSearch, LuUser, LuX } from "@qwikest/icons/lucide";
import { listGrados, listStudentsForProfessor, buildStudentsCsv } from "~/lib/progress";
import { requireProfesorOrAdmin, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Estudiantes | MOA Profesor",
};

export const useStudentsPage = routeLoader$(async () => {
  const [students, grados] = await Promise.all([
    listStudentsForProfessor(),
    listGrados(),
  ]);
  return { students, grados };
});

const exportCsvAction = server$(async function (idGrado: number | null) {
  try {
    await requireProfesorOrAdmin(this);
    const csv = await buildStudentsCsv(idGrado ?? undefined);
    return { ok: true as const, csv };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    throw error;
  }
});

export default component$(() => {
  const data = useStudentsPage();
  const filterQuery = useSignal("");
  const filterGrado = useSignal<number | "">("");
  const exporting = useSignal(false);

  const filtered = useComputed$(() => {
    const q = filterQuery.value.trim().toLowerCase();
    return data.value.students.filter((s) => {
      if (filterGrado.value && s.id_grado !== filterGrado.value) {
        return false;
      }
      if (!q) return true;
      const haystack = `${s.nombres} ${s.apellidos} ${s.username}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  const downloadCsv = $(async () => {
    exporting.value = true;
    try {
      const idGrado =
        filterGrado.value === "" ? null : Number(filterGrado.value);
      const result = await exportCsvAction(idGrado);
      if (!result.ok) return;

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moa-estudiantes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Estudiantes</h1>
          <p class="mt-2 text-slate-600">
            {data.value.students.length} estudiantes registrados en el campus.
          </p>
        </div>
        <button
          type="button"
          disabled={exporting.value}
          onClick$={downloadCsv}
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <LuDownload class="h-4 w-4" />
          {exporting.value ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <label class="block min-w-0 flex-1">
          <span class="text-xs font-semibold uppercase text-slate-500">Buscar</span>
          <div class="relative mt-1">
            <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4"
              placeholder="Nombre o usuario..."
              value={filterQuery.value}
              onInput$={(e) => {
                filterQuery.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
        </label>
        <label class="block w-full sm:w-44">
          <span class="text-xs font-semibold uppercase text-slate-500">Grado</span>
          <select
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={filterGrado.value}
            onChange$={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              filterGrado.value = v === "" ? "" : Number(v);
            }}
          >
            <option value="">Todos</option>
            {data.value.grados.map((g) => (
              <option key={g.id_grado} value={g.id_grado}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        {filterQuery.value || filterGrado.value ? (
          <button
            type="button"
            onClick$={() => {
              filterQuery.value = "";
              filterGrado.value = "";
            }}
            class="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            <LuX class="h-4 w-4" />
            Limpiar
          </button>
        ) : null}
      </div>

      <div class="space-y-3">
        {filtered.value.length === 0 ? (
          <p class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Ningún estudiante coincide con los filtros.
          </p>
        ) : (
          filtered.value.map((student) => {
            const pct =
              student.total_lecciones > 0
                ? Math.round(
                    (student.lecciones_completadas / student.total_lecciones) *
                      100,
                  )
                : 0;
            return (
              <Link
                key={student.id_estudiante}
                href={`/dashboard/profesor/estudiantes/${student.id_estudiante}/`}
                class="moa-card-hover flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div class="flex items-center gap-4">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <LuUser class="h-6 w-6" />
                  </div>
                  <div>
                    <p class="font-bold text-slate-900">
                      {student.nombres} {student.apellidos}
                    </p>
                    <p class="text-sm text-slate-500">
                      @{student.username} · {student.grado} · {student.escuela}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-4 text-sm">
                  <div class="text-right">
                    <p class="font-bold text-slate-900">
                      {student.puntos_totales} pts
                    </p>
                    <p class="text-slate-500">Racha {student.racha_actual}d</p>
                  </div>
                  <div class="min-w-[100px] text-right">
                    <p class="font-bold text-indigo-600">{pct}%</p>
                    <p class="text-xs text-slate-500">
                      {student.lecciones_completadas}/{student.total_lecciones}
                    </p>
                  </div>
                  {student.trofeos > 0 ? (
                    <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {student.trofeos} trofeo{student.trofeos === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
});
