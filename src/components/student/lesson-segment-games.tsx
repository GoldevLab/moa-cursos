import { component$ } from "@builder.io/qwik";
import { LuVolume2 } from "@qwikest/icons/lucide";
import type { LessonSegment } from "~/lib/constants";
import type { LessonGameType, GameSubmission } from "~/lib/lesson-games";
import { speakWord } from "~/lib/lesson-sounds";
import {
  buildMatchPairs,
  buildMeaningChoiceRound,
  buildMemoryPairs,
  buildPictureChoiceRound,
  buildSentenceOrderRound,
  buildSpellingRound,
  buildUsePictureRound,
  fillUseSentenceBlank,
  formatSentenceOrderTemplate,
  type MeaningChoiceOption,
  type MemoryPair,
  type MatchPairItem,
  type PictureChoiceOption,
  type SentenceOrderRound,
  type SpellingRound,
} from "~/lib/lesson-games";
import { MatchPairsGame } from "./match-pairs-game";
import { MeaningChoiceGame } from "./meaning-choice-game";
import { MemoryMatchGame } from "./memory-match-game";
import { PictureChoiceGame } from "./picture-choice-game";
import { SentenceOrderGame } from "./sentence-order-game";
import { SpellingBuildGame } from "./spelling-build-game";

const shellClass = (segment: LessonSegment) => {
  const border =
    segment === "presentation"
      ? "border-sky-200/80"
      : segment === "practice"
        ? "border-violet-200/80"
        : "border-amber-200/80";
  return ["rounded-xl border bg-white/90 p-3 sm:p-4", border].join(" ");
};

export const LessonSegmentGameArena = component$(
  (props: {
    segment: LessonSegment;
    gameType: LessonGameType;
    gameSeed: number;
    disabled: boolean;
    saving: boolean;
    pictureRound: {
    prompt: string;
    options: PictureChoiceOption[];
    correctTerm: string;
    englishTerm?: string;
    spanishMeaning?: string;
    sentence?: string;
      hintMeaning?: string;
    };
    meaningRound: {
      prompt: string;
      emoji: string;
      term: string;
      options: MeaningChoiceOption[];
    };
    memoryPairs: MemoryPair[];
    matchPairs: MatchPairItem[];
    spellingRound: SpellingRound;
    sentenceRound: SentenceOrderRound;
    onSubmit$: (submission: GameSubmission) => void;
  }) => {
    const { segment, gameType } = props;

    if (gameType === "meaning_choice") {
      return (
        <div class={shellClass(segment)}>
          <MeaningChoiceGame
            key={`meaning-${props.gameSeed}`}
            prompt={props.meaningRound.prompt}
            emoji={props.meaningRound.emoji}
            term={props.meaningRound.term}
            options={props.meaningRound.options}
            seed={props.gameSeed}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={props.onSubmit$}
          />
        </div>
      );
    }

    if (gameType === "picture_choice") {
      const usePictureHeader = Boolean(props.pictureRound.sentence);
      return (
        <div class={shellClass(segment)}>
          {usePictureHeader ? (
            <div class="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-center">
              <p class="text-xl font-black text-amber-950">
                {props.pictureRound.sentence}
              </p>
              {props.pictureRound.prompt ? (
                <p class="mt-2 text-sm font-bold text-amber-800">
                  {props.pictureRound.prompt}
                </p>
              ) : null}
              {props.pictureRound.hintMeaning ? (
                <div class="mt-2 flex items-center justify-center gap-2">
                  <p class="text-sm font-semibold text-slate-600">
                    💡 Hint: {props.pictureRound.hintMeaning}
                  </p>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                    aria-label={`Escuchar «${props.pictureRound.hintMeaning}»`}
                    onClick$={() =>
                      void speakWord(props.pictureRound.hintMeaning!, "es")
                    }
                  >
                    <LuVolume2 class="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <PictureChoiceGame
            key={`picture-${props.gameSeed}`}
            prompt={usePictureHeader ? "" : props.pictureRound.prompt}
            options={props.pictureRound.options}
            seed={props.gameSeed}
            englishTerm={props.pictureRound.englishTerm}
            spanishMeaning={props.pictureRound.spanishMeaning}
            hintMeaning={usePictureHeader ? undefined : props.pictureRound.hintMeaning}
            showTermLabels={props.segment === "use"}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={props.onSubmit$}
          />
        </div>
      );
    }

    if (gameType === "memory_match") {
      return (
        <div class={shellClass(segment)}>
          <MemoryMatchGame
            key={`memory-${props.gameSeed}`}
            pairs={props.memoryPairs}
            seed={props.gameSeed}
            disabled={props.disabled}
            onSubmit$={props.onSubmit$}
          />
        </div>
      );
    }

    if (gameType === "spelling_build") {
      return (
        <div class={shellClass(segment)}>
          <SpellingBuildGame
            key={`spelling-${props.gameSeed}`}
            round={props.spellingRound}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={props.onSubmit$}
          />
        </div>
      );
    }

    if (gameType === "sentence_order") {
      return (
        <div class={shellClass(segment)}>
          <SentenceOrderGame
            key={`sentence-${props.gameSeed}`}
            round={props.sentenceRound}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={props.onSubmit$}
          />
        </div>
      );
    }

    return (
      <div class={shellClass(segment)}>
        <MatchPairsGame
          key={`match-${props.gameSeed}`}
          pairs={props.matchPairs}
          seed={props.gameSeed}
          disabled={props.disabled}
          saving={props.saving}
          onSubmit$={props.onSubmit$}
        />
      </div>
    );
  },
);

export const buildSegmentGameRounds = (input: {
  segment: LessonSegment;
  gameType: LessonGameType;
  gameSeed: number;
  vocabulary: { term: string; meaning: string }[];
  focusIndex: number;
  themeIndex: number;
  lessonSlot: number;
  focus: { term: string; meaning: string };
  useSentence?: string;
}) => {
  const vocab = input.vocabulary;
  const useFilled =
    input.useSentence && input.segment === "use"
      ? fillUseSentenceBlank(input.useSentence, input.focus.term)
      : undefined;

  const pictureRound =
    input.segment === "use" && input.useSentence
      ? buildUsePictureRound(
          vocab,
          input.focusIndex,
          input.themeIndex,
          input.lessonSlot,
          input.gameSeed,
          input.useSentence,
          input.focus.meaning,
        )
      : buildPictureChoiceRound(
          vocab,
          input.focusIndex,
          input.themeIndex,
          input.lessonSlot,
          input.gameSeed,
        );

  const meaningRound = buildMeaningChoiceRound(
    vocab,
    input.focusIndex,
    input.themeIndex,
    input.lessonSlot,
    input.gameSeed,
  );

  const memoryPairs = buildMemoryPairs(vocab);

  const matchPairs = buildMatchPairs(vocab);

  const spellingRound = buildSpellingRound(
    input.focus,
    input.gameSeed,
    input.segment === "use" && input.useSentence
      ? formatSentenceOrderTemplate(input.useSentence)
      : undefined,
  );

  const sentenceRound =
    useFilled && input.useSentence && input.segment === "use"
      ? buildSentenceOrderRound(
          useFilled,
          input.useSentence,
          input.focus.term,
          input.focus.meaning,
          input.gameSeed,
        )
      : {
          prompt: "",
          hintMeaning: undefined,
          sentenceWithBlank: "",
          shuffledWords: [],
          correctPhrase: "",
          emoji: "",
        };

  return {
    pictureRound,
    meaningRound,
    memoryPairs,
    matchPairs,
    spellingRound,
    sentenceRound,
  };
};
