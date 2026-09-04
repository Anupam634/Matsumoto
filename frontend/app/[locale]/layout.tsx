import type { Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales } from '../../i18n';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bondkoinlabs.com';
const TITLE = 'BONDKOIN Labs | Next-Gen Node Mining on BNB Chain';
const DESCRIPTION =
  'Register free in seconds. No battery drain. Accumulate digital assets daily. Convert points directly to on-chain $BONDKOIN BEP-20 tokens on BNB Chain.';

// Open Graph + Twitter card: when a miner tweets their invite link (the
// "Post on X" bounty), X unfurls this image and title under the post.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'BONDKOIN Labs',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BONDKOIN — node mining on BNB Chain' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@BondKoin',
    creator: '@BondKoin',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

// viewport-fit=cover lets the auth/dashboard screens pad around the notch
// and home-indicator with env(safe-area-inset-*) instead of sitting under them.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Required for static rendering of the pages under this layout.
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-slate-950 text-slate-100">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
