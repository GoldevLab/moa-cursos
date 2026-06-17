import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuPenLine, LuPlus, LuTrash2 } from "@qwikest/icons/lucide";
import {
  createEscuela,
  deleteEscuela,
  listEscuelas,
  updateEscuela,
} from "~/lib/progress";
import { requireAdmin, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Escuelas | MOA Admin",
};

export const useEscuelasPage = routeLoader$(async () => {
  const escuelas = await listEscuelas();
  return { escuelas };
});

const createEscuelaAction = server$(async function (
  nombre: string,
  ciudad: string,
  direccion: string,
) {
  try {
    await requireAdmin(this);
    await createEscuela({ nombre, ciudad, direccion });
    const escuelas = await listEscuelas();
    return { ok: true as const, escuelas };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

const updateEscuelaAction = server$(async function (
  idEscuela: number,
  nombre: string,
  ciudad: string,
  direccion: string,
) {
  try {
    await requireAdmin(this);
    await updateEscuela(idEscuela, { nombre, ciudad, direccion });
    const escuelas = await listEscuelas();
    return { ok: true as const, escuelas };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

const deleteEscuelaAction = server$(async function (idEscuela: number) {
  try {
    await requireAdmin(this);
    const result = await deleteEscuela(idEscuela);
    if (!result.ok) return result;
    const escuelas = await listEscuelas();
    return { ok: true as const, escuelas };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    throw error;
  }
});

export default component$(() => {
  const data = useEscuelasPage();
  const escuelas = useSignal(data.value.escuelas);
  const nombre = useSignal("");
  const ciudad = useSignal("");
  const direccion = useSignal("");
  const message = useSignal("");
  const loading = useSignal(false);
  const editingId = useSignal<number | null>(null);
  const editNombre = useSignal("");
  const editCiudad = useSignal("");
  const editDireccion = useSignal("");

  const submitCreate = $(async () => {
    loading.value = true;
    message.value = "";
    try {
      const result = await createEscuelaAction(
        nombre.value,
        ciudad.value,
        direccion.value,
      );
      if (!result.ok) {
        message.value = "No tienes permiso para crear escuelas.";
        return;
      }
      escuelas.value = result.escuelas;
      nombre.value = "";
      ciudad.value = "";
      direccion.value = "";
      message.value = "Escuela creada.";
    } catch {
      message.value = "Error al crear la escuela.";
    } finally {
      loading.value = false;
    }
  });

  const startEdit = $((id: number, n: string, c: string, d: string) => {
    editingId.value = id;
    editNombre.value = n;
    editCiudad.value = c;
    editDireccion.value = d;
  });

  const submitEdit = $(async () => {
    if (editingId.value === null) return;
    loading.value = true;
    message.value = "";
    try {
      const result = await updateEscuelaAction(
        editingId.value,
        editNombre.value,
        editCiudad.value,
        editDireccion.value,
      );
      if (!result.ok) {
        message.value = "No tienes permiso para editar.";
        return;
      }
      escuelas.value = result.escuelas;
      editingId.value = null;
      message.value = "Escuela actualizada.";
    } catch {
      message.value = "Error al actualizar.";
    } finally {
      loading.value = false;
    }
  });

  const removeEscuela = $(async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la escuela "${name}"?`)) return;
    loading.value = true;
    message.value = "";
    try {
      const result = await deleteEscuelaAction(id);
      if (!result.ok) {
        message.value =
          result.reason === "in_use"
            ? "No se puede eliminar: tiene estudiantes o invitaciones asociadas."
            : result.reason === "forbidden"
              ? "No tienes permiso."
              : "Escuela no encontrada.";
        return;
      }
      escuelas.value = result.escuelas;
      message.value = "Escuela eliminada.";
    } catch {
      message.value = "Error al eliminar.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Escuelas</h1>
        <p class="mt-2 text-slate-600">
          Instituciones registradas en el sistema MOA.
        </p>
      </div>

      <form
        preventdefault:submit
        onSubmit$={submitCreate}
        class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
      >
        <h2 class="md:col-span-3 flex items-center gap-2 font-bold text-slate-900">
          <LuPlus class="h-5 w-5 text-emerald-600" />
          Nueva escuela
        </h2>
        <label class="block">
          <span class="text-sm font-medium">Nombre</span>
          <input
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={nombre.value}
            onInput$={(e) => {
              nombre.value = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Ciudad</span>
          <input
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={ciudad.value}
            onInput$={(e) => {
              ciudad.value = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Dirección</span>
          <input
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={direccion.value}
            onInput$={(e) => {
              direccion.value = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <div class="md:col-span-3">
          <button
            type="submit"
            disabled={loading.value}
            class="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading.value ? "Guardando..." : "Crear escuela"}
          </button>
        </div>
      </form>

      {message.value ? (
        <p class="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message.value}
        </p>
      ) : null}

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Ciudad</th>
              <th class="px-4 py-3">Dirección</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {escuelas.value.map((escuela) => (
              <tr key={escuela.id_escuela} class="border-t border-slate-100">
                {editingId.value === escuela.id_escuela ? (
                  <>
                    <td class="px-4 py-3">
                      <input
                        class="w-full rounded-lg border border-slate-200 px-2 py-1"
                        value={editNombre.value}
                        onInput$={(e) => {
                          editNombre.value = (e.target as HTMLInputElement).value;
                        }}
                      />
                    </td>
                    <td class="px-4 py-3">
                      <input
                        class="w-full rounded-lg border border-slate-200 px-2 py-1"
                        value={editCiudad.value}
                        onInput$={(e) => {
                          editCiudad.value = (e.target as HTMLInputElement).value;
                        }}
                      />
                    </td>
                    <td class="px-4 py-3">
                      <input
                        class="w-full rounded-lg border border-slate-200 px-2 py-1"
                        value={editDireccion.value}
                        onInput$={(e) => {
                          editDireccion.value = (e.target as HTMLInputElement).value;
                        }}
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        class="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                        onClick$={submitEdit}
                      >
                        Guardar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td class="px-4 py-3 font-medium">{escuela.nombre}</td>
                    <td class="px-4 py-3">{escuela.ciudad}</td>
                    <td class="px-4 py-3 text-slate-500">{escuela.direccion}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="inline-flex gap-2">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick$={() =>
                            startEdit(
                              escuela.id_escuela,
                              escuela.nombre,
                              escuela.ciudad,
                              escuela.direccion,
                            )
                          }
                        >
                          <LuPenLine class="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={loading.value}
                          class="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          onClick$={() =>
                            removeEscuela(escuela.id_escuela, escuela.nombre)
                          }
                        >
                          <LuTrash2 class="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
