import type { LessonSegment } from "./constants";
import type { LessonContent, LessonExercise } from "./lesson-content";

export const resolveSegmentExercise = (
  content: LessonContent,
  segment: LessonSegment,
): LessonExercise => {
  if (segment === "presentation") return content.presentation.quiz;
  if (segment === "practice") return content.practice;
  return content.use;
};

export const gradeLessonAnswer = (
  content: LessonContent,
  segment: LessonSegment,
  selectedIndex: number,
): {
  correct: boolean;
  correctIndex: number;
  correctAnswer: string;
} | null => {
  const exercise = resolveSegmentExercise(content, segment);
  if (
    selectedIndex < 0 ||
    selectedIndex >= exercise.options.length ||
    exercise.correctIndex < 0 ||
    exercise.correctIndex >= exercise.options.length
  ) {
    return null;
  }

  return {
    correct: selectedIndex === exercise.correctIndex,
    correctIndex: exercise.correctIndex,
    correctAnswer: exercise.options[exercise.correctIndex] ?? "",
  };
};
