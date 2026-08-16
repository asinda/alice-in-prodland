import bundle from '../data/courses-translations-bundle.json';

export interface LessonTranslation {
  titleEn: string;
  contentEn: string;
}

export interface CourseTranslation {
  titleEn: string;
  descriptionEn: string;
  lessons: Record<string, LessonTranslation>;
}

type Bundle = Record<string, CourseTranslation>;
const bundled = bundle as Bundle;

function validateSlug(slug: string): void {
  if (!/^[a-zA-Z0-9_/-]+$/.test(slug)) throw new Error('Invalid slug');
}

export function getCourseTranslation(courseSlug: string): CourseTranslation | null {
  validateSlug(courseSlug);
  return bundled[courseSlug] ?? null;
}

export function getLessonTranslation(courseSlug: string, lessonSlug: string): LessonTranslation | null {
  validateSlug(courseSlug);
  validateSlug(lessonSlug);
  return bundled[courseSlug]?.lessons?.[lessonSlug] ?? null;
}
