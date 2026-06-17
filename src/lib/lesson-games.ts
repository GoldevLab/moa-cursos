import { SEGMENT_POINTS, type LessonSegment } from "./constants";
import { getOptionEmoji } from "./lesson-emojis";

export type PracticeGameType = "memory_match" | "match_pairs";

/** Lecciones 2, 4, 6 y 8 de cada competencia usan minijuegos en Práctica. */
export const getPracticeGameType = (
  idLeccion: number,
): PracticeGameType | null => {
  const ordenEnCompetencia = ((idLeccion - 1) % 8) + 1;
  if (ordenEnCompetencia === 2 || ordenEnCompetencia === 6) {
    return "memory_match";
  }
  if (ordenEnCompetencia === 4 || ordenEnCompetencia === 8) {
    return "match_pairs";
  }
  return null;
};

export type MemoryPair = {
  id: string;
  emoji: string;
  term: string;
};

export type MatchPairItem = {
  id: string;
  emoji: string;
  term: string;
  meaning: string;
};

const cap = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const buildMemoryPairs = (
  vocabulary: { term: string; meaning: string }[],
): MemoryPair[] =>
  vocabulary.map((item, index) => ({
    id: `m-${index}`,
    emoji: getOptionEmoji(item.term),
    term: cap(item.term),
  }));

export const buildMatchPairs = (
  vocabulary: { term: string; meaning: string }[],
): MatchPairItem[] =>
  vocabulary.map((item, index) => ({
    id: `p-${index}`,
    emoji: getOptionEmoji(item.term),
    term: cap(item.term),
    meaning: item.meaning,
  }));

export const fisherYatesShuffle = <T>(items: T[], seed: number): T[] => {
  const arr = [...items];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const scoreFromRatio = (
  segment: LessonSegment,
  ratio: number,
): number => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const max = SEGMENT_POINTS[segment];
  return Math.round(max * clamped);
};

export const gradeMatchPairs = (
  pairs: MatchPairItem[],
  matchMap: Record<string, string>,
): number => {
  if (pairs.length === 0) return 0;
  let correct = 0;
  for (const pair of pairs) {
    if (matchMap[pair.id] === pair.id) correct += 1;
  }
  return correct / pairs.length;
};

export const PRACTICE_GAME_UI: Record<
  PracticeGameType,
  { emoji: string; title: string; hint: string; badge: string }
> = {
  memory_match: {
    emoji: "🧩",
    title: "¡Memoria MOA!",
    hint: "Voltea las tarjetas y une cada emoji con su palabra en inglés",
    badge: "Juego de memoria",
  },
  match_pairs: {
    emoji: "🔗",
    title: "¡Empareja!",
    hint: "Toca una palabra en inglés y luego su significado en español",
    badge: "Une las parejas",
  },
};
