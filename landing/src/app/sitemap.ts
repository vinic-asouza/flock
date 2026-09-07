import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'https://flockapp.com.br';

export function normalizeSiteUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

export function buildSitemapEntries(baseUrl: string): MetadataRoute.Sitemap {
  const origin = normalizeSiteUrl(baseUrl);

  return [
    {
      url: origin,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${origin}/waitlist`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return buildSitemapEntries(baseUrl);
}
