import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { isRouteErrorResponse, Links, Meta, Scripts, useRouteError } from 'react-router';
import App from './App';
import ErrorPage from './pages/ErrorPage';
import NotFoundPage from './pages/NotFoundPage';
import Providers from './providers';
import { COLOR_SCHEME_STORAGE_KEY } from './theme';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Max Morhardt',
  url: 'https://maxstash.io/',
  jobTitle: 'Software Engineer',
  worksFor: {
    '@type': 'Organization',
    name: 'Fidelity Investments',
  },
  sameAs: ['https://github.com/maxmorhardt', 'https://www.linkedin.com/in/max-morhardt-60b9121b8/'],
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Max Morhardt" />
        <meta property="og:locale" content="en_US" />
        <meta
          property="og:image"
          content="https://maxstash.io/favicon/android-chrome-512x512.png"
        />
        {/* Twitter / X Card */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:image"
          content="https://maxstash.io/favicon/android-chrome-512x512.png"
        />
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {/* applies the stored color scheme before paint so there's no flash */}
        <InitColorSchemeScript
          attribute="class"
          defaultMode="dark"
          modeStorageKey={COLOR_SCHEME_STORAGE_KEY}
        />
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <App />;
}

// react-router renders this inside <Layout> whenever a route throws
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  return <ErrorPage />;
}
