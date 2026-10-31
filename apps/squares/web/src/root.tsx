import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import { Box } from '@mui/material';
import { Links, Meta, Scripts } from 'react-router';
import AppLayout from './app/AppLayout';
import Header from './components/layout/Header';
import { ErrorFallback } from './components/feedback/ErrorBoundary';
import Providers from './app/providers';
import { gradients } from './types/gradients';
import { initFaro } from './utils/faro';

initFaro();

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Squares',
  url: 'https://squares.maxhq.io/',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  description:
    'Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Squares',
    url: 'https://squares.maxhq.io/',
  },
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="manifest" href="/site.webmanifest?v=2" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#060a14" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://squares.maxhq.io/" />
        <meta property="og:site_name" content="Squares" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content="Squares – NFL Football Squares Pools" />
        <meta
          property="og:description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <meta property="og:image" content="https://squares.maxhq.io/squares_logo.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Squares – NFL Football Squares Pools" />
        <meta
          name="twitter:description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <meta name="twitter:image" content="https://squares.maxhq.io/squares_logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <AppLayout />;
}

// show the real app shell while a client-only route hydrates
export function HydrateFallback() {
  return (
    <Box
      sx={{
        background: gradients.background,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header />
      <Box sx={{ flex: 1 }} />
    </Box>
  );
}

export function ErrorBoundary() {
  return <ErrorFallback />;
}
