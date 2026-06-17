import { $, component$, useComputed$, useSignal } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuSearch, LuTrash2, LuX } from "@qwikest/icons/lucide";
import { listGrados, listEscuelas } from "~/lib/progress";
import {
  addWhitelistEntry,
  deleteWhitelistEntry,
  listWhitelistEntries,
} from "~/lib/whitelist";
import { requireAdmin, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Lista blanca | MOA Admin",
};

export const useWhitelistPage = routeLoader$(async () => {
  const [entries, grados, escuelas] = await Promise.all([
    listWhitelistEntries(),
    listGrados(),
    listEscuelas(),
  ]);
  return { entries, grados, escuelas };
});

const addEntryAction = server$(async function (
  nombres: string,
  apellidos: string,
  rol: "estudiante" | "profesor" | "admin",
  idGrado: number | null,
  idEscuela: number,
) {
  try {
    await requireAdmin(this);
    const result = await addWhitelistEntry({
      nombres,
      apellidos,
      rol_asignado: rol,
      id_escuela: idEscuela,
      id_gradoactual: idGrado,
    });
    if (!result.ok) return result;
    const entries = await listWhitelistEntries();
    return { ok: true as const, entries };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    console.error("[lista-blanca] addEntryAction failed:", error);
    return { ok: false as const, reason: "db_error" as const };
  }
});

const deleteEntryAction = server$(async function (id: number) {
  try {
    await requireAdmin(this);
    const result = await deleteWhitelistEntry(id);
    if (!result.ok) return result;
    const entries = await listWhitelistEntries();
    return { ok: true as const, entries };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    console.error("[lista-blanca] deleteEntryAction failed:", error);
    return { ok: false as const, reason: "db_error" as const };
  }
});

const addEntryMessages: Record<string, string> = {
  duplicate_pending: "Esa persona ya tiene una invitación pendiente.",
  already_registered: "Esa persona ya activó su cuenta.",
  db_error: "No se pudo guardar en la base de datos. Intenta de nuevo.",
  forbidden: "No tienes permiso para esta acción.",
};

const deleteEntryMessages: Record<string, string> = {
  not_found: "La invitación ya no existe.",
  already_registered: "No se puede eliminar una cuenta ya activada.",
  db_error: "No se pudo eliminar la invitación.",
  forbidden: "No tienes permiso para esta acción.",
};

export default component$(() => {
  const data = useWhitelistPage();
  const entries = useSignal(data.value.entries);
  const nombres = useSignal("");
  const apellidos = useSignal("");
  const rol = useSignal<"estudiante" | "profesor" | "admin">("estudiante");
  const idGrado = useSignal(1);
  const idEscuela = useSignal(1);
  const message = useSignal("");
  const messageKind = useSignal<"success" | "warning" | "error">("success");
  const loading = useSignal(false);
  const deletingId = useSignal<number | null>(null);

  const filterQuery = useSignal("");
  const filterRol = useSignal<"" | "estudiante" | "profesor" | "admin">("");
  const filterEstado = useSignal<"" | "pendiente" | "registrado">("");

  const filteredEntries = useComputed$(() => {
    const q = filterQuery.value.trim().toLowerCase();
    return entries.value.filter((entry) => {
      if (filterRol.value && entry.rol_asignado !== filterRol.value) {
        return false;
      }
      if (filterEstado.value === "pendiente" && entry.ya_registrado) {
        return false;
      }
      if (filterEstado.value === "registrado" && !entry.ya_registrado) {
        return false;
      }
      if (!q) return true;
      const fullName = `${entry.nombres} ${entry.apellidos}`.toLowerCase();
      return fullName.includes(q);
    });
  });

  const hasActiveFilters = useComputed$(() =>
    Boolean(filterQuery.value.trim() || filterRol.value || filterEstado.value),
  );

  const clearFilters = $(() => {
    filterQuery.value = "";
    filterRol.value = "";
    filterEstado.value = "";
  });

  const submit = $(async () => {
    loading.value = true;
    message.value = "";
    try {
      const result = await addEntryAction(
        nombres.value,
        apellidos.value,
        rol.value,
        rol.value === "estudiante" ? idGrado.value : null,
        idEscuela.value,
      );
      if (!result.ok) {
        messageKind.value =
          result.reason === "duplicate_pending" ||
          result.reason === "already_registered"
            ? "warning"
            : "error";
        message.value =
          addEntryMessages[result.reason] || "No se pudo agregar la invitación.";
        return;
      }

      entries.value = result.entries;
      messageKind.value = "success";
      message.value = "Invitación agregada.";
      nombres.value = "";
      apellidos.value = "";
    } catch {
      messageKind.value = "error";
      message.value = "No se pudo agregar la invitación.";
    } finally {
      loading.value = false;
    }
  });

  const removeEntry = $(async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la invitación de ${name}?`)) return;

    deletingId.value = id;
    message.value = "";
    try {
      const result = await deleteEntryAction(id);
      if (!result.ok) {
        messageKind.value =
          result.reason === "already_registered" ? "warning" : "error";
        message.value =
          deleteEntryMessages[result.reason] || "No se pudo eliminar la invitación.";
        return;
      }

      entries.value = result.entries;
      messageKind.value = "success";
      message.value = "Invitación eliminada.";
    } catch {
      messageKind.value = "error";
      message.value = "No se pudo eliminar la invitación.";
    } finally {
      deletingId.value = null;
    }
  });

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Lista blanca</h1>
        <p class="mt-2 text-slate-600">
          Solo las personas en esta lista pueden activar su cuenta.
        </p>
      </div>

      <form
        preventdefault:submit
        onSubmit$={submit}
        class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <label class="block">
          <span class="text-sm font-medium">Nombres</span>
          <input
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={nombres.value}
            onInput$={(e) => {
              nombres.value = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Apellidos</span>
          <input
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={apellidos.value}
            onInput$={(e) => {
              apellidos.value = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Rol</span>
          <select
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={rol.value}
            onChange$={(e) => {
              rol.value = (e.target as HTMLSelectElement).value as
                | "estudiante"
                | "profesor"
                | "admin";
            }}
          >
            <option value="estudiante">Estudiante</option>
            <option value="profesor">Profesor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label class="block">
          <span class="text-sm font-medium">Escuela</span>
          <select
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
            value={idEscuela.value}
            onChange$={(e) => {
              idEscuela.value = Number((e.target as HTMLSelectElement).value);
            }}
          >
            {data.value.escuelas.map((e) => (
              <option key={e.id_escuela} value={e.id_escuela}>
                {`${e.nombre} (${e.ciudad})`}
              </option>
            ))}
          </select>
        </label>
        {rol.value === "estudiante" ? (
          <label class="block">
            <span class="text-sm font-medium">Grado</span>
            <select
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
              value={idGrado.value}
              onChange$={(e) => {
                idGrado.value = Number((e.target as HTMLSelectElement).value);
              }}
            >
              {data.value.grados.map((g) => (
                <option key={g.id_grado} value={g.id_grado}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}
        <div class="md:col-span-2">
          <button
            type="submit"
            disabled={loading.value}
            class="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading.value ? "Guardando..." : "Agregar a lista blanca"}
          </button>
          {message.value ? (
            <p
              class={[
                "mt-3 text-sm",
                messageKind.value === "error"
                  ? "text-red-600"
                  : messageKind.value === "warning"
                    ? "text-amber-700"
                    : "text-emerald-600",
              ].join(" ")}
            >
              {message.value}
            </p>
          ) : null}
        </div>
      </form>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-end">
          <label class="block min-w-0 flex-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscar
            </span>
            <div class="relative mt-1">
              <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                class="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4"
                placeholder="Nombre o apellido..."
                value={filterQuery.value}
                onInput$={(e) => {
                  filterQuery.value = (e.target as HTMLInputElement).value;
                }}
              />
            </div>
          </label>
          <label class="block w-full sm:w-40">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rol
            </span>
            <select
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={filterRol.value}
              onChange$={(e) => {
                filterRol.value = (e.target as HTMLSelectElement).value as
                  | ""
                  | "estudiante"
                  | "profesor"
                  | "admin";
              }}
            >
              <option value="">Todos</option>
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label class="block w-full sm:w-40">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado
            </span>
            <select
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={filterEstado.value}
              onChange$={(e) => {
                filterEstado.value = (e.target as HTMLSelectElement).value as
                  | ""
                  | "pendiente"
                  | "registrado";
              }}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="registrado">Registrado</option>
            </select>
          </label>
          {hasActiveFilters.value ? (
            <button
              type="button"
              onClick$={clearFilters}
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LuX class="h-4 w-4" />
              Limpiar
            </button>
          ) : null}
        </div>

        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3">Escuela</th>
              <th class="px-4 py-3">Grado</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.value.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  class="px-4 py-8 text-center text-slate-500"
                >
                  {entries.value.length === 0
                    ? "No hay invitaciones en la lista blanca."
                    : "Ninguna invitación coincide con los filtros."}
                </td>
              </tr>
            ) : (
              filteredEntries.value.map((entry) => (
                <tr key={entry.id} class="border-t border-slate-100">
                  <td class="px-4 py-3 font-medium">
                    {entry.nombres} {entry.apellidos}
                  </td>
                  <td class="px-4 py-3 capitalize">{entry.rol_asignado}</td>
                  <td class="px-4 py-3">{entry.escuela}</td>
                  <td class="px-4 py-3">{entry.grado}</td>
                  <td class="px-4 py-3">
                    <span
                      class={[
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        entry.ya_registrado
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800",
                      ].join(" ")}
                    >
                      {entry.ya_registrado ? "Registrado" : "Pendiente"}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    {entry.ya_registrado ? (
                      <span class="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={deletingId.value === entry.id}
                        onClick$={() =>
                          removeEntry(
                            entry.id,
                            `${entry.nombres} ${entry.apellidos}`,
                          )
                        }
                        class="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <LuTrash2 class="h-3.5 w-3.5" />
                        {deletingId.value === entry.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
