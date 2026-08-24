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

async function findMoreOrnaments() {
  const { data: prods } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('category_id', 'prop')
    .limit(100);

  const valid = [];
  for (const p of prods) {
    if (p.image_url && p.image_url.startsWith('https://')) {
      const res = await checkUrl(p.image_url);
      if (res.status === 200) {
        valid.push(p.image_url);
      }
    }
  }

  console.log(`Found ${valid.length} valid 200 OK prop product images!`);
  console.log(valid.slice(0, 10));
}

findMoreOrnaments();
