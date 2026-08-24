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

async function findMore() {
  const { data: cg1 } = await supabase
    .from('collection_groups')
    .select('id, name, product_sup, cover_image_url')
    .ilike('tag', '%prop%')
    .or('product_sup.ilike.%Accessories%,product_sup.ilike.%Object%,product_sup.ilike.%Box%,product_sup.ilike.%Clock%')
    .limit(10);
  console.log('Decor:', cg1);

  const { data: cg2 } = await supabase
    .from('collection_groups')
    .select('id, name, product_sup, cover_image_url')
    .ilike('tag', '%prop%')
    .or('product_sup.ilike.%Dining%,product_sup.ilike.%Kitchen%,product_sup.ilike.%Plate%,product_sup.ilike.%Bowl%')
    .limit(10);
  console.log('Tableware:', cg2);
}

findMore();
