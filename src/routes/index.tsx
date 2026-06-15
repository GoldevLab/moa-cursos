import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import {
  LuArrowRight,
  LuBookOpen,
  LuFlame,
  LuGraduationCap,
  LuLayers,
  LuLock,
  LuPlay,
  LuShield,
  LuSparkles,
  LuStar,
  LuTarget,
  LuTrophy,
  LuUsers,
  LuZap,
} from "@qwikest/icons/lucide";
import { APP_NAME } from "~/lib/constants";
import { MAX_POINTS_PER_LESSON } from "~/lib/constants";

export const head: DocumentHead = {
  title: `${APP_NAME} | Aprende inglés con lecciones gamificadas`,
  meta: [
    {
      name: "description",
      content:
        "MOA Education: plataforma de inglés con 128 lecciones, competencias por lapso, rachas de estudio y paneles para estudiantes, profesores y administradores.",
    },
  ],
};

const stats = [
  { value: "128", label: "Lecciones", sub: "8 por competencia" },
  { value: "16", label: "Competencias", sub: "3 lapsos escolares" },
  { value: String(MAX_POINTS_PER_LESSON), label: "Puntos máx.", sub: "por lección perfecta" },
  { value: "3", label: "Segmentos", sub: "presentación · práctica · uso" },
];

const segments = [
  {
    step: "01",
    title: "Presentación",
    pts: 25,
    desc: "Vocabulario y contexto antes de practicar.",
    color: "from-sky-500 to-indigo-500",
  },
  {
    step: "02",
    title: "Práctica",
    pts: 50,
    desc: "Ejercicios guiados con retroalimentación inmediata.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    step: "03",
    title: "Uso",
    pts: 50,
    desc: "Aplica lo aprendido en situaciones reales.",
    color: "from-violet-500 to-orange-500",
  },
];

const roles = [
  {
    icon: LuGraduationCap,
    title: "Estudiante",
    tag: "Aprendizaje activo",
    color: "text-indigo-600",
    ring: "ring-indigo-100",
    bg: "bg-indigo-50",
    items: [
      "Lecciones que se desbloquean al completar la anterior",
      "Rachas diarias y puntos acumulados",
      "Retroalimentación en cada intento",
    ],
    href: "/auth/activar/",
  },
  {
    icon: LuUsers,
    title: "Profesor",
    tag: "Panel docente",
    color: "text-violet-600",
    ring: "ring-violet-100",
    bg: "bg-violet-50",
    items: [
      "Crear, editar y publicar contenido",
      "Organizar por competencia y lapso",
      "Flujo claro de guardado y confirmación",
    ],
    href: "/auth/?mode=login",
  },
  {
    icon: LuShield,
    title: "Administrador",
    tag: "Control total",
    color: "text-emerald-600",
    ring: "ring-emerald-100",
    bg: "bg-emerald-50",
    items: [
      "Gestión de usuarios y roles",
      "Lista blanca de registro",
      "Configuración de escuelas y grados",
    ],
    href: "/auth/?mode=login",
  },
];

const perks = [
  {
    icon: LuFlame,
    title: "Rachas de estudio",
    text: "Mantén tu racha activa estudiando cada día y supera tu mejor marca.",
  },
  {
    icon: LuTrophy,
    title: "Mejor puntaje",
    text: "Tu récord nunca baja: cada intento puede mejorar tu score hasta el perfecto.",
  },
  {
    icon: LuLock,
    title: "Registro seguro",
    text: "Solo quienes están en la lista blanca pueden activar su cuenta.",
  },
  {
    icon: LuLayers,
    title: "Progreso por lapsos",
    text: "16 competencias distribuidas en 3 lapsos con seguimiento visual.",
  },
];

export default component$(() => {
  return (
    <div class="overflow-hidden">
      {/* Hero */}
      <section class="relative px-4 pb-20 pt-10 sm:pb-28 sm:pt-16">
        <div class="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div class="pointer-events-none absolute -right-16 top-32 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />

        <div class="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div class="moa-fade-up space-y-7">
            <span class="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-4 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur">
              <LuSparkles class="h-4 w-4 text-amber-500" />
              Sistema Educativo Web · Inglés MOA
            </span>

            <h1 class="text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Domina el inglés con{" "}
              <span class="moa-gradient-text">lecciones que evolucionan contigo</span>
            </h1>

            <p class="max-w-xl text-lg leading-relaxed text-slate-600">
              MOA combina presentación multimedia, práctica interactiva y uso real
              del idioma. Gana puntos, desbloquea competencias y consulta tu
              progreso en un campus diseñado para estudiantes, docentes y
              administradores.
            </p>

            <div class="flex flex-wrap gap-3">
              <Link
                href="/auth/?mode=login"
                class="moa-shine inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-indigo-600/25 transition hover:brightness-105"
              >
                Empezar ahora
                <LuArrowRight class="h-5 w-5" />
              </Link>
              <Link
                href="/auth/activar/"
                class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                Activar mi cuenta
              </Link>
            </div>

            <div class="flex flex-wrap gap-4 pt-2 text-sm text-slate-500">
              <span class="inline-flex items-center gap-1.5">
                <LuStar class="h-4 w-4 text-amber-500" />
                Hasta {MAX_POINTS_PER_LESSON} pts por lección
              </span>
              <span class="inline-flex items-center gap-1.5">
                <LuZap class="h-4 w-4 text-orange-500" />
                Desbloqueo secuencial
              </span>
            </div>
          </div>

          {/* Hero card mockup */}
          <div class="relative moa-fade-up lg:pl-4" style="animation-delay: 0.15s">
            <div class="moa-float moa-glass relative z-10 rounded-3xl border border-white/60 p-6 shadow-2xl shadow-indigo-500/10">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Tu progreso
                  </p>
                  <p class="mt-1 font-display text-2xl font-bold text-slate-900">
                    Competencia 3
                  </p>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                  <LuFlame class="h-4 w-4" />
                  7 días
                </span>
              </div>

              <div class="mt-6 space-y-3">
                {["Presentación", "Práctica", "Uso"].map((seg, i) => (
                  <div key={seg} class="rounded-2xl bg-slate-50/90 p-4">
                    <div class="mb-2 flex items-center justify-between text-sm">
                      <span class="font-semibold text-slate-800">{seg}</span>
                      <span class="text-indigo-600">
                        {i === 2 ? "50/50" : i === 1 ? "42/50" : "25/25"}
                      </span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: i === 1 ? "84%" : "100%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div class="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
                <span class="text-sm font-medium">Puntaje de lección</span>
                <span class="font-display text-xl font-bold">117 / 125</span>
              </div>
            </div>

            <div class="moa-float-delayed absolute -bottom-6 -left-4 z-20 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
              <p class="text-xs text-slate-500">Siguiente lección</p>
              <p class="font-semibold text-emerald-700">¡Desbloqueada!</p>
            </div>

            <div class="absolute -right-2 -top-4 z-0 h-full w-full rounded-3xl bg-gradient-to-br from-indigo-200/40 to-violet-200/30" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section class="border-y border-indigo-100/80 bg-white/60 px-4 py-10 backdrop-blur">
        <div class="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              class="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm"
            >
              <p class="font-display text-3xl font-black text-indigo-600">{s.value}</p>
              <p class="mt-1 font-semibold text-slate-900">{s.label}</p>
              <p class="text-sm text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metodología */}
      <section id="metodo" class="px-4 py-20 sm:py-24">
        <div class="mx-auto max-w-6xl">
          <div class="mx-auto max-w-2xl text-center">
            <p class="text-sm font-bold uppercase tracking-widest text-violet-600">
              Metodología MOA
            </p>
            <h2 class="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Tres segmentos, un camino claro al dominio
            </h2>
            <p class="mt-4 text-lg text-slate-600">
              Cada lección sigue el mismo ritmo pedagógico: comprender, practicar
              y usar. El sistema registra tu mejor puntaje en cada etapa.
            </p>
          </div>

          <div class="mt-14 grid gap-6 lg:grid-cols-3">
            {segments.map((seg, i) => (
              <article
                key={seg.step}
                class="moa-card-hover group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div
                  class={[
                    "absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition group-hover:opacity-30",
                    seg.color,
                  ].join(" ")}
                />
                <span class="font-display text-5xl font-black text-slate-100">
                  {seg.step}
                </span>
                <h3 class="relative mt-2 font-display text-xl font-bold text-slate-900">
                  {seg.title}
                </h3>
                <p class="relative mt-1 text-sm font-semibold text-indigo-600">
                  hasta {seg.pts} puntos
                </p>
                <p class="relative mt-3 text-slate-600">{seg.desc}</p>
                {i < segments.length - 1 ? (
                  <LuArrowRight class="absolute bottom-7 right-7 hidden h-5 w-5 text-slate-300 lg:block" />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" class="bg-slate-900 px-4 py-20 text-white sm:py-24">
        <div class="mx-auto max-w-6xl">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-indigo-300">
                Un campus, tres experiencias
              </p>
              <h2 class="mt-2 font-display text-3xl font-black sm:text-4xl">
                Cada rol tiene su panel
              </h2>
            </div>
            <p class="max-w-md text-slate-400">
              Estudiantes aprenden, profesores crean contenido y administradores
              controlan acceso y configuración desde un mismo ecosistema.
            </p>
          </div>

          <div class="mt-12 grid gap-6 lg:grid-cols-3">
            {roles.map((role) => (
              <article
                key={role.title}
                class="moa-card-hover flex flex-col rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <div class="flex items-start justify-between">
                  <span
                    class={[
                      "inline-flex rounded-2xl p-3 ring-4",
                      role.bg,
                      role.color,
                      role.ring,
                    ].join(" ")}
                  >
                    <role.icon class="h-7 w-7" />
                  </span>
                  <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                    {role.tag}
                  </span>
                </div>
                <h3 class="mt-5 font-display text-2xl font-bold">{role.title}</h3>
                <ul class="mt-4 flex-1 space-y-2.5 text-sm text-slate-300">
                  {role.items.map((item) => (
                    <li key={item} class="flex gap-2">
                      <LuTarget class="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={role.href}
                  class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-white"
                >
                  Acceder
                  <LuArrowRight class="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section class="px-4 py-20 sm:py-24">
        <div class="mx-auto max-w-6xl">
          <h2 class="text-center font-display text-3xl font-black text-slate-900 sm:text-4xl">
            Diseñado para mantenerte motivado
          </h2>
          <div class="mt-12 grid gap-5 sm:grid-cols-2">
            {perks.map((perk) => (
              <div
                key={perk.title}
                class="moa-card-hover flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <perk.icon class="h-6 w-6" />
                </span>
                <div>
                  <h3 class="font-display text-lg font-bold text-slate-900">
                    {perk.title}
                  </h3>
                  <p class="mt-1 text-slate-600">{perk.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="px-4 pb-24">
        <div class="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-orange-500 px-8 py-14 text-center text-white shadow-2xl shadow-indigo-600/30 sm:px-16">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.2),transparent_50%)]" />
          <div class="relative">
            <LuBookOpen class="mx-auto h-10 w-10 text-white/90" />
            <h2 class="mt-4 font-display text-3xl font-black sm:text-4xl">
              ¿Listo para tu próxima lección?
            </h2>
            <p class="mx-auto mt-3 max-w-xl text-lg text-indigo-100">
              Si ya tienes invitación en la lista blanca, activa tu cuenta en
              minutos. Si ya eres parte del campus, inicia sesión y continúa
              donde lo dejaste.
            </p>
            <div class="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/activar/"
                class="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                <LuPlay class="h-5 w-5" />
                Activar cuenta
              </Link>
              <Link
                href="/auth/?mode=login"
                class="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});
