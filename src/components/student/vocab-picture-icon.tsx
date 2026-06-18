import { component$ } from "@builder.io/qwik";
import {
  LuBookOpen,
  LuClipboardList,
  LuLibrary,
  LuPresentation,
  LuTable2,
} from "@qwikest/icons/lucide";

/** Términos cuyo emoji no representa bien la palabra — Lucide solo en «elige imagen». */
const PICTURE_LUCIDE_TERMS = new Set([
  "board",
  "pizarra",
  "library",
  "biblioteca",
  "desk",
  "escritorio",
  "table",
  "mesa",
  "homework",
  "tarea",
  "notebook",
  "cuaderno",
]);

export const usesVocabPictureIcon = (term: string) =>
  PICTURE_LUCIDE_TERMS.has(term.trim().toLowerCase());

export const VocabPictureIcon = component$(
  (props: { term: string; emoji: string; class?: string }) => {
    const key = props.term.trim().toLowerCase();
    const iconClass = props.class ?? "h-16 w-16 text-violet-700";

    if (key === "board" || key === "pizarra") {
      return <LuPresentation class={iconClass} aria-hidden="true" />;
    }
    if (key === "library" || key === "biblioteca") {
      return <LuLibrary class={iconClass} aria-hidden="true" />;
    }
    if (key === "desk" || key === "escritorio") {
      return <LuTable2 class={iconClass} aria-hidden="true" />;
    }
    if (key === "table" || key === "mesa") {
      return <LuTable2 class={[iconClass, "text-amber-700"].join(" ")} aria-hidden="true" />;
    }
    if (key === "homework" || key === "tarea") {
      return <LuClipboardList class={iconClass} aria-hidden="true" />;
    }
    if (key === "notebook" || key === "cuaderno") {
      return <LuBookOpen class={iconClass} aria-hidden="true" />;
    }

    return (
      <span class="text-6xl leading-none" aria-hidden="true">
        {props.emoji}
      </span>
    );
  },
);
