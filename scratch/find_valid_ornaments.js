const { createClient } = require('@supabase/supabase-js');
const https = require('https');
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

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, status: err.message });
    });
  });
}

async function findValidOrnamentImages() {
  const { data: prods } = await supabase
    .from('products')
    .select('id, image_url')
    .eq('category_id', 'prop')
    .ilike('name', '%Sculpture%')
    .limit(20);

  const { data: groups } = await supabase
    .from('collection_groups')
    .select('id, cover_image_url, image_url')
    .ilike('tag', '%prop%')
    .ilike('product_sup', '%Sculpture%')
    .limit(10);

  const candidates = new Set();
  (prods || []).forEach(p => { if (p.image_url) candidates.add(p.image_url); });
  (groups || []).forEach(g => { 
    if (g.cover_image_url) candidates.add(g.cover_image_url);
    if (g.image_url) candidates.add(g.image_url);
  });

  console.log(`Testing ${candidates.size} candidates for 01_ORNAMENT...`);
  const valid = [];
  for (const url of candidates) {
    const res = await checkUrl(url);
    if (res.status === 200) {
      console.log(`  ✅ 200 OK: ${url}`);
      valid.push(url);
    }
  }
  console.log('Valid count:', valid.length);
}

findValidOrnamentImages();
