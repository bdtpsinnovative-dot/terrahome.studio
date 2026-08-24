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

async function findCategoryImages() {
  const categories = [
    { key: "ORNAMENT", query: "Sculpture" },
    { key: "BOOKENDS", query: "BOOKED" },
    { key: "CANDLE HOLDERS", query: "CANDLE" },
    { key: "DECORATIVE OBJECTS", query: "Accessories" },
    { key: "DOLLS & TOYS", query: "Figure" },
    { key: "TABLEWARE", query: "Dining" },
    { key: "TRAYS", query: "Trays" },
    { key: "VESSELS", query: "Vase" },
    { key: "ART & WALL DECOR", query: "Art" },
  ];

  for (const cat of categories) {
    const { data } = await supabase
      .from('collection_groups')
      .select('id, name, product_sup, cover_image_url, image_url')
      .ilike('tag', '%prop%')
      .ilike('product_sup', `%${cat.query}%`)
      .limit(5);

    console.log(`=== ${cat.key} ===`);
    if (data && data.length > 0) {
      for (const item of data) {
        console.log(`Group: ${item.id} | ${item.product_sup} | Cover: ${item.cover_image_url || item.image_url}`);
        // also get product image
        const { data: prods } = await supabase
          .from('products')
          .select('image_url, specs, price')
          .eq('collection_group_id', item.id)
          .eq('category_id', 'prop')
          .limit(2);
        if (prods && prods.length > 0) {
          prods.forEach(p => console.log(`   Prod img: ${p.image_url}`));
        }
      }
    }
  }
}

findCategoryImages();
