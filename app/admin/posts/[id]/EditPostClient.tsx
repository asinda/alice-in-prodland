'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import type { DbPost, IntegrationStatus } from '../../../../lib/db';
import {
  actionUpdatePost, actionPublishPost, actionUnpublishPost,
  actionDeletePost, actionRepushPostIntegrations,
} from '../../../../lib/actions/posts';
import { actionRenderMarkdown } from '../../../../lib/actions/markdown';
import styles from '../../../../styles/Admin.module.css';

function IntegBadge({ status }: { status: IntegrationStatus }) {
  const cls = {
    idle: styles.badgeIdle,
    success: styles.badgePublished,
    error: styles.badgeError,
    skipped: styles.badgeSkipped,
  }[status];
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

export default function EditPostClient({ post }: { post: DbPost }) {
  const [state, action, pending] = useActionState(actionUpdatePost, null);
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState(post.content);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewing, startPreview] = useTransition();

  function switchToPreview() {
    setTab('preview');
    startPreview(async () => {
      const html = await actionRenderMarkdown(content);
      setPreviewHtml(html);
    });
  }

  function copyCaption(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>✦</span> {post.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/admin/posts" className={styles.btnSecondary}>← Retour</Link>
          <Link href={`/admin/posts/${post.id}/preview`} className={styles.btnSecondary} target="_blank">
            Aperçu ↗
          </Link>
          {post.status === 'published' && (
            <Link href={`/blog/${post.slug}`} className={styles.btnSecondary} target="_blank">
              Voir ↗
            </Link>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span className={`${styles.badge} ${post.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
          {post.status}
        </span>
        {post.status === 'draft' ? (
          <form action={actionPublishPost.bind(null, post.id)} style={{ display: 'inline' }}>
            <button type="submit" className={styles.btnGreen}>→ Publier</button>
          </form>
        ) : (
          <form action={actionUnpublishPost.bind(null, post.id)} style={{ display: 'inline' }}>
            <button type="submit" className={styles.btnSecondary}>Dépublier</button>
          </form>
        )}
        <form action={actionDeletePost.bind(null, post.id)} style={{ display: 'inline' }}>
          <button type="submit" className={styles.btnDanger}
            onClick={e => { if (!confirm('Supprimer définitivement ?')) e.preventDefault(); }}>
            Supprimer
          </button>
        </form>
      </div>

      <form action={action} className={styles.form}>
        <input type="hidden" name="id" value={post.id} />

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>type</label>
          <select name="type" defaultValue={post.type} className={styles.formSelect}>
            <option value="post">post</option>
            <option value="tutorial">tutorial</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>titre *</label>
          <input name="title" required defaultValue={post.title} className={styles.formInput} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>excerpt</label>
          <input name="excerpt" defaultValue={post.excerpt} className={styles.formInput} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>tags</label>
          <input name="tags" defaultValue={post.tags.join(', ')} className={styles.formInput} />
          <span className={styles.formHint}>séparés par des virgules</span>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.previewTabBar}>
            <label className={styles.formLabel}>contenu (markdown)</label>
            <div className={styles.previewTabs}>
              <button
                type="button"
                className={`${styles.previewTab} ${tab === 'edit' ? styles.previewTabActive : ''}`}
                onClick={() => setTab('edit')}
              >
                Éditer
              </button>
              <button
                type="button"
                className={`${styles.previewTab} ${tab === 'preview' ? styles.previewTabActive : ''}`}
                onClick={switchToPreview}
              >
                Aperçu
              </button>
            </div>
          </div>

          <textarea
            name="content"
            value={content}
            onChange={e => setContent(e.target.value)}
            className={styles.formTextarea}
            style={tab === 'preview' ? { display: 'none' } : {}}
          />

          {tab === 'preview' && (
            <div className={styles.previewPane}>
              {isPreviewing ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Rendu en cours…
                </p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          )}
        </div>

        {state?.error && <p className={styles.formError}>{state.error}</p>}
        {state?.success && <p className={styles.formSuccess}>✓ Sauvegardé</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={pending} className={styles.btnPrimary}>
            {pending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>

      {post.status === 'published' && (
        <section className={styles.diffusion}>
          <div className={styles.diffusionHeader}>
            <span>Diffusion</span>
            <form action={actionRepushPostIntegrations.bind(null, post.id)}>
              <button type="submit" className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                ↺ Re-push
              </button>
            </form>
          </div>

          <div className={styles.diffusionRow}>
            <span className={styles.diffusionPlatform}>LinkedIn</span>
            <IntegBadge status={post.integrations.linkedin.status} />
            {post.integrations.linkedin.url && (
              <a href={post.integrations.linkedin.url} target="_blank" rel="noreferrer" className={styles.btnSecondary}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                Voir ↗
              </a>
            )}
            {post.integrations.linkedin.error && (
              <span className={styles.diffusionError}>{post.integrations.linkedin.error}</span>
            )}
          </div>

          <div className={styles.diffusionRow}>
            <span className={styles.diffusionPlatform}>TikTok</span>
            <IntegBadge status={post.integrations.tiktok.status} />
            {post.integrations.tiktok.id && (
              <button type="button" onClick={() => copyCaption(post.integrations.tiktok.id!)}
                className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                {copied ? '✓ Copié' : 'Copier caption'}
              </button>
            )}
            {post.integrations.tiktok.error && (
              <span className={styles.diffusionError}>{post.integrations.tiktok.error}</span>
            )}
          </div>
        </section>
      )}
    </>
  );
}
