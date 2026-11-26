import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getLocalizedPosts } from '../../lib/localized-posts';
import { getCourses } from '../../lib/db';
import { getCourseTranslation } from '../../lib/courseTranslations';
import { kindOf } from '../../lib/severity';
import { categoriesOf } from '../../lib/categories';
import TopicExplorer, { type ExplorerPost } from '../../components/TopicExplorer';
import CourseRoute from '../../components/CourseRoute';
import Cover from '../../components/Cover';
import HeroSearch from '../../components/HeroSearch';
import NewsletterForm from '../../components/NewsletterForm';
import Reveal from '../../components/Reveal';
import styles from '../../styles/Editorial.module.css';

/** Ordre conseillé du parcours : les bases (Docker, Kubernetes), puis le système, puis l'entretien. Autres cours à la suite. */
function routeRank(title: string): number {
  const s = title.toLowerCase();
  if (s.includes('docker')) return 0;
  if (s.includes('kubernetes')) return 1;
  if (s.includes('rhel') || s.includes('linux')) return 2;
  if (s.includes('interview') || s.includes('entretien')) return 3;
  return 4;
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const tKind = await getTranslations({ locale, namespace: 'kind' });
  const tCat = await getTranslations({ locale, namespace: 'categories' });

  const raw = getLocalizedPosts(locale);
  const lead = raw[0];
  const posts: ExplorerPost[] = raw.slice(1).map(p => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags,
    dateLabel: p.date.slice(0, 10), kind: kindOf(p.tags), readTime: p.readTime, level: p.level,
  }));
  const leadCat = lead ? categoriesOf(lead.tags)[0] : null;

  const courses = getCourses({ status: 'published' })
    .map(c => {
      const tr = locale === 'en' ? getCourseTranslation(c.slug) : undefined;
      return { slug: c.slug, title: tr?.titleEn || c.title, description: tr?.descriptionEn || c.description, lessons: c.lessons.length };
    })
    .sort((a, b) => routeRank(a.title) - routeRank(b.title));

  return (
    <>
      <section className={styles.bHero}>
        <div className={styles.orbit} aria-hidden="true"><i /><i /></div>
        <div className={styles.coord}>
          <span>N 43°36′</span><span>E 01°26′</span><span>REV. {lead ? lead.date.slice(0, 7).replace('-', '.') : '----'}</span>
        </div>
        <h1 className={styles.bTitle}>{t.rich('heroTitle', { b: chunks => <b>{chunks}</b>, br: () => <br /> })}</h1>
        <p className={styles.bLead}>{t('heroLead')}</p>
        <HeroSearch count={raw.length} />
      </section>

      <Reveal className={styles.bRow}>
        {lead && leadCat && (
          <Link href={`/${locale}/blog/${lead.slug}`} className={`hud-box ${styles.plan}`}>
            <span className={styles.planMeta}>{t('planLabel')} · {tKind(kindOf(lead.tags))} · {lead.readTime} {t('readTime')}</span>
            <span className={styles.planTitle}>{lead.title}</span>
            <span className={styles.planText}>{lead.excerpt}</span>
            <span className={styles.planCover}><Cover category={leadCat} label={tCat(`${leadCat}.name`)} fit /></span>
            <span className={styles.planLegend}>
              <span><b>{raw.length}</b>{t('teleArticles')}</span>
              <span><b>{courses.length}</b>{t('teleCourses')}</span>
              <span><b>{courses.reduce((n, c) => n + c.lessons, 0)}</b>{t('teleLessons')}</span>
            </span>
          </Link>
        )}
        <section className={`hud-box ${styles.journal}`} aria-labelledby="journal-title">
          <h2 id="journal-title" className={styles.boxTitle}>{t('journalTitle')}</h2>
          <TopicExplorer posts={posts} locale={locale} limit={6} compact dense />
          <p className={styles.moreRow}>
            <Link href={`/${locale}/blog`} className={styles.textLink}>{t('viewAll')}</Link>
          </p>
        </section>
      </Reveal>

      <Reveal as="section" className={`hud-box ${styles.routeBox}`} aria-labelledby="route-title">
        <h2 id="route-title" className={styles.boxTitle}>{t('routeTitle')}</h2>
        <p className={styles.boxLead}>{t('routeLead')}</p>
        <CourseRoute courses={courses} locale={locale} />
        <p className={styles.moreRow}>
          <Link href={`/${locale}/cours`} className={styles.textLink}>{t('modulesAll')}</Link>
        </p>
      </Reveal>

      <Reveal as="section" className={`hud-box ${styles.followBox}`} aria-labelledby="follow-box-title">
        <div>
          <h2 id="follow-box-title" className={styles.boxTitle}>{t('nlTitle')}</h2>
          <p className={styles.followText}>{t('followText')}</p>
        </div>
        <NewsletterForm locale={locale} source="home" />
      </Reveal>
    </>
  );
}
