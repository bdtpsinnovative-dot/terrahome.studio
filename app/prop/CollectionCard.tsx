"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProductSlide {
  image_url: string
  price: number | null
  sku: string
  name?: string
  discount_value?: number | null
  discount_type?: 'PERCENT' | 'FIXED' | null
  availability_status?: 'available' | 'preorder'
}

export default function CollectionCard({
  group,
  slides,
  bgColor = "#EBE8E1" // 🌟 ส่งเป็น hex color แทน tailwind class เพื่อป้องกันปัญหา class โดน purge
}: {
  group: any
  slides: ProductSlide[]
  bgColor?: string
}) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)

  const stockQtyForProduct = (product: any) =>
    (product?.stock || []).reduce((sum: number, stockItem: any) => sum + Number(stockItem?.qty || 0), 0)

  const availableProducts = (group.products || []).filter((product: any) => stockQtyForProduct(product) > 0)
  const isPreOrderGroup = availableProducts.length === 0

  const preferredSlides = slides.filter((slide) => {
    const matchedProduct = (group.products || []).find((product: any) => product?.sku === slide.sku)
    if (!matchedProduct) return availableProducts.length === 0
    return stockQtyForProduct(matchedProduct) > 0
  })

  const resolvedSlides = preferredSlides.length > 0 ? preferredSlides : slides
  const currentSlide = resolvedSlides[currentIndex] || resolvedSlides[0] || { image_url: null, price: null, sku: "", name: "" }
  
  // 🌟 ถ้ามีรูปปกกลุ่ม cover_image_url ให้ใช้รูปนี้เป็นหลักเดี่ยวๆ
  const groupCoverImage = group?.cover_image_url && String(group.cover_image_url).trim() !== "" ? String(group.cover_image_url).trim() : null

  // คำนวณราคาสำหรับสินค้าทุกประเภท (ทั้งพร้อมส่งและพรีออเดอร์)
  const allGroupProducts = group.products || []
  const targetProducts = availableProducts.length > 0 ? availableProducts : allGroupProducts
  const priceValues = targetProducts
    .map((product: any) => Number(product?.price))
    .filter((price: number) => Number.isFinite(price) && price > 0)

  const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : (currentSlide.price || null)
  const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : (currentSlide.price || null)
  const hasPriceRange = minPrice !== null && maxPrice !== null && minPrice !== maxPrice
  const displayPrice = currentSlide.price || minPrice

  const firstAvailableProduct = availableProducts[0] || group.products?.[0]
  const firstProductSku = firstAvailableProduct?.sku
  const targetHref = firstProductSku
    ? `/prop/${encodeURIComponent(group.id)}/${encodeURIComponent(firstProductSku)}`
    : currentSlide.sku
      ? `/prop/${encodeURIComponent(group.id)}/${encodeURIComponent(currentSlide.sku)}`
      : `/prop/${encodeURIComponent(group.id)}`

  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setIsNavigating(true)
    router.push(targetHref)
  }

  useEffect(() => {
    if (groupCoverImage || resolvedSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % resolvedSlides.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [groupCoverImage, resolvedSlides.length])

  return (
    <>
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[10px] border border-[#D5D2CA] shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
            <span className="h-10 w-10 border-2 border-[#84492C] border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm uppercase tracking-[0.3em] text-[#84492C] font-semibold">Loading...</span>
          </div>
        </div>
      )}
      <Link
        href={targetHref}
        prefetch={false}
        title={`View details of ${group.name || group.id}`}
        onClick={handleNavigate}
        className="flex flex-col items-center group cursor-pointer w-full h-full justify-between"
      >
        {/* 🌟 ใช้ style={{ backgroundColor }} แทน Tailwind class เพื่อการันตีว่าสีไม่หายชัวร์ๆ */}
        <div
          className="w-full aspect-square relative mb-5 flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          {groupCoverImage ? (
            <img
              src={groupCoverImage}
              alt={group.name || group.id}
              title={group.name || group.id}
              className="absolute inset-0 object-contain w-full h-full p-2 mix-blend-multiply"
            />
          ) : resolvedSlides.length > 0 ? (
            resolvedSlides.map((slide, idx) => (
              <img
                key={idx}
                src={slide.image_url || ""}
                alt={group.name || group.id}
                title={group.name || group.id}
                // 🌟 ให้รูปภาพใช้ mix-blend-multiply เพื่อละลายพื้นหลังขาวเข้ากับสีของกล่องด้านบน
                className={`absolute inset-0 object-contain w-full h-full p-2 transition-opacity duration-500 ease-in-out mix-blend-multiply
                  ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}
                `}
              />
            ))
          ) : (
            <span className="text-[10px] uppercase font-light tracking-[0.2em] text-[#8C8A86]">No Image</span>
          )}
        </div>

        {/* ส่วนรายละเอียดสินค้า: แสดงชื่อ ป้ายสถานะ และราคาเสมอ */}
        <div className="flex flex-col items-center text-center mt-auto px-2">
          <span className="text-[#3A3835] text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-medium text-center mb-1.5">
            {group.name || currentSlide.name ? (group.name || currentSlide.name).substring(0, 25) : "PRODUCT"}
          </span>
          {(() => {
            if (isPreOrderGroup) {
              return (
                <div className="mt-0.5 flex flex-col items-center">
                  <p className="text-[#84492C] text-[9px] tracking-[0.2em] uppercase font-semibold">
                    PRE-ORDER
                  </p>
                  <p className="text-[#84492C] text-[9px] tracking-normal font-semibold">
                    (รอสินค้า 45-60 วัน)
                  </p>
                  {minPrice !== null && minPrice > 0 ? (
                    hasPriceRange ? (
                      <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-1 opacity-95">
                        THB {minPrice.toLocaleString()}–{maxPrice?.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-1 opacity-95">
                        THB {minPrice.toLocaleString()}
                      </p>
                    )
                  ) : (
                    <p className="text-[#8C8A86] text-[9px] tracking-widest uppercase font-light mt-1">
                      Price upon request
                    </p>
                  )}
                </div>
              )
            }

            if (hasPriceRange && minPrice !== null && maxPrice !== null) {
              return (
                <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-0.5 opacity-95">
                  THB {minPrice.toLocaleString()}–{maxPrice.toLocaleString()}
                </p>
              )
            }

            if (displayPrice === null || displayPrice <= 0 || minPrice === null) {
              return (
                <p className="text-[#8C8A86] text-[9px] tracking-widest uppercase font-light mt-0.5">
                  Price upon request
                </p>
              )
            }

            const originalPrice = displayPrice
            let finalPrice = originalPrice
            let isDiscounted = false
            let discountLabel = ""

            if (currentSlide.discount_value && currentSlide.discount_type) {
              isDiscounted = true
              if (currentSlide.discount_type === 'PERCENT') {
                finalPrice = originalPrice - (originalPrice * (currentSlide.discount_value / 100))
                discountLabel = `-${currentSlide.discount_value}%`
              } else if (currentSlide.discount_type === 'FIXED') {
                finalPrice = originalPrice - currentSlide.discount_value
                discountLabel = `-฿${currentSlide.discount_value}`
              }
            }

            return isDiscounted ? (
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider">
                  <span className="text-[#8C8A86] line-through opacity-60">
                    THB {originalPrice.toLocaleString()}
                  </span>
                  <span className="text-[#DC2626] font-semibold opacity-90">
                    {discountLabel}
                  </span>
                </div>
                <p className="text-[#3A3835] text-[12px] font-semibold tracking-widest font-mono">
                  THB {finalPrice.toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-0.5 opacity-95">
                THB {originalPrice.toLocaleString()}
              </p>
            )
          })()}
        </div>
      </Link>
    </>
  )
}
