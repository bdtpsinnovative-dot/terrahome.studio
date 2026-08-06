import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com';

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
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. ดึงข้อมูลสินค้าที่แอคทีฟทั้งหมด พร้อมข้อมูลสต็อก
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
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
      `)
      .not('collection_group_id', 'is', null);

    if (productsError) {
      console.error('Error fetching products for Facebook feed:', productsError);
      throw productsError;
    }

    // กรองเฉพาะสินค้าที่สถานะเป็น active หรือไม่ระบุสถานะ (active โดยปริยาย) และมี sku/id
    const activeProducts = (products || []).filter(
      (p: any) => p.status === 'active' || !p.status
    );

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

      // สร้าง Canonical Link หน้าสินค้า
      const productUrl = `${SITE_URL}/prop/${encodeURIComponent(product.collection_group_id)}/${encodeURIComponent(product.sku)}`;

      // จัดการ URL รูปภาพสินค้าให้สมบูรณ์ (หากเป็น path สัมพัทธ์ ให้เติม SITE_URL นำหน้า)
      let imageUrl = product.image_url || '';
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      return `    <item>
      <g:id>${escapeXml(product.sku || String(product.id))}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(product.description || product.name)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${originalPrice} THB</g:price>
      ${hasDiscount && salePrice < originalPrice ? `<g:sale_price>${Math.round(salePrice)} THB</g:sale_price>` : ''}
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
