import { getPostById } from '../../../../lib/db';
import { notFound } from 'next/navigation';
import EditPostClient from './EditPostClient';

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(id);
  if (!post) notFound();
  return <EditPostClient post={post} />;
}
