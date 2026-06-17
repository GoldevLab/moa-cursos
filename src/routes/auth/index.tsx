import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { LuEye, LuEyeOff } from "@qwikest/icons/lucide";
import { AuthShell } from "~/components/marketing/auth-shell";
import { APP_NAME } from "~/lib/constants";
import {
  authenticateUsuario,
  createSession,
} from "~/lib/auth";
import { ensureMoaSchema } from "~/lib/schema";
import { dashboardPathForRole } from "~/lib/auth-navigation";
import {
  checkRateLimit,
  clientKeyFromEvent,
  resetRateLimit,
} from "~/lib/rate-limit";

const loginAction = server$(async function (username: string, password: string) {
  await ensureMoaSchema();

  // Máximo 10 intentos por IP cada 5 minutos.
  const rlKey = `login:${clientKeyFromEvent(this)}`;
  const rl = checkRateLimit(rlKey, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return {
      ok: false as const,
      reason: "rate_limited" as const,
      retryAfterSeconds: rl.retryAfterSeconds,
    };
  }

  const user = await authenticateUsuario(username, password);
  if (!user) return { ok: false as const, reason: "invalid_credentials" as const };
  resetRateLimit(rlKey);
  await createSession(user.id_usuario, this);
  return {
    ok: true as const,
    rol: user.rol,
    username: user.username,
  };
});

export const head: DocumentHead = {
  title: `Iniciar sesión | ${APP_NAME}`,
  meta: [
    {
      name: "description",
      content: "Accede a tu cuenta de MOA Education.",
    },
  ],
};

export default component$(() => {
  const nav = useNavigate();
  const username = useSignal("");
  const password = useSignal("");
  const showPassword = useSignal(false);
  const error = useSignal("");
  const loading = useSignal(false);

  const submit = $(async () => {
    error.value = "";
    loading.value = true;
    try {
      const result = await loginAction(username.value, password.value);
      if (!result.ok) {
        error.value =
          result.reason === "rate_limited"
            ? `Demasiados intentos. Espera ${result.retryAfterSeconds} segundos e intenta de nuevo.`
            : "Usuario o contraseña incorrectos.";
        return;
      }
      await nav(dashboardPathForRole(result.rol));
    } catch {
      error.value = "No se pudo iniciar sesión. Intenta de nuevo.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Ingresa con tu usuario de estudiante, profesor o administrador."
    >
      <form preventdefault:submit onSubmit$={submit} class="space-y-4">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Usuario</span>
          <input
            type="text"
            value={username.value}
            onInput$={(e) => {
              username.value = (e.target as HTMLInputElement).value;
            }}
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            autocomplete="username"
            required
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Contraseña</span>
          <div class="relative mt-1.5">
            <input
              type={showPassword.value ? "text" : "password"}
              value={password.value}
              onInput$={(e) => {
                password.value = (e.target as HTMLInputElement).value;
              }}
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword.value ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick$={() => {
                showPassword.value = !showPassword.value;
              }}
            >
              {showPassword.value ? (
                <LuEyeOff class="h-5 w-5" />
              ) : (
                <LuEye class="h-5 w-5" />
              )}
            </button>
          </div>
        </label>

        {error.value ? (
          <p class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.value}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading.value}
          class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:opacity-60"
        >
          {loading.value ? "Validando..." : "Entrar al campus"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        ¿Primera vez?{" "}
        <Link href="/auth/activar/" class="font-semibold text-indigo-600 hover:underline">
          Activar cuenta
        </Link>
      </p>

      {import.meta.env.DEV ? (
        <p class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
          Demo: <strong>admin</strong> / <strong>admin123</strong>
        </p>
      ) : null}
    </AuthShell>
  );
});
