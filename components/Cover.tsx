import type { CategorySlug } from '../lib/categories';
import styles from '../styles/Visual.module.css';

/** Couverture d'article : un schéma technique par rubrique (pas d'image externe, léger, thémable). */
export default function Cover({ category, label, fit = false }: { category: CategorySlug; label: string; fit?: boolean }) {
  return (
    <svg className={styles.cover} viewBox="0 0 400 240" role="img" aria-label={label} preserveAspectRatio={fit ? 'xMidYMid meet' : 'xMidYMid slice'}>
      <rect className={styles.coverBg} width="400" height="240" />
      <g className={styles.grid} aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} />)}
      </g>
      <g className={styles.ticks} aria-hidden="true">
        <path d="M14 26V14h12M374 14h12v12M386 214v12h-12M26 226H14v-12" />
      </g>
      <g className={styles.art} aria-hidden="true">{MOTIFS[category]}</g>
    </svg>
  );
}

const MOTIFS: Record<CategorySlug, React.ReactNode> = {
  'ia-llm': (
    <>
      {[[40, 70, 60], [110, 70, 90], [210, 70, 50], [270, 70, 80], [60, 120, 100], [170, 120, 60], [240, 120, 100], [40, 170, 80], [130, 170, 110]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height="28" rx="6" className={i === 4 ? styles.accentFill : undefined} />
      ))}
      <path d="M160 70 C160 20 330 20 330 70" className={styles.accentLine} />
    </>
  ),
  agents: (
    <>
      <circle cx="200" cy="120" r="30" className={styles.accentFill} />
      {[[80, 50], [320, 50], [80, 190], [320, 190]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r="18" /><line x1="200" y1="120" x2={x} y2={y} /></g>
      ))}
      <path d="M140 120 a60 60 0 0 1 120 0" className={styles.accentLine} />
    </>
  ),
  architecture: (
    <>
      <rect x="90" y="40" width="220" height="40" rx="6" />
      <rect x="70" y="100" width="260" height="40" rx="6" className={styles.accentFill} />
      <rect x="50" y="160" width="300" height="40" rx="6" />
      <line x1="200" y1="80" x2="200" y2="100" /><line x1="200" y1="140" x2="200" y2="160" />
    </>
  ),
  api: (
    <>
      <path d="M150 70 L100 120 L150 170" /><path d="M250 70 L300 120 L250 170" />
      <line x1="185" y1="95" x2="215" y2="95" className={styles.accentLine} />
      <line x1="215" y1="145" x2="185" y2="145" className={styles.accentLine} />
      <circle cx="200" cy="120" r="6" className={styles.accentFill} />
    </>
  ),
  automatisation: (
    <>
      <rect x="30" y="100" width="70" height="40" rx="8" /><rect x="165" y="50" width="70" height="40" rx="8" className={styles.accentFill} />
      <rect x="165" y="150" width="70" height="40" rx="8" /><rect x="300" y="100" width="70" height="40" rx="8" />
      <path d="M100 120 C130 120 135 70 165 70 M100 120 C130 120 135 170 165 170 M235 70 C265 70 270 120 300 120 M235 170 C265 170 270 120 300 120" />
    </>
  ),
  rag: (
    <>
      {[[40, 60], [40, 110], [40, 160]].map(([x, y], i) => <rect key={i} x={x} y={y} width="60" height="36" rx="4" />)}
      {[[190, 70], [220, 100], [200, 140], [250, 150], [270, 80], [235, 125]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 5 ? 9 : 5} className={i === 5 ? styles.accentFill : undefined} />
      ))}
      <path d="M100 128 C140 128 170 128 226 125" className={styles.accentLine} />
      <rect x="320" y="100" width="44" height="40" rx="6" />
    </>
  ),
  tutoriels: (
    <>
      <rect x="60" y="40" width="280" height="160" rx="10" />
      <path d="M90 88 L112 106 L90 124" className={styles.accentLine} />
      <line x1="130" y1="124" x2="200" y2="124" className={styles.accentLine} />
      <line x1="90" y1="156" x2="250" y2="156" /><line x1="90" y1="176" x2="190" y2="176" />
    </>
  ),
  transformation: (
    <>
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={60 + i * 70} y={170 - i * 36} width="60" height={30 + i * 36} rx="4" className={i === 3 ? styles.accentFill : undefined} />
      ))}
      <path d="M60 80 L330 40" className={styles.accentLine} />
    </>
  ),
  ops: (
    <>
      <line x1="30" y1="90" x2="370" y2="90" strokeDasharray="6 6" />
      <polyline points="30,150 80,150 100,150 120,70 140,190 160,150 230,150 250,110 270,160 290,150 370,150" className={styles.accentLine} />
      <circle cx="120" cy="70" r="7" className={styles.accentFill} />
    </>
  ),
};
