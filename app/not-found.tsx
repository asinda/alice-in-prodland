import NotFound from './[locale]/not-found';

/** 404 globale (adresse hors de toute page connue) : même contenu que la 404 localisée, avec des marges de page. */
export default function GlobalNotFound() {
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <NotFound />
    </div>
  );
}
