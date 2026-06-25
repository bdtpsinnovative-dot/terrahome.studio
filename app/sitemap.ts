import { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://terrahome-studio.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://terrahome-studio.vercel.app/prop',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://terrahome-studio.vercel.app/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://terrahome-studio.vercel.app/journal',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://terrahome-studio.vercel.app/contact',
      lastModified: new Date(),
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
      .select('collection_group_id, sku')
      .order('id', { ascending: false });

    if (products && products.length > 0) {
      const productPages: MetadataRoute.Sitemap = products.map((item) => ({
        url: `https://terrahome-studio.vercel.app/prop/${encodeURIComponent(item.collection_group_id)}/${encodeURIComponent(item.sku)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      }));
      return [...staticPages, ...productPages];
    }
  } catch (error) {
    console.error('Sitemap dynamic generation error:', error);
  }

  return staticPages;
}
