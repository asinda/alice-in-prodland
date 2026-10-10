const COPY = {
  fr: {
    title: 'Alice in Prodland — en construction',
    kicker: 'Chute en cours…',
    h1: 'Le terrier est en travaux',
    p: "Je creuse un nouveau site : j'apprends en public et je partage ce que je découvre, terrier après terrier. Reviens vite, ça descend bientôt.",
    note: 'Prochainement : des parcours d’apprentissage SRE / DevOps.',
  },
  en: {
    title: 'Alice in Prodland — under construction',
    kicker: 'Falling…',
    h1: 'The rabbit hole is under construction',
    p: "I'm digging a brand new site: I learn in public and share what I find, one rabbit hole at a time. Come back soon — the descent starts shortly.",
    note: 'Coming soon: SRE / DevOps learning paths.',
  },
} as const;

export function isMaintenanceOn(): boolean {
  return process.env.MAINTENANCE_MODE === 'true';
}

export function maintenanceHtml(locale: 'fr' | 'en'): string {
  const c = COPY[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${c.title}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100svh; display: grid; place-items: center;
    padding: 24px; text-align: center;
    background: radial-gradient(120% 90% at 50% 0%, #1b1440 0%, #0b0a1a 60%);
    color: #ece9ff; font-family: Georgia, 'Times New Roman', serif;
  }
  main { max-width: 34rem; }
  .kicker { font: 600 .8rem ui-monospace, Menlo, Consolas, monospace; letter-spacing: .15em; text-transform: uppercase; color: #ff4fd8; }
  h1 { font-size: clamp(1.8rem, 6vw, 3rem); line-height: 1.15; margin: .6rem 0 1rem; }
  p { font-size: clamp(1rem, 2.8vw, 1.15rem); line-height: 1.6; color: #c9c4ee; margin: 0 0 1.2rem; }
  .note { font: .85rem ui-monospace, Menlo, Consolas, monospace; color: #8f89c9; }
  .grin { font-size: 3rem; display: inline-block; animation: fall 3s ease-in-out infinite; }
  @keyframes fall { 0%,100% { transform: translateY(-8px); } 50% { transform: translateY(10px); } }
  @media (prefers-reduced-motion: reduce) { .grin { animation: none; } }
</style>
</head>
<body>
<main>
  <div class="grin" aria-hidden="true">🐇</div>
  <div class="kicker">${c.kicker}</div>
  <h1>${c.h1}</h1>
  <p>${c.p}</p>
  <div class="note">${c.note}</div>
</main>
</body>
</html>`;
}
