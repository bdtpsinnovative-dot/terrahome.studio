import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Script from "next/script";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.terrahome-studio.com';

export default async function FeedDiagPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. ดึงข้อมูลทั้งหมดในตารางสินค้าเพื่อแสดงสถิติเปรียบเทียบ
  const { data: allDbProducts } = await supabase
    .from('products')
    .select('id, sku, name, status, price, collection_group_id');

  // 2. ดึงข้อมูลสินค้าที่อยู่ในคอลเล็กชันที่มี tag เป็น 'prop'
  const { data: collections } = await supabase
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

  // ดึงโปรโมชันส่วนลดที่กำลังใช้งาน
  const { data: activeDiscounts } = await supabase
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

  const now = new Date();

  // ทำการยุบรวมสินค้าจากคอลเล็กชันต่างๆ
  const allPropProducts: any[] = [];
  const seenProductIds = new Set<string>();

  if (collections) {
    for (const collection of collections) {
      if (collection.products) {
        for (const product of collection.products) {
          if (!seenProductIds.has(product.id)) {
            seenProductIds.add(product.id);
            allPropProducts.push(product);
          }
        }
      }
    }
  }

  // แยกกลุ่มข้อมูลเพื่อแสดงรายงาน
  const activeProducts = allPropProducts.filter(
    (p: any) => (p.status === 'active' || !p.status) && p.price && p.price > 0
  );

  const zeroPriceProducts = allPropProducts.filter(
    (p: any) => (p.status === 'active' || !p.status) && (!p.price || p.price <= 0)
  );

  const inactiveProducts = allPropProducts.filter(
    (p: any) => p.status && p.status !== 'active'
  );

  // สถิติจากฐานข้อมูลรวม
  const totalDbCount = allDbProducts?.length || 0;
  const furnitureCount = totalDbCount - allPropProducts.length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1B253A] font-sans py-12 px-4 md:px-8">
      {/* ซ่อน Header/Navbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        nav, header, .navbar, footer { display: none !important; }
      `}} />

      <div className="max-w-7xl mx-auto">
        {/* หัวข้อหน้าจอ */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-wider uppercase text-[#1B253A]">
            Facebook Feed Diagnostics
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            ระบบตรวจสอบสินค้าในไฟล์ข้อมูล Facebook/Meta XML Feed ปัจจุบัน
          </p>
          <a
            href="/facebook-feed.xml"
            target="_blank"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100"
          >
            เปิดดูไฟล์ XML Feed จริง (XML URL)
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>

        {/* แดชบอร์ดสรุปสถิติ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">สินค้าทั้งหมดใน Feed (ส่งขึ้น Meta)</p>
            <p className="text-4xl font-black text-green-600 mt-2">{activeProducts.length} <span className="text-sm font-medium text-gray-400">ชิ้น</span></p>
            <p className="text-xs text-gray-400 mt-1">คอลเล็กชันที่มีแท็ก &quot;prop&quot;, สต็อกสมบูรณ์, ราคา &gt; 0</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">สินค้าเฟอร์นิเจอร์ (คัดออก)</p>
            <p className="text-4xl font-black text-gray-700 mt-2">{furnitureCount} <span className="text-sm font-medium text-gray-400">ชิ้น</span></p>
            <p className="text-xs text-gray-400 mt-1">สินค้ากลุ่ม Furniture / เว็บไซต์ร่วมอื่น ๆ</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">ราคาเป็นศูนย์หรือไม่มีราคา (คัดออก)</p>
            <p className="text-4xl font-black text-red-500 mt-2">{zeroPriceProducts.length} <span className="text-sm font-medium text-gray-400">ชิ้น</span></p>
            <p className="text-xs text-gray-400 mt-1">สินค้าไม่มีราคาขายปลีกระบุไว้</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">สินค้าสถานะปิดการขาย (คัดออก)</p>
            <p className="text-4xl font-black text-amber-500 mt-2">{inactiveProducts.length} <span className="text-sm font-medium text-gray-400">ชิ้น</span></p>
            <p className="text-xs text-gray-400 mt-1">สินค้าที่มีสถานะไม่ใช่ active ในระบบ</p>
          </div>
        </div>

        {/* ช่องค้นหาสินค้า */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            id="search-input"
            type="text"
            placeholder="ค้นหาตามชื่อสินค้า, รหัส SKU หรือไอดีกลุ่ม..."
            className="w-full bg-transparent outline-none text-sm placeholder-gray-400 font-medium py-1"
          />
          <div className="text-xs font-bold text-gray-400 whitespace-nowrap bg-gray-100 px-3 py-1 rounded-full">
            แสดง: <span id="visible-count">{activeProducts.length}</span> / {activeProducts.length}
          </div>
        </div>

        {/* รายการตารางสินค้า */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6 w-16">รูปภาพ</th>
                  <th className="py-4 px-6">ชื่อสินค้า (Meta Title)</th>
                  <th className="py-4 px-6">SKU (Meta ID)</th>
                  <th className="py-4 px-6">กลุ่ม (Item Group ID)</th>
                  <th className="py-4 px-6">สถานะสต็อก</th>
                  <th className="py-4 px-6 text-right">ราคาปกติ</th>
                  <th className="py-4 px-6 text-right">ราคาลดพิเศษ (Sale Price)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {activeProducts.map((product: any) => {
                  // เช็คส่วนลด
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

                  const totalStock = product.stock?.reduce((sum: number, s: any) => sum + (s.qty || 0), 0) || 0;
                  const inStock = totalStock > 0;

                  // ตรวจสอบชื่อพิเศษ
                  let nameToShow = product.name || '';
                  let isFallbackName = false;
                  if (!nameToShow || nameToShow.trim() === '-') {
                    nameToShow = `${product.collection_group_id || 'Decorative'} Object`;
                    isFallbackName = true;
                  }

                  return (
                    <tr
                      key={product.id}
                      className="product-row hover:bg-gray-50/50 transition-colors text-sm"
                      data-name={nameToShow}
                      data-sku={product.sku || ''}
                      data-gid={product.collection_group_id || ''}
                    >
                      <td className="py-4 px-6">
                        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt={nameToShow} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold">NO IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        <span className={isFallbackName ? "text-amber-600 font-mono text-xs" : "text-gray-900"}>
                          {nameToShow}
                        </span>
                        {isFallbackName && <span className="ml-1.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Fallback</span>}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">{product.sku || product.id}</td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">{product.collection_group_id}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${inStock ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-red-50 text-red-700 border border-red-150'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-green-600' : 'bg-red-600'}`} />
                          {inStock ? `In Stock (${totalStock})` : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-gray-700">
                        {originalPrice.toLocaleString()} THB
                      </td>
                      <td className="py-4 px-6 text-right font-black text-blue-600">
                        {hasDiscount && salePrice < originalPrice ? (
                          <div className="flex flex-col items-end">
                            <span>{Math.round(salePrice).toLocaleString()} THB</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mt-1">
                              -{applicableDiscount?.value}{applicableDiscount?.discount_type === 'PERCENT' ? '%' : ' THB'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>
      <Script id="feed-search-logic" strategy="afterInteractive">
        {`
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.addEventListener('input', function() {
              const query = this.value.toLowerCase().trim();
              const rows = document.querySelectorAll('.product-row');
              let visibleCount = 0;
              rows.forEach(row => {
                const name = row.getAttribute('data-name').toLowerCase();
                const sku = row.getAttribute('data-sku').toLowerCase();
                const gid = row.getAttribute('data-gid').toLowerCase();
                if (name.includes(query) || sku.includes(query) || gid.includes(query)) {
                  row.style.display = '';
                  visibleCount++;
                } else {
                  row.style.display = 'none';
                }
              });
              const visibleEl = document.getElementById('visible-count');
              if (visibleEl) visibleEl.innerText = visibleCount;
            });
          }
        `}
      </Script>
        </div>
      </div>
  );
}
