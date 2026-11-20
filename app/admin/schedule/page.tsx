// app/admin/schedule/page.tsx
import { getSchedule } from '@/lib/schedule'
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import Link from 'next/link'
import { listDrafts } from '@/lib/social-drafts'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const schedule = getSchedule()
  const allPosts = getAllAdminPosts()
  const pendingDrafts = listDrafts().filter(d => d.status === 'pending' || d.status === 'failed').length
  const readyPosts = allPosts.filter(p => getContentStatus(p.slug).status === 'ready')

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Calendrier de publication</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Lundi, Mercredi, Vendredi à 9h00 (Paris)</p>
      <p style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/social" style={{ color: '#a78bfa' }}>
          → Posts sociaux à valider ({pendingDrafts})
        </Link>
      </p>
      <ScheduleClient schedule={schedule} readyPosts={readyPosts} />
    </div>
  )
}
