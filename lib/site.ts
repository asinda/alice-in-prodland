/** Nom public du site : un seul endroit à modifier pour le renommer. */
export const SITE_NAME = 'Jambo';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://alice-in-prodland.onrender.com').replace(/\/$/, '');
