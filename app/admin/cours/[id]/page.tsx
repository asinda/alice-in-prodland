import { getCourseById } from '../../../../lib/db';
import { getSchedule } from '../../../../lib/schedule';
import { notFound } from 'next/navigation';
import EditCoursClient from './EditCoursClient';

export default async function EditCours({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) notFound();
  const entry = getSchedule().find(e => e.slug === course.slug && e.kind === 'course' && e.status === 'pending');
  return <EditCoursClient course={course} scheduled={entry ? { id: entry.id, scheduledAt: entry.scheduledAt } : undefined} />;
}
