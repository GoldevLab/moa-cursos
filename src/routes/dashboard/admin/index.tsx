import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { LuActivity, LuList, LuSettings, LuUsers } from "@qwikest/icons/lucide";
import { getProfessorStats, listUsuarios, listEscuelas } from "~/lib/progress";
import { listWhitelistEntries } from "~/lib/whitelist";

export const head: DocumentHead = {
  title: "Panel administrador | MOA",
};

export const useAdminSummary = routeLoader$(async () => {
  const [usuarios, whitelist, escuelas, stats] = await Promise.all([
    listUsuarios(),
    listWhitelistEntries(),
    listEscuelas(),
    getProfessorStats(),
  ]);
  return {
    totalUsuarios: usuarios.length,
    totalEstudiantes: stats.total_estudiantes,
    leccionesCompletadas: stats.lecciones_completadas,
    pendientesWhitelist: whitelist.filter((w) => !w.ya_registrado).length,
    totalEscuelas: escuelas.length,
  };
});

export default component$(() => {
  const summary = useAdminSummary();

  const cards = [
    {
      href: "/dashboard/admin/usuarios/",
      title: "Gestionar usuarios",
      value: summary.value.totalUsuarios,
      icon: LuUsers,
      color: "text-indigo-600",
    },
    {
      href: "/dashboard/admin/lista-blanca/",
      title: "Lista blanca",
      value: summary.value.pendientesWhitelist,
      subtitle: "pendientes de activar",
      icon: LuList,
      color: "text-violet-600",
    },
    {
      href: "/dashboard/admin/escuelas/",
      title: "Escuelas",
      value: summary.value.totalEscuelas,
      icon: LuSettings,
      color: "text-emerald-600",
    },
  ];

  return (
    <div class="space-y-6">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 class="text-3xl font-bold text-slate-900">Administración del sistema</h1>
        <p class="mt-2 text-slate-600">
          Gestiona usuarios, lista blanca y configuración general de MOA.
        </p>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl bg-indigo-50 p-4">
            <p class="text-xs font-semibold uppercase text-indigo-600">Estudiantes</p>
            <p class="mt-1 text-2xl font-bold">{summary.value.totalEstudiantes}</p>
          </div>
          <div class="rounded-2xl bg-violet-50 p-4">
            <p class="inline-flex items-center gap-1 text-xs font-semibold uppercase text-violet-600">
              <LuActivity class="h-3.5 w-3.5" />
              Lecciones hechas
            </p>
            <p class="mt-1 text-2xl font-bold">
              {summary.value.leccionesCompletadas}
            </p>
          </div>
          <div class="rounded-2xl bg-amber-50 p-4">
            <p class="text-xs font-semibold uppercase text-amber-700">Invitaciones</p>
            <p class="mt-1 text-2xl font-bold">
              {summary.value.pendientesWhitelist} pendientes
            </p>
          </div>
        </div>
      </section>

      <div class="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href + card.title}
            href={card.href}
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <card.icon class={`h-8 w-8 ${card.color}`} />
            <p class="mt-4 text-2xl font-bold text-slate-900">{card.value}</p>
            <p class="font-semibold text-slate-800">{card.title}</p>
            {card.subtitle ? (
              <p class="text-sm text-slate-500">{card.subtitle}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
});
