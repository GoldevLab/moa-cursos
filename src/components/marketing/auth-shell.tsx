import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { LuArrowLeft } from "@qwikest/icons/lucide";
import { MoaLogo } from "~/components/ui/moa-logo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  accent?: "indigo" | "violet";
};

export const AuthShell = component$<AuthShellProps>(
  ({ title, subtitle, accent = "indigo" }) => {
    const gradient =
      accent === "violet"
        ? "from-violet-600 via-purple-600 to-indigo-700"
        : "from-indigo-600 via-violet-600 to-orange-500";

    return (
      <div class="mx-auto grid min-h-[calc(100vh-12rem)] max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div
          class={[
            "relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br p-10 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between",
            gradient,
          ].join(" ")}
        >
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(255_255_255/0.25),transparent_45%)]" />
          <div class="relative">
            <MoaLogo size="lg" showText={false} />
            <p class="mt-6 font-display text-3xl font-black leading-tight">
              Tu campus de inglés, siempre contigo
            </p>
            <p class="mt-4 max-w-sm text-indigo-100">
              Lecciones por competencias, puntos, rachas y paneles dedicados
              para cada rol en la comunidad MOA.
            </p>
          </div>
          <ul class="relative space-y-3 text-sm text-white/90">
            <li class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              128 lecciones en 16 competencias
            </li>
            <li class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Presentation · Practice · Use
            </li>
            <li class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Progreso que nunca retrocede
            </li>
          </ul>
        </div>

        <div class="w-full max-w-lg justify-self-center">
          <Link
            href="/"
            class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <LuArrowLeft class="h-4 w-4" />
            Volver al inicio
          </Link>

          <div class="moa-glass rounded-3xl border border-white/70 p-8 shadow-xl shadow-indigo-500/10">
            <div class="mb-6 lg:hidden">
              <MoaLogo size="sm" />
            </div>
            <h1 class="font-display text-2xl font-black text-slate-900">{title}</h1>
            <p class="mt-2 text-sm text-slate-600">{subtitle}</p>
            <div class="mt-6">
              <Slot />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
