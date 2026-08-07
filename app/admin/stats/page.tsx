import styles from '../../../styles/Admin.module.css';

const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function StatsPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>~</span> Statistiques</h1>
        {token && (
          <a
            href="https://dash.cloudflare.com/?to=/:account/web-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            Ouvrir Cloudflare ↗
          </a>
        )}
      </div>

      {!token ? (
        <div className={styles.empty} style={{ marginTop: '2rem' }}>
          <p>Cloudflare Web Analytics non configuré.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            Ajoute <code>NEXT_PUBLIC_CF_BEACON_TOKEN</code> dans ton <code>.env.local</code>.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
            ✓ Tracking actif — beacon token configuré.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Le dashboard Cloudflare ne peut pas être intégré en iframe (politique de sécurité).
            Consulte les stats directement sur Cloudflare.
          </p>
          <a
            href="https://dash.cloudflare.com/?to=/:account/web-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
            style={{ display: 'inline-block' }}
          >
            Voir les statistiques sur Cloudflare ↗
          </a>
        </div>
      )}
    </>
  );
}
