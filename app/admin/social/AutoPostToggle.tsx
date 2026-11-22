'use client'

import { useState, useTransition } from 'react'
import { actionSetAutoPost } from '@/lib/actions/social'

export default function AutoPostToggle({ enabled, forcedByEnv }: { enabled: boolean; forcedByEnv: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [on, setOn] = useState(enabled)

  const change = (next: boolean) => {
    if (next && !window.confirm(
      "Activer la publication automatique ? Les teasers générés par l'IA seront publiés sur LinkedIn, Instagram et YouTube SANS relecture."
    )) return
    setOn(next)
    startTransition(async () => { await actionSetAutoPost(next) })
  }

  return (
    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#e2e8f0', marginBottom: '1.5rem' }}>
      <input
        type="checkbox"
        checked={on || forcedByEnv}
        disabled={isPending || forcedByEnv}
        onChange={e => change(e.target.checked)}
      />
      Publier automatiquement sans validation
      {forcedByEnv && <span style={{ color: '#fbbf24' }}> (imposé par SOCIAL_AUTO_POST=true)</span>}
    </label>
  )
}
