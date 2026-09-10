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
  title: 'Pixel Studio — Online Image Editor',
  description:
    'A fast, familiar image editing workspace that runs in your browser.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  applicationName: 'Pixel Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#101114' }}>
      <head>
        <meta name="theme-color" content="#1f8fff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
