import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { SITE_URL } from '../lib/site';
import '@fontsource-variable/jetbrains-mono';
import '../styles/globals.css';
import 'highlight.js/styles/github-dark.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
