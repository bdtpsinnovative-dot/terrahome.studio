// app/prop/[groupId]/[sku]/page.tsx
import { Metadata } from 'next'
import { createClient } from "../../../../src/supabase/server" // ⚡ ดึงโค้ด Supabase ของนายกลับมา
import ProductDetailClient from './ProductDetailClient'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ groupId: string; sku: string }> // ⚡ ปรับเป็น Promise ตามมาตรฐาน Next.js ใหม่
}

export const revalidate = 0 // ✅ stock เปลี่ยนบ่อย ต้อง fresh ทุก request

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com'

// ⚡ ฟังก์ชันทำ SEO (generateMetadata) แบบรองรับ Next.js ใหม่
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params // 👈 แก้ตรงนี้: ต้องใช้ await เพื่อแกะข้อมูลออกมาก่อนครับนาย!
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const supabase = await createClient()
  const { data: product } = await supabase
    .from("products")
    .select("name, image_url, price, description")
    .eq("sku", currentSku)
    .single()

  const productName = product?.name || "Decorative Object"
  const title = `${productName} — ${currentGroupId} Collection`
  const description = product
    ? `Shop ${productName} from the ${currentGroupId} collection at Terra Home Studio. เช็คสต็อกและสาขาที่จำหน่าย ${productName} พร้อมจัดส่ง`
    : `เช็คสต็อกสินค้ากลุ่ม ${currentGroupId} และสาขาที่พร้อมจำหน่ายใน Terra Home Studio`

  const canonicalUrl = `/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`
  const fullUrl = `${SITE_URL}${canonicalUrl}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'Terra Home Studio',
      images: product?.image_url ? [
        {
          url: product.image_url,
          width: 800,
          height: 800,
          alt: `${productName} - Terra Home Studio`,
        }
      ] : [
        {
          url: "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp",
          width: 1200,
          height: 630,
          alt: "Terra Home Studio - Decorative Objects",
        }
      ],
      type: 'website',
      locale: 'th_TH',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product?.image_url ? [product.image_url] : [],
    },
  }
}

// ⚡ หน้าตา Page หลัก (ปรับใช้ await params เหมือนกัน)
export default async function ProductDetailWithGroupSidebarPage({ params }: Props) {
  const resolvedParams = await params // 👈 แก้ตรงนี้: แกะ Promise ออกมาให้เรียบร้อย
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const supabase = await createClient()

  const { data: rawGroupProducts, error } = await supabase
    .from("products")
    .select(`
      *,
      stock (
        qty,
        branches (
          id,
          branch_name,
          latitude,
          longitude
        )
      )
    `)
    .eq("collection_group_id", currentGroupId)
    .order("sku", { ascending: true })

  const groupProducts = (rawGroupProducts || []).filter(p => p.status === 'active' || !p.status)

  if (error || !groupProducts || groupProducts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-500">
        <p className="text-lg mb-4">ไม่พบข้อมูลสินค้ากลุ่มนี้ในระบบ หรือสินค้าถูกปิดการขายชั่วคราว</p>
      </div>
    )
  }

  // Generate dynamic Product Schema for search engine/LLM crawler analysis
  const activeProduct = groupProducts.find(p => p.sku === currentSku);

  // If the specific requested SKU is not active or not found, redirect to the first available product in this group
  if (!activeProduct && groupProducts.length > 0) {
    redirect(`/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(groupProducts[0].sku)}`)
  }
  const totalStock = activeProduct?.stock?.reduce((sum: number, s: any) => sum + (s.qty || 0), 0) || 0;
  const canonicalUrl = `${SITE_URL}/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`;

  // ✅ Product schema ที่ครบถ้วนกว่าเดิม พร้อม brand, category, itemCondition
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": activeProduct?.name || "Decorative Object",
    "image": activeProduct?.image_url ? [activeProduct.image_url] : [],
    "description": `${activeProduct?.name || "Decorative Object"} จาก ${currentGroupId} collection — Terra Home Studio. ของตกแต่งบ้านเซรามิกดีไซน์มินิมอล สไตล์ wabi-sabi`,
    "sku": currentSku,
    "brand": {
      "@type": "Brand",
      "name": "Terra Home Studio",
    },
    "category": "Home Decor > Ceramic & Decorative Objects",
    "itemCondition": "https://schema.org/NewCondition",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "THB",
      "price": activeProduct?.price || 0,
      "availability": totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": canonicalUrl,
      "seller": {
        "@type": "Organization",
        "name": "Terra Home Studio",
      },
    },
  };

  // ✅ BreadcrumbList schema สำหรับ navigation signal
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Collections",
        "item": `${SITE_URL}/prop`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": currentGroupId,
        "item": `${SITE_URL}/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`,
      },
    ],
  };

  // Fetch 16 Recommended Products (randomly from collections that have 'prop' tag)
  const { data: recommendedCollectionsRaw } = await supabase
    .from("collection_groups")
    .select(`*, products!inner ( id, sku, name, image_url, price, status )`)
    .ilike("tag", "%prop%")
    
  const activeRecommended = (recommendedCollectionsRaw || []).map(collection => {
    return {
      ...collection,
      products: collection.products?.filter((p: any) => p.status === 'active' || !p.status) || []
    }
  }).filter(collection => collection.products && collection.products.length > 0 && collection.id !== currentGroupId);

  for (let i = activeRecommended.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeRecommended[i], activeRecommended[j]] = [activeRecommended[j], activeRecommended[i]];
  }
  const recommendedCollections = activeRecommended.slice(0, 16);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductDetailClient 
        groupProducts={groupProducts}
        currentGroupId={currentGroupId}
        initialSku={currentSku}
        recommendedCollections={recommendedCollections}
      />
    </>
  )
}