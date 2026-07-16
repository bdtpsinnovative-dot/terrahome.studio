"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation" 
import dynamic from "next/dynamic"
import { ArrowLeft, CheckCircle2, MapPin, Navigation } from "lucide-react"
// ⚡ 1. นำเข้า Supabase Client
import { createClient } from '@/src/supabase/client'

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

export default function ProductDetailClient({
  groupProducts,
  currentGroupId,
  initialSku,
  recommendedCollections
}: {
  groupProducts: any[]
  currentGroupId: string
  initialSku: string
  recommendedCollections?: any[]
}) {
  const router = useRouter()
  const supabase = createClient() // ⚡ เรียกใช้ Supabase
  
  const [activeProduct, setActiveProduct] = useState(() => {
    return groupProducts.find(p => p.sku === initialSku) || groupProducts[0]
  })

  const [showStock, setShowStock] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  
  const [selectedBranch, setSelectedBranch] = useState<{ lat: number; lng: number; timestamp: number } | null>(null)

  // ⚡ 2. State สำหรับปุ่ม Add to Cart
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  const handleSelectProduct = (product: any) => {
    setActiveProduct(product)
    setShowStock(false)
    const newPath = `/prop/${encodeURIComponent(currentGroupId)}/${encodeURIComponent(product.sku)}`
    
    window.history.replaceState(null, "", newPath)
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

  // ⚡ 3. ฟังก์ชันเพิ่มสินค้าลงตะกร้า
  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true)

      // เช็คว่าล็อกอินหรือยัง
      const { data: { session } } = await supabase.auth.getSession()
      
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

  return (
    <div className="relative z-[9999] min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans selection:bg-[#C8A97E]/20 flex flex-col">
      
      <nav className="w-full py-6 px-8 lg:px-12 flex items-center justify-between sticky top-0 bg-[#EAE7E0] z-[10000]">
        
        <button 
          onClick={() => router.back()} 
          className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#3A3835] flex items-center gap-2 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
          <span>BACK</span>
        </button>
        
        <div className="font-serif text-sm sm:text-base tracking-[0.25em] uppercase text-center truncate px-4">
          COLLECTION SHOWROOM
        </div>
        
        <div className="text-[9px] sm:text-[10px] text-[#8C8A86] font-medium tracking-[0.15em] text-right truncate max-w-[120px] sm:max-w-none">
          GROUP: {currentGroupId}
        </div>
      </nav>

      <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 flex-1 items-stretch py-4 lg:py-8">
        
        <div className="lg:col-span-5 p-6 lg:p-10 flex flex-col">
          <div className="flex-1 bg-[#F4F1EB] aspect-[3/4] lg:aspect-auto relative overflow-hidden group rounded-[2px]">
            {activeProduct.image_url ? (
              <img 
                src={activeProduct.image_url} 
                alt={activeProduct.name} 
                title={activeProduct.name} 
                key={activeProduct.id}
                className="w-full h-full absolute inset-0 object-contain p-10 lg:p-16 mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8C8A86] uppercase tracking-[0.2em] text-xs">
                No Image
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 p-6 lg:p-10 xl:p-16 flex flex-col gap-10">
          
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl uppercase tracking-wide leading-snug text-[#3A3835]">
              {activeProduct.name}
            </h1>
            <p className="mt-3 text-sm font-medium tracking-[0.15em] text-[#84492C]">
              {activeProduct.price > 0 ? `THB ${activeProduct.price.toLocaleString()}` : "POA"}
            </p>

            <div className="mt-10 py-6 border-y border-[#3A3835]/10 grid grid-cols-4 text-center text-xs divide-x divide-[#3A3835]/10 max-w-lg">
              <div>
                <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">MATERIAL</span>
                <span className="font-medium text-[10px] text-[#3A3835]">{specs.material || '-'}</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">WIDTH</span>
                <span className="font-medium text-[10px] text-[#3A3835]">{specs.width_cm || '-'} cm</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">DEPTH</span>
                <span className="font-medium text-[10px] text-[#3A3835]">{specs.length_cm || '-'} cm</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">HEIGHT</span>
                <span className="font-medium text-[10px] text-[#3A3835]">{specs.thickness_cm || '-'} cm</span>
              </div>
            </div>

            <div className="mt-8 max-w-lg">
              <button 
                onClick={() => setShowStock(!showStock)}
                className="w-full flex items-center justify-between py-4 border-b border-[#3A3835]/10 group"
              >
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] font-bold text-[#3A3835] group-hover:text-[#84492C] transition-colors">
                  <MapPin className="w-3.5 h-3.5" />
                  IN-STORE AVAILABILITY & MAP
                </div>
                <span className="text-[#8C8A86] text-lg font-light group-hover:text-[#84492C] transition-colors">
                  {showStock ? '−' : '+'}
                </span>
              </button>

              <div className={`overflow-hidden transition-all duration-700 ease-in-out ${showStock ? 'max-h-[1200px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                
                {activeStock.length > 0 && !userLocation && (
                  <button
                    onClick={handleGetLocation}
                    disabled={loadingLocation}
                    className="mb-4 w-full text-left text-[9px] font-bold text-[#84492C] hover:text-[#3A3835] transition-colors uppercase tracking-[0.15em] flex items-center gap-1.5 py-1"
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
                            className="text-[#8C8A86] hover:text-[#84492C] p-1 rounded-sm transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[9px] text-[#8C8A86] uppercase tracking-[0.2em] py-5">
                      CURRENTLY OUT OF STOCK
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
          </div>

          <div className="mt-4">
            <div className="mb-6">
              <span className="text-[#84492C] text-[8px] uppercase tracking-[0.2em] font-bold block mb-1">
                COMPLETE THE SET
              </span>
              <h2 className="font-serif text-lg uppercase tracking-wider text-[#3A3835]">
                COLLECTION ITEMS
              </h2>
            </div>

            <div className="flex flex-row gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {groupProducts.map((item) => {
                const isActive = item.sku === activeProduct.sku
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleSelectProduct(item)}
                    className={`snap-start min-w-[120px] max-w-[120px] flex flex-col group transition-all duration-300 cursor-pointer`}
                  >
                    <div className={`w-full aspect-[4/5] mb-3 relative overflow-hidden flex flex-col items-center justify-center rounded-[2px] transition-colors duration-300 ${
                      isActive ? 'bg-[#F2EFE9] border border-[#84492C]' : 'bg-[#F2EFE9] border border-transparent hover:border-[#3A3835]/15'
                    }`}>
                      
                      {isActive && (
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
                          <span className="flex items-center gap-1 text-[7px] font-bold text-[#84492C] uppercase tracking-[0.15em] bg-white px-2 py-0.5 rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#3A3835]/5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            VIEWING
                          </span>
                        </div>
                      )}

                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          className={`w-full h-full object-contain p-4 mix-blend-multiply transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} 
                          alt={item.name} 
                          title={item.name} 
                        />
                      ) : (
                        <span className="text-[8px] text-[#8C8A86] uppercase tracking-[0.2em]">No Img</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center px-1">
                      <h3 className={`text-[9px] uppercase font-bold tracking-[0.1em] truncate w-full transition-colors ${isActive ? 'text-[#84492C]' : 'text-[#5A544F] group-hover:text-[#84492C]'}`}>
                        {item.name}
                      </h3>
                      <p className={`text-[9px] mt-1 font-medium ${isActive ? 'text-[#3A3835]' : 'text-[#8C8A86]'}`}>
                        {item.price > 0 ? `THB ${item.price.toLocaleString()}` : "POA"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ⚡ 4. เปลี่ยนปุ่ม CONTACT เป็น ADD TO CART พร้อม Logic เช็คสถานะ */}
          <div className="pt-2 max-w-lg mt-auto">
            <button 
              onClick={handleAddToCart}
              disabled={isAddingToCart || outOfStock}
              className={`w-full py-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all duration-300 shadow-sm rounded-[2px] flex justify-center items-center gap-2 ${
                outOfStock 
                  ? 'bg-[#EAE7E0] border border-[#3A3835]/10 text-[#8C8A86] cursor-not-allowed'
                  : addedSuccess 
                    ? 'bg-[#84492C] text-white' 
                    : 'bg-[#3A3835] text-white hover:bg-[#84492C] active:scale-[0.99]'
              }`}
            >
              {isAddingToCart ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ADDING...
                </>
              ) : outOfStock ? (
                'OUT OF STOCK'
              ) : addedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ADDED TO CART
                </>
              ) : (
                'ADD TO CART'
              )}
            </button>
          </div>
          
        </div>
      </div>

      {/* ⚡ RECOMMENDED PRODUCTS SECTION */}
      {recommendedCollections && recommendedCollections.length > 0 && (
        <div className="w-full border-t border-[#D5D2CA]/70 mt-12 pt-16 pb-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal mb-8 text-center">
              RECOMMENDED FOR YOU
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 w-full relative">
              {recommendedCollections.map((group) => {
                const slides = group.products
                  ?.filter((p: any) => p.image_url !== null && p.image_url !== "")
                  .map((p: any) => ({
                    image_url: p.image_url, price: p.price, sku: p.sku, name: p.name, 
                    discount_value: p.discount_value, discount_type: p.discount_type
                  })) || []
                if (slides.length === 0 && group.cover_image_url) {
                  slides.push({ image_url: group.cover_image_url, price: null, sku: "", name: "", discount_value: null, discount_type: null })
                }
                return (
                  <div key={group.id} className="border-b border-[#D5D2CA]/70 [&:not(:nth-child(2n))]:border-r lg:[&:not(:nth-child(4n))]:border-r py-8 px-4 md:py-12 md:px-6 flex flex-col justify-between items-center relative">
                    <CollectionCard group={group} slides={slides} bgColor="#EAE7E0" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}