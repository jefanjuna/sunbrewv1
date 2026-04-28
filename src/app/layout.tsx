import type { Metadata } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteNav } from '@/components/site-nav';

import './globals.css';

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading'
});

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'SUNBREW',
  description: 'A cinematic homework and payment bulletin board for class use.'
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <div className="relative isolate min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_28%)]" />
          <div className="relative">
            <SiteNav />
            <main className="sunbrew-shell pb-16 pt-5 sm:pt-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}