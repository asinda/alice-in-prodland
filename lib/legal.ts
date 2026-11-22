// Informations légales, surchargeables par variables d'environnement (NEXT_PUBLIC_*, figées au build).
export const LEGAL = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME ?? 'Alice Sindayigaya',
  /** Obligatoire (LCEN) : à renseigner via NEXT_PUBLIC_CONTACT_EMAIL */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  host: {
    name: process.env.NEXT_PUBLIC_HOST_NAME ?? 'Render',
    /** Adresse postale de l'hébergeur : à renseigner via NEXT_PUBLIC_HOST_ADDRESS (exigée par la LCEN) */
    address: process.env.NEXT_PUBLIC_HOST_ADDRESS ?? '',
    url: process.env.NEXT_PUBLIC_HOST_URL ?? 'https://render.com',
  },
  analytics: !!process.env.NEXT_PUBLIC_CF_BEACON_TOKEN,
} as const;
