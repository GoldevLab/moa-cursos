import "dotenv/config";
import { defineConfig, type UserConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json";

type PkgDep = Record<string, string>;
const { dependencies = {}, devDependencies = {} } = pkg as {
  dependencies: PkgDep;
  devDependencies: PkgDep;
};

function errorOnDuplicatesPkgDeps(
  devDependencies: PkgDep,
  dependencies: PkgDep,
) {
  const duplicateDeps = Object.keys(devDependencies).filter(
    (dep) => dependencies[dep],
  );
  const qwikPkg = Object.keys(dependencies).filter((value) =>
    /qwik/i.test(value),
  );

  if (qwikPkg.length > 0) {
    throw new Error(
      `Move qwik packages ${qwikPkg.join(", ")} to devDependencies`,
    );
  }

  if (duplicateDeps.length > 0) {
    throw new Error(
      `Duplicate dependencies in devDependencies and dependencies: ${duplicateDeps.join(", ")}`,
    );
  }
}

errorOnDuplicatesPkgDeps(devDependencies, dependencies);

export default defineConfig((): UserConfig => {
  return {
    plugins: [tailwindcss(), qwikCity(), qwikVite(), tsconfigPaths({ root: "." })],
    server: {
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
