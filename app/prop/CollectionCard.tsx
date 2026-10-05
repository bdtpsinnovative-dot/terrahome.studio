"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProductSlide {
  image_url: string
  price: number | null
  sku: string
  name?: string
  width_cm?: number | string | null
  length_cm?: number | string | null
  thickness_cm?: number | string | null
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

  // เรียงสไลด์ให้สินค้าที่มีสต็อกพร้อมส่งขึ้นก่อน แต่ยังเก็บสไลด์ทั้งหมดไว้เพื่อให้หมุนเวียนรูปได้ครบทุกชิ้น
  const resolvedSlides = [...slides].sort((a, b) => {
    const matchedA = (group.products || []).find((product: any) => product?.sku === a.sku)
    const matchedB = (group.products || []).find((product: any) => product?.sku === b.sku)
    const stockA = matchedA ? stockQtyForProduct(matchedA) : 0
    const stockB = matchedB ? stockQtyForProduct(matchedB) : 0
    if (stockA > 0 && stockB <= 0) return -1
    if (stockA <= 0 && stockB > 0) return 1
    return 0
  })
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

  // คำนวณขนาดสินค้าสำหรับแสดงบรรทัดที่ 3 (xx*xx*xx cm หรือ VARIOUS SIZES)
  const formatDimensionPart = (val: any) => {
    if (val === null || val === undefined || val === "") return null
    const num = Number(val)
    if (isNaN(num) || num <= 0) return null
    return parseFloat(num.toFixed(1))
  }

  const getProductDimString = (p: any) => {
    if (!p) return null
    const w = formatDimensionPart(p.width_cm ?? p.specs?.width_cm ?? p.specs?.w ?? p.specs?.width)
    const l = formatDimensionPart(p.length_cm ?? p.specs?.length_cm ?? p.specs?.l ?? p.specs?.length ?? p.specs?.d ?? p.specs?.depth)
    const h = formatDimensionPart(p.thickness_cm ?? p.specs?.thickness_cm ?? p.specs?.h ?? p.specs?.height ?? p.specs?.thickness)
    const parts = [w, l, h].filter((v): v is number => v !== null)
    return parts.length > 0 ? `${parts.join("*")} cm` : null
  }

  // รวบรวมขนาดที่ไม่ซ้ำกันของสินค้าทั้งหมดในกลุ่มนี้
  const allDimensionSources = [...(group.products || []), ...(slides || [])]
  const uniqueGroupDimensions = Array.from(
    new Set(allDimensionSources.map(getProductDimString).filter((d): d is string => Boolean(d)))
  )

  let dimensionText: string | null = null

  // ถ้ามีการ์ดรูปปกกลุ่มรวมเซ็ต (ภาพนิ่งไม่สไลด์)
  if (groupCoverImage) {
    if (uniqueGroupDimensions.length > 1) {
      dimensionText = "VARIOUS SIZES"
    } else if (uniqueGroupDimensions.length === 1) {
      dimensionText = uniqueGroupDimensions[0]
    } else {
      dimensionText = null
    }
  } else {
    // กรณีสไลด์เปลี่ยนรูปสินค้าตามรอบ: แสดงขนาดตามสินค้าของสไลด์ที่กำลังแสดงอยู่
    const activeProduct =
      (group.products || []).find((product: any) => product?.sku === currentSlide.sku) ||
      availableProducts[0] ||
      group.products?.[0]

    const dimW = formatDimensionPart(
      currentSlide.width_cm ??
        activeProduct?.width_cm ??
        activeProduct?.specs?.width_cm ??
        activeProduct?.specs?.w ??
        activeProduct?.specs?.width
    )
    const dimL = formatDimensionPart(
      currentSlide.length_cm ??
        activeProduct?.length_cm ??
        activeProduct?.specs?.length_cm ??
        activeProduct?.specs?.l ??
        activeProduct?.specs?.length ??
        activeProduct?.specs?.d ??
        activeProduct?.specs?.depth
    )
    const dimH = formatDimensionPart(
      currentSlide.thickness_cm ??
        activeProduct?.thickness_cm ??
        activeProduct?.specs?.thickness_cm ??
        activeProduct?.specs?.h ??
        activeProduct?.specs?.height ??
        activeProduct?.specs?.thickness
    )

    const dimParts = [dimW, dimL, dimH].filter((v): v is number => v !== null)
    dimensionText = dimParts.length > 0 ? `${dimParts.join("*")} cm` : null
  }

  const firstAvailableProduct = availableProducts[0] || group.products?.[0]
  const targetSku = groupCoverImage
    ? (firstAvailableProduct?.sku || currentSlide.sku)
    : (currentSlide.sku || firstAvailableProduct?.sku)
  const targetHref = targetSku
    ? `/prop/${encodeURIComponent(group.id)}/${encodeURIComponent(targetSku)}`
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
            {groupCoverImage
              ? (group.name || currentSlide.name ? (group.name || currentSlide.name).substring(0, 25) : "PRODUCT")
              : (currentSlide.name || group.name ? (currentSlide.name || group.name).substring(0, 25) : "PRODUCT")}
          </span>
          {(() => {
            // 🌟 1. กรณีที่มีรูปภาพปกกลุ่มรวมเซ็ต (groupCoverImage ภาพนิ่งไม่สไลด์)
            if (groupCoverImage) {
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

              return (
                <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-0.5 opacity-95">
                  THB {Number(displayPrice).toLocaleString()}
                </p>
              )
            }

            // 🌟 2. กรณีเป็นการ์ดสินค้าปกติ (สไลด์รูป หรือสินค้าเดี่ยว):
            // อัปเดตราคาและสถานะพรีออเดอร์ตามสินค้าของสไลด์ที่กำลังแสดงอยู่จริง
            const activeMatchedProduct = (group.products || []).find((p: any) => p?.sku === currentSlide.sku)
            const isSlidePreOrder = activeMatchedProduct
              ? stockQtyForProduct(activeMatchedProduct) <= 0
              : currentSlide.availability_status === 'preorder' || isPreOrderGroup

            const slidePriceNum = Number(currentSlide.price)
            const hasValidPrice = Number.isFinite(slidePriceNum) && slidePriceNum > 0

            let finalPrice = slidePriceNum
            let isDiscounted = false
            let discountLabel = ""

            const discountValue = Number(currentSlide.discount_value)
            if (hasValidPrice && Number.isFinite(discountValue) && discountValue > 0 && currentSlide.discount_type) {
              isDiscounted = true
              if (currentSlide.discount_type === 'PERCENT') {
                finalPrice = slidePriceNum * (1 - (discountValue / 100))
                discountLabel = `-${discountValue}%`
              } else if (currentSlide.discount_type === 'FIXED') {
                finalPrice = Math.max(0, slidePriceNum - discountValue)
                discountLabel = `-฿${discountValue}`
              }
            }

            return (
              <div className="mt-0.5 flex flex-col items-center">
                {isSlidePreOrder && (
                  <>
                    <p className="text-[#84492C] text-[9px] tracking-[0.2em] uppercase font-semibold">
                      PRE-ORDER
                    </p>
                    <p className="text-[#84492C] text-[9px] tracking-normal font-semibold mb-0.5">
                      (รอสินค้า 45-60 วัน)
                    </p>
                  </>
                )}

                {!hasValidPrice ? (
                  <p className="text-[#8C8A86] text-[9px] tracking-widest uppercase font-light mt-0.5">
                    Price upon request
                  </p>
                ) : isDiscounted ? (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.12em]">
                      <span className="text-[#8C8A86] line-through opacity-60">
                        THB {slidePriceNum.toLocaleString()}
                      </span>
                      <span className="text-[#DC2626] font-semibold opacity-90">
                        {discountLabel}
                      </span>
                    </div>
                    <p className="text-[#3A3835] text-[11px] font-semibold tracking-[0.14em] font-mono">
                      THB {finalPrice.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-0.5 opacity-95">
                    THB {slidePriceNum.toLocaleString()}
                  </p>
                )}
              </div>
            )
          })()}
          {dimensionText && (
            <p className="text-[#8C8A86] text-[10px] sm:text-[11px] font-mono tracking-wider mt-1 opacity-90">
              {dimensionText}
            </p>
          )}
        </div>
      </Link>
    </>
  )
}
