/** Données structurées schema.org. `<` est échappé pour qu'aucun contenu ne puisse fermer la balise <script>. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
