import { listDrafts } from '@/lib/social-drafts'
import { isAutoPostEnabled } from '@/lib/agents/distribute'
import { getSettings } from '@/lib/settings'
import SocialClient from './SocialClient'
import AutoPostToggle from './AutoPostToggle'

export const dynamic = 'force-dynamic'

export default function SocialPage() {
  const drafts = listDrafts()
  const open = drafts.filter(d => d.status === 'pending' || d.status === 'failed')
  const history = drafts.filter(d => d.status === 'posted' || d.status === 'rejected').slice(0, 20)

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Validation des posts sociaux</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        {isAutoPostEnabled()
          ? 'Mode automatique actif : les posts sont publiés sans validation.'
          : 'Rien n’est publié sur LinkedIn, Instagram ou YouTube avant votre approbation.'}
      </p>
      <AutoPostToggle enabled={getSettings().autoPost} forcedByEnv={process.env.SOCIAL_AUTO_POST === 'true'} />
      <SocialClient open={open} history={history} />
    </div>
  )
}
