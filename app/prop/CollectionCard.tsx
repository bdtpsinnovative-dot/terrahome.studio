// app/prop/CollectionCard.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ProductSlide {
  image_url: string
  price: number | null
  sku: string
  // ✅ เพิ่มฟิลด์สำหรับรับค่าส่วนลด
  discount_value?: number | null 
  discount_type?: 'PERCENT' | 'FIXED' | null
}

export default function CollectionCard({ 
  group, 
  slides 
}: { 
  group: any
  slides: ProductSlide[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // ให้สไลด์ภาพเปลี่ยนเองทุกๆ 3 วินาที
  useEffect(() => {
    if (slides.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 3000) 
    
    return () => clearInterval(timer)
  }, [slides.length])

  const currentSlide = slides[currentIndex] || { image_url: null, price: null, sku: "" }
  const displayPrice = currentSlide.price

  const targetHref = currentSlide.sku 
    ? `/prop/${encodeURIComponent(group.id)}/${encodeURIComponent(currentSlide.sku)}`
    : `/prop/${encodeURIComponent(group.id)}`

  return (
    <Link 
      href={targetHref} 
      className="flex flex-col group cursor-pointer"
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-[#F5F4F0] mb-3 sm:mb-4">
        
        {/* ✅ ย้าย mix-blend-multiply มาไว้ที่กล่องนี้แทน เพื่อให้พื้นหลังขาวของรูป กลืนไปกับสีเบจด้านบน */}
        <div className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 transform-gpu will-change-transform mix-blend-multiply">
          {slides.length > 0 ? (
            slides.map((slide, idx) => (
              <img 
                key={idx}
                src={slide.image_url || ""} 
                alt={group.name || group.id} 
                // ✅ ถอด mix-blend-multiply ออกจากบรรทัดนี้ ป้องกันการทับซ้อน
                className={`absolute inset-0 object-contain w-full h-full p-4 sm:p-8 transition-opacity duration-1000 ease-in-out transform-gpu [backface-visibility:hidden]
                  ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}
                `}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-[#C8A97E] opacity-50">
              <span className="text-[9px] sm:text-[10px] uppercase font-light tracking-[0.2em]">No Image</span>
            </div>
          )}
        </div>
        
        {/* จุดบอกตำแหน่งรูป */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 flex justify-center gap-1 z-20">
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-[2px] transition-all duration-500 ${
                  idx === currentIndex ? 'w-3 sm:w-4 bg-[#C8A97E]' : 'w-1.5 sm:w-2 bg-[#C8A97E]/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* รายละเอียดสินค้า */}
      <div className="flex flex-col items-center text-center px-1 sm:px-2">
        <span className="text-[#C8A97E] text-[8px] sm:text-[9px] uppercase font-medium tracking-[0.2em] mb-1 sm:mb-2">
          {currentSlide.sku || group.id}
        </span>
        
        <h3 className="font-serif text-[#2C2A26] group-hover:text-[#C8A97E] text-sm sm:text-base lg:text-lg transition-colors duration-300 line-clamp-1 mb-0.5 sm:mb-1">
          {group.name || `Collection ${group.id}`}
        </h3>
        
        <p className="text-[#8C8A86] text-[10px] sm:text-xs font-light tracking-wide line-clamp-1 mb-1.5 sm:mb-2">
          {group.description || "Explore the curated selection"}
        </p>

        {/* ✅ Logic คำนวณและแสดงผลราคา (แบบมี/ไม่มีส่วนลด) */}
        {(() => {
          if (displayPrice === null || displayPrice <= 0) {
            return (
              <p className="text-[#8C8A86] text-[9px] sm:text-[10px] tracking-widest uppercase mt-1">
                Price upon request
              </p>
            )
          }

          const originalPrice = displayPrice
          let finalPrice = originalPrice
          let isDiscounted = false
          let discountLabel = ""

          // เช็คว่ามีส่วนลดถูกส่งมาด้วยไหม
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
            // แบบมีส่วนลด: โชว์ราคาเดิมขีดฆ่า + Badge สีทอง + ราคาใหม่
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-[#8C8A86] text-[10px] line-through font-mono opacity-60">
                  THB {originalPrice.toLocaleString()}
                </span>
                <span className="text-[#C8A97E] text-[8px] sm:text-[9px] font-semibold tracking-wider border border-[#C8A97E]/40 bg-[#C8A97E]/5 px-1.5 py-0.5 rounded-sm">
                  {discountLabel}
                </span>
              </div>
              <p className="text-[#2C2A26] text-[11px] sm:text-xs font-semibold tracking-widest font-mono">
                THB {finalPrice.toLocaleString()}
              </p>
            </div>
          ) : (
            // แบบไม่มีส่วนลด: โชว์ปกติ
            <p className="text-[#2C2A26] text-[11px] sm:text-xs font-semibold tracking-widest font-mono mt-1">
              THB {originalPrice.toLocaleString()}
            </p>
          )
        })()}
      </div>
    </Link>
  )
}