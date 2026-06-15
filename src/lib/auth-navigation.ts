/** Ruta canónica de login. */
export const AUTH_LOGIN_PATH = "/auth/?mode=login";

export const dashboardPathForRole = (
  rol: "estudiante" | "profesor" | "admin",
): string => {
  if (rol === "admin") return "/dashboard/admin/";
  if (rol === "profesor") return "/dashboard/profesor/";
  return "/dashboard/estudiante/";
};

export const redirectToLoginAfterLogout = (): void => {
  if (typeof window === "undefined") return;
  const url = new URL(AUTH_LOGIN_PATH, window.location.origin);
  url.searchParams.set("_logout", String(Date.now()));
  window.location.replace(`${url.pathname}${url.search}`);
};
