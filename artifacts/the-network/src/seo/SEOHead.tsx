import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImageAlt?: string;
  schema?: object | object[];
  keywords?: string;
  robots?: string;
}

export const SITE_URL = 'https://the-network.co.in';
const DEFAULT_IMAGE = `${SITE_URL}/icons/icon-512x512.png`;

export default function SEOHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  ogImageAlt = 'The Network student networking platform',
  schema,
  keywords,
  robots = 'index, follow',
}: SEOHeadProps) {
  const fullTitle = title.includes('The Network') ? title : `${title} | The Network`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
  const image = ogImage || DEFAULT_IMAGE;

  const schemaArray = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="The Network" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      <meta name="twitter:url" content={canonicalUrl} />

      {/* Schema.org JSON-LD */}
      {schemaArray.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
