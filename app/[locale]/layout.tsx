import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '../../i18n/routing';
import Link from 'next/link';
import Script from 'next/script';
import FooterYear from '../../components/FooterYear';
import ReadingProgress from '../../components/ReadingProgress';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import GlassGlow from '../../components/GlassGlow';
import KeyboardShortcuts from '../../components/KeyboardShortcuts';
import BrandWord from '../../components/BrandWord';
import { LogoMark } from '../../components/Logo';
import FooterFollow from '../../components/FooterFollow';
import FollowDialog from '../../components/FollowDialog';
import SiteNav from '../../components/SiteNav';
import SearchPalette from '../../components/SearchPalette';
import ThemeToggle from '../../components/ThemeToggle';
import { getLocalizedPosts } from '../../lib/localized-posts';
import { SITE_NAME } from '../../lib/site';
import styles from '../../styles/Layout.module.css';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: SITE_NAME,
    description: t('description'),
    alternates: { types: { 'application/rss+xml': `/rss.xml?lang=${locale}` } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'nav' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });
  const tFollow = await getTranslations({ locale, namespace: 'follow' });
  const localized = getLocalizedPosts(locale);
  const searchItems = localized.map(p => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags,
  }));

  return (
    <NextIntlClientProvider locale={locale}>
      {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          strategy="afterInteractive"
        />
      )}
      <a href="#main" className="skip-link">{tA11y('skip')}</a>
      <ReadingProgress />
      <KeyboardShortcuts locale={locale} />
      <GlassGlow />
      <div className={styles.shell}>
        <header className={styles.header}>
          <nav className={styles.nav} aria-label={tA11y('mainNav')}>
            <Link href={`/${locale}`} className={styles.brand}>
              <LogoMark />
              <BrandWord className={styles.brandName} text={SITE_NAME} />
            </Link>
            <SiteNav
              locale={locale}
              labels={{
                blog: t('blog'), library: t('library'), courses: t('courses'), about: t('about'),
                menu: tA11y('menu'), close: tA11y('closeMenu'), follow: tFollow('button'),
              }}
            >
              <SearchPalette items={searchItems} locale={locale} />
              <ThemeToggle />
              <LanguageSwitcher currentLocale={locale} ariaLabel={tA11y('langLabel')} />
              <FollowDialog locale={locale} />
            </SiteNav>
          </nav>
        </header>

        <main id="main" className={styles.main}>{children}</main>

        <footer className={styles.footer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href={`/${locale}`} className={styles.brand}>
                <LogoMark />
                <BrandWord className={styles.brandName} text={SITE_NAME} />
              </Link>
              <p className={styles.footerTagline}>{tFooter('tagline')}</p>
              <p className={styles.footerSmall}>
                {tFooter('built')} <span className={styles.heart}>{tFooter('heart')}</span>{' '}
                {tFooter('and')} <code>kubectl debug</code> {tFooter('sessions')}
              </p>
            </div>
            <nav className={styles.footerCol} aria-label={tFooter('explore')}>
              <p className={styles.footerHead}>{tFooter('explore')}</p>
              <Link href={`/${locale}/blog`}>{t('blog')}</Link>
              <Link href={`/${locale}/cours`}>{t('courses')}</Link>
              <Link href={`/${locale}/glossaire`}>{t('glossary')}</Link>
              <Link href={`/${locale}/bibliotheque`}>{t('library')}</Link>
            </nav>
            <nav className={styles.footerCol} aria-label={tFooter('follow')}>
              <p className={styles.footerHead}>{tFooter('follow')}</p>
              <FooterFollow label={tFooter('newsletter')} className={styles.footerBtn} />
              <a href={`/rss.xml?lang=${locale}`}>RSS</a>
              <a href="https://www.linkedin.com/in/alicesindayigaya" target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> {tA11y('newTab')}</span></a>
              <a href="https://github.com/asinda" target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> {tA11y('newTab')}</span></a>
            </nav>
            <nav className={styles.footerCol} aria-label={tFooter('about')}>
              <p className={styles.footerHead}>{tFooter('about')}</p>
              <Link href={`/${locale}/about`}>{t('about')}</Link>
              <Link href={`/${locale}/legal`}>{tFooter('legal')}</Link>
              <Link href={`/${locale}/privacy`}>{tFooter('privacy')}</Link>
            </nav>
          </div>
          <p className={styles.footerCopy}>© <FooterYear /> {SITE_NAME}</p>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
