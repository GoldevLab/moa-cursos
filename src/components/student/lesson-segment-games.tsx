import { component$ } from "@builder.io/qwik";
import type { LessonSegment } from "~/lib/constants";
import type { LessonGameType, GameSubmission } from "~/lib/lesson-games";
import {
  buildMatchPairs,
  buildMeaningChoiceRound,
  buildMemoryMeaningPairs,
  buildMemoryPairs,
  buildPictureChoiceRound,
  buildSentenceOrderRound,
  buildSpellingRound,
  buildUsePictureRound,
  fillUseSentenceBlank,
  getSegmentGameUi,
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
  return ["rounded-2xl border-2 bg-white/90 p-5 sm:p-6", border].join(" ");
};

const chipClass = (segment: LessonSegment) => {
  if (segment === "presentation") return "bg-sky-100 text-sky-800";
  if (segment === "practice") return "bg-violet-100 text-violet-800";
  return "bg-amber-100 text-amber-900";
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
    const ui = getSegmentGameUi(segment, gameType);

    if (gameType === "meaning_choice") {
      return (
        <div class={shellClass(segment)}>
          <p
            class={[
              "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              chipClass(segment),
            ].join(" ")}
          >
            {ui.badge}
          </p>
          <MeaningChoiceGame
            key={`meaning-${props.gameSeed}`}
            prompt={props.meaningRound.prompt}
            emoji={props.meaningRound.emoji}
            term={props.meaningRound.term}
            options={props.meaningRound.options}
            seed={props.gameSeed}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={(selectedMeaningId) =>
              props.onSubmit$({ kind: "meaning_choice", selectedMeaningId })
            }
          />
        </div>
      );
    }

    if (gameType === "picture_choice") {
      return (
        <div class={shellClass(segment)}>
          <p
            class={[
              "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              chipClass(segment),
            ].join(" ")}
          >
            {ui.badge}
          </p>
          {props.pictureRound.sentence ? (
            <p class="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center text-xl font-black text-amber-950">
              {props.pictureRound.sentence}
            </p>
          ) : null}
          <PictureChoiceGame
            key={`picture-${props.gameSeed}`}
            prompt={props.pictureRound.prompt}
            options={props.pictureRound.options}
            seed={props.gameSeed}
            englishTerm={props.pictureRound.englishTerm}
            hintMeaning={props.pictureRound.hintMeaning}
            showTermLabels={props.segment === "use"}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={(selectedTerm) =>
              props.onSubmit$({ kind: "picture_choice", selectedTerm })
            }
          />
        </div>
      );
    }

    if (gameType === "memory_match") {
      return (
        <div class={shellClass(segment)}>
          <p
            class={[
              "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              chipClass(segment),
            ].join(" ")}
          >
            {ui.badge}
          </p>
          <MemoryMatchGame
            key={`memory-${props.gameSeed}`}
            pairs={props.memoryPairs}
            seed={props.gameSeed}
            disabled={props.disabled}
            onComplete$={() => props.onSubmit$({ kind: "memory_match" })}
          />
        </div>
      );
    }

    if (gameType === "spelling_build") {
      return (
        <div class={shellClass(segment)}>
          <p
            class={[
              "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              chipClass(segment),
            ].join(" ")}
          >
            {ui.badge}
          </p>
          <SpellingBuildGame
            key={`spelling-${props.gameSeed}`}
            round={props.spellingRound}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={(built) =>
              props.onSubmit$({ kind: "spelling_build", built })
            }
          />
        </div>
      );
    }

    if (gameType === "sentence_order") {
      return (
        <div class={shellClass(segment)}>
          <p
            class={[
              "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
              chipClass(segment),
            ].join(" ")}
          >
            {ui.badge}
          </p>
          <SentenceOrderGame
            key={`sentence-${props.gameSeed}`}
            round={props.sentenceRound}
            disabled={props.disabled}
            saving={props.saving}
            onSubmit$={(built) =>
              props.onSubmit$({ kind: "sentence_order", built })
            }
          />
        </div>
      );
    }

    return (
      <div class={shellClass(segment)}>
        <p
          class={[
            "mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
            chipClass(segment),
          ].join(" ")}
        >
          {ui.badge}
        </p>
        <MatchPairsGame
          key={`match-${props.gameSeed}`}
          pairs={props.matchPairs}
          seed={props.gameSeed}
          disabled={props.disabled}
          saving={props.saving}
          onSubmit$={(ratio, matches) =>
            props.onSubmit$({ kind: "match_pairs", matches })
          }
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

  const memoryPairs =
    input.segment === "presentation"
      ? buildMemoryMeaningPairs(vocab)
      : buildMemoryPairs(vocab);

  const matchPairs = buildMatchPairs(vocab);

  const spellingRound = buildSpellingRound(
    input.focus,
    input.gameSeed,
    input.segment === "use" ? input.useSentence : undefined,
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
