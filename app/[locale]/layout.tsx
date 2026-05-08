import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '../../i18n/routing';
import Link from 'next/link';
import FooterYear from '../../components/FooterYear';
import ReadingProgress from '../../components/ReadingProgress';
import LanguageSwitcher from '../../components/LanguageSwitcher';
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
    title: 'alice-in-prodland',
    description: t('description'),
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

  return (
    <NextIntlClientProvider locale={locale}>
      <ReadingProgress />
      <div className={styles.shell}>
        <header className={styles.header}>
          <nav className={styles.nav}>
            <Link href={`/${locale}`} className={styles.brand}>
              <span className={styles.prompt}>$</span>
              <span className={styles.brandName}>alice-in-prodland</span>
              <span className={styles.cursor}>▌</span>
            </Link>
            <div className={styles.links}>
              <Link href={`/${locale}/blog`} className={styles.navLink}>{t('blog')}</Link>
              <Link href={`/${locale}/cours`} className={styles.navLink}>{t('courses')}</Link>
              <Link href={`/${locale}/about`} className={styles.navLink}>{t('about')}</Link>
              <a
                href="https://github.com/asinda"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navLink}
              >
                {t('github')} ↗
              </a>
              <LanguageSwitcher currentLocale={locale} />
            </div>
          </nav>
        </header>

        <main className={styles.main}>{children}</main>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span className={styles.footerText}>
              {tFooter('built')} <span className={styles.heart}>{tFooter('heart')}</span>{' '}
              {tFooter('and')} <code>kubectl debug</code> {tFooter('sessions')}
            </span>
            <span className={styles.footerText}>
              © <FooterYear /> alice-in-prodland
            </span>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
