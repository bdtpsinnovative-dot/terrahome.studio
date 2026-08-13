import Link from "next/link"
import { createClient } from "../../src/supabase/server"
import PropFilterClient from "./PropFilterClient"
import PropBanner from "./PropBanner"
import Footer from "../components/Footer"
import type { Metadata } from "next"

export const revalidate = 3600 // cache 1 ชั่วโมง แทน 0 ช่วยลด TTFB

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

  // 🌟 [ไม้ตายแก้บั๊กแบนเนอร์หาย!] ดึงข้อมูลเฉพาะรูปแบนเนอร์แยกต่างหาก 
  // เพื่อให้มั่นใจว่ารูปจะไม่โดนตัดทิ้ง แม้สินค้านั้นจะไม่มีสต็อกในสาขาที่เลือกก็ตาม!
  const { data: bannerGroups } = await supabase
    .from("collection_groups")
    .select("product_sup, image_url")
    .ilike("tag", "%prop%");

  let activeBannerImage = null;
  let allBannerImages: string[] = [];

  if (bannerGroups) {
    if (categoryParam && categoryParam !== "All" && categoryParam !== "SPECIAL_DISCOUNT") {
      // ถ้าเลือกหมวดหมู่ ให้ค้นหารูปแบนเนอร์จากหมวดหมู่นั้นตรงๆ (ไม่ต้องแคร์สต็อก)
      const matchedGroup = bannerGroups.find(c => c.product_sup === categoryParam && c.image_url);
      if (matchedGroup) {
        activeBannerImage = matchedGroup.image_url;
      }
    } else {
      // ถ้าเลือก All ให้ดึงรูปทั้งหมดมาเล่นสไลด์โชว์
      allBannerImages = Array.from(new Set(
        bannerGroups.map(c => c.image_url).filter((url): url is string => !!url && url !== "")
      ));
    }
  }

  // 2. ดึงข้อมูลสินค้าและกรองตามสาขา (เฉพาะส่วนเนื้อหาสินค้าด้านล่าง)
  const productSelectStr = `id, sku, name, image_url, price, status, category_id, specs, stock ( branch_id, qty )`

  const collectionQuery = supabase
    .from("collection_groups")
    .select(`*, products!inner ( ${productSelectStr} )`)
    .ilike("tag", "%prop%")
    .eq("products.category_id", "prop")
    .order("created_at", { ascending: false })

  const { data: collections, error } = await collectionQuery

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
      return {
        ...product,
        stock: stockItems,
        total_stock: totalStock,
        availability_status: totalStock > 0 ? 'available' : 'preorder',
        hot_rank: hotRankByProductId.get(Number(product.id)) || null,
        hot_score: hotScoreByProductId.get(Number(product.id)) || null,
        discount_value: applicableDiscount ? applicableDiscount.value : null,
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

  // Match the product-ordering design: Hot Item first, then Vase, Doll/
  // Decorative, Ornament and the remaining categories. Within each category,
  // use the sub-order Hot+stock -> stock -> Hot+preorder -> preorder.
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
    const bucket = collection.hot_rank !== null && subOrder === 0
      ? 0
      : (categoryOrder * 10) + subOrder
    const items = collectionBuckets.get(bucket) || []
    items.push(collection)
    collectionBuckets.set(bucket, items)
  })

  const orderedCollections = Array.from(collectionBuckets.keys())
    .sort((a, b) => a - b)
    .flatMap((bucket) => {
      const items = collectionBuckets.get(bucket) || []
      if (bucket === 0) {
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
