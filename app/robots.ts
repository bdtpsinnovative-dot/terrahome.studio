import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/sys-diag',  // Internal diagnostic page
          '/cart',      // Cart — ไม่มีประโยชน์ให้ Google crawl
          '/profile',   // User profile — private
          '/login',     // Login page — ไม่ควร index
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
