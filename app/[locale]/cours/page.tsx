import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import CourseModules from '../../../components/CourseModules';
import ed from '../../../styles/Editorial.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'courses' });
  return { title: `${t('title')} — Jambo` };
}

export default async function CoursIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  return (
    <>
      <header className={ed.pageHead}>
        <h1 className={ed.pageTitle}>{t('title')}</h1>
        <p className={ed.pageLead}>{t('subtitle')}</p>
      </header>

      <div className="hud-box">
        <CourseModules locale={locale} />
      </div>
    </>
  );
}
