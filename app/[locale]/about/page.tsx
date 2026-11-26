import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SITE_NAME } from '../../../lib/site';
import { findPortrait } from '../../../lib/portrait';
import JsonLd from '../../../components/JsonLd';
import styles from '../../../styles/AboutPage.module.css';
import ed from '../../../styles/Editorial.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: `${locale === 'fr' ? 'À propos' : 'About'} — ${SITE_NAME}`, description: t('description') };
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'about' });
  const fr = locale === 'fr';
  const portrait = findPortrait();

  const stack: [string, string][] = [
    ['Orchestration', 'Kubernetes · Helm · Rancher · k3s · OpenShift · EKS · GKE'],
    ['CI/CD & IaC', 'GitLab CI · Jenkins · Terraform · Ansible · Artifactory'],
    ['Cloud', 'GCP · AWS · OpenStack · GCP Deployment Manager'],
    ['DevSecOps', 'Trivy · Vault · Snyk · Sonar · SBOM/SLSA · mTLS'],
    [fr ? 'Observabilité' : 'Observability', 'Prometheus · Grafana · Loki · OpenSearch · Centreon'],
    [fr ? 'Bases de données' : 'Databases', 'MongoDB (Ops Manager, sharding, PBM) · PostgreSQL'],
    [fr ? 'Langages' : 'Languages', 'Python · Bash · Java · PHP'],
    [fr ? 'Langues parlées' : 'Spoken languages', fr ? 'Français · Anglais · Kirundi · Swahili' : 'French · English · Kirundi · Swahili'],
  ];

  const timeline: { year: string; title: string; desc: string }[] = [
    { year: '2024', title: fr ? 'DevOps Engineer — Responsable de plateforme' : 'DevOps Engineer — Platform Lead', desc: fr ? 'Plateformes PaaS OpenSearch & MongoDB — GitLab CI/CD full-IaC, DevSecOps, production 24/7' : 'PaaS platforms OpenSearch & MongoDB — GitLab CI/CD full-IaC, DevSecOps, 24/7 production' },
    { year: '2021', title: fr ? 'DevOps Engineer — Plateforme ELK Mission Critical' : 'DevOps Engineer — Mission Critical ELK Platform', desc: 'Inetum · Airbus DS/Geo — HA, P1/P2, Ansible · Terraform · Grafana · Prometheus' },
    { year: '2021', title: 'DevOps Engineer — CI/CD', desc: `Neosoft · BPCE-IT — ${fr ? 'chaîne CI/CD pour SI bancaire critique' : 'CI/CD pipeline for critical banking IS'} (GitLab · Sonar · Artifactory · Jenkins)` },
    { year: '2018', title: fr ? 'DevOps Engineer — Infrastructure & Cybersécurité' : 'DevOps Engineer — Infrastructure & Cybersecurity', desc: `CTS IT — ${fr ? 'supervision réseau' : 'network monitoring'}, Ansible · GitLab CI · Kubernetes · OpenShift · AWS` },
    { year: '2018', title: fr ? 'Stagiaire Développeuse Web' : 'Web Developer Intern', desc: `Airbus Operations SAS — ${fr ? 'web services Python/Flask, outillage DevOps' : 'Python/Flask web services, DevOps tooling'}` },
    { year: '2016', title: fr ? 'Master 2 Informatique — Mention Bien' : 'MSc Computer Science — Merit', desc: fr ? 'Université Clermont Auvergne · Systèmes distribués & cloud computing' : 'Université Clermont Auvergne · Distributed systems & cloud computing' },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1 className={styles.name}>Alice Sindayigaya</h1>
          <p className={styles.role}>{t('role')}</p>
          <p className={styles.meta}>{t('meta')}</p>
          <div className={styles.bio}>
            {fr ? (
              <>
                <p>Ingénieure DevOps/SRE avec 10+ ans d&apos;expérience dans des environnements critiques. Experte en Kubernetes, GCP, IaC et observabilité. Je conçois, déploie et opère des plateformes cloud bout-en-bout.</p>
                <p>Ce blog est mon espace de partage — post-mortems honnêtes, cheatsheets pratiques, et les rabbit holes dans lesquels je suis tombée pour que tu n&apos;aies pas à le faire.</p>
              </>
            ) : (
              <>
                <p>DevOps/SRE engineer with 10+ years of experience in critical environments. Expert in Kubernetes, GCP, IaC and observability. I design, deploy and operate cloud platforms end-to-end.</p>
                <p>This blog is my space to share — honest post-mortems, practical cheatsheets, and the rabbit holes I fell into so you don&apos;t have to.</p>
              </>
            )}
          </div>
          <p className={styles.nameStory}>{t('nameStory')}</p>
          <div className={ed.heroActions}>
            <Link href={`/${locale}/blog`} className={ed.primaryBtn}>{t('ctaBlog')}</Link>
            <Link href={`/${locale}/cours`} className={ed.textLink}>{t('ctaCourses')}</Link>
          </div>
        </div>
        {portrait && (
          <Image src={portrait} alt="Alice Sindayigaya" width={360} height={440} className={styles.portrait} priority />
        )}
      </header>

      <section className={styles.section} aria-labelledby="about-stack">
        <h2 id="about-stack" className={styles.h2}>{t('stack')}</h2>
        <dl className={styles.stack}>
          {stack.map(([k, v]) => (
            <div key={k} className={styles.stackRow}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="about-path">
        <h2 id="about-path" className={styles.h2}>{t('path')}</h2>
        <ol className={styles.timeline}>
          {timeline.map((e, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.year}>{e.year}</span>
              <div>
                <p className={styles.stepTitle}>{e.title}</p>
                <p className={styles.stepDesc}>{e.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="about-contact">
        <h2 id="about-contact" className={styles.h2}>{t('contact')}</h2>
        <ul className={styles.links}>
          <li><span>e-mail</span><a href="mailto:alicesindayigaya@gmail.com">alicesindayigaya@gmail.com</a></li>
          <li><span>GitHub</span><a href="https://github.com/asinda" target="_blank" rel="noopener noreferrer">github.com/asinda<span className="sr-only"> ({t('newTab')})</span> ↗</a></li>
          <li><span>LinkedIn</span><a href="https://linkedin.com/in/alicesindayigaya" target="_blank" rel="noopener noreferrer">linkedin.com/in/alicesindayigaya<span className="sr-only"> ({t('newTab')})</span> ↗</a></li>
        </ul>
      </section>

      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Person', name: 'Alice Sindayigaya',
        jobTitle: t('role'), sameAs: ['https://github.com/asinda', 'https://linkedin.com/in/alicesindayigaya'],
      }} />
    </div>
  );
}
