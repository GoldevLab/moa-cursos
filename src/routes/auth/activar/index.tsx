import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { LuUserCheck } from "@qwikest/icons/lucide";
import { AuthShell } from "~/components/marketing/auth-shell";
import { APP_NAME } from "~/lib/constants";
import { createSession } from "~/lib/auth";
import { dashboardPathForRole } from "~/lib/auth-navigation";
import { activateAccountFromWhitelist } from "~/lib/whitelist";

const activateAction = server$(async function (
  nombres: string,
  apellidos: string,
  password: string,
  username: string,
) {
  try {
    const result = await activateAccountFromWhitelist({
      nombres,
      apellidos,
      password,
      username: username || undefined,
    });

    if (!result.ok) return result;

    const { authenticateUsuario } = await import("~/lib/auth");
    const user = await authenticateUsuario(result.username, password);
    if (!user) {
      return { ok: false as const, reason: "activation_failed" as const };
    }

    await createSession(user.id_usuario, this);
    return { ok: true as const, rol: user.rol, username: result.username };
  } catch (error) {
    console.error("[activar] activateAction failed:", error);
    return { ok: false as const, reason: "activation_error" as const };
  }
});

const errorMessages: Record<string, string> = {
  not_found: "No encontramos tus datos en la lista blanca.",
  already_registered: "Esta persona ya activó su cuenta.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  username_taken: "Ese nombre de usuario ya está en uso.",
  invalid_names: "Ingresa nombres y apellidos válidos.",
  incomplete_profile:
    "Tu invitación no tiene escuela o grado asignado. Pide al administrador que la corrija.",
  activation_failed: "La cuenta se creó pero no pudimos iniciar sesión.",
  activation_error:
    "No pudimos completar la activación. Si el problema continúa, pide al administrador que revise tu invitación.",
};

export const head: DocumentHead = {
  title: `Activar cuenta | ${APP_NAME}`,
};

export default component$(() => {
  const nav = useNavigate();
  const nombres = useSignal("");
  const apellidos = useSignal("");
  const username = useSignal("");
  const password = useSignal("");
  const confirmPassword = useSignal("");
  const error = useSignal("");
  const success = useSignal("");
  const loading = useSignal(false);

  const submit = $(async () => {
    error.value = "";
    success.value = "";
    if (password.value !== confirmPassword.value) {
      error.value = "Las contraseñas no coinciden.";
      return;
    }
    loading.value = true;
    try {
      const result = await activateAction(
        nombres.value,
        apellidos.value,
        password.value,
        username.value,
      );
      if (!result.ok) {
        error.value = errorMessages[result.reason] || "No se pudo activar la cuenta.";
        return;
      }
      success.value = `Cuenta activada. Bienvenido, ${result.username}.`;
      await nav(dashboardPathForRole(result.rol));
    } catch {
      error.value = errorMessages.activation_error;
    } finally {
      loading.value = false;
    }
  });

  return (
    <AuthShell
      title="Activa tu cuenta"
      subtitle="Verificamos tu nombre en la lista blanca, creas tu contraseña y entras al campus."
      accent="violet"
    >
      <form preventdefault:submit onSubmit$={submit} class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nombres</span>
            <input
              class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              value={nombres.value}
              onInput$={(e) => {
                nombres.value = (e.target as HTMLInputElement).value;
              }}
              required
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Apellidos</span>
            <input
              class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              value={apellidos.value}
              onInput$={(e) => {
                apellidos.value = (e.target as HTMLInputElement).value;
              }}
              required
            />
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Usuario (opcional)</span>
          <input
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            value={username.value}
            onInput$={(e) => {
              username.value = (e.target as HTMLInputElement).value;
            }}
            placeholder="Se genera automáticamente si lo dejas vacío"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            value={password.value}
            onInput$={(e) => {
              password.value = (e.target as HTMLInputElement).value;
            }}
            minLength={8}
            required
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Confirmar contraseña</span>
          <input
            type="password"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            value={confirmPassword.value}
            onInput$={(e) => {
              confirmPassword.value = (e.target as HTMLInputElement).value;
            }}
            minLength={8}
            required
          />
        </label>

        {error.value ? (
          <p class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.value}
          </p>
        ) : null}
        {success.value ? (
          <p class="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success.value}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading.value}
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-105 disabled:opacity-60"
        >
          <LuUserCheck class="h-5 w-5" />
          {loading.value ? "Verificando..." : "Activar y entrar"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/?mode=login" class="font-semibold text-indigo-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>

      {import.meta.env.DEV ? (
        <p class="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-center text-xs text-violet-800">
          Lista blanca demo: <strong>Ana García</strong> · <strong>Carlos Pérez</strong>
        </p>
      ) : null}
    </AuthShell>
  );
});
