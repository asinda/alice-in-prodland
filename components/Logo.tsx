import { SITE_NAME } from '../lib/site';

/**
 * Marque : un « J » tracé comme une piste de circuit. Un nœud et une barre en haut (l'empattement), la tige qui descend et se courbe,
 * et au bout un curseur de terminal (le « > _ » de la ligne de commande). Le trait suit la couleur du texte ;
 * le curseur suit la couleur de marque.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <circle cx="10.6" cy="6.4" r="1.9" fill="currentColor" />
      <path d="M12.6 6.4H21V18a6.25 6.25 0 0 1-12.5 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="6.6" y="10.2" width="3.8" height="5.6" rx="0.8" fill="var(--signal)" />
    </svg>
  );
}

export default function Logo({ className, nameClassName }: { className?: string; nameClassName?: string }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
      <LogoMark />
      <span className={nameClassName}>{SITE_NAME}</span>
    </span>
  );
}
