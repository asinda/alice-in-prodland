import type { Metadata } from 'next';
import styles from '../../styles/About.module.css';

export const metadata: Metadata = {
  title: 'About — alice-in-prodland',
  description: 'DevOps Architect · SRE · Platform Engineering. 10+ ans d\'expérience en environnements critiques. Kubernetes, GCP, IaC, observabilité.',
};

export default function About() {
  return (
    <div className={styles.page}>
      {/* Terminal */}
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
          <p className={styles.output}>10+ ans en production · éligible habilitation II 901</p>
          <p className={styles.line}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cursor}>▌</span>
          </p>
        </div>
      </div>

      {/* Bio */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>bio</p>
        <div className={styles.bio}>
          <p>
            Ingénieure DevOps/SRE avec 10+ ans d&apos;expérience dans des environnements critiques.
            Experte en Kubernetes, GCP, IaC et observabilité. Je conçois, déploie et opère des
            plateformes cloud bout-en-bout.
          </p>
          <p>
            Ce blog est mon espace de partage — post-mortems honnêtes, cheatsheets pratiques,
            et les rabbit holes dans lesquels je suis tombée pour que tu n&apos;aies pas à le faire.
          </p>
        </div>
      </section>

      {/* Stack */}
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
            <p className={styles.stackCategory}>Observabilité</p>
            <p className={styles.stackItems}>Prometheus · Grafana · Loki · OpenSearch · Centreon</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>Bases de données</p>
            <p className={styles.stackItems}>MongoDB (Ops Manager, sharding, PBM) · PostgreSQL</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>Langages</p>
            <p className={styles.stackItems}>Python · Bash · Java · PHP</p>
          </div>
          <div className={styles.stackCard}>
            <p className={styles.stackCategory}>Langues</p>
            <p className={styles.stackItems}>Français · Anglais · Kirundi · Swahili</p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>parcours</p>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2024</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>DevOps Engineer — Responsable de plateforme</p>
              <p className={styles.timelineDesc}>Plateformes PaaS OpenSearch & MongoDB — GitLab CI/CD full-IaC, DevSecOps, production 24/7</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2021</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>DevOps Engineer — Plateforme ELK Mission Critical</p>
              <p className={styles.timelineDesc}>Inetum · Airbus DS/Geo — HA, incidents P1/P2, Ansible · Terraform · Grafana · Prometheus</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2021</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>DevOps Engineer — CI/CD</p>
              <p className={styles.timelineDesc}>Neosoft · BPCE-IT — chaîne CI/CD pour SI bancaire critique (GitLab · Sonar · Artifactory · Jenkins)</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2018</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>DevOps Engineer — Infrastructure & Cybersécurité</p>
              <p className={styles.timelineDesc}>CTS IT — supervision réseau, Ansible · GitLab CI · Kubernetes · OpenShift · AWS</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2018</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>Stagiaire Développeuse Web</p>
              <p className={styles.timelineDesc}>Airbus Operations SAS — web services Python/Flask, outillage DevOps</p>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineYear}>2016</span>
            <div className={styles.timelineContent}>
              <p className={styles.timelineTitle}>Master 2 Informatique — Mention Bien</p>
              <p className={styles.timelineDesc}>Université Clermont Auvergne · Systèmes distribués & cloud computing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
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
            <a
              href="https://github.com/asinda"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactVal}
            >
              github.com/asinda ↗
            </a>
          </div>
          <div className={styles.contactRow}>
            <span className={styles.contactKey}>linkedin</span>
            <a
              href="https://linkedin.com/in/alicesindayigaya"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactVal}
            >
              linkedin.com/in/alicesindayigaya ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
