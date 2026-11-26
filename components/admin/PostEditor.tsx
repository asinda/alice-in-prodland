'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { DbPost, IntegrationStatus } from '../../lib/db';
import {
  actionCreatePost, actionUpdatePost, actionPublishPost, actionUnpublishPost,
  actionDeletePost, actionRepushPostIntegrations, actionTranslatePost,
} from '../../lib/actions/posts';
import { actionRenderMarkdown } from '../../lib/actions/markdown';
import { actionTechReview } from '../../lib/actions/review';
import type { TechReviewOutput } from '../../lib/agents/techreview';
import postStyles from '../../styles/Post.module.css';
import admin from '../../styles/Admin.module.css';
import styles from '../../styles/AdminEditor.module.css';

type Level = '' | 'debutant' | 'intermediaire' | 'avance';
const LEVEL_LABEL: Record<Exclude<Level, ''>, string> = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

function IntegBadge({ status }: { status: IntegrationStatus }) {
  const cls = { idle: admin.badgeIdle, success: admin.badgePublished, error: admin.badgeError, skipped: admin.badgeSkipped }[status];
  return <span className={`${admin.badge} ${cls}`}>{status}</span>;
}

interface Props {
  /** Absent : création d'un nouvel article. */
  post?: DbPost;
  /** Statut de relecture (content-status) : « unreviewed » tant que l'agent n'est pas passé. */
  reviewStatus?: string;
}

/**
 * Éditeur d'article en trois volets : Markdown, aperçu fidèle au site, inspecteur avec liste de contrôle avant publication.
 * Ctrl+S enregistre. Les agents existants (relecture technique, traduction) sont lancés depuis la liste de contrôle.
 */
export default function PostEditor({ post, reviewStatus = 'unreviewed' }: Props) {
  const isNew = !post;
  type SaveState = { error?: string; success?: boolean } | null;
  const saveAction = (isNew ? actionCreatePost : actionUpdatePost) as (prev: SaveState, form: FormData) => Promise<SaveState>;
  const [state, action, saving] = useActionState<SaveState, FormData>(saveAction, null);

  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [tags, setTags] = useState(post?.tags.join(', ') ?? '');
  const [level, setLevel] = useState<Level>(post?.level ?? '');
  const [type, setType] = useState(post?.type ?? 'post');
  const [content, setContent] = useState(post?.content ?? '');

  const [html, setHtml] = useState('');
  const [rendering, startRender] = useTransition();
  const [reviewing, startReview] = useTransition();
  const [translating, startTranslate] = useTransition();
  const [review, setReview] = useState<TechReviewOutput | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [translateMsg, setTranslateMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Aperçu en direct, avec un léger délai pour ne pas rendre à chaque frappe
  useEffect(() => {
    const id = setTimeout(() => {
      startRender(async () => { setHtml(await actionRenderMarkdown(content)); });
    }, 350);
    return () => clearTimeout(id);
  }, [content]);

  // Ctrl+S / Cmd+S : enregistrer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); formRef.current?.requestSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tagList = useMemo(() => tags.split(',').map(t => t.trim()).filter(Boolean), [tags]);
  const dirty = !post || title !== post.title || excerpt !== post.excerpt || tags !== post.tags.join(', ')
    || level !== (post.level ?? '') || type !== post.type || content !== post.content;

  const titleOk = title.trim().length >= 20 && title.trim().length <= 70;
  const metaOk = excerpt.trim().length >= 50 && excerpt.trim().length <= 160 && tagList.length > 0;
  const reviewOk = reviewStatus !== 'unreviewed' || (review !== null && review.findings.length === 0);
  const translateOk = !!post?.contentEn;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const lines = content.split('\n').length;

  function runReview() {
    if (!post) return;
    setReviewError('');
    startReview(async () => {
      const r = await actionTechReview(post.slug);
      if (r.error) setReviewError(r.error); else setReview(r.result ?? null);
    });
  }
  function runTranslate(from: 'fr' | 'en') {
    if (!post) return;
    setTranslateMsg('');
    startTranslate(async () => {
      const r = await actionTranslatePost(post.id, from);
      setTranslateMsg(r.error ? `Erreur : ${r.error}` : from === 'fr' ? 'Traduction EN générée' : 'Traduction EN→FR appliquée');
    });
  }
  function copyCaption(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className={styles.editor}>
      <header className={styles.top}>
        <div className={styles.crumb}>
          <Link href="/admin/posts">Articles</Link>
          <span aria-hidden="true">/</span>
          <h1 className={styles.heading}>{title.trim() || 'Nouvel article'}</h1>
        </div>
        <div className={styles.topActions}>
          {post && <span className={`${admin.badge} ${post.status === 'published' ? admin.badgePublished : admin.badgeDraft}`}>{post.status}</span>}
          {dirty && !saving && <span className={styles.dirty}>Modifications non enregistrées</span>}
          {state?.success && !dirty && <span className={styles.saved}>✓ Enregistré</span>}
          {post && (
            <>
              <Link href={`/admin/posts/${post.id}/preview`} target="_blank" className={styles.ghost}>Aperçu ↗</Link>
              {post.status === 'published' && <Link href={`/blog/${post.slug}`} target="_blank" className={styles.ghost}>Voir ↗</Link>}
            </>
          )}
          <button type="submit" form="post-form" disabled={saving} className={styles.btn}>
            {saving ? 'Enregistrement…' : isNew ? 'Créer (brouillon)' : 'Enregistrer'}
          </button>
          {post && post.status === 'draft' && (
            <form action={actionPublishPost.bind(null, post.id)}>
              <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={dirty} title={dirty ? 'Enregistrez d’abord' : undefined}>Publier</button>
            </form>
          )}
          {post && post.status === 'published' && (
            <form action={actionUnpublishPost.bind(null, post.id)}>
              <button type="submit" className={styles.btn}>Dépublier</button>
            </form>
          )}
        </div>
      </header>

      {state?.error && <p className={admin.formError}>{state.error}</p>}

      <form id="post-form" ref={formRef} action={action} className={styles.panes}>
        {post && <input type="hidden" name="id" value={post.id} />}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="level" value={level} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="excerpt" value={excerpt} />
        <input type="hidden" name="tags" value={tags} />

        <section className={styles.pane} aria-label="Markdown">
          <div className={styles.paneHead}><span>article.md</span><span>{lines} lignes · {words} mots</span></div>
          <textarea
            name="content"
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck={false}
            className={styles.source}
            placeholder={'# Titre\n\nÉcris en Markdown…'}
            aria-label="Contenu en Markdown"
          />
        </section>

        <section className={styles.pane} aria-label="Aperçu">
          <div className={styles.paneHead}><span>aperçu</span><span>{rendering ? 'rendu…' : 'rendu du site'}</span></div>
          <div className={styles.preview}>
            {content.trim()
              ? <div className={postStyles.content} dangerouslySetInnerHTML={{ __html: html }} />
              : <p className={styles.hint}>Commence à écrire : l’aperçu apparaît ici.</p>}
          </div>
        </section>

        <aside className={styles.pane} aria-label="Inspecteur">
          <div className={styles.paneHead}><span>inspecteur</span><span>{post ? post.slug : 'brouillon'}</span></div>
          <div className={styles.inspector}>
            <label className={styles.field}>
              <span>Titre</span>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Mon article…" />
              <small className={titleOk ? styles.ok : styles.warn}>{title.trim().length} caractères · idéal 20 à 70</small>
            </label>
            <label className={styles.field}>
              <span>Extrait</span>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Une ou deux phrases de résumé" />
              <small className={excerpt.trim().length >= 50 && excerpt.trim().length <= 160 ? styles.ok : styles.warn}>{excerpt.trim().length} / 160</small>
            </label>
            <label className={styles.field}>
              <span>Tags</span>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="kubernetes, SRE, devops" />
              <span className={styles.chips}>{tagList.map(t => <span key={t} className={styles.chip}>{t}</span>)}</span>
            </label>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span>Niveau</span>
                <select value={level} onChange={e => setLevel(e.target.value as Level)}>
                  <option value="">Non renseigné</option>
                  {(Object.keys(LEVEL_LABEL) as Exclude<Level, ''>[]).map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Type</span>
                <select value={type} onChange={e => setType(e.target.value as 'post' | 'tutorial')}>
                  <option value="post">Article</option>
                  <option value="tutorial">Tutoriel</option>
                </select>
              </label>
            </div>

            <div>
              <p className={styles.label}>Avant de publier</p>
              <ul className={styles.check}>
                <li data-ok={titleOk}><i>{titleOk ? '✓' : ''}</i>Titre de bonne longueur</li>
                <li data-ok={metaOk}><i>{metaOk ? '✓' : ''}</i>Extrait et tags renseignés</li>
                <li data-ok={reviewOk}>
                  <i>{reviewOk ? '✓' : ''}</i>Relecture technique IA
                  {!isNew && !reviewOk && (
                    <button type="button" onClick={runReview} disabled={reviewing}>{reviewing ? '…' : 'Lancer'}</button>
                  )}
                </li>
                <li data-ok={translateOk}>
                  <i>{translateOk ? '✓' : ''}</i>Traduction EN
                  {!isNew && (
                    <button type="button" onClick={() => runTranslate('fr')} disabled={translating}>
                      {translating ? '…' : translateOk ? 'Refaire' : 'Traduire'}
                    </button>
                  )}
                </li>
              </ul>
              {isNew && <p className={styles.hint}>La relecture et la traduction sont disponibles après la création.</p>}
              {translateMsg && <p className={styles.ok}>{translateMsg}</p>}
              {reviewError && <p className={styles.warn}>{reviewError}</p>}
              {review && (
                <div className={styles.review}>
                  <p>{review.summary}</p>
                  {review.findings.length === 0
                    ? <p className={styles.ok}>Aucune remarque.</p>
                    : (
                      <ul>
                        {review.findings.map((f, i) => (
                          <li key={i}><b>{f.severity}</b>{f.line ? ` · ligne ${f.line}` : ''} : {f.problem}</li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
            </div>

            {post && (
              <div className={styles.danger}>
                {post.contentEn && (
                  <button type="button" className={styles.link} disabled={translating} onClick={() => runTranslate('en')}>Traduire EN → FR</button>
                )}
              </div>
            )}
          </div>
        </aside>
      </form>

      {post && (
        <div className={styles.below}>
          {post.status === 'published' && (
            <section className={admin.diffusion}>
              <div className={admin.diffusionHeader}>
                <span>Diffusion</span>
                <form action={actionRepushPostIntegrations.bind(null, post.id)}>
                  <button type="submit" className={admin.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>↺ Re-push</button>
                </form>
              </div>
              <div className={admin.diffusionRow}>
                <span className={admin.diffusionPlatform}>LinkedIn</span>
                <IntegBadge status={post.integrations.linkedin.status} />
                {post.integrations.linkedin.url && (
                  <a href={post.integrations.linkedin.url} target="_blank" rel="noreferrer" className={admin.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>Voir ↗</a>
                )}
                {post.integrations.linkedin.error && <span className={admin.diffusionError}>{post.integrations.linkedin.error}</span>}
              </div>
              <div className={admin.diffusionRow}>
                <span className={admin.diffusionPlatform}>TikTok</span>
                <IntegBadge status={post.integrations.tiktok.status} />
                {post.integrations.tiktok.id && (
                  <button type="button" onClick={() => copyCaption(post.integrations.tiktok.id!)} className={admin.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                    {copied ? '✓ Copié' : 'Copier caption'}
                  </button>
                )}
                {post.integrations.tiktok.error && <span className={admin.diffusionError}>{post.integrations.tiktok.error}</span>}
              </div>
            </section>
          )}
          <form action={actionDeletePost.bind(null, post.id)} className={styles.deleteForm}>
            <button type="submit" className={styles.deleteBtn} onClick={e => { if (!confirm('Supprimer définitivement ?')) e.preventDefault(); }}>
              Supprimer cet article
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
