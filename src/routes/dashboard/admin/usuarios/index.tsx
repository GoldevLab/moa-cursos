import { $, component$, useComputed$, useSignal } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuKeyRound, LuSearch, LuX } from "@qwikest/icons/lucide";
import { updateUsuarioPassword } from "~/lib/auth";
import { listUsuarios } from "~/lib/progress";
import { requireAdmin, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Usuarios | MOA Admin",
};

export const useUsuarios = routeLoader$(async () => listUsuarios());

const resetPasswordAction = server$(async function (
  idUsuario: number,
  newPassword: string,
) {
  try {
    await requireAdmin(this);
    return await updateUsuarioPassword(idUsuario, newPassword);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    throw error;
  }
});

const resetMessages: Record<string, string> = {
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  not_found: "Usuario no encontrado.",
  forbidden: "No tienes permiso para esta acción.",
};

export default component$(() => {
  const usuarios = useUsuarios();
  const filterQuery = useSignal("");
  const filterRol = useSignal<"" | "estudiante" | "profesor" | "admin">("");
  const resetUserId = useSignal<number | null>(null);
  const resetUsername = useSignal("");
  const newPassword = useSignal("");
  const message = useSignal("");
  const loading = useSignal(false);

  const filtered = useComputed$(() => {
    const q = filterQuery.value.trim().toLowerCase();
    return usuarios.value.filter((user) => {
      if (filterRol.value && user.rol !== filterRol.value) return false;
      if (!q) return true;
      const haystack =
        `${user.username} ${user.nombres} ${user.apellidos}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  const clearFilters = $(() => {
    filterQuery.value = "";
    filterRol.value = "";
  });

  const openReset = $((id: number, username: string) => {
    resetUserId.value = id;
    resetUsername.value = username;
    newPassword.value = "";
    message.value = "";
  });

  const closeReset = $(() => {
    resetUserId.value = null;
    newPassword.value = "";
  });

  const submitReset = $(async () => {
    if (resetUserId.value === null) return;
    loading.value = true;
    message.value = "";
    try {
      const result = await resetPasswordAction(
        resetUserId.value,
        newPassword.value,
      );
      if (!result.ok) {
        message.value = resetMessages[result.reason] || "No se pudo actualizar.";
        return;
      }
      message.value = `Contraseña actualizada para @${resetUsername.value}. El usuario deberá volver a iniciar sesión.`;
      resetUserId.value = null;
      newPassword.value = "";
    } catch {
      message.value = "Error al actualizar la contraseña.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Gestionar usuarios</h1>
        <p class="mt-2 text-slate-600">
          {usuarios.value.length} cuentas registradas en el sistema.
        </p>
      </div>

      {message.value ? (
        <p class="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {message.value}
        </p>
      ) : null}

      {resetUserId.value !== null ? (
        <form
          preventdefault:submit
          onSubmit$={submitReset}
          class="rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <h2 class="font-bold text-amber-900">
            Restablecer contraseña — @{resetUsername.value}
          </h2>
          <label class="mt-4 block">
            <span class="text-sm font-medium text-amber-900">Nueva contraseña</span>
            <input
              type="password"
              class="mt-1 w-full max-w-sm rounded-xl border border-amber-200 bg-white px-4 py-2"
              value={newPassword.value}
              minLength={8}
              required
              onInput$={(e) => {
                newPassword.value = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <div class="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={loading.value}
              class="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading.value ? "Guardando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick$={closeReset}
              class="rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <label class="block min-w-0 flex-1">
          <span class="text-xs font-semibold uppercase text-slate-500">Buscar</span>
          <div class="relative mt-1">
            <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              class="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4"
              placeholder="Usuario o nombre..."
              value={filterQuery.value}
              onInput$={(e) => {
                filterQuery.value = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
        </label>
        <label class="block w-full sm:w-44">
          <span class="text-xs font-semibold uppercase text-slate-500">Rol</span>
          <select
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
        {filterQuery.value || filterRol.value ? (
          <button
            type="button"
            onClick$={clearFilters}
            class="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            <LuX class="h-4 w-4" />
            Limpiar
          </button>
        ) : null}
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3">Registro</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.value.length === 0 ? (
              <tr>
                <td colSpan={5} class="px-4 py-8 text-center text-slate-500">
                  Ningún usuario coincide con los filtros.
                </td>
              </tr>
            ) : (
              filtered.value.map((user) => (
                <tr key={user.id_usuario} class="border-t border-slate-100">
                  <td class="px-4 py-3 font-medium text-slate-900">
                    @{user.username}
                  </td>
                  <td class="px-4 py-3">
                    {user.nombres} {user.apellidos}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class={[
                        "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                        user.rol === "admin"
                          ? "bg-violet-100 text-violet-700"
                          : user.rol === "profesor"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-indigo-100 text-indigo-700",
                      ].join(" ")}
                    >
                      {user.rol}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-slate-500">
                    {user.fecha_registro.slice(0, 10)}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick$={() => openReset(user.id_usuario, user.username)}
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <LuKeyRound class="h-3.5 w-3.5" />
                      Contraseña
                    </button>
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
