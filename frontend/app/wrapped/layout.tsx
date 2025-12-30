import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Wrapped - Unwrapped for Plex',
  description: 'Your year in entertainment. Discover your watch time, top movies, favorite shows, and more.',
  keywords: ['plex', 'wrapped', 'movies', 'tv shows', 'streaming', 'entertainment', 'statistics'],
  authors: [{ name: 'Unwrapped for Plex' }],
  openGraph: {
    title: 'Unwrapped for Plex',
    description: 'Your year in entertainment wrapped up.',
    type: 'website',
    siteName: 'Unwrapped for Plex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unwrapped for Plex',
    description: 'Your year in entertainment wrapped up.',
  },
  themeColor: '#ff6b35',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WrappedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
