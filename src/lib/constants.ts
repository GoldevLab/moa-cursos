export const MAX_POINTS_PER_LESSON = 125;
export const LESSONS_PER_COMPETENCY = 8;
export const SEGMENT_POINTS = {
  presentation: 25,
  practice: 50,
  use: 50,
} as const;

export type LessonSegment = keyof typeof SEGMENT_POINTS;

export const APP_NAME = "MOA Education";
