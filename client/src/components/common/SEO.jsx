import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component
 * -----------------------------------------
 * Manages dynamically rendering page titles, descriptions, canonical URLs,
 * OpenGraph, Twitter tags, and structured JSON-LD data for search indexers.
 * -----------------------------------------
 */
const SEO = ({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  keywords,
  schemaJson,
}) => {
  const siteTitle = 'Local Store — Neighborhood E-Commerce';
  const displayTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const displayDescription = description || 'Fast and convenient online shopping from your local trusted shops.';
  const currentUrl = canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{displayTitle}</title>
      <meta name="description" content={displayDescription} />
      {keywords && <meta name="keywords" content={Array.isArray(keywords) ? keywords.join(', ') : keywords} />}
      <link rel="canonical" href={currentUrl} />

      {/* OpenGraph Metadata (Facebook/LinkedIn) */}
      <meta property="og:title" content={displayTitle} />
      <meta property="og:description" content={displayDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content="Local Store" />

      {/* Twitter Card Metadata */}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={displayTitle} />
      <meta name="twitter:description" content={displayDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Structured JSON-LD Data */}
      {schemaJson && (
        <script type="application/ld+json">
          {JSON.stringify(schemaJson)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
