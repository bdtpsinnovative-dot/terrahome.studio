// app/prop/page.tsx
import Link from "next/link"
import { createClient } from "../../src/supabase/server"
import PropFilterClient from "./PropFilterClient"

export const revalidate = 0

export default async function PropCollectionsPage() {
  const supabase = await createClient()

  // 1. ดึงข้อมูล Collections และ Products (เพิ่ม id มาด้วยเพื่อเอาไปเทียบกับ discount_rules)
  const { data: collections, error } = await supabase
    .from("collection_groups")
    .select(`
      *,
      products ( id, sku, image_url, price )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6]">
        <div className="text-center">
          <p className="text-[#C8A97E] font-serif text-xl mb-2">Unavailable</p>
          <p className="text-[#8C8A86] text-sm font-light tracking-wide">Unable to load the collections at this time.</p>
        </div>
      </div>
    )
  }

  // 2. ดึงข้อมูลส่วนลดที่เปิดใช้งานอยู่ พร้อมกฎที่ผูกไว้
  const { data: activeDiscounts } = await supabase
    .from("discounts")
    .select(`
      id, discount_type, value, start_date, end_date,
      discount_rules ( product_id )
    `)
    .eq("active", true)

  // 3. Map ข้อมูลส่วนลดเข้าไปใน Products แต่ละตัว
  const now = new Date()
  
  const mappedCollections = collections?.map((collection) => {
    const mappedProducts = collection.products.map((product: any) => {
      let applicableDiscount = null

      if (activeDiscounts && activeDiscounts.length > 0) {
        // หาส่วนลดที่ตรงกับสินค้านี้ หรือส่วนลดที่ใช้ได้กับ "ทุกสินค้า" (product_id เป็น null)
        applicableDiscount = activeDiscounts.find(discount => {
          // เช็คเรื่องวันที่ (ถ้ามี start_date/end_date)
          const isStarted = !discount.start_date || new Date(discount.start_date) <= now
          const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now
          if (!isStarted || !isNotEnded) return false

          // เช็คว่าอยู่ในกฎของสินค้านี้ไหม
          return discount.discount_rules.some((rule: any) => 
            rule.product_id === product.id || rule.product_id === null
          )
        })
      }

      // แปะค่า discount_value และ discount_type เข้าไปใน object product
      return {
        ...product,
        discount_value: applicableDiscount ? applicableDiscount.value : null,
        discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
      }
    })

    return { ...collection, products: mappedProducts }
  }) || []

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2C2A26] font-sans selection:bg-[#C8A97E]/20">
      
      {/* Luxury Minimal Navbar */}
      <nav className="w-full py-6 px-6 lg:px-12 flex justify-between items-center border-b border-[#2C2A26]/5 sticky top-0 bg-[#F9F8F6]/90 backdrop-blur-md z-50">
        <Link href="/" className="text-[10px] font-medium tracking-[0.2em] text-[#8C8A86] hover:text-[#C8A97E] transition-colors uppercase">
          Return
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 font-serif text-xl lg:text-2xl tracking-widest text-[#2C2A26]">
          Terra Home Studio
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-[1500px] mx-auto py-12 sm:py-16 lg:py-24">
        
        {/* Editorial Header */}
        <div className="mb-12 sm:mb-16 lg:mb-20 flex flex-col items-center text-center px-4">
          <span className="text-[#C8A97E] text-[10px] uppercase font-medium tracking-[0.3em] mb-4">
            Curated Selection
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#2C2A26] mb-6 tracking-wide leading-tight max-w-2xl">
            The Prop Collection
          </h1>
        </div>

        {/* ✅ ส่ง mappedCollections ที่มีส่วนลดแล้ว ไปให้ Client */}
        {mappedCollections.length === 0 ? (
          <div className="text-center py-32">
            <span className="text-[#C8A97E] text-sm uppercase tracking-[0.2em] font-light">No Collections Discovered</span>
          </div>
        ) : (
          <PropFilterClient collections={mappedCollections} />
        )}

      </div>
    </div>
  )
}