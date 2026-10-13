import { Helmet } from 'react-helmet-async';

export interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
}

export default function PageMeta({ title, description, canonical, robots }: PageMetaProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="robots" content={robots ?? 'index, follow'} />
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* a page that shouldn't be indexed (the 404) also shouldn't claim a canonical url */}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {canonical ? <meta property="og:url" content={canonical} /> : null}
    </Helmet>
  );
}
