// app/admin/review/page.tsx
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import ReviewClient from './ReviewClient'

export default async function ReviewPage() {
  const posts = getAllAdminPosts()
  const postsWithStatus = posts.map(p => ({
    ...p,
    contentStatus: getContentStatus(p.slug),
  }))

  const unreviewed = postsWithStatus.filter(p => p.contentStatus.status === 'unreviewed')
  const ready = postsWithStatus.filter(p => p.contentStatus.status === 'ready')
  const scheduled = postsWithStatus.filter(p => p.contentStatus.status === 'scheduled')

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '2rem' }}>Queue de révision</h1>
      <ReviewClient unreviewed={unreviewed} ready={ready} scheduled={scheduled} />
    </div>
  )
}
