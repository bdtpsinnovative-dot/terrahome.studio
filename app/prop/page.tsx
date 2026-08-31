import Link from "next/link"
import { connection } from "next/server"
import { createClient } from "../../src/supabase/server"
import PropFilterClient from "./PropFilterClient"
import PropBanner from "./PropBanner"

export const runtime = 'edge'
import { CATEGORY_MAP } from "./productFilterModel"
import Footer from "../components/Footer"
import type { Metadata } from "next"

// Hot-item scores are time-sensitive. Keep this route fresh so the RPC result
// is not cached for an hour while the catalog query remains optimized.
export const revalidate = 0

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://terrahome-studio.com'

function getCategoryOrder(productSup: string | null | undefined): number {
  const value = (productSup || '').trim().toLowerCase()
  if (value.startsWith('vase')) return 1
  if (value.startsWith('doll') || value.startsWith('decorative') || value.startsWith('decotative')) return 2
  if (value.includes('ornament') || value.startsWith('art object')) return 3
  return 4
}

function getCollectionSubOrder(collection: any): number {
  const products = collection.products || []
  const hasHotAvailable = products.some((product: any) => product.hot_rank !== null && product.availability_status === 'available')
  const hasAvailable = products.some((product: any) => product.availability_status === 'available')
  const hasHotPreorder = products.some((product: any) => product.hot_rank !== null && product.availability_status === 'preorder')

  // Within each category: hot + available, available, hot + preorder, preorder.
  if (hasHotAvailable) return 0
  if (hasAvailable) return 1
  if (hasHotPreorder) return 2
  return 3
}

export const metadata: Metadata = {
  title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio - เซรามิก แจกัน Decorative Objects',
  description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน Decorative Objects และ Vessels จาก Terra Home Studio คอลเล็กชันดีไซน์มินิมอล สไตล์ wabi-sabi และ Nordic เช็คสต็อกสาขาได้ทันที',
  keywords: ['ของตกแต่งบ้าน', 'เซรามิก', 'แจกัน', 'decorative objects', 'vessels', 'minimalist', 'wabi-sabi', 'ซื้อของแต่งบ้าน'],
  alternates: {
    canonical: '/prop',
  },
  openGraph: {
    title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio',
    description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects ดีไซน์มินิมอล สไตล์ wabi-sabi เช็คสต็อกสาขาได้ทันที',
    url: `${SITE_URL}/prop`,
    siteName: 'Terra Home Studio',
    images: [
      {
        url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp',
        width: 1200,
        height: 630,
        alt: 'Terra Home Studio Collections - Ceramic Decorative Objects',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'คอลเล็กชันของตกแต่งบ้าน | Terra Home Studio',
    description: 'ช้อปของตกแต่งบ้านเซรามิก แจกัน และ Decorative Objects ดีไซน์มินิมอล',
    images: ['https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780478880815-990.webp'],
  },
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PropCollectionsPage({ searchParams }: PageProps) {
  // The hot-item RPC depends on recent events and must not be served from a
  // previously prerendered route response.
  await connection()
  const supabase = await createClient()

  const resolvedParams = await searchParams
  const branchId = resolvedParams.branch as string | undefined
  const categoryParam = resolvedParams.category as string | undefined

  // 1. ดึงข้อมูลสาขาทั้งหมด
  const { data: branches } = await supabase
    .from("branches")
    .select("id, branch_code, branch_name, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("branch_name", { ascending: true })

  // 🌟 [ไม้ตายแก้บั๊กแบนเนอร์หาย!] ดึงข้อมูลเฉพาะรูปแบนเนอร์แยกต่างหาก (ดึงครบทุกแถวด้วย Pagination)
  // เพื่อให้มั่นใจว่ารูปจะไม่โดนตัดทิ้ง แม้สินค้านั้นจะไม่มีสต็อกในสาขาที่เลือกก็ตาม!
  const bannerGroups: any[] = [];
  const bannerPageSize = 1000;
  for (let from = 0; ; from += bannerPageSize) {
    const { data: pageData } = await supabase
      .from("collection_groups")
      .select("product_sup, image_url")
      .ilike("tag", "%prop%")
      .not("image_url", "is", null)
      .range(from, from + bannerPageSize - 1);

    bannerGroups.push(...(pageData || []));
    if (!pageData || pageData.length < bannerPageSize) break;
  }

  let activeBannerImage = null;
  let allBannerImages: string[] = [];

  if (bannerGroups && bannerGroups.length > 0) {
    // 🌟 รวบรวมรูปแบนเนอร์ทั้งหมดไว้เสมอ สำหรับเล่นสไลด์โชว์แบบ ALL เมื่อกด IN STOCK, PRE-ORDER หรือหมวดรวม
    allBannerImages = Array.from(new Set(
      bannerGroups.map(c => c.image_url).filter((url): url is string => !!url && url !== "")
    ));

    const isSpecialFilter = !categoryParam || categoryParam === "All" || categoryParam === "IN_STOCK" || categoryParam === "PRE_ORDER" || categoryParam === "SPECIAL_DISCOUNT";

    if (!isSpecialFilter) {
      const allowedSups = (CATEGORY_MAP[categoryParam] || CATEGORY_MAP[categoryParam.toUpperCase()] || [categoryParam.toLowerCase()]).map(s => s.trim().toLowerCase());
      const matchedGroup = bannerGroups.find(c => {
        const sup = (c.product_sup || "").trim().toLowerCase();
        return allowedSups.includes(sup) && !!c.image_url;
      });
      if (matchedGroup) {
        activeBannerImage = matchedGroup.image_url;
      }
    }
  }

  // 2. ดึงข้อมูลสินค้าและกรองตามสาขา (เฉพาะส่วนเนื้อหาสินค้าด้านล่าง)
  // `products.color` is the catalog's source of truth for colour. Keep specs
  // as a fallback for older rows, but always select the real column so the
  // client-side filter cannot silently lose a colour that exists in the DB.
  const productSelectStr = `id, collection_group_id, sku, name, image_url, price, status, category_id, color, specs, stock ( branch_id, qty )`

  let collections: any[] | null = null
  let error = null

  // Start from the shared catalog's canonical boundary. This avoids scanning
  // every collection group with `%prop%` and also lets us page past PostgREST's
  // default 1,000-row response limit.
  const productPageSize = 500
  const propProducts: any[] = []
  for (let from = 0; ; from += productPageSize) {
    const { data: productPage, error: pageError } = await supabase
      .from("products")
      .select(productSelectStr)
      .eq("category_id", "prop")
      .order("id", { ascending: true })
      .range(from, from + productPageSize - 1)

    if (pageError) {
      error = pageError
      break
    }

    propProducts.push(...(productPage || []))
    if (!productPage || productPage.length < productPageSize) break
  }

  if (!error && propProducts.length > 0) {
    const groupIds = Array.from(new Set(
      propProducts
        .map((product: any) => product.collection_group_id)
        .filter((id: unknown): id is string | number => typeof id === "string" || typeof id === "number")
        .map((id) => String(id))
    ))
    const propGroups: any[] = []
    const groupChunkSize = 500

    // Fetch only groups referenced by Prop products. The tag check remains a
    // defense-in-depth boundary for the shared collection_groups table.
    for (let from = 0; from < groupIds.length; from += groupChunkSize) {
      const groupChunk = groupIds.slice(from, from + groupChunkSize)
      const { data: groupPage, error: pageError } = await supabase
        .from("collection_groups")
        .select("*")
        .in("id", groupChunk)
        .ilike("tag", "%prop%")

      if (pageError) {
        error = pageError
        break
      }

      propGroups.push(...(groupPage || []))
    }

    if (!error) {
      const productsByGroup = new Map<string, any[]>()
      for (const product of propProducts) {
        const groupKey = String(product.collection_group_id)
        const groupProducts = productsByGroup.get(groupKey) || []
        groupProducts.push(product)
        productsByGroup.set(groupKey, groupProducts)
      }

      collections = propGroups
        .sort((a: any, b: any) => {
          const createdDiff = String(b.created_at || "").localeCompare(String(a.created_at || ""))
          return createdDiff !== 0 ? createdDiff : String(b.id).localeCompare(String(a.id))
        })
        .map((group: any) => ({
          ...group,
          products: productsByGroup.get(String(group.id)) || [],
        }))
    }
  } else if (!error) {
    collections = []
  }

  if (error) {
    console.error("[PropCollectionsPage] Supabase collection fetch error:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBE8E1]">
        <div className="text-center">
          <p className="text-[#3A3835] font-serif text-xl mb-2">Unavailable</p>
          <p className="text-[#8C8A86] text-sm font-light tracking-wide">Unable to load the collections at this time.</p>
        </div>
      </div>
    )
  }

  const { data: activeDiscounts } = await supabase
    .from("discounts")
    .select(`id, discount_type, value, start_date, end_date, discount_rules ( product_id )`)
    .eq("active", true)

  // Hot Item ranking is computed from the raw event table by the migration's
  // RPC. Keep the catalog usable if the migration has not been run yet.
  const { data: hotItems, error: hotItemsError } = await supabase
    .rpc('get_prop_hot_items', { limit_count: 20 })

  if (hotItemsError) {
    console.warn('[PropCollectionsPage] Hot Item ranking unavailable:', hotItemsError.message)
  }

  const hotRankByProductId = new Map<number, number>()
  const hotScoreByProductId = new Map<number, number>()
  ;(hotItems || []).forEach((item: any, index: number) => {
    const productId = Number(item.product_id)
    if (!Number.isSafeInteger(productId)) return
    hotRankByProductId.set(productId, index + 1)
    hotScoreByProductId.set(productId, Number(item.score) || 0)
  })

  const now = new Date()

  // กรอง Collection ที่มีสินค้าอยู่จริงๆ และดึงเฉพาะสินค้าที่ Active เพื่อส่งให้ส่วนเนื้อหาด้านล่าง
  const activeCollections = collections?.map(collection => {
    return {
      ...collection,
      products: collection.products?.filter((p: any) => p.status === 'active' || !p.status) || []
    }
  }).filter(collection =>
    collection.products && collection.products.length > 0
  ) || []

  const mappedCollections = activeCollections.map((collection) => {
    const mappedProducts = collection.products.map((product: any) => {
      const stockItems = branchId && branchId !== "all"
        ? (product.stock || []).filter((stockItem: any) => String(stockItem.branch_id) === String(branchId))
        : (product.stock || [])
      const totalStock = stockItems.reduce((sum: number, stockItem: any) => sum + Number(stockItem.qty || 0), 0) || 0
      let applicableDiscount = null
      if (activeDiscounts && activeDiscounts.length > 0) {
        applicableDiscount = activeDiscounts.find(discount => {
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
        stock: stockItems,
        total_stock: totalStock,
        availability_status: totalStock > 0 ? 'available' : 'preorder',
        hot_rank: hotRankByProductId.get(Number(product.id)) || null,
        hot_score: hotScoreByProductId.get(Number(product.id)) || null,
        discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
        discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
      }
    })

    // Keep the four tiers from the ordering brief:
    // 1) Hot Item + available, 2) available, 3) Hot Item + pre-order,
    // 4) pre-order. Hot products must keep their actual ranking; only the
    // non-hot products are randomized within their tier.
    const shuffle = (items: any[]) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items
    }
    const sortHot = (items: any[]) => items.sort((a: any, b: any) => {
      const rankDiff = (a.hot_rank || Infinity) - (b.hot_rank || Infinity)
      return rankDiff !== 0 ? rankDiff : Number(a.id) - Number(b.id)
    })
    const hotAvailableProducts = mappedProducts.filter((product: any) => product.hot_rank !== null && product.availability_status === 'available')
    const availableProducts = mappedProducts.filter((product: any) => product.hot_rank === null && product.availability_status === 'available')
    const hotPreorderProducts = mappedProducts.filter((product: any) => product.hot_rank !== null && product.availability_status === 'preorder')
    const preorderProducts = mappedProducts.filter((product: any) => product.hot_rank === null && product.availability_status === 'preorder')

    return {
      ...collection,
      products: [
        ...sortHot(hotAvailableProducts),
        ...shuffle(availableProducts),
        ...sortHot(hotPreorderProducts),
        ...shuffle(preorderProducts),
      ],
      has_available_products: hotAvailableProducts.length + availableProducts.length > 0,
      is_preorder_only: hotAvailableProducts.length + availableProducts.length === 0 && hotPreorderProducts.length + preorderProducts.length > 0,
      hot_rank: mappedProducts.reduce((best: number | null, product: any) => {
        if (!product.hot_rank) return best
        return best === null ? product.hot_rank : Math.min(best, product.hot_rank)
      }, null),
      hot_score: mappedProducts.reduce((best: number, product: any) => best + (product.hot_score || 0), 0),
    }
  })

  // Apply availability tiers globally so every preorder-only collection stays
  // after every collection with available stock. Categories are used only as
  // the secondary order inside the available and preorder sections.
  const shuffleCollections = (items: any[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items
  }
  const collectionBuckets = new Map<number, any[]>()
  mappedCollections.forEach((collection: any) => {
    const categoryOrder = getCategoryOrder(collection.product_sup)
    const subOrder = getCollectionSubOrder(collection)
    const hasHotAvailable = subOrder === 0
    const hasAvailableProducts = collection.has_available_products === true
    const hasHotPreorder = collection.products?.some((product: any) =>
      product.hot_rank !== null && product.availability_status === 'preorder'
    )

    // 0: hot + available (global), 1: available by category,
    // 2: hot + preorder (global), 3: preorder by category.
    const bucket = hasHotAvailable
      ? 0
      : hasAvailableProducts
        ? 100 + categoryOrder
        : hasHotPreorder
          ? 200
          : 300 + categoryOrder
    const items = collectionBuckets.get(bucket) || []
    items.push(collection)
    collectionBuckets.set(bucket, items)
  })

  const orderedCollections = Array.from(collectionBuckets.keys())
    .sort((a, b) => a - b)
    .flatMap((bucket) => {
      const items = collectionBuckets.get(bucket) || []
      if (bucket === 0 || bucket === 200) {
        return items.sort((a: any, b: any) => (a.hot_rank || Infinity) - (b.hot_rank || Infinity))
      }
      return shuffleCollections(items)
    })

  // เช็คว่ามีรูปแบนเนอร์ที่จะแสดงไหม? (ใช้ข้อมูลจาก bannerGroups ที่ดึงแยกมา)
  const hasBanner = activeBannerImage || allBannerImages.length > 0;

  return (
    <div className="min-h-screen bg-[#EBE8E1] text-[#3A3835] font-sans selection:bg-[#C8A97E]/20 flex flex-col">

      {/* 1. ตัวแบนเนอร์ด้านบน — Navbar กลางอยู่ใน app/layout.tsx */}
      {hasBanner && (
        <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden">
          <PropBanner
            allImages={allBannerImages}
            activeImage={activeBannerImage}
            categoryName={categoryParam || "All"}
          />
        </div>
      )}

      {/* 2. โซนเนื้อหาสินค้าด้านล่าง */}
      <div className={`max-w-[1600px] mx-auto w-full px-4 lg:py-16 pb-24 ${hasBanner ? 'pt-4 lg:pt-0' : 'pt-24 lg:pt-28'}`}>
        <PropFilterClient
          collections={orderedCollections}
          branches={branches || []}
          hotProductIds={(hotItems || []).map((item: any) => Number(item.product_id)).filter(Number.isSafeInteger)}
        />
      </div>
      <Footer />
    </div>

  )
}
