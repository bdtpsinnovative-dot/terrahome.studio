import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.terrahome-studio.com';

// ล้างตัวอักษรควบคุมที่ผิดกฎ XML 1.0 (XML 1.0 Illegal Control Characters)
function cleanXmlString(str: string): string {
  if (!str) return '';
  return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F]/g, '');
}

// ฟังก์ชันสำหรับป้องกันตัวอักษรพิเศษใน XML (XML Escaping)
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zexflchjcycxrpjkuews.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzMyNTEsImV4cCI6MjA4MDc0OTI1MX0.Hw3dJqP6-bpmqMW56pGHB1-Y2hN9tjCKNq9u2BnyeTk';
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // 1. ดึงข้อมูลกลุ่มคอลเล็กชันที่มี tag เป็น 'prop' (สำหรับเว็บของตกแต่งบ้าน) เพื่อไม่ให้ดึงสินค้าของเว็บอื่น (เช่น เฟอร์นิเจอร์) ที่ใช้ฐานข้อมูลร่วมกัน
    const { data: collections, error: productsError } = await supabase
      .from('collection_groups')
      .select(`
        id,
        tag,
        products!inner (
          id,
          sku,
          name,
          description,
          image_url,
          price,
          status,
          collection_group_id,
          stock (
            qty
          )
        )
      `)
      .ilike('tag', '%prop%')
      .eq('products.category_id', 'prop');

    if (productsError) {
      console.error('Error fetching products for Facebook feed:', productsError);
      throw productsError;
    }

    // ทำการยุบรวม (Flatten) สินค้าจากคอลเล็กชันต่างๆ และตัดสินค้าที่ซ้ำออก
    const allProducts: any[] = [];
    const seenProductIds = new Set<string>();

    if (collections) {
      for (const collection of collections) {
        if (collection.products) {
          for (const product of collection.products) {
            if (!seenProductIds.has(product.id)) {
              seenProductIds.add(product.id);
              allProducts.push(product);
            }
          }
        }
      }
    }

    // กรองสินค้าที่แอคทีฟ และต้องมีราคาสินค้าที่มากกว่า 0 เท่านั้น (เพื่อไม่ให้ Meta แจ้งเตือนข้อผิดพลาดเรื่องราคา)
    const activeProducts = allProducts.filter(
      (p: any) => (p.status === 'active' || !p.status) && p.price && p.price > 0
    );

    // 🌟 ทำการสุ่มสลับลำดับสินค้า (Shuffle) ด้วยวิธี Fisher-Yates เพื่อให้แสดงผลแบบสุ่มลำดับตามต้องการ
    for (let i = activeProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeProducts[i], activeProducts[j]] = [activeProducts[j], activeProducts[i]];
    }

    // 2. ดึงโปรโมชันส่วนลดที่เปิดใช้งานอยู่ในปัจจุบัน
    const { data: activeDiscounts, error: discountsError } = await supabase
      .from("discounts")
      .select(`
        id,
        discount_type,
        value,
        start_date,
        end_date,
        discount_rules (
          product_id
        )
      `)
      .eq("active", true);

    if (discountsError) {
      console.error('Error fetching discounts for Facebook feed:', discountsError);
    }

    const now = new Date();

    // 3. แปลงข้อมูลเป็น RSS XML Item
    const itemsXml = activeProducts.map((product: any) => {
      // ค้นหาโปรโมชันส่วนลดที่มีผลกับสินค้านี้
      let applicableDiscount = null;
      if (activeDiscounts && activeDiscounts.length > 0) {
        applicableDiscount = activeDiscounts.find(discount => {
          const isStarted = !discount.start_date || new Date(discount.start_date) <= now;
          const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now;
          if (!isStarted || !isNotEnded) return false;
          
          return discount.discount_rules.some(
            (rule: any) => rule.product_id === product.id || rule.product_id === null
          );
        });
      }

      // คำนวณราคาส่วนลด (Sale Price)
      const originalPrice = product.price || 0;
      let salePrice = originalPrice;
      let hasDiscount = false;

      if (applicableDiscount && applicableDiscount.value) {
        hasDiscount = true;
        if (applicableDiscount.discount_type === 'PERCENT') {
          salePrice = originalPrice - (originalPrice * (applicableDiscount.value / 100));
        } else if (applicableDiscount.discount_type === 'FIXED') {
          salePrice = originalPrice - applicableDiscount.value;
        }
        if (salePrice < 0) salePrice = 0;
      }

      // คำนวณจำนวนสต็อกสินค้า (หากมีสต็อกมากกว่า 0 เป็น in stock นอกเหนือจากนั้นเป็น out of stock)
      const totalStock = product.stock?.reduce((sum: number, s: any) => sum + (s.qty || 0), 0) || 0;
      const availability = totalStock > 0 ? 'in stock' : 'out of stock';

      // ล้างอักขระควบคุม (Control Characters) ที่มักปนเปื้อนในฐานข้อมูลเพื่อป้องกันไม่ให้ XML Parser ทำงานล้มเหลว
      let cleanName = cleanXmlString(product.name || '').trim();
      if (!cleanName || cleanName === '-') {
        cleanName = `${product.collection_group_id || 'Decorative'} Object`;
      }

      let cleanDesc = cleanXmlString(product.description || '').trim();
      if (!cleanDesc || cleanDesc === '-' || cleanDesc === '') {
        cleanDesc = `${cleanName} - High-quality decorative craft piece from Terra Home Studio.`;
      }

      const cleanSku = cleanXmlString(product.sku || String(product.id));
      const cleanGroupId = cleanXmlString(product.collection_group_id || '');

      // สร้าง Canonical Link หน้าสินค้า
      const productUrl = `${SITE_URL}/prop/${encodeURIComponent(cleanGroupId)}/${encodeURIComponent(cleanSku)}`;

      // จัดการ URL รูปภาพสินค้าให้สมบูรณ์ (หากเป็น path สัมพัทธ์ ให้เติม SITE_URL นำหน้า)
      let imageUrl = product.image_url || '';
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      return `    <item>
      <g:id>${escapeXml(cleanSku)}</g:id>
      <g:title>${escapeXml(cleanName)}</g:title>
      <g:description>${escapeXml(cleanDesc)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>Terra Home Studio</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${originalPrice} THB</g:price>
      ${hasDiscount && salePrice < originalPrice ? `<g:sale_price>${Math.round(salePrice)} THB</g:sale_price>` : ''}
      <g:item_group_id>${escapeXml(cleanGroupId)}</g:item_group_id>
    </item>`;
    }).join('\n');

    // 4. ประกอบโครงสร้างไฟล์ XML RSS 2.0
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Terra Home Studio Catalog</title>
    <link>${SITE_URL}</link>
    <description>Terra Home Studio Product Catalog Feed for Meta Commerce Manager</description>
${itemsXml}
  </channel>
</rss>`;

    return new Response(xmlContent, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('Error generating Facebook feed XML:', error);
    
    // ส่ง XML เปล่ากลับไปเพื่อให้บอทอ่านแล้วไม่พังพร้อมแจ้งข้อผิดพลาดเป็นคอมเมนต์ XML
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Terra Home Studio Catalog - Error</title>
    <link>${SITE_URL}</link>
    <description>Temporary error generating catalog feed</description>
    <!-- Error details: ${escapeXml((error as Error).message)} -->
  </channel>
</rss>`;

    return new Response(errorXml, {
      status: 500,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }
}
