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

async function getImages() {
  const { data: p1 } = await supabase
    .from('products')
    .select('image_url')
    .in('collection_group_id', ['CY3835G', 'CY3835W', 'CY3835BL', 'CY3835L', 'CY3934P', 'CY3934C'])
    .eq('category_id', 'prop')
    .limit(8);
  console.log('Decor Products:', p1);

  const { data: p2 } = await supabase
    .from('products')
    .select('image_url')
    .in('collection_group_id', ['CY3821BL', 'CY3821L', 'CY3821G', 'CY3821P', 'CY3825P', 'CY3825W', 'CY3825C'])
    .eq('category_id', 'prop')
    .limit(8);
  console.log('Tableware Products:', p2);
}

getImages();
