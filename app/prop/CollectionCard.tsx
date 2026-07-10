"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ProductSlide {
  image_url: string
  price: number | null
  sku: string
  name?: string 
  discount_value?: number | null 
  discount_type?: 'PERCENT' | 'FIXED' | null
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
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 3000) 
    return () => clearInterval(timer)
  }, [slides.length])

  const currentSlide = slides[currentIndex] || { image_url: null, price: null, sku: "", name: "" }
  const displayPrice = currentSlide.price

  const targetHref = currentSlide.sku 
    ? `/prop/${encodeURIComponent(group.id)}/${encodeURIComponent(currentSlide.sku)}`
    : `/prop/${encodeURIComponent(group.id)}`

  return (
    <Link 
      href={targetHref} 
      title={`View details of ${group.name || group.id}`}
      className="flex flex-col items-center group cursor-pointer w-full h-full justify-between"
    >
      {/* 🌟 ใช้ style={{ backgroundColor }} แทน Tailwind class เพื่อการันตีว่าสีไม่หายชัวร์ๆ */}
      <div 
        className="w-full aspect-square relative mb-5 flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        {slides.length > 0 ? (
          slides.map((slide, idx) => (
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

      {/* ส่วนรายละเอียดสินค้า: ปรับขนาดตัวอักษรและราคาให้ใหญ่และคมชัดขึ้นตามบรีฟ */}
      <div className="flex flex-col items-center text-center mt-auto px-2">
        {/* 🌟 ปรับชื่อสินค้าให้ใหญ่ขึ้นจาก 8px เป็น 10px/11px และปรับเป็น font-medium เพื่อความคมชัด */}
        <span className="text-[#3A3835] text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-medium text-center mb-1.5">
          {currentSlide.name ? currentSlide.name.substring(0, 25) : "PRODUCT"}
        </span>

        {(() => {
          if (displayPrice === null || displayPrice <= 0) {
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
            // 🏷️ แบบมีส่วนลด: ปรับขนาดราคาเดิมและ Badge ขึ้นเป็น 10px และราคาลดจริงขึ้นเป็น 12px
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
            // 💵 แบบราคาทั่วไป: ขยายขนาดฟอนต์จาก 10px ขึ้นเป็น 12px และเพิ่มความหนาเป็น font-medium เพื่อความพรีเมียม
            <p className="text-[#3A3835] text-[12px] font-medium tracking-widest font-mono mt-0.5 opacity-95">
              THB {originalPrice.toLocaleString()}
            </p>
          )
        })()}
      </div>
    </Link>
  )
}