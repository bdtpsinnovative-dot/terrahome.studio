const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/Por Woodden/Desktop/the_best/terrahome.studio/.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findMultipleImages() {
  const categories = [
    { key: "01_ORNAMENT", query: "Sculpture" },
    { key: "02_BOOKENDS", query: "BOOKED" },
    { key: "03_CANDLE_HOLDERS", query: "CANDLE" },
    { key: "04_DECORATIVE_OBJECTS", query: "Accessories" },
    { key: "05_DOLLS_TOYS", query: "Figure" },
    { key: "06_TABLEWARE", query: "Dining" },
    { key: "07_TRAYS", query: "Trays" },
    { key: "08_VESSELS", query: "Vase" },
    { key: "09_ART_WALL_DECOR", query: "Art" },
  ];

  const results = {};

  for (const cat of categories) {
    const { data: groups } = await supabase
      .from('collection_groups')
      .select('id, name, product_sup, cover_image_url')
      .ilike('tag', '%prop%')
      .ilike('product_sup', `%${cat.query}%`)
      .limit(10);

    const images = new Set();

    if (groups && groups.length > 0) {
      for (const g of groups) {
        if (g.cover_image_url && g.cover_image_url.startsWith('http')) {
          images.add(g.cover_image_url);
        }
        const { data: prods } = await supabase
          .from('products')
          .select('image_url')
          .eq('collection_group_id', g.id)
          .eq('category_id', 'prop')
          .limit(4);
        if (prods) {
          for (const p of prods) {
            if (p.image_url && p.image_url.startsWith('http')) {
              images.add(p.image_url);
            }
          }
        }
      }
    }

    results[cat.key] = Array.from(images).slice(0, 5);
  }

  console.log(JSON.stringify(results, null, 2));
}

findMultipleImages();
