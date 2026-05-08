import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import styles from '../../../styles/About.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: `about — alice-in-prodland`, description: t('description') };
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isFr = locale === 'fr';

  return (
    <div className={styles.page}>
      <div className={styles.terminal}>
        <div className={styles.terminalBar}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
          <span className={styles.terminalTitle}>alice@prodland ~ $</span>
        </div>
        <div className={styles.terminalBody}>
          <p className={styles.line}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cmd}>cat about.md</span>
          </p>
          <p className={styles.outputBold}>Alice Sindayigaya</p>
          <p className={styles.output}>DevOps Architect · SRE · Platform Engineering</p>
          <p className={styles.output}>Toulouse, France</p>
          <p className={styles.output}>&nbsp;</p>
          <p className={styles.line}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cmd}>uptime</span>
          </p>
          <p className={styles.output}>
            {isFr ? '10+ ans en production · éligible habilitation II 901' : '10+ years in production · eligible II 901 clearance'}
          </p>
          <p className={styles.line}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cursor}>▌</span>
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>{isFr ? 'bio' : 'bio'}</p>
        <div className={styles.bio}>
          {isFr ? (
            <>
              <p>Ingénieure DevOps/SRE avec 10+ ans d&apos;expérience dans des environnements critiques.
                Experte en Kubernetes, GCP, IaC et observabilité. Je conçois, déploie et opère des
                plateformes cloud bout-en-bout.</p>
              <p>Ce blog est mon espace de partage — post-mortems honnêtes, cheatsheets pratiques,
                et les rabbit holes dans lesquels je suis tombée pour que tu n&apos;aies pas à le faire.</p>
            </>
          ) : (
            <>
              <p>DevOps/SRE engineer with 10+ years of experience in critical environments.
                Expert in Kubernetes, GCP, IaC and observability. I design, deploy and operate
                cloud platforms end-to-end.</p>
              <p>This blog is my space to share — honest post-mortems, practical cheatsheets,
                and the rabbit holes I fell into so you don&apos;t have to.</p>
            </>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>stack</p>
        <div className={styles.stackGrid}>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>Orchestration</p>
            <p className={styles.stackItems}>Kubernetes · Helm · Rancher · k3s · OpenShift · EKS · GKE</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>CI/CD & IaC</p>
            <p className={styles.stackItems}>GitLab CI · Jenkins · Terraform · Ansible · Artifactory</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>Cloud</p>
            <p className={styles.stackItems}>GCP · AWS · OpenStack · GCP Deployment Manager</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>DevSecOps</p>
            <p className={styles.stackItems}>Trivy · Vault · Snyk · Sonar · SBOM/SLSA · mTLS</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>{isFr ? 'Observabilité' : 'Observability'}</p>
            <p className={styles.stackItems}>Prometheus · Grafana · Loki · OpenSearch · Centreon</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>{isFr ? 'Bases de données' : 'Databases'}</p>
            <p className={styles.stackItems}>MongoDB (Ops Manager, sharding, PBM) · PostgreSQL</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>{isFr ? 'Langages' : 'Languages'}</p>
            <p className={styles.stackItems}>Python · Bash · Java · PHP</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>{isFr ? 'Langues' : 'Spoken languages'}</p>
            <p className={styles.stackItems}>{isFr ? 'Français · Anglais · Kirundi · Swahili' : 'French · English · Kirundi · Swahili'}</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>{isFr ? 'parcours' : 'timeline'}</p>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2024</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>{isFr ? 'DevOps Engineer — Responsable de plateforme' : 'DevOps Engineer — Platform Lead'}</p>
              <p className={styles.timelineDesc}>{isFr ? 'Plateformes PaaS OpenSearch & MongoDB — GitLab CI/CD full-IaC, DevSecOps, production 24/7' : 'PaaS platforms OpenSearch & MongoDB — GitLab CI/CD full-IaC, DevSecOps, 24/7 production'}</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2021</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>{isFr ? 'DevOps Engineer — Plateforme ELK Mission Critical' : 'DevOps Engineer — Mission Critical ELK Platform'}</p>
              <p className={styles.timelineDesc}>Inetum · Airbus DS/Geo — HA, P1/P2, Ansible · Terraform · Grafana · Prometheus</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2021</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>DevOps Engineer — CI/CD</p>
              <p className={styles.timelineDesc}>Neosoft · BPCE-IT — {isFr ? 'chaîne CI/CD pour SI bancaire critique' : 'CI/CD pipeline for critical banking IS'} (GitLab · Sonar · Artifactory · Jenkins)</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2018</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>{isFr ? 'DevOps Engineer — Infrastructure & Cybersécurité' : 'DevOps Engineer — Infrastructure & Cybersecurity'}</p>
              <p className={styles.timelineDesc}>CTS IT — {isFr ? 'supervision réseau' : 'network monitoring'}, Ansible · GitLab CI · Kubernetes · OpenShift · AWS</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2018</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>{isFr ? 'Stagiaire Développeuse Web' : 'Web Developer Intern'}</p>
              <p className={styles.timelineDesc}>Airbus Operations SAS — {isFr ? 'web services Python/Flask, outillage DevOps' : 'Python/Flask web services, DevOps tooling'}</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2016</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>{isFr ? 'Master 2 Informatique — Mention Bien' : 'MSc Computer Science — Merit'}</p>
              <p className={styles.timelineDesc}>{isFr ? 'Université Clermont Auvergne · Systèmes distribués & cloud computing' : 'Université Clermont Auvergne · Distributed systems & cloud computing'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>contact</p>
        <div className={styles.contactList}>
          <div className={styles.contactRow}>
            <span className={styles.contactKey}>email</span>
            <a href="mailto:alicesindayigaya@gmail.com" className={styles.contactVal}>
              alicesindayigaya@gmail.com
            </a>
          </div>
          <div className={styles.contactRow}>
            <span className={styles.contactKey}>github</span>
            <a href="https://github.com/asinda" target="_blank" rel="noopener noreferrer" className={styles.contactVal}>
              github.com/asinda ↗
            </a>
          </div>
          <div className={styles.contactRow}>
            <span className={styles.contactKey}>linkedin</span>
            <a href="https://linkedin.com/in/alicesindayigaya" target="_blank" rel="noopener noreferrer" className={styles.contactVal}>
              linkedin.com/in/alicesindayigaya ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
