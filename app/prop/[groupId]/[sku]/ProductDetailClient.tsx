"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation" 
import dynamic from "next/dynamic"
import { CheckCircle2, MapPin, Navigation, MessageCircle, ChevronLeft, ChevronRight, Maximize2, Share2, X, Truck, Store, ShieldCheck } from "lucide-react"
// ⚡ 1. นำเข้า Supabase Client
import { createClient, getSafeSession } from '@/src/supabase/client'
import { trackAnalyticsCta } from '@/app/components/AnalyticsTracker'
import MessengerInquiryButton from '@/app/components/MessengerInquiryButton'

const BranchMap = dynamic(() => import('./BranchMap'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-[350px] mt-4 bg-[#F2EFE9] flex flex-col items-center justify-center text-[#84492C] text-[10px] uppercase tracking-widest animate-pulse rounded-[2px]">
      <MapPin className="w-6 h-6 mb-2 opacity-50" />
      Loading Map...
    </div>
  )
})

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

import CollectionCard from "../../CollectionCard" // ⚡ Import CollectionCard

function analyticsTrackingUrl() {
  const url = new URL(window.location.href)
  const allowedKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'category', 'filter', 'branch']
  const query = new URLSearchParams()
  for (const key of allowedKeys) {
    const value = url.searchParams.get(key)
    if (value) query.set(key, value.slice(0, 200))
  }
  return `${url.origin}${url.pathname}${query.toString() ? `?${query.toString()}` : ''}`
}

type GalleryImage = { src: string; sort: number }

function getProductGalleryImages(product: { image_url?: unknown; specs?: unknown }): string[] {
  const mainImage = typeof product.image_url === 'string' ? product.image_url.trim() : ''
  const storedImages =
    typeof product.specs === 'object' &&
    product.specs !== null &&
    Array.isArray((product.specs as { images?: unknown }).images)
      ? (product.specs as { images: unknown[] }).images
      : []

  const extraImages = storedImages
    .map((image, index) => {
      const value = typeof image === 'object' && image !== null
        ? (image as { path?: unknown; sort?: unknown })
        : {}
      const src = typeof value.path === 'string' ? value.path.trim() : ''
      return { src, sort: Number(value.sort) || index + 1 }
    })
    .filter((image): image is GalleryImage => Boolean(image.src))
    .sort((a, b) => a.sort - b.sort)
    .map(image => image.src)

  return Array.from(new Set([mainImage, ...extraImages].filter(Boolean)))
}

export default function ProductDetailClient({
  groupProducts,
  currentGroupId,
  initialSku,
  recommendedCollections: initialRecommendedCollections,
  productSup,
}: {
  groupProducts: any[]
  currentGroupId: string
  initialSku: string
  recommendedCollections?: any[]
  productSup?: string | null
}) {
  const router = useRouter()
  const supabase = createClient() // ⚡ เรียกใช้ Supabase
  
  const [activeProduct, setActiveProduct] = useState(() => {
    return groupProducts.find(p => p.sku === initialSku) || groupProducts[0]
  })
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recommendedCollections, setRecommendedCollections] = useState<any[]>(
    () => initialRecommendedCollections || []
  )

  useEffect(() => {
    if (initialRecommendedCollections && initialRecommendedCollections.length > 0) return
    let cancelled = false

    const fetchRecommendations = async () => {
      try {
        const productId = Number(activeProduct?.id)
        let relatedRank = new Map<number, number>()

        if (Number.isSafeInteger(productId)) {
          const { data: relatedScores } = await supabase.rpc('get_prop_related_products', {
            current_product_id: productId,
            limit_count: 8,
          })
          ;(relatedScores || []).forEach((item: any, index: number) => {
            const pid = Number(item.product_id)
            if (Number.isSafeInteger(pid)) relatedRank.set(pid, index)
          })
        }

        const relatedProductIds = Array.from(relatedRank.keys())
        let recs: any[] = []

        if (relatedProductIds.length > 0) {
          const { data: relatedCollectionsRaw } = await supabase
            .from("collection_groups")
            .select(`id, name, cover_image_url, product_sup, products!inner ( id, sku, name, image_url, price, status, category_id, stock ( branch_id, qty ) )`)
            .ilike("tag", "%prop%")
            .eq("products.category_id", "prop")
            .in("products.id", relatedProductIds)
            .limit(8)

          recs = (relatedCollectionsRaw || [])
            .filter((collection: any) => String(collection.id) !== String(currentGroupId))
            .map((collection: any) => {
              const products = (collection.products || [])
                .filter((p: any) => (p.status === 'active' || !p.status) && relatedRank.has(Number(p.id)))
                .sort((a: any, b: any) => (relatedRank.get(Number(a.id)) ?? Infinity) - (relatedRank.get(Number(b.id)) ?? Infinity))
              return { ...collection, products }
            })
            .filter((collection: any) => collection.products.length > 0)
            .sort((a: any, b: any) => (relatedRank.get(Number(a.products[0].id)) ?? Infinity) - (relatedRank.get(Number(b.products[0].id)) ?? Infinity))
        }

        if (recs.length === 0 && productSup) {
          const { data: fallbackCollectionsRaw } = await supabase
            .from("collection_groups")
            .select(`id, name, cover_image_url, product_sup, products!inner ( id, sku, name, image_url, price, status, category_id, stock ( branch_id, qty ) )`)
            .ilike("tag", "%prop%")
            .eq("products.category_id", "prop")
            .eq("product_sup", productSup)
            .neq("id", currentGroupId)
            .order("created_at", { ascending: false })
            .limit(8)

          recs = (fallbackCollectionsRaw || [])
            .map((collection: any) => ({
              ...collection,
              products: (collection.products || []).filter((p: any) => p.status === 'active' || !p.status),
            }))
            .filter((collection: any) => collection.products.length > 0)
        }

        if (!cancelled) {
          setRecommendedCollections(recs)
        }
      } catch (err) {
        console.warn('[ProductDetailClient] Failed to load recommendations:', err)
      }
    }

    fetchRecommendations()
    return () => {
      cancelled = true
    }
  }, [activeProduct?.id, currentGroupId, initialRecommendedCollections, productSup, supabase])

  const getDiscountedPrice = (product: any) => {
    const originalPrice = Number(product?.price || 0)
    const discountValue = Number(product?.discount_value)
    const discountType = product?.discount_type

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return null
    if (!Number.isFinite(discountValue) || discountValue <= 0 || !discountType) return originalPrice

    if (discountType === 'PERCENT') return originalPrice * (1 - (discountValue / 100))
    if (discountType === 'FIXED') return Math.max(0, originalPrice - discountValue)
    return originalPrice
  }

  const [showStock, setShowStock] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  
  const [selectedBranch, setSelectedBranch] = useState<{ lat: number; lng: number; timestamp: number } | null>(null)

  // ⚡ 2. State สำหรับปุ่ม Add to Cart
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)
  const trackedViewsRef = useRef<Set<number>>(new Set())
  const pendingViewsRef = useRef<Set<number>>(new Set())
  const previousProductRef = useRef<number | null>(null)

  useEffect(() => {
    const productId = Number(activeProduct?.id)
    if (!Number.isSafeInteger(productId) || trackedViewsRef.current.has(productId) || pendingViewsRef.current.has(productId)) return

    if (previousProductRef.current !== null && previousProductRef.current !== productId) {
      window.dispatchEvent(new CustomEvent('prop-product-selected', { detail: { productId, sku: activeProduct?.sku || String(productId) } }))
    }
    previousProductRef.current = productId

    pendingViewsRef.current.add(productId)
    const payload = JSON.stringify({
      event_type: 'product_view',
      product_id: productId,
      collection_group_id: currentGroupId,
      page_type: 'product',
      page_path: window.location.pathname,
      page_entity_id: activeProduct?.sku || String(productId),
      tracking_url: analyticsTrackingUrl(),
      metadata: {
        path: window.location.pathname,
      },
    })

    const sendViewEvent = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch('/api/algorithm/events', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: payload,
            credentials: 'same-origin',
            cache: 'no-store',
            keepalive: true,
          })

          if (!response.ok) throw new Error(`product_view returned ${response.status}`)

          trackedViewsRef.current.add(productId)
          pendingViewsRef.current.delete(productId)
          return
        } catch (error) {
          if (attempt === 1 && process.env.NODE_ENV !== 'production') {
            console.warn('[algorithm-events] product_view was not recorded', error)
          }
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 400))
        }
      }

      pendingViewsRef.current.delete(productId)
    }

    void sendViewEvent()
  }, [activeProduct?.id, activeProduct?.sku, currentGroupId])

  const handleSelectProduct = (product: any) => {
    setActiveProduct(product)
    setSelectedImageIndex(0)
    setShowStock(false)
    const newPath = `/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(product.sku)}`
    
    window.history.replaceState(null, "", newPath)
  }

  const handleShareProduct = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: activeProduct.name,
        text: `${activeProduct.name} - TERRA HOME STUDIO`,
        url: window.location.href,
      }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งครับ")
      return
    }
    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        setLoadingLocation(false)
      },
      (error) => {
        console.error(error)
        alert("ไม่สามารถดึงตำแหน่งได้ โปรดเปิดสิทธิ์เข้าถึงพิกัดในเบราว์เซอร์ก่อนนะครับ")
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }

  // คำนวณสต็อกรวมทั้งหมดของสินค้าชิ้นที่เปิดดูอยู่
  const totalStock = activeProduct.stock?.reduce((sum: number, s: any) => sum + Number(s.qty), 0) || 0
  const outOfStock = totalStock <= 0
  const activeDiscountValue = Number(activeProduct?.discount_value)
  const activeDiscountType = activeProduct?.discount_type
  const activeDiscountedPrice = getDiscountedPrice(activeProduct)
  const hasActiveDiscount = Number.isFinite(activeDiscountValue) && activeDiscountValue > 0 && activeDiscountType

  // ⚡ 3. ฟังก์ชันเพิ่มสินค้าลงตะกร้า
  const handleAddToCart = async () => {
    try {
      trackAnalyticsCta('add_to_cart', { product_id: activeProduct.id, price: activeProduct.price })
      setIsAddingToCart(true)

      // เช็คว่าล็อกอินหรือยัง
      const session = await getSafeSession()
      
      if (!session) {
        alert("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้านะครับ")
        router.push('/login')
        return
      }

      // ตรวจสอบว่าในตะกร้ามีสินค้านี้อยู่แล้วหรือเปล่า
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('product_id', activeProduct.id)
        .maybeSingle()

      if (existingItem) {
        // ถ้ามีแล้ว เช็คว่าถ้าบวกเพิ่มอีก 1 จะเกินสต็อกไหม
        if (existingItem.quantity >= totalStock) {
          alert(`ขออภัยครับ สินค้านี้มีสต็อกคงเหลือ ${totalStock} ชิ้น (คุณเพิ่มลงตะกร้าเต็มจำนวนแล้ว)`)
          setIsAddingToCart(false)
          return
        }

        // อัปเดตจำนวน +1
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id)
          
        if (updateError) throw updateError
      } else {
        // ถ้ายังไม่มีในตะกร้า ให้สร้างแถวใหม่ (insert)
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: session.user.id,
            product_id: activeProduct.id,
            quantity: 1
          })
          
        if (insertError) throw insertError
      }

      // โชว์แอนิเมชันติ๊กถูก 2 วินาที
      setAddedSuccess(true)
      setTimeout(() => setAddedSuccess(false), 2000)

    } catch (error: any) {
      console.error("Error adding to cart:", error)
      alert("เกิดข้อผิดพลาดในการเพิ่มสินค้าลงตะกร้า โปรดลองอีกครั้งครับ")
    } finally {
      setIsAddingToCart(false)
    }
  }

  const specs = activeProduct.specs || {}
  const galleryImages = getProductGalleryImages(activeProduct)
  const selectedImage = galleryImages[selectedImageIndex] || galleryImages[0]
  
  let activeStock = activeProduct.stock?.filter((s: any) => s.qty > 0).map((s: any) => {
    if (userLocation && s.branches?.latitude && s.branches?.longitude) {
      const dist = calculateDistance(
        userLocation[0],
        userLocation[1],
        Number(s.branches.latitude),
        Number(s.branches.longitude)
      )
      return { ...s, distance: dist }
    }
    return { ...s, distance: null }
  }) || []

  if (userLocation) {
    activeStock.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }

  const rawName = activeProduct.name || ''
  const sku = activeProduct.sku || ''
  const displayName = sku && rawName.toLowerCase().endsWith(sku.toLowerCase())
    ? rawName.slice(0, rawName.length - sku.length).trim()
    : rawName

  return (
    <div data-prop-product-id={String(activeProduct.id)} className="relative min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans selection:bg-[#C8A97E]/20 flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 flex-1 items-start pt-28 pb-8 lg:pt-36 lg:pb-12 border-b border-[#D5D2CA]/70">
        
        {/* 🌟 ฝั่งซ้าย: รูปสินค้าหลักและ Gallery สไตล์ Studio Luxury */}
        <div className="lg:col-span-7 xl:col-span-7 lg:border-r border-[#D5D2CA]/70 p-4 sm:p-6 lg:p-8 xl:p-10 flex flex-col items-center justify-start">
          <div className="relative w-full max-w-[560px] aspect-square bg-[#F4F1EB] rounded-[3px] overflow-hidden group shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-[#3A3835]/5 flex items-center justify-center p-3 sm:p-6">
            {outOfStock && (
              <div className="absolute top-4 right-4 z-20">
                <span className="bg-[#DC2626] text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[2px] shadow-xs">
                  OUT OF STOCK
                </span>
              </div>
            )}

            {selectedImage ? (
              <img 
                src={selectedImage}
                alt={activeProduct.name} 
                title={activeProduct.name} 
                key={`${activeProduct.id}-${selectedImage}`}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8C8A86] uppercase tracking-[0.2em] text-xs">
                No Image
              </div>
            )}

            {/* Prev / Next Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#3A3835] backdrop-blur-md shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 cursor-pointer"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#3A3835] backdrop-blur-md shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 cursor-pointer"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Bottom Floating Bar on Image */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
              {galleryImages.length > 1 && (
                <span className="px-2.5 py-1 rounded-[2px] bg-[#3A3835]/70 backdrop-blur-xs text-white text-[9px] font-mono tracking-widest uppercase">
                  {String(selectedImageIndex + 1).padStart(2, '0')} / {String(galleryImages.length).padStart(2, '0')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-[2px] bg-[#3A3835]/70 hover:bg-[#3A3835] backdrop-blur-xs text-white text-[9px] font-medium tracking-[0.15em] uppercase opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="ขยายรูปภาพขนาดเต็ม"
            >
              <Maximize2 className="w-3 h-3" />
              <span>ZOOM</span>
            </button>
          </div>

          {/* Centered Gallery Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="w-full max-w-[560px] mt-4 flex items-center justify-center gap-2.5 overflow-x-auto py-1 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {galleryImages.map((image, index) => {
                const isSelected = selectedImage === image
                return (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                    className={`relative h-20 w-16 sm:h-22 sm:w-18 shrink-0 overflow-hidden rounded-[2px] bg-[#F4F1EB] transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? 'border-[#84492C] ring-2 ring-[#84492C]/40 shadow-xs scale-102'
                        : 'border-[#3A3835]/12 opacity-70 hover:opacity-100 hover:border-[#84492C]/40'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${activeProduct.name} - thumbnail ${index + 1}`}
                      className="h-full w-full object-cover mix-blend-multiply"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 🌟 ฝั่งขวา: รายละเอียดสินค้า สเปก และ Action Panel แบบ STICKY สไตล์ Luxury Studio */}
        <div className="lg:col-span-5 xl:col-span-5 p-6 lg:p-8 xl:p-10 flex flex-col gap-5 lg:sticky lg:top-28 xl:top-32 self-start">
          
          {/* Header Row: Back button & SKU */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/prop')
                }
              }}
              className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] hover:text-[#84492C] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>TERRA STUDIO PROP</span>
            </button>
            {sku && (
              <span className="text-[9px] font-mono tracking-[0.12em] text-[#8C8A86] bg-[#3A3835]/5 px-2 py-0.5 rounded-[2px] border border-[#3A3835]/10">
                SKU: {sku}
              </span>
            )}
          </div>

          {/* Product Name */}
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl uppercase tracking-wide leading-snug text-[#3A3835] font-normal">
              {displayName}
            </h1>
          </div>

          {/* Price & Stock Status Row */}
          <div>
            {outOfStock ? (
              <div className="flex items-center gap-3">
                <span className="bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-[2px]">
                  OUT OF STOCK
                </span>
                {Number(activeProduct.price) > 0 && (
                  <span className="text-sm font-mono text-[#8C8A86] line-through">
                    THB {Number(activeProduct.price).toLocaleString()}
                  </span>
                )}
              </div>
            ) : hasActiveDiscount && activeDiscountedPrice !== null ? (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#8C8A86]">THB</span>
                <span className="font-serif text-2xl lg:text-3xl text-[#84492C] font-normal tracking-wide">
                  {Number(activeDiscountedPrice).toLocaleString()}
                </span>
                <span className="text-xs font-mono text-[#8C8A86] line-through">
                  THB {Number(activeProduct.price).toLocaleString()}
                </span>
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-[2px]">
                  {activeDiscountType === 'PERCENT' ? `-${activeDiscountValue}%` : `-฿${activeDiscountValue}`}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#8C8A86]">THB</span>
                <span className="font-serif text-2xl lg:text-3xl text-[#84492C] font-normal tracking-wide">
                  {activeProduct.price > 0 ? Number(activeProduct.price).toLocaleString() : 'POA'}
                </span>
                {!outOfStock && (
                  <span className="ml-2 text-[9px] uppercase tracking-[0.15em] text-[#84492C] bg-[#84492C]/10 px-2 py-0.5 rounded-[2px] font-medium">
                    พร้อมจำหน่าย ({totalStock} ชิ้น)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Architectural Specifications Table */}
          <div className="p-4 rounded-[2px] bg-[#F4F1EB] border border-[#D5D2CA]/80">
            {Boolean(
              (specs.width_cm && String(specs.width_cm).trim() !== '-') ||
              (specs.length_cm && String(specs.length_cm).trim() !== '-') ||
              (specs.thickness_cm && String(specs.thickness_cm).trim() !== '-')
            ) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#D5D2CA]">
                <div className="pt-1 sm:pt-0">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-1">MATERIAL</span>
                  <span className="font-medium text-[11px] text-[#3A3835]">{specs.material || 'Natural Stone'}</span>
                </div>
                <div className="pt-2 sm:pt-0">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-1">WIDTH</span>
                  <span className="font-medium text-[11px] text-[#3A3835]">{specs.width_cm ? `${specs.width_cm} cm` : '-'}</span>
                </div>
                <div className="pt-2 sm:pt-0">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-1">DEPTH</span>
                  <span className="font-medium text-[11px] text-[#3A3835]">{specs.length_cm ? `${specs.length_cm} cm` : '-'}</span>
                </div>
                <div className="pt-2 sm:pt-0">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-1">HEIGHT</span>
                  <span className="font-medium text-[11px] text-[#3A3835]">{specs.thickness_cm ? `${specs.thickness_cm} cm` : '-'}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs px-1">
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-0.5">MATERIAL</span>
                  <span className="font-medium text-[11.5px] text-[#3A3835]">{specs.material || 'Natural Stone'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] font-medium mb-0.5">DIMENSIONS</span>
                  <span className="text-[10px] text-[#8C8A86] tracking-wide">สอบถามขนาดหรือสั่งทำพิเศษได้ที่โชว์รูม</span>
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs: Inquiry / Stock / Share */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                trackAnalyticsCta('open_contact_channels', {
                  product_id: activeProduct.id,
                  product_name: activeProduct.name || activeProduct.sku,
                  source: 'product_detail_main_inquiry',
                })
                setIsInquiryOpen(true)
              }}
              className="w-full py-4 px-6 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[11px] font-bold tracking-[0.2em] uppercase rounded-[2px] transition-all duration-300 shadow-sm flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer group"
            >
              <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>สอบถามรายละเอียด / สั่งซื้อสินค้านี้</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowStock(!showStock)
                  trackAnalyticsCta(showStock ? 'close_stock_availability' : 'open_stock_availability', { product_id: activeProduct.id })
                }}
                className="flex-1 py-3 px-3 border border-[#3A3835]/15 hover:border-[#84492C] bg-white/40 hover:bg-white text-[#3A3835] hover:text-[#84492C] text-[9.5px] font-bold tracking-[0.15em] uppercase rounded-[2px] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#84492C]" />
                <span>{showStock ? 'ซ่อนสต็อกสาขา' : `สต็อกโชว์รูม (${activeStock.length} สาขา)`}</span>
              </button>

              <button
                type="button"
                onClick={handleShareProduct}
                title="แชร์สินค้านี้"
                className="py-3 px-4 border border-[#3A3835]/15 hover:border-[#84492C] bg-white/40 hover:bg-white text-[#3A3835] hover:text-[#84492C] text-[9.5px] font-bold tracking-[0.15em] uppercase rounded-[2px] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#84492C]" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'แชร์'}</span>
              </button>
            </div>
          </div>

          {/* In-Store Availability & Map Accordion */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showStock ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="pt-2 flex flex-col gap-3">
              {activeStock.length > 0 && !userLocation && (
                <button
                  onClick={handleGetLocation}
                  disabled={loadingLocation}
                  className="w-full text-left text-[9px] font-bold text-[#84492C] hover:text-[#3A3835] transition-colors uppercase tracking-[0.15em] flex items-center gap-1.5 py-1"
                >
                  <Navigation className={`w-3 h-3 ${loadingLocation ? 'animate-spin' : ''}`} />
                  {loadingLocation ? 'CALCULATING...' : 'CALCULATE DISTANCE FROM YOUR LOCATION'}
                </button>
              )}

              <div className="bg-[#F2EFE9]/50 p-2 rounded-sm border border-[#3A3835]/5 flex flex-col gap-1">
                {activeStock.length > 0 ? (
                  activeStock.map((s: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        if (s.branches?.latitude && s.branches?.longitude) {
                          setSelectedBranch({
                            lat: Number(s.branches.latitude),
                            lng: Number(s.branches.longitude),
                            timestamp: Date.now()
                          })
                        }
                      }}
                      className="flex justify-between items-center text-[10px] uppercase tracking-wider p-3 rounded-sm cursor-pointer hover:bg-white/60 transition-all duration-300 border border-transparent hover:border-[#3A3835]/10"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[#3A3835] font-medium tracking-[0.1em]">
                          {s.branches?.branch_name || 'Unknown Branch'}
                        </span>
                        {s.distance !== null && (
                          <span className="text-[8.5px] text-[#84492C] font-medium flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {s.distance.toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#84492C]"></span>
                          <span className="font-mono text-[#3A3835] font-semibold">{s.qty} in stock</span>
                        </div>
                        
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} 
                          title={`Get directions to ${s.branches.branch_name} branch on Google Maps`}
                          data-analytics-event="open_directions"
                          className="text-[#8C8A86] hover:text-[#84492C] p-1 rounded-sm transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[9px] text-[#84492C] uppercase tracking-[0.2em] py-5 flex flex-col items-center gap-1 font-semibold">
                    <span>OUT OF STOCK</span>
                  </div>
                )}
              </div>

              {activeStock.length > 0 && (
                <BranchMap 
                  activeStock={activeStock} 
                  productImage={activeProduct.image_url} 
                  productName={activeProduct.name}
                  userLocation={userLocation}
                  setUserLocation={setUserLocation}
                  selectedBranch={selectedBranch}
                />
              )}
            </div>
          </div>

          {/* Studio Service Guarantees */}
          <div className="pt-4 border-t border-[#3A3835]/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-[#5A544F]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#84492C] shrink-0" />
              <span>จัดส่งปลอดภัยทั่วประเทศ</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#84492C] shrink-0" />
              <span>ชมสินค้าจริงที่โชว์รูม</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#84492C] shrink-0" />
              <span>งานคราฟต์เกรดพรีเมียม</span>
            </div>
          </div>

          {/* Complete The Set / Collection Items (ONLY rendered when multiple products exist) */}
          {groupProducts.length > 1 && (
            <div className="pt-6 border-t border-[#3A3835]/10">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <span className="text-[#84492C] text-[8px] uppercase tracking-[0.2em] font-bold block mb-1">
                    COMPLETE THE SET
                  </span>
                  <h2 className="font-serif text-base uppercase tracking-wider text-[#3A3835]">
                    COLLECTION ITEMS ({groupProducts.length})
                  </h2>
                </div>
                <span className="text-[10px] text-[#8C8A86] tracking-wider">เลือกชมชิ้นอื่นในเซต</span>
              </div>

              <div className="flex flex-row gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {groupProducts.map((item) => {
                  const isActive = item.sku === activeProduct.sku
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleSelectProduct(item)}
                      className="snap-start min-w-[110px] max-w-[110px] flex flex-col group transition-all duration-300 cursor-pointer"
                    >
                      <div className={`w-full aspect-[4/5] mb-2 relative overflow-hidden flex flex-col items-center justify-center rounded-[2px] transition-all duration-300 ${
                        isActive ? 'bg-[#F2EFE9] border-2 border-[#84492C] shadow-xs' : 'bg-[#F2EFE9] border border-transparent hover:border-[#84492C]/30 opacity-80 hover:opacity-100'
                      }`}>
                        
                        {isActive && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
                            <span className="flex items-center gap-0.5 text-[7px] font-bold text-[#84492C] uppercase tracking-[0.15em] bg-white/95 px-1.5 py-0.5 rounded-[2px] shadow-xs border border-[#3A3835]/5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              VIEWING
                            </span>
                          </div>
                        )}

                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            className={`w-full h-full object-cover mix-blend-multiply transition-all duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} 
                            alt={item.name} 
                            title={item.name} 
                          />
                        ) : (
                          <span className="text-[8px] text-[#8C8A86] uppercase tracking-[0.2em]">No Img</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center text-center px-0.5">
                        <h3 className={`text-[9px] uppercase font-bold tracking-[0.08em] truncate w-full transition-colors ${isActive ? 'text-[#84492C]' : 'text-[#5A544F] group-hover:text-[#84492C]'}`}>
                          {item.name}
                        </h3>
                        {((item.stock || []).reduce((sum: number, stockItem: any) => sum + Number(stockItem?.qty || 0), 0) > 0) ? (
                          <p className={`text-[9px] mt-0.5 font-medium ${isActive ? 'text-[#3A3835]' : 'text-[#8C8A86]'}`}>
                            {item.price > 0 ? `THB ${Number(item.price).toLocaleString()}` : 'POA'}
                          </p>
                        ) : (
                          <div className="mt-0.5 flex flex-col items-center">
                            <p className="text-[#DC2626] text-[9px] tracking-wider font-bold">
                              OUT OF STOCK
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* ⚡ RECOMMENDED PRODUCTS SECTION */}
      {recommendedCollections && recommendedCollections.length > 0 && (
        <div className="w-full mt-4 pt-10 pb-16">
          <div className="max-w-[1600px] mx-auto px-6">
            <h2 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal mb-8 text-center">
              RECOMMENDED FOR YOU
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 w-full relative border-t border-[#D5D2CA]/70">
              {recommendedCollections.map((group) => {
                const slides = group.products
                  ?.filter((p: any) => p.image_url !== null && p.image_url !== "")
                  .map((p: any) => ({
                    image_url: p.image_url, price: p.price, sku: p.sku, name: p.name, 
                    width_cm: p.width_cm ?? p.specs?.width_cm ?? null,
                    length_cm: p.length_cm ?? p.specs?.length_cm ?? null,
                    thickness_cm: p.thickness_cm ?? p.specs?.thickness_cm ?? null,
                    discount_value: p.discount_value, discount_type: p.discount_type
                  })) || []
                if (slides.length === 0 && group.cover_image_url) {
                  slides.push({
                    image_url: group.cover_image_url, price: null, sku: "", name: "",
                    width_cm: group.products?.[0]?.width_cm ?? group.products?.[0]?.specs?.width_cm ?? null,
                    length_cm: group.products?.[0]?.length_cm ?? group.products?.[0]?.specs?.length_cm ?? null,
                    thickness_cm: group.products?.[0]?.thickness_cm ?? group.products?.[0]?.specs?.thickness_cm ?? null,
                    discount_value: null, discount_type: null
                  })
                }
                return (
                  <div key={group.id} className="border-b border-[#D5D2CA]/70 [&:not(:nth-child(2n))]:border-r lg:[&:not(:nth-child(4n))]:border-r flex flex-col justify-between items-center relative overflow-hidden">
                    <CollectionCard group={group} slides={slides} bgColor="#EAE7E0" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messenger Inquiry Drawer Modal */}
      <MessengerInquiryButton
        productName={activeProduct.name || activeProduct.sku || 'สินค้านี้'}
        isOpen={isInquiryOpen}
        onOpenChange={setIsInquiryOpen}
        hideTrigger={true}
      />

      {/* Fullscreen Image Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2.5 rounded-full bg-white/10 hover:bg-white/20 z-20 cursor-pointer"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>
          {selectedImage && (
            <img 
              src={selectedImage}
              alt={activeProduct.name}
              className="max-w-[92vw] max-h-[88vh] object-contain rounded-[2px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
