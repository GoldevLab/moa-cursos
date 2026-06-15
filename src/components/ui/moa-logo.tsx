import { component$ } from "@builder.io/qwik";

type MoaLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

const sizes = {
  sm: { box: "h-8 w-8 text-xs", text: "text-sm" },
  md: { box: "h-10 w-10 text-sm", text: "text-base" },
  lg: { box: "h-12 w-12 text-base", text: "text-lg" },
};

export const MoaLogo = component$<MoaLogoProps>(
  ({ size = "md", showText = true }) => {
    const s = sizes[size];
    return (
      <span class="inline-flex items-center gap-2.5">
        <span
          class={[
            "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-orange-500 font-bold text-white shadow-lg shadow-indigo-500/25",
            s.box,
          ].join(" ")}
          aria-hidden="true"
        >
          M
          <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
        </span>
        {showText ? (
          <span class={["font-display font-bold tracking-tight text-slate-900", s.text].join(" ")}>
            MOA <span class="font-semibold text-indigo-600">Education</span>
          </span>
        ) : null}
      </span>
    );
  },
);
