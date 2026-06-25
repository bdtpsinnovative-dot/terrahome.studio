import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/sys-diag',
    },
    sitemap: 'https://terrahome-studio.vercel.app/sitemap.xml',
  };
}
