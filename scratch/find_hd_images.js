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

async function findHighResImages() {
  const categories = [
    { key: "01_ORNAMENT", query: "Sculpture" },
    { key: "02_BOOKENDS", query: "BOOKED" },
    { key: "03_CANDLE_HOLDERS", query: "Candle" },
    { key: "04_DECORATIVE_OBJECTS", query: "Decorative Box" },
    { key: "05_DOLLS_TOYS", query: "Figure" },
    { key: "06_TABLEWARE", query: "Kitchenware" },
    { key: "07_TRAYS", query: "Trays" },
    { key: "08_VESSELS", query: "Vase" },
    { key: "09_ART_WALL_DECOR", query: "Wall Art" },
  ];

  for (const cat of categories) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, image_url, collection_group_id')
      .eq('category_id', 'prop')
      .ilike('image_url', '%pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/%')
      .limit(15);

    // Also get specific products for category
    const { data: catProds } = await supabase
      .from('collection_groups')
      .select('id, name, product_sup, cover_image_url')
      .ilike('tag', '%prop%')
      .ilike('product_sup', `%${cat.query}%`)
      .limit(10);

    const groupIds = (catProds || []).map(g => g.id);

    const { data: specificProds } = await supabase
      .from('products')
      .select('id, name, image_url, collection_group_id')
      .eq('category_id', 'prop')
      .in('collection_group_id', groupIds)
      .limit(15);

    console.log(`\n=================== ${cat.key} ===================`);
    const allImages = new Set();
    (catProds || []).forEach(g => { if (g.cover_image_url) allImages.add(g.cover_image_url); });
    (specificProds || []).forEach(p => { if (p.image_url) allImages.add(p.image_url); });

    Array.from(allImages).forEach(img => {
      console.log(img);
    });
  }
}

findHighResImages();
