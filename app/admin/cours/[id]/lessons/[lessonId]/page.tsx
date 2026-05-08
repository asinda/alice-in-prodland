import { getCourseById } from '../../../../../../lib/db';
import { notFound } from 'next/navigation';
import EditLessonClient from './EditLessonClient';

export default async function EditLesson({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const course = getCourseById(id);
  if (!course) notFound();
  const lesson = course.lessons.find(l => l.id === lessonId);
  if (!lesson) notFound();
  return <EditLessonClient courseId={id} lesson={lesson} />;
}
