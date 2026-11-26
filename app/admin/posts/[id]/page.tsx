import { getPostById } from '../../../../lib/db';
import { getContentStatus } from '../../../../lib/content-status';
import { notFound } from 'next/navigation';
import PostEditor from '../../../../components/admin/PostEditor';

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(id);
  if (!post) notFound();
  return <PostEditor post={post} reviewStatus={getContentStatus(post.slug).status} />;
}
