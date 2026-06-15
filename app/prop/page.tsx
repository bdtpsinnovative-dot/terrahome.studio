import Link from "next/link"
import { createClient } from "../../src/supabase/server"
import PropFilterClient from "./PropFilterClient"
import Navbar from "../components/Navbar"
import PropBanner from "./PropBanner" 

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PropCollectionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const resolvedParams = await searchParams
  const branchId = resolvedParams.branch as string | undefined
  const categoryParam = resolvedParams.category as string | undefined

  const { data: branches } = await supabase
    .from("branches")
    .select("id, branch_code, branch_name, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("branch_name", { ascending: true })

  const productSelectStr = branchId && branchId !== "all"
    ? `id, sku, name, image_url, price, stock!inner ( branch_id, qty )`
    : `id, sku, name, image_url, price`

  let collectionQuery = supabase
    .from("collection_groups")
    .select(`*, products!inner ( ${productSelectStr} )`)
    .order("created_at", { ascending: false })

  if (branchId && branchId !== "all") {
    collectionQuery = collectionQuery
      .eq("products.stock.branch_id", branchId)
      .gt("products.stock.qty", 0)
  }

  const { data: collections, error } = await collectionQuery

  if (error) {
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

  const now = new Date()
  
  const activeCollections = collections?.filter(collection => 
    collection.products && collection.products.length > 0
  ) || []

  const allBannerImages = Array.from(new Set(
    activeCollections
      .map(c => c.image_url)
      .filter((url): url is string => !!url && url !== "")
  ));

  let activeBannerImage = null;
  if (categoryParam && categoryParam !== "All" && categoryParam !== "SPECIAL_DISCOUNT") {
    const matchedGroup = activeCollections.find(c => c.product_sup === categoryParam && c.image_url);
    if (matchedGroup) {
      activeBannerImage = matchedGroup.image_url;
    }
  }

  const mappedCollections = activeCollections.map((collection) => {
    const mappedProducts = collection.products.map((product: any) => {
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
        discount_value: applicableDiscount ? applicableDiscount.value : null,
        discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
      }
    })
    return { ...collection, products: mappedProducts }
  })

  const hasBanner = activeBannerImage || allBannerImages.length > 0;

  return (
    <div className="min-h-screen bg-[#EBE8E1] text-[#3A3835] font-sans selection:bg-[#C8A97E]/20 flex flex-col">
      
      {/* 1. จัดตำแหน่ง Navbar */}
      <div className="relative z-50">
        <Navbar collections={collections} isLightMode={!hasBanner} />
      </div>

      {/* 2. 🔥 แก้ไขตรงนี้ครับนาย! หดความสูงกล่องหุ้มลงมาเหลือ h-[45vh] lg:h-[55vh] ให้เท่ากับขนาดแบนเนอร์จริงแล้วครับ */}
      {hasBanner && (
        <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden">
          <PropBanner 
            allImages={allBannerImages} 
            activeImage={activeBannerImage}
            categoryName={categoryParam || "All"}
          />
        </div>
      )}

      {/* 3. โซนเนื้อหาสินค้าด้านล่าง */}
      {/* 🔥 ปรับเป็น pt-0 เพื่อให้เส้น Grid วิ่งจ่อขึ้นไปจูบขอบตูดแบนเนอร์พอดีเป๊ะ เส้นจะต่อกันคมชัดครบทุกพิกเซลครับนาย */}
      <div className="relative z-30 max-w-[1600px] mx-auto w-full px-4 lg:py-16 pt-0 pb-24">
        {mappedCollections.length === 0 ? (
          <div className="text-center py-32">
            <span className="text-[#8C8A86] text-[10px] uppercase tracking-[0.2em] font-medium">
              No Collections Discovered
            </span>
          </div>
        ) : (
          <PropFilterClient collections={mappedCollections} branches={branches || []} />
        )}
      </div>
    </div>
  )
}