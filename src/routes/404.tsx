import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { LuArrowLeft, LuHome, LuSearchX } from "@qwikest/icons/lucide";
import { APP_NAME } from "~/lib/constants";

export const head: DocumentHead = {
  title: `Página no encontrada | ${APP_NAME}`,
  meta: [{ name: "robots", content: "noindex" }],
};

export default component$(() => {
  return (
    <main class="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div class="moa-fade-up w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm backdrop-blur-sm sm:p-10">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
          <LuSearchX class="h-8 w-8" />
        </div>

        <p class="mt-6 text-sm font-bold uppercase tracking-wide text-indigo-600">
          Error 404
        </p>
        <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Página no encontrada
        </h1>
        <p class="mt-3 text-slate-600">
          La ruta que buscas no existe o fue movida. Revisa la URL o vuelve al
          inicio.
        </p>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
          >
            <LuHome class="h-4 w-4" />
            Ir al inicio
          </Link>
          <button
            type="button"
            onClick$={() => {
              if (typeof window !== "undefined") {
                window.history.back();
              }
            }}
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LuArrowLeft class="h-4 w-4" />
            Volver atrás
          </button>
        </div>
      </div>
    </main>
  );
});
