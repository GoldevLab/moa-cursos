import { $, component$, useSignal } from "@builder.io/qwik";
import { Link, routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuCheck, LuPenLine } from "@qwikest/icons/lucide";
import { BreadcrumbTrail } from "~/components/student/student-ui";
import { getDbClient, rowInt, rowStr } from "~/lib/db";
import {
  listLeccionesWithContent,
  updateCompetenciaTitle,
  updateLessonTitle,
} from "~/lib/lesson-content";
import { ensureMoaSchema } from "~/lib/schema";
import { requireProfesorOrAdmin, ServerAuthError } from "~/lib/server-auth";

export const useCompetenciaContenido = routeLoader$(async (event) => {
  await ensureMoaSchema();
  const idCompetencia = Number(event.params.idCompetencia);
  const client = getDbClient();
  const compRes = await client.execute({
    sql: `SELECT c.titulo, c.lapso, g.nombre AS grado
          FROM competencia c
          JOIN grado g ON g.id_grado = c.id_grado
          WHERE c.id_competencia = ? LIMIT 1`,
    args: [idCompetencia],
  });
  const comp = compRes.rows[0];
  if (!comp) return null;

  const lecciones = await listLeccionesWithContent(idCompetencia);
  return {
    competencia: {
      id_competencia: idCompetencia,
      titulo: rowStr(comp.titulo),
      lapso: rowInt(comp.lapso),
      grado: rowStr(comp.grado),
    },
    lecciones,
  };
});

const saveCompetenciaTitleAction = server$(
  async function (idCompetencia: number, titulo: string) {
    try {
      await requireProfesorOrAdmin(this);
      await updateCompetenciaTitle(idCompetencia, titulo);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ServerAuthError) {
        return { ok: false as const, reason: error.code };
      }
      throw error;
    }
  },
);

const saveLessonTitleAction = server$(
  async function (idLeccion: number, titulo: string) {
    try {
      await requireProfesorOrAdmin(this);
      await updateLessonTitle(idLeccion, titulo);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ServerAuthError) {
        return { ok: false as const, reason: error.code };
      }
      throw error;
    }
  },
);

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useCompetenciaContenido);
  return {
    title: data ? `${data.competencia.titulo} | Editor` : "Editor | MOA",
  };
};

export default component$(() => {
  const data = useCompetenciaContenido();
  const message = useSignal("");
  const messageOk = useSignal(true);
  const saving = useSignal(false);
  const tituloCompetencia = useSignal(data.value?.competencia.titulo ?? "");
  const titulosLeccion = useSignal(
    data.value?.lecciones.map((lesson) => ({
      id: lesson.id_leccion,
      titulo: lesson.titulo,
    })) ?? [],
  );

  if (!data.value) {
    return <p class="text-slate-600">Competencia no encontrada.</p>;
  }

  const { competencia, lecciones } = data.value;

  const saveTitles = $(async () => {
    saving.value = true;
    message.value = "";
    try {
      const compResult = await saveCompetenciaTitleAction(
        competencia.id_competencia,
        tituloCompetencia.value,
      );
      if (!compResult.ok) {
        messageOk.value = false;
        message.value = "No tienes permiso para guardar el título.";
        return;
      }

      for (const item of titulosLeccion.value) {
        const lessonResult = await saveLessonTitleAction(item.id, item.titulo);
        if (!lessonResult.ok) {
          messageOk.value = false;
          message.value = "No tienes permiso para guardar los títulos.";
          return;
        }
      }

      messageOk.value = true;
      message.value = "Títulos guardados correctamente.";
      await data.reload();
    } catch {
      messageOk.value = false;
      message.value = "Error al guardar. Intenta de nuevo.";
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <BreadcrumbTrail
        items={[
          { label: "Panel docente", href: "/dashboard/profesor/" },
          { label: "Contenido", href: "/dashboard/profesor/contenido/" },
          { label: competencia.titulo },
        ]}
      />

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0 flex-1">
          <label class="block">
            <span class="text-sm font-medium text-slate-600">
              Título de la competencia
            </span>
            <input
              class="mt-1 w-full max-w-xl rounded-xl border border-slate-200 px-4 py-2 text-2xl font-bold text-slate-900"
              value={tituloCompetencia.value}
              onInput$={(e) => {
                tituloCompetencia.value = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <p class="mt-2 text-sm text-slate-500">
            {competencia.grado} · Lapso {competencia.lapso}
          </p>
        </div>
        <button
          type="button"
          disabled={saving.value}
          onClick$={saveTitles}
          class="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {saving.value ? "Guardando..." : "Guardar títulos"}
        </button>
      </div>

      {message.value ? (
        <p
          class={[
            "rounded-xl px-4 py-3 text-sm",
            messageOk.value
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {message.value}
        </p>
      ) : null}

      <div class="space-y-3">
        {lecciones.map((lesson, index) => (
          <article
            key={lesson.id_leccion}
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="min-w-0 flex-1">
              <label class="block">
                <span class="text-xs font-medium text-slate-500">
                  Lección {lesson.orden}
                </span>
                <input
                  class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-900"
                  value={titulosLeccion.value[index]?.titulo ?? lesson.titulo}
                  onInput$={(e) => {
                    const next = [...titulosLeccion.value];
                    next[index] = {
                      ...next[index],
                      titulo: (e.target as HTMLInputElement).value,
                    };
                    titulosLeccion.value = next;
                  }}
                />
              </label>
              <p class="mt-1 text-sm text-slate-500">
                {lesson.actualizado_en
                  ? `Actualizada ${lesson.actualizado_en.slice(0, 10)}`
                  : "Sin fecha de actualización"}
              </p>
            </div>
            <div class="flex items-center gap-3">
              {lesson.tiene_contenido ? (
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <LuCheck class="h-3.5 w-3.5" />
                  Publicado
                </span>
              ) : (
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Sin contenido
                </span>
              )}
              <Link
                href={`/dashboard/profesor/contenido/leccion/${lesson.id_leccion}/`}
                class="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                <LuPenLine class="h-4 w-4" />
                Editar
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});
