// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Nav } from '@/components/Nav';
import { Analytics } from '@vercel/analytics/react';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-mono',
});

const DESCRIPTION = 'Pick the winner from 3 driver head-to-head matchups each race week. Score points, compete in leagues, win the championship.';

// Social previews need an absolute address. Vercel supplies its own, so this
// works on a fresh deploy with nothing to configure; the override is only for
// a custom domain.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Wheel2Wheel – F1 Fantasy Picks',
    template: '%s · Wheel2Wheel',
  },
  description: DESCRIPTION,
  openGraph: {
    title: 'Wheel2Wheel – F1 Fantasy Picks',
    description: DESCRIPTION,
    siteName: 'Wheel2Wheel',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Wheel2Wheel', description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <Nav />
          <main id="main" style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
            {children}
          </main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
