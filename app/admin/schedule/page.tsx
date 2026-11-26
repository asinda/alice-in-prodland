// app/admin/schedule/page.tsx
import { getSchedule } from '@/lib/schedule'
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import { getCourses } from '@/lib/db'
import { getNotes } from '@/lib/notes'
import Link from 'next/link'
import { listDrafts } from '@/lib/social-drafts'
import { nextPublicationSlots } from '@/lib/schedule-slots'
import adminStyles from '@/styles/Admin.module.css'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const schedule = getSchedule()
  const allPosts = getAllAdminPosts()
  const pendingDrafts = listDrafts().filter(d => d.status === 'pending' || d.status === 'failed').length
  const readyPosts = allPosts.filter(p => getContentStatus(p.slug).status === 'ready')
  const notes = getNotes().map(n => ({ id: n.id, title: n.title, targetSlot: n.targetSlot, status: n.status }))

  return (
    <>
      <div className={adminStyles.pageHeader}>
        <div>
          <h1 className={adminStyles.pageTitle}>Calendrier de publication</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Créneaux : lundi, mercredi et vendredi à 9 h (heure de Paris). Tout est modifiable : déplacez, échangez, fixez une heure.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <Link href="/admin/notes" style={{ color: 'var(--signal)', fontWeight: 600, fontSize: '0.88rem' }}>Carnet d’idées →</Link>
          <Link href="/admin/social" style={{ color: 'var(--signal)', fontWeight: 600, fontSize: '0.88rem' }}>
            Posts sociaux à valider ({pendingDrafts})
          </Link>
        </div>
      </div>
      <ScheduleClient
        schedule={schedule}
        posts={allPosts.map(p => ({ slug: p.slug, title: p.title }))}
        readyPosts={readyPosts}
        slots={nextPublicationSlots(12).map(d => d.toISOString())}
        notes={notes}
        courses={getCourses().map(c => ({ slug: c.slug, title: c.title }))}
      />
    </>
  )
}
