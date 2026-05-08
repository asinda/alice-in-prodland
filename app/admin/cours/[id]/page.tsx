import { getCourseById } from '../../../../lib/db';
import { notFound } from 'next/navigation';
import EditCoursClient from './EditCoursClient';

export default async function EditCours({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) notFound();
  return <EditCoursClient course={course} />;
}
