// src/app/layout.tsx
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Nav } from '@/components/Nav';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Wheel2Wheel – F1 Fantasy Picks',
  description: 'Pick the winner from 3 driver matchups each race week',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        <Providers>
          <Nav />
          <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
