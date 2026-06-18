import { $, component$, useSignal } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { LuHome, LuPlay, LuUser, LuVolume2, LuVolumeX } from "@qwikest/icons/lucide";
import { NavLink } from "~/components/ui/nav-link";
import {
  isLessonSoundsMuted,
  setLessonSoundsMuted,
} from "~/lib/lesson-sounds";
import { routes } from "~/lib/routes";

export const StudentMobileNav = component$(
  (props: {
    continuarHref?: string | null;
    continuarLabel?: string;
  }) => {
    const loc = useLocation();
    const muted = useSignal(
      typeof window !== "undefined" ? isLessonSoundsMuted() : false,
    );

    const toggleMute = $(() => {
      const next = !muted.value;
      muted.value = next;
      setLessonSoundsMuted(next);
    });

    const path = loc.url.pathname;
    const isCampus =
      path.startsWith("/dashboard/estudiante") &&
      !path.includes("/leccion/") &&
      !path.includes("/competencia/");

    return (
      <div class="fixed bottom-0 left-0 right-0 z-40 border-t border-indigo-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md lg:hidden">
        <div class="mx-auto flex max-w-lg items-center justify-between gap-1">
          <NavLink
            href={routes.estudiante.campus}
            class={[
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-bold",
              isCampus ? "text-indigo-600" : "text-slate-500",
            ].join(" ")}
          >
            <LuHome class="h-5 w-5" />
            Campus
          </NavLink>

          {props.continuarHref ? (
            <NavLink
              href={props.continuarHref}
              class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-500/25"
            >
              <LuPlay class="h-4 w-4" />
              <span class="max-w-[9rem] truncate">
                {props.continuarLabel ?? "Seguir"}
              </span>
            </NavLink>
          ) : (
            <span class="flex-1 text-center text-[11px] font-semibold text-slate-400">
              ¡Sigue explorando!
            </span>
          )}

          <button
            type="button"
            onClick$={toggleMute}
            class="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-500"
            aria-label={muted.value ? "Activar sonidos" : "Silenciar sonidos"}
          >
            {muted.value ? (
              <LuVolumeX class="h-5 w-5" />
            ) : (
              <LuVolume2 class="h-5 w-5" />
            )}
            Sonido
          </button>

          <NavLink
            href={routes.cuenta}
            class={[
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-bold",
              path.startsWith("/dashboard/cuenta")
                ? "text-indigo-600"
                : "text-slate-500",
            ].join(" ")}
          >
            <LuUser class="h-5 w-5" />
            Cuenta
          </NavLink>
        </div>
      </div>
    );
  },
);
