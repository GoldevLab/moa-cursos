import { $, component$, useSignal, type Signal } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { BreadcrumbTrail } from "~/components/student/student-ui";
import {
  getLessonEditorData,
  saveLessonContentPayload,
  updateLessonTitle,
  type LessonContentPayload,
} from "~/lib/lesson-content";
import { requireProfesorOrAdmin, ServerAuthError } from "~/lib/server-auth";

export const useLessonEditor = routeLoader$(async (event) => {
  const idLeccion = Number(event.params.idLeccion);
  return getLessonEditorData(idLeccion);
});

const saveContentAction = server$(async function (
  idLeccion: number,
  payload: LessonContentPayload,
) {
  try {
    await requireProfesorOrAdmin(this);
    await saveLessonContentPayload(idLeccion, payload);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

const saveTitleAction = server$(async function (idLeccion: number, titulo: string) {
  try {
    await requireProfesorOrAdmin(this);
    await updateLessonTitle(idLeccion, titulo);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return { ok: false as const, reason: error.code };
    }
    throw error;
  }
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useLessonEditor);
  return { title: data ? `Editar ${data.titulo} | MOA` : "Editor | MOA" };
};

const OPTION_LABELS = ["A", "B", "C", "D"];

export default component$(() => {
  const data = useLessonEditor();
  const message = useSignal("");
  const messageOk = useSignal(true);
  const saving = useSignal(false);

  const page = data.value;
  const titulo = useSignal(page?.titulo ?? "");
  const summary = useSignal(page?.content.summary ?? "");
  const vocab = useSignal(
    page?.content.vocabulary.map((v) => ({ ...v })) ?? [],
  );
  const quizPrompt = useSignal(page?.content.quiz.prompt ?? "");
  const quizOptions = useSignal([...(page?.content.quiz.options ?? [])]);
  const quizCorrect = useSignal(page?.content.quiz.correctIndex ?? 0);
  const practicePrompt = useSignal(page?.content.practice.prompt ?? "");
  const practiceOptions = useSignal([...(page?.content.practice.options ?? [])]);
  const practiceCorrect = useSignal(page?.content.practice.correctIndex ?? 0);
  const usePrompt = useSignal(page?.content.use.prompt ?? "");
  const useOptions = useSignal([...(page?.content.use.options ?? [])]);
  const useCorrect = useSignal(page?.content.use.correctIndex ?? 0);

  if (!page) {
    return <p class="text-slate-600">Lección no encontrada.</p>;
  }

  const save = $(async () => {
    saving.value = true;
    message.value = "";
    try {
      const payload: LessonContentPayload = {
        summary: summary.value.trim(),
        vocabulary: vocab.value.map((v) => ({
          term: v.term.trim(),
          meaning: v.meaning.trim(),
        })),
        quiz: {
          prompt: quizPrompt.value.trim(),
          options: quizOptions.value.map((o) => o.trim()),
          correctIndex: quizCorrect.value,
        },
        practice: {
          prompt: practicePrompt.value.trim(),
          options: practiceOptions.value.map((o) => o.trim()),
          correctIndex: practiceCorrect.value,
        },
        use: {
          prompt: usePrompt.value.trim(),
          options: useOptions.value.map((o) => o.trim()),
          correctIndex: useCorrect.value,
        },
      };

      const result = await saveContentAction(page.id_leccion, payload);
      if (!result.ok) {
        messageOk.value = false;
        message.value = "No tienes permiso para guardar este contenido.";
        return;
      }

      const titleResult = await saveTitleAction(page.id_leccion, titulo.value);
      if (!titleResult.ok) {
        messageOk.value = false;
        message.value = "No tienes permiso para guardar el título.";
        return;
      }

      messageOk.value = true;
      message.value = "Contenido guardado correctamente.";
    } catch {
      messageOk.value = false;
      message.value = "Error al guardar. Intenta de nuevo.";
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="space-y-6">
      <BreadcrumbTrail
        items={[
          { label: "Panel docente", href: "/dashboard/profesor/" },
          { label: "Contenido", href: "/dashboard/profesor/contenido/" },
          {
            label: page.competencia,
            href: `/dashboard/profesor/contenido/${page.id_competencia}/`,
          },
          { label: page.titulo },
        ]}
      />

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <label class="block">
            <span class="text-sm font-medium text-slate-600">Título de la lección</span>
            <input
              class="mt-1 w-full max-w-xl rounded-xl border border-slate-200 px-4 py-2 text-xl font-bold text-slate-900"
              value={titulo.value}
              onInput$={(e) => {
                titulo.value = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <p class="mt-2 text-sm text-slate-500">
            {page.competencia} · Lección {page.orden}
            {page.persisted ? " · Contenido en BD" : " · Borrador por defecto"}
          </p>
        </div>
        <button
          type="button"
          disabled={saving.value}
          onClick$={save}
          class="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {saving.value ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {message.value ? (
        <p
          class={[
            "rounded-xl px-4 py-3 text-sm",
            messageOk.value
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {message.value}
        </p>
      ) : null}

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Presentación — resumen</h2>
        <textarea
          class="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3"
          rows={3}
          value={summary.value}
          onInput$={(e) => {
            summary.value = (e.target as HTMLTextAreaElement).value;
          }}
        />
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="font-bold text-slate-900">Vocabulario</h2>
        <div class="mt-4 space-y-3">
          {vocab.value.map((item, index) => (
            <div key={index} class="grid gap-3 sm:grid-cols-2">
              <input
                class="rounded-xl border border-slate-200 px-4 py-2"
                placeholder="Término (inglés)"
                value={item.term}
                onInput$={(e) => {
                  const next = [...vocab.value];
                  next[index] = {
                    ...next[index],
                    term: (e.target as HTMLInputElement).value,
                  };
                  vocab.value = next;
                }}
              />
              <input
                class="rounded-xl border border-slate-200 px-4 py-2"
                placeholder="Significado (español)"
                value={item.meaning}
                onInput$={(e) => {
                  const next = [...vocab.value];
                  next[index] = {
                    ...next[index],
                    meaning: (e.target as HTMLInputElement).value,
                  };
                  vocab.value = next;
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <ExerciseEditor
        title="Presentación — pregunta"
        prompt={quizPrompt}
        options={quizOptions}
        correctIndex={quizCorrect}
      />
      <ExerciseEditor
        title="Práctica"
        prompt={practicePrompt}
        options={practiceOptions}
        correctIndex={practiceCorrect}
      />
      <ExerciseEditor
        title="Uso"
        prompt={usePrompt}
        options={useOptions}
        correctIndex={useCorrect}
      />
    </div>
  );
});

const ExerciseEditor = component$(
  (props: {
    title: string;
    prompt: Signal<string>;
    options: Signal<string[]>;
    correctIndex: Signal<number>;
  }) => (
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="font-bold text-slate-900">{props.title}</h2>
      <label class="mt-4 block">
        <span class="text-sm font-medium text-slate-600">Pregunta</span>
        <input
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2"
          value={props.prompt.value}
          onInput$={(e) => {
            props.prompt.value = (e.target as HTMLInputElement).value;
          }}
        />
      </label>
      <div class="mt-4 space-y-2">
        <p class="text-sm font-medium text-slate-600">Opciones (marca la correcta)</p>
        {props.options.value.map((option, index) => (
          <div key={index} class="flex items-center gap-3">
            <input
              type="radio"
              name={`correct-${props.title}`}
              checked={props.correctIndex.value === index}
              onChange$={() => {
                props.correctIndex.value = index;
              }}
            />
            <span class="w-6 text-sm font-bold text-slate-500">
              {OPTION_LABELS[index] ?? index + 1}
            </span>
            <input
              class="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2"
              value={option}
              onInput$={(e) => {
                const next = [...props.options.value];
                next[index] = (e.target as HTMLInputElement).value;
                props.options.value = next;
              }}
            />
          </div>
        ))}
      </div>
    </section>
  ),
);
