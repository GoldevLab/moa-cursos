import { defineConfig } from "vite";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodeServerAdapter } from "@builder.io/qwik-city/adapters/node-server/vite";

export default defineConfig(() => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.express.tsx", "src/entry.ssr.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [
      qwikCity(),
      qwikVite(),
      tsconfigPaths({ root: "." }),
      nodeServerAdapter({
        name: "express",
      }),
    ],
  };
});
