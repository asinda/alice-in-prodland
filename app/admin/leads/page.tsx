import { getMessages, getSubscribers } from '@/lib/leads';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default function AdminLeads() {
  const messages = getMessages().slice().reverse();
  const subscribers = getSubscribers().slice().reverse();
  const cell = { fontSize: '0.82rem', color: 'var(--text-muted)' } as const;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Abonnés</h1>
      </div>

      {messages.length > 0 && (
        <>
      <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem' }}>Messages ({messages.length})</h2>
        {messages.length === 0 ? (
          <p className={styles.empty}>Aucun message pour l&apos;instant.</p>
        ) : (
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Contact</th><th>Besoin</th><th>Message</th></tr></thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id}>
                  <td style={cell}>{m.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>
                    <a href={`mailto:${m.email}`} style={{ color: 'var(--text-heading)' }}>{m.name}</a>
                    <div style={cell}>{m.email}{m.company ? ` · ${m.company}` : ''}</div>
                  </td>
                  <td style={cell}>{m.need}</td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: '32rem' }}>{m.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
  
          </>
      )}

      <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem' }}>Abonnés newsletter ({subscribers.length})</h2>
      {subscribers.length === 0 ? (
        <p className={styles.empty}>Aucun abonné pour l&apos;instant.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Date</th><th>E-mail</th><th>Langue</th><th>Source</th></tr></thead>
          <tbody>
            {subscribers.map(s => (
              <tr key={s.email}>
                <td style={cell}>{s.createdAt.slice(0, 10)}</td>
                <td>{s.email}</td>
                <td style={cell}>{s.locale}</td>
                <td style={cell}>{s.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
