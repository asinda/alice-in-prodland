import styles from '../../../styles/Admin.module.css';

const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const sharedLink = process.env.NEXT_PUBLIC_PLAUSIBLE_SHARED_LINK;

export default function StatsPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>~</span> Statistiques</h1>
        {domain && (
          <a
            href={`https://plausible.io/${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            Ouvrir Plausible ↗
          </a>
        )}
      </div>

      {!domain ? (
        <div className={styles.empty} style={{ marginTop: '2rem' }}>
          <p>Plausible non configuré.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            Ajoute <code>NEXT_PUBLIC_PLAUSIBLE_DOMAIN</code> dans ton <code>.env.local</code>,
            puis crée un compte sur{' '}
            <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">
              plausible.io
            </a>.
          </p>
        </div>
      ) : sharedLink ? (
        <iframe
          src={sharedLink}
          style={{
            width: '100%',
            height: 'calc(100vh - 160px)',
            border: 'none',
            borderRadius: '6px',
            marginTop: '1rem',
          }}
        />
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Tracking actif sur <strong>{domain}</strong>.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Pour afficher le dashboard ici, crée un lien partagé dans Plausible :{' '}
            <strong>Settings → Visibility → Public dashboard</strong>, puis ajoute l&apos;URL
            dans <code>NEXT_PUBLIC_PLAUSIBLE_SHARED_LINK</code>.
          </p>
          <a
            href={`https://plausible.io/${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
            style={{ display: 'inline-block', marginTop: '1rem' }}
          >
            Voir les stats sur Plausible ↗
          </a>
        </div>
      )}
    </>
  );
}
