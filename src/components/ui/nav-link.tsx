import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

/** Enlace interno con prefetch SPA (hover) por defecto. */
export const NavLink = component$(
  (props: { href: string; class?: string; prefetch?: boolean }) => (
    <Link
      href={props.href}
      prefetch={props.prefetch ?? true}
      class={props.class}
    >
      <Slot />
    </Link>
  ),
);
