import { component$, Slot, $ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useLocation,
} from "@builder.io/qwik-city";
import type { RequestHandler } from "@builder.io/qwik-city";
import { LuLogIn, LuLogOut, LuMenu, LuUserPlus, LuX } from "@qwikest/icons/lucide";
import { MoaLogo } from "~/components/ui/moa-logo";
import { clearSession, getCurrentUsuario } from "~/lib/auth";
import { redirectToLoginAfterLogout } from "~/lib/auth-navigation";
import { ensureMoaSchema } from "~/lib/schema";
import { useSignal } from "@builder.io/qwik";

export const onRequest: RequestHandler = async (event) => {
  await ensureMoaSchema();

  try {
    const user = await getCurrentUsuario(event);
    if (user) {
      event.cacheControl({ noStore: true, private: true });
    }
  } catch {
    /* public pages */
  }
};

export const useAuthSession = routeLoader$(async (event) => {
  await ensureMoaSchema();
  const user = await getCurrentUsuario(event);
  if (!user) return { isAuthenticated: false as const };
  return {
    isAuthenticated: true as const,
    userId: user.id_usuario,
    username: user.username,
    nombres: user.nombres,
    apellidos: user.apellidos,
    rol: user.rol,
  };
});

const logoutServer = server$(async function () {
  await clearSession(this);
  return { ok: true as const };
});

export default component$(() => {
  const session = useAuthSession();
  const loc = useLocation();
  const menuOpen = useSignal(false);

  const logout = $(async () => {
    await logoutServer();
    redirectToLoginAfterLogout();
  });

  const dashboardHref =
    session.value.rol === "admin"
      ? "/dashboard/admin/"
      : session.value.rol === "profesor"
        ? "/dashboard/profesor/"
        : "/dashboard/estudiante/";

  const isHome = loc.url.pathname === "/";
  const isDashboard = loc.url.pathname.startsWith("/dashboard");

  if (isDashboard) {
    return (
      <div class="min-h-screen">
        <Slot />
      </div>
    );
  }

  return (
    <div class="moa-mesh flex min-h-screen flex-col">
      <header class="sticky top-0 z-50 border-b border-white/50 moa-glass">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/" class="rounded-xl transition hover:opacity-90">
            <MoaLogo size="md" />
          </Link>

          <nav class="hidden items-center gap-1 md:flex">
            {isHome && !session.value.isAuthenticated ? (
              <>
                <a
                  href="#metodo"
                  class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-indigo-700"
                >
                  Metodología
                </a>
                <a
                  href="#roles"
                  class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-indigo-700"
                >
                  Roles
                </a>
              </>
            ) : null}

            {session.value.isAuthenticated ? (
              <>
                <Link
                  href={dashboardHref}
                  class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/80"
                >
                  Mi panel
                </Link>
                <button
                  type="button"
                  onClick$={logout}
                  class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200"
                >
                  <LuLogOut class="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/activar/"
                  class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/80"
                >
                  <LuUserPlus class="h-4 w-4" />
                  Activar cuenta
                </Link>
                <Link
                  href="/auth/?mode=login"
                  class="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:brightness-105"
                >
                  <LuLogIn class="h-4 w-4" />
                  Iniciar sesión
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-700 md:hidden"
            aria-label="Menú"
            onClick$={() => {
              menuOpen.value = !menuOpen.value;
            }}
          >
            {menuOpen.value ? <LuX class="h-6 w-6" /> : <LuMenu class="h-6 w-6" />}
          </button>
        </div>

        {menuOpen.value ? (
          <div class="border-t border-slate-100 px-4 py-4 md:hidden">
            <nav class="flex flex-col gap-2">
              {isHome && !session.value.isAuthenticated ? (
                <>
                  <a href="#metodo" class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700">
                    Metodología
                  </a>
                  <a href="#roles" class="rounded-lg px-3 py-2 text-sm font-medium text-slate-700">
                    Roles
                  </a>
                </>
              ) : null}
              {session.value.isAuthenticated ? (
                <>
                  <Link href={dashboardHref} class="rounded-lg px-3 py-2 text-sm font-medium">
                    Mi panel
                  </Link>
                  <button
                    type="button"
                    onClick$={logout}
                    class="rounded-lg px-3 py-2 text-left text-sm font-medium"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/activar/" class="rounded-lg px-3 py-2 text-sm font-medium">
                    Activar cuenta
                  </Link>
                  <Link
                    href="/auth/?mode=login"
                    class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main class="flex-1">
        <Slot />
      </main>

      <footer class="border-t border-slate-200/80 bg-white/50 backdrop-blur">
        <div class="mx-auto max-w-6xl px-4 py-12">
          <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div class="sm:col-span-2">
              <MoaLogo size="sm" />
              <p class="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
                Plataforma educativa para aprender inglés con lecciones
                gamificadas, seguimiento de progreso y herramientas para
                docentes y administradores.
              </p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Plataforma
              </p>
              <ul class="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/auth/?mode=login" class="hover:text-indigo-600">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link href="/auth/activar/" class="hover:text-indigo-600">
                    Activar cuenta
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aprendizaje
              </p>
              <ul class="mt-3 space-y-2 text-sm text-slate-600">
                <li>128 lecciones</li>
                <li>16 competencias · 3 lapsos</li>
                <li>Presentation · Practice · Use</li>
              </ul>
            </div>
          </div>
          <div class="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 MOA Education</p>
            <p>
              {loc.url.pathname.startsWith("/dashboard")
                ? "Área privada del campus"
                : "Sistema Educativo Web"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});
