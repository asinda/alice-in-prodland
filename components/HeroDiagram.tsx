import styles from '../styles/Visual.module.css';

interface Labels { aria: string; request: string; retrieve: string; model: string; tools: string; answer: string; guard: string }

/** Schéma du hero : le trajet d'une requête IA en production. Animation discrète (flux pointillé), coupée si l'utilisateur la refuse. */
export default function HeroDiagram({ labels }: { labels: Labels }) {
  const nodes = [
    { label: labels.request },
    { label: labels.retrieve },
    { label: labels.model, accent: true },
    { label: labels.tools },
    { label: labels.answer },
  ];
  const W = 240, H = 46, GAP = 30, X = 60;
  const y = (i: number) => 10 + i * (H + GAP);
  return (
    <svg className={styles.hero} viewBox="0 0 360 410" role="img" aria-label={labels.aria}>
      <g aria-hidden="true">
        <path className={styles.flow} d={nodes.slice(0, -1).map((_, i) => `M${X + W / 2} ${y(i) + H} V${y(i + 1)}`).join(' ')} />
        {nodes.map((n, i) => (
          <g key={i}>
            <rect x={X} y={y(i)} width={W} height={H} rx="10" className={n.accent ? styles.nodeAccent : styles.node} />
            <text x={X + W / 2} y={y(i) + H / 2 + 5} textAnchor="middle" className={n.accent ? styles.nodeTextAccent : styles.nodeText}>{n.label}</text>
          </g>
        ))}
        <path className={styles.bracket} d={`M${X - 20} ${y(0) + 10} V${y(4) + H - 10}`} />
        <path className={styles.bracket} d={`M${X + W + 20} ${y(0) + 10} V${y(4) + H - 10}`} />
        <rect x="0" y="372" width="360" height="34" rx="9" className={styles.guard} />
        <text x="180" y="394" textAnchor="middle" className={styles.guardText}>{labels.guard}</text>
      </g>
    </svg>
  );
}
