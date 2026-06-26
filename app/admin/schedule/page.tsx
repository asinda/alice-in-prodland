// app/admin/schedule/page.tsx
import { getSchedule } from '@/lib/schedule'
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const schedule = getSchedule()
  const allPosts = getAllAdminPosts()
  const readyPosts = allPosts.filter(p => getContentStatus(p.slug).status === 'ready')

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Calendrier de publication</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Lundi, Mercredi, Vendredi à 9h00 (Paris)</p>
      <ScheduleClient schedule={schedule} readyPosts={readyPosts} />
    </div>
  )
}
