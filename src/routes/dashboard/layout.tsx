import { component$, Slot, $, useSignal } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import type { RequestHandler } from "@builder.io/qwik-city";
import {
  LuBookOpen,
  LuLayoutDashboard,
  LuList,
  LuLogOut,
  LuMenu,
  LuSettings,
  LuUser,
  LuUsers,
  LuBarChart3,
  LuX,
} from "@qwikest/icons/lucide";
import { clearSession, getCurrentUsuario } from "~/lib/auth";
import {
  AUTH_LOGIN_PATH,
  dashboardPathForRole,
  redirectToLoginAfterLogout,
} from "~/lib/auth-navigation";
import { getEstudianteByUsuarioId, getContinueLesson } from "~/lib/progress";
import { ensureMoaSchema } from "~/lib/schema";
import { StudentMobileNav } from "~/components/student/student-mobile-nav";

export const head: DocumentHead = {
  meta: [{ name: "robots", content: "noindex, nofollow" }],
};

export const onRequest: RequestHandler = async (event) => {
  event.cacheControl({ noStore: true, private: true });
  await ensureMoaSchema();
  const user = await getCurrentUsuario(event);
  if (!user) throw event.redirect(302, AUTH_LOGIN_PATH);

  const path = event.url.pathname;
  const expectedPrefix =
    user.rol === "admin"
      ? "/dashboard/admin"
      : user.rol === "profesor"
        ? "/dashboard/profesor"
        : "/dashboard/estudiante";

  if (!path.startsWith(expectedPrefix) && !path.startsWith("/dashboard/cuenta")) {
    throw event.redirect(302, dashboardPathForRole(user.rol));
  }
};

export const useDashboardUser = routeLoader$(async (event) => {
  const user = await getCurrentUsuario(event);
  if (!user) throw event.redirect(302, AUTH_LOGIN_PATH);
  return user;
});

export const useStudentContinuar = routeLoader$(async (event) => {
  const user = await getCurrentUsuario(event);
  if (!user || user.rol !== "estudiante") return null;

  const perfil = await getEstudianteByUsuarioId(user.id_usuario);
  if (!perfil) return null;

  return await getContinueLesson(perfil.id_estudiante);
});

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const isDashboardRoot = (href: string) =>
  /\/dashboard\/(admin|profesor|estudiante)$/.test(normalizePath(href));

const isNavItemActive = (pathname: string, href: string) => {
  const path = normalizePath(pathname);
  const target = normalizePath(href);

  if (isDashboardRoot(target)) {
    return path === target;
  }

  return path === target || path.startsWith(`${target}/`);
};

const logoutServer = server$(async function () {
  await clearSession(this);
  return { ok: true as const };
});

export default component$(() => {
  const user = useDashboardUser();
  const continuar = useStudentContinuar();
  const loc = useLocation();
  const menuOpen = useSignal(false);

  const isEstudiante = user.value.rol === "estudiante";
  const continuarHref =
    continuar.value &&
    !loc.url.pathname.includes(
      `/leccion/${continuar.value.id_leccion}`,
    )
      ? `/dashboard/estudiante/leccion/${continuar.value.id_leccion}/`
      : null;

  const logout = $(async () => {
    await logoutServer();
    redirectToLoginAfterLogout();
  });

  const cuentaItem = {
    href: "/dashboard/cuenta/",
    label: "Mi cuenta",
    icon: LuUser,
  };

  const navItems =
    user.value.rol === "admin"
      ? [
          { href: "/dashboard/admin/", label: "Resumen", icon: LuLayoutDashboard },
          { href: "/dashboard/admin/usuarios/", label: "Usuarios", icon: LuUsers },
          {
            href: "/dashboard/admin/lista-blanca/",
            label: "Lista blanca",
            icon: LuList,
          },
          {
            href: "/dashboard/admin/escuelas/",
            label: "Escuelas",
            icon: LuSettings,
          },
          cuentaItem,
        ]
      : user.value.rol === "profesor"
        ? [
            {
              href: "/dashboard/profesor/",
              label: "Panel docente",
              icon: LuLayoutDashboard,
            },
            {
              href: "/dashboard/profesor/contenido/",
              label: "Contenido",
              icon: LuBookOpen,
            },
            {
              href: "/dashboard/profesor/estadisticas/",
              label: "Estadísticas",
              icon: LuBarChart3,
            },
            {
              href: "/dashboard/profesor/estudiantes/",
              label: "Estudiantes",
              icon: LuUsers,
            },
            cuentaItem,
          ]
        : [
            {
              href: "/dashboard/estudiante/",
              label: "Mi progreso",
              icon: LuLayoutDashboard,
            },
            cuentaItem,
          ];

  return (
    <div
      class={[
        "min-h-screen",
        user.value.rol === "estudiante" ? "moa-mesh moa-campus-grid" : "bg-slate-50",
      ].join(" ")}
    >
      <div class="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:py-8">
        <aside class="hidden w-72 shrink-0 lg:block">
          <div
            class={[
              "sticky top-6 overflow-hidden rounded-3xl border shadow-sm",
              user.value.rol === "estudiante"
                ? "border-indigo-100/80 bg-white/80 moa-glass"
                : "border-slate-200 bg-white",
            ].join(" ")}
          >
            {user.value.rol === "estudiante" ? (
              <div class="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-5 text-white">
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold backdrop-blur">
                    {user.value.nombres.charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-bold">
                      {user.value.nombres} {user.value.apellidos}
                    </p>
                    <p class="truncate text-sm text-indigo-100">
                      @{user.value.username}
                    </p>
                  </div>
                </div>
                <p class="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                  Campus MOA
                </p>
              </div>
            ) : (
              <div class="p-5">
                <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {user.value.rol}
                </p>
                <h2 class="mt-1 font-bold text-slate-900">
                  {user.value.nombres} {user.value.apellidos}
                </h2>
                <p class="text-sm text-slate-500">@{user.value.username}</p>
              </div>
            )}

            <div class="p-4">
              <nav class="space-y-1">
                {navItems.map((item) => {
                  const active = isNavItemActive(loc.url.pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      class={[
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        active
                          ? user.value.rol === "estudiante"
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                            : "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <item.icon class="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick$={logout}
                class="mt-4 flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <LuLogOut class="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <div
          class={[
            "min-w-0 flex-1",
            isEstudiante ? "pb-20 lg:pb-0" : "",
          ].join(" ")}
        >
          <div
            class={[
              "mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 shadow-sm lg:hidden",
              user.value.rol === "estudiante"
                ? "border-indigo-100 bg-white/90 moa-glass"
                : "border-slate-200 bg-white",
            ].join(" ")}
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">
                {user.value.nombres}
              </p>
              <p class="text-xs text-slate-500 capitalize">{user.value.rol}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 p-2 text-slate-700"
                aria-label="Menú de navegación"
                onClick$={() => {
                  menuOpen.value = !menuOpen.value;
                }}
              >
                {menuOpen.value ? (
                  <LuX class="h-5 w-5" />
                ) : (
                  <LuMenu class="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick$={logout}
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
              >
                Salir
              </button>
            </div>
          </div>

          {menuOpen.value ? (
            <nav class="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
              <div class="space-y-1">
                {navItems.map((item) => {
                  const active = isNavItemActive(loc.url.pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      class={[
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600",
                      ].join(" ")}
                      onClick$={() => {
                        menuOpen.value = false;
                      }}
                    >
                      <item.icon class="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          ) : null}

          <Slot />
        </div>
      </div>

      {isEstudiante ? (
        <StudentMobileNav
          continuarHref={continuarHref}
          continuarLabel={continuar.value?.titulo}
        />
      ) : null}
    </div>
  );
});
