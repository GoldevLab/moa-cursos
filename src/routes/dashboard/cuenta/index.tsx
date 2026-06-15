import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { LuEye, LuEyeOff, LuShield } from "@qwikest/icons/lucide";
import { changeOwnPassword, getCurrentUsuario } from "~/lib/auth";
import { AUTH_LOGIN_PATH } from "~/lib/auth-navigation";
import { requireAuthenticatedUsuario, ServerAuthError } from "~/lib/server-auth";

export const head: DocumentHead = {
  title: "Mi cuenta | MOA",
};

export const useCuentaPage = routeLoader$(async (event) => {
  const user = await getCurrentUsuario(event);
  if (!user) throw event.redirect(302, AUTH_LOGIN_PATH);
  return {
    username: user.username,
    nombres: user.nombres,
    apellidos: user.apellidos,
    rol: user.rol,
  };
});

const changePasswordAction = server$(async function (
  currentPassword: string,
  newPassword: string,
) {
  try {
    const user = await requireAuthenticatedUsuario(this);
    return await changeOwnPassword(user.id_usuario, currentPassword, newPassword);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

const messages: Record<string, string> = {
  weak_password: "La nueva contraseña debe tener al menos 8 caracteres.",
  wrong_password: "La contraseña actual no es correcta.",
  not_found: "Cuenta no encontrada.",
  unauthorized: "Sesión expirada. Vuelve a iniciar sesión.",
};

export default component$(() => {
  const cuenta = useCuentaPage();
  const currentPassword = useSignal("");
  const newPassword = useSignal("");
  const confirmPassword = useSignal("");
  const showCurrent = useSignal(false);
  const showNew = useSignal(false);
  const message = useSignal("");
  const messageOk = useSignal(true);
  const loading = useSignal(false);

  const submit = $(async () => {
    message.value = "";
    if (newPassword.value !== confirmPassword.value) {
      messageOk.value = false;
      message.value = "Las contraseñas nuevas no coinciden.";
      return;
    }
    loading.value = true;
    try {
      const result = await changePasswordAction(
        currentPassword.value,
        newPassword.value,
      );
      if (!result.ok) {
        messageOk.value = false;
        message.value = messages[result.reason] || "No se pudo cambiar la contraseña.";
        return;
      }
      messageOk.value = true;
      message.value = "Contraseña actualizada correctamente.";
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
    } catch {
      messageOk.value = false;
      message.value = "Error al cambiar la contraseña.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="mx-auto max-w-lg space-y-6">
      <section class="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <LuShield class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Mi cuenta</h1>
            <p class="text-sm text-slate-500 capitalize">{cuenta.value.rol}</p>
          </div>
        </div>
        <dl class="mt-5 space-y-2 text-sm">
          <div class="flex justify-between rounded-xl bg-slate-50 px-4 py-2">
            <dt class="text-slate-500">Nombre</dt>
            <dd class="font-medium text-slate-900">
              {cuenta.value.nombres} {cuenta.value.apellidos}
            </dd>
          </div>
          <div class="flex justify-between rounded-xl bg-slate-50 px-4 py-2">
            <dt class="text-slate-500">Usuario</dt>
            <dd class="font-medium text-slate-900">@{cuenta.value.username}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Cambiar contraseña</h2>
        <form preventdefault:submit onSubmit$={submit} class="mt-4 space-y-4">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Contraseña actual</span>
            <div class="relative mt-1">
              <input
                type={showCurrent.value ? "text" : "password"}
                class="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12"
                value={currentPassword.value}
                required
                onInput$={(e) => {
                  currentPassword.value = (e.target as HTMLInputElement).value;
                }}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label="Mostrar contraseña actual"
                onClick$={() => {
                  showCurrent.value = !showCurrent.value;
                }}
              >
                {showCurrent.value ? (
                  <LuEyeOff class="h-5 w-5" />
                ) : (
                  <LuEye class="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nueva contraseña</span>
            <div class="relative mt-1">
              <input
                type={showNew.value ? "text" : "password"}
                class="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12"
                value={newPassword.value}
                minLength={8}
                required
                onInput$={(e) => {
                  newPassword.value = (e.target as HTMLInputElement).value;
                }}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label="Mostrar nueva contraseña"
                onClick$={() => {
                  showNew.value = !showNew.value;
                }}
              >
                {showNew.value ? (
                  <LuEyeOff class="h-5 w-5" />
                ) : (
                  <LuEye class="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">
              Confirmar nueva contraseña
            </span>
            <input
              type="password"
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3"
              value={confirmPassword.value}
              minLength={8}
              required
              onInput$={(e) => {
                confirmPassword.value = (e.target as HTMLInputElement).value;
              }}
            />
          </label>

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

          <button
            type="submit"
            disabled={loading.value}
            class="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading.value ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
});
