/** True durante `yarn build` / SSG (sin BD de producción). */
export const isAppBuildContext = (): boolean => {
  if (typeof process === "undefined") return false;
  if (String(process.env.MOA_BUILD || "").trim() === "1") return true;
  const lifecycle = String(process.env.npm_lifecycle_event || "").trim();
  return lifecycle === "build" || lifecycle === "build.client" || lifecycle === "build.server";
};
