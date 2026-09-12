import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LibreLayer by Good Tools — Online Image Editor',
  description:
    'LibreLayer 0.5 Deep Canvas Update — a free, familiar browser-based image editor from Good Tools.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  applicationName: 'LibreLayer by Good Tools',
  other: {
    'application-version': '0.5.0',
    'release-name': 'Deep Canvas Update',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#101513' }}>
      <head>
        <meta name="theme-color" content="#22b884" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
