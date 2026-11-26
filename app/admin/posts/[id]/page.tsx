import { getPostById } from '../../../../lib/db';
import { getContentStatus } from '../../../../lib/content-status';
import { getSchedule } from '../../../../lib/schedule';
import { notFound } from 'next/navigation';
import PostEditor from '../../../../components/admin/PostEditor';

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(id);
  if (!post) notFound();
  const entry = getSchedule().find(e => e.slug === post.slug && e.status === 'pending');
  return (
    <PostEditor
      post={post}
      reviewStatus={getContentStatus(post.slug).status}
      scheduled={entry ? { id: entry.id, scheduledAt: entry.scheduledAt } : undefined}
    />
  );
}
