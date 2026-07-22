import { Box } from '@mui/material';
import { Links, Meta, Scripts } from 'react-router';
import App from './App';
import Header from './components/header/Header';
import { ErrorFallback } from './pages/error/ErrorBoundary';
import Providers from './providers';
import { gradients } from './types/gradients';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Squares',
  url: 'https://squares.maxstash.io/',
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
    url: 'https://squares.maxstash.io/',
  },
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#121212" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://squares.maxstash.io/" />
        <meta property="og:site_name" content="Squares" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content="Squares – NFL Football Squares Pools" />
        <meta
          property="og:description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <meta property="og:image" content="https://squares.maxstash.io/squares_logo.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Squares – NFL Football Squares Pools" />
        <meta
          name="twitter:description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <meta name="twitter:image" content="https://squares.maxstash.io/squares_logo.png" />
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
  return <App />;
}

// shown during hydration of client-only (non-prerendered) routes; renders the
// real app shell (header + background) with an empty content area so it reads as
// the loaded app rather than a distinct loading page
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
