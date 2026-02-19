import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SmartCOI',
    template: '%s | SmartCOI',
  },
  description:
    'AI-powered COI compliance tracking for commercial property managers',
  icons: {
    icon: '/favicon.svg',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://smartcoi.io'
  ),
  openGraph: {
    title: 'SmartCOI',
    description:
      'AI-powered COI compliance tracking for commercial property managers',
    siteName: 'SmartCOI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartCOI',
    description:
      'AI-powered COI compliance tracking for commercial property managers',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        DM Sans is loaded via Google Fonts stylesheet link.
        When deploying with next/font/google support, replace this <head> block
        with the next/font import for optimal self-hosting and performance.
      */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
