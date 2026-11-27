// app/prop/[groupId]/[sku]/page.tsx
import { Metadata } from 'next'
import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import ProductDetailClient from './ProductDetailClient'
import { redirect } from 'next/navigation'

export const runtime = 'edge'

type Props = {
  params: Promise<{ groupId: string; sku: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

const supabaseAnon = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let cachedDiscounts: { data: any[]; expiresAt: number } | null = null

async function getActiveDiscounts() {
  if (cachedDiscounts && Date.now() < cachedDiscounts.expiresAt) {
    return cachedDiscounts.data
  }
  const { data } = await supabaseAnon
    .from("discounts")
    .select(`id, discount_type, value, start_date, end_date, discount_rules ( product_id )`)
    .eq("active", true)
    .order("id", { ascending: false })
  const list = data || []
  cachedDiscounts = { data: list, expiresAt: Date.now() + 30_000 }
  return list
}

interface CachedGroupMeta {
  groupData: {
    id: string
    product_sup?: string | null
    products: any[]
  } | null
  error?: any
  cachedAt: number
}

const GROUP_META_CACHE = new Map<string, CachedGroupMeta>()
const GROUP_META_TTL_MS = 60 * 60 * 1000 // 1 hour in worker memory

async function getGroupMetadata(groupId: string, sku?: string): Promise<CachedGroupMeta> {
  const cacheKey = `${groupId}:${sku || ''}`
  const hit = GROUP_META_CACHE.get(cacheKey)
  if (hit && Date.now() - hit.cachedAt < GROUP_META_TTL_MS) {
    return hit
  }

  // 1. ดึงข้อมูล Group + Products (แคชหมด โดยไม่ Join ตาราง stock/branches ให้ช้า)
  const groupRes = await supabaseAnon
    .from("collection_groups")
    .select(`
      id,
      product_sup,
      products!inner (
        id,
        sku,
        name,
        image_url,
        price,
        status,
        category_id,
        color,
        specs
      )
    `)
    .eq("id", groupId)
    .eq("products.category_id", "prop")
    .maybeSingle()

  if (groupRes.data && !groupRes.error) {
    const entry: CachedGroupMeta = {
      groupData: groupRes.data,
      cachedAt: Date.now(),
    }
    GROUP_META_CACHE.set(cacheKey, entry)
    return entry
  }

  // Fallback for standalone products or when groupId is actually a product id / sku
  let productQuery = supabaseAnon
    .from("products")
    .select(`
      id,
      sku,
      name,
      image_url,
      price,
      status,
      category_id,
      color,
      specs,
      collection_group_id
    `)
    .eq("category_id", "prop")

  if (sku) {
    productQuery = productQuery.eq("sku", sku)
  } else if (!isNaN(Number(groupId))) {
    productQuery = productQuery.eq("id", Number(groupId))
  } else {
    productQuery = productQuery.eq("sku", groupId)
  }

  const { data: productData, error: productErr } = await productQuery.maybeSingle()

  if (productData && !productErr) {
    if (productData.collection_group_id && String(productData.collection_group_id) !== String(groupId)) {
      const { data: actualGroup } = await supabaseAnon
        .from("collection_groups")
        .select(`
          id,
          product_sup,
          products!inner (
            id,
            sku,
            name,
            image_url,
            price,
            status,
            category_id,
            color,
            specs
          )
        `)
        .eq("id", productData.collection_group_id)
        .eq("products.category_id", "prop")
        .maybeSingle()

      if (actualGroup) {
        const entry: CachedGroupMeta = {
          groupData: actualGroup,
          cachedAt: Date.now(),
        }
        GROUP_META_CACHE.set(cacheKey, entry)
        return entry
      }
    }

    const fallbackGroupData = {
      id: groupId,
      product_sup: productData.specs?.material || productData.specs?.brand || null,
      products: [productData],
    }
    const entry: CachedGroupMeta = {
      groupData: fallbackGroupData,
      cachedAt: Date.now(),
    }
    GROUP_META_CACHE.set(cacheKey, entry)
    return entry
  }

  return { groupData: null, error: groupRes.error || productErr, cachedAt: Date.now() }
}

// React.cache ensures generateMetadata and Page share the exact same single fetch per request
const getGroupDetailData = cache(async (groupId: string, sku?: string) => {
  const [activeDiscounts, metaResult] = await Promise.all([
    getActiveDiscounts(),
    getGroupMetadata(groupId, sku),
  ])

  if (!metaResult.groupData) {
    return { activeDiscounts, groupData: null, error: metaResult.error }
  }

  const rawProducts = metaResult.groupData.products || []
  const productIds = rawProducts.map((p: any) => p.id).filter(Boolean)

  // ⚡ ดึงสต็อกสดและสาขา (Real-time Live Stock & Branches) เฉพาะสินค้าในกลุ่มนี้
  let liveStock: any[] = []
  if (productIds.length > 0) {
    const { data: stockData } = await supabaseAnon
      .from("stock")
      .select(`
        product_id,
        qty,
        branches!inner (
          id,
          branch_name,
          latitude,
          longitude,
          is_active
        )
      `)
      .in("product_id", productIds)
      .gt("qty", 0)
      .eq("branches.is_active", true)

    liveStock = stockData || []
  }

  // ประกอบ Live Stock และสาขาเข้ากับข้อมูลสินค้าที่แคชไว้
  const productsWithLiveStock = rawProducts.map((p: any) => {
    const pStock = liveStock
      .filter((s: any) => s.product_id === p.id)
      .map((s: any) => ({
        qty: s.qty,
        branches: s.branches,
      }))
    return {
      ...p,
      stock: pStock,
    }
  })

  const groupData = {
    ...metaResult.groupData,
    products: productsWithLiveStock,
  }

  return { activeDiscounts, groupData, error: null }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const { groupData } = await getGroupDetailData(currentGroupId, currentSku)
  const products: any[] = groupData?.products || []
  const product = products.find((p: any) => p.sku === currentSku) || products[0] || null

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

export default async function ProductDetailWithGroupSidebarPage({ params }: Props) {
  const resolvedParams = await params
  const currentGroupId = decodeURIComponent(resolvedParams.groupId)
  const currentSku = decodeURIComponent(resolvedParams.sku)

  const { activeDiscounts, groupData, error } = await getGroupDetailData(currentGroupId, currentSku)

  const now = new Date()
  const mapProductDiscount = (product: any) => {
    let applicableDiscount = null
    if (activeDiscounts && activeDiscounts.length > 0) {
      applicableDiscount = activeDiscounts.find((discount: any) => {
        const isStarted = !discount.start_date || new Date(discount.start_date) <= now
        const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now
        if (!isStarted || !isNotEnded) return false
        return discount.discount_rules.some((rule: any) => rule.product_id === product.id || rule.product_id === null)
      })
    }

    const normalizedDiscountValue = applicableDiscount && applicableDiscount.value !== null && applicableDiscount.value !== undefined
      ? Number(applicableDiscount.value)
      : null
    const hasValidDiscountValue = normalizedDiscountValue !== null && Number.isFinite(normalizedDiscountValue) && normalizedDiscountValue > 0

    return {
      ...product,
      discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
      discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
    }
  }

  const groupProducts = (groupData?.products || [])
    .filter((p: any) => p.category_id === 'prop' && (p.status === 'active' || !p.status))
    .map(mapProductDiscount)

  if (error || !groupData || !groupProducts || groupProducts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-500">
        <p className="text-lg mb-4">ไม่พบข้อมูลสินค้ากลุ่มนี้ในระบบ หรือสินค้าถูกปิดการขายชั่วคราว</p>
      </div>
    )
  }

  const activeProduct = groupProducts.find((p: any) => p.sku === currentSku)

  if (!activeProduct && groupProducts.length > 0) {
    redirect(`/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(groupProducts[0].sku)}`)
  }

  const totalStock = activeProduct?.stock?.reduce((sum: number, s: any) => sum + (s.qty || 0), 0) || 0
  const canonicalUrl = `${SITE_URL}/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(currentSku)}`

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
  }

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
  }

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
        productSup={groupData.product_sup}
      />
    </>
  )
}
