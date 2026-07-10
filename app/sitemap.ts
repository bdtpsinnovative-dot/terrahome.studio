import { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com';

// Use a stable date for static pages to avoid Google treating every deploy as a full re-crawl
const STATIC_UPDATED = new Date('2026-07-10');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: STATIC_UPDATED,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/prop`,
      lastModified: STATIC_UPDATED,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: STATIC_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/journal`,
      lastModified: STATIC_UPDATED,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: STATIC_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: products } = await supabase
      .from('products')
      .select('collection_group_id, sku, updated_at')
      .not('collection_group_id', 'is', null) // ✅ กรอง null ออก — ป้องกัน /prop/null/... URLs
      .order('id', { ascending: false });

    if (products && products.length > 0) {
      const productPages: MetadataRoute.Sitemap = products.map((item) => ({
        url: `${SITE_URL}/prop/${encodeURIComponent(item.collection_group_id)}/${encodeURIComponent(item.sku)}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : STATIC_UPDATED,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
      return [...staticPages, ...productPages];
    }
  } catch (error) {
    console.error('Sitemap dynamic generation error:', error);
  }

  return staticPages;
}

