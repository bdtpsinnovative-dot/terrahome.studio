// app/prop/PropFilterClient.tsx
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import CollectionCard from "./CollectionCard"

export default function PropFilterClient({ collections }: { collections: any[] }) {
  const [activeFilter, setActiveFilter] = useState("All")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) 
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 

  const topRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    collections.forEach(group => {
      if (group.product_sup) {
        cats.add(group.product_sup)
      }
    })
    return ["All", ...Array.from(cats).sort()]
  }, [collections])

  const filteredCollections = activeFilter === "All" 
    ? collections 
    : collections.filter(group => group.product_sup === activeFilter)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + itemsPerPage)

  // ✅ ฟังก์ชันเปลี่ยนหน้า (ปรับให้เรียบง่ายและชัวร์ที่สุด)
  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    
    // เปลี่ยนหน้า
    setCurrentPage(page);
    
    // เลื่อนจอขึ้นบนสุดของ Grid
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  }

// ✅ ใช้ฟังก์ชันนี้ทับของเดิมเลยครับ
  const renderPagination = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return <span key={`dots-${idx}`} className="px-2 text-[#8C8A86] text-xs">...</span>
      }
      return (
        // เปลี่ยนจาก <button> มาใช้ <div> เพื่อตัดปัญหา Browser กวนใจ
        <div
          key={`page-${page}`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // console.log("คลิกหน้า:", page); // เอาไว้ดูใน Inspect > Console
            handlePageChange(page as number);
          }}
          className={`relative z-[9999] pointer-events-auto w-8 h-8 flex items-center justify-center text-xs font-serif transition-all duration-300 cursor-pointer select-none
            ${currentPage === page 
              ? 'text-[#2C2A26] border-b border-[#C8A97E]' 
              : 'text-[#8C8A86] hover:text-[#C8A97E]'
            }`}
        >
          {page}
        </div>
      )
    });
  }
  return (
    <div className="w-full scroll-mt-32" ref={topRef}>
      
      {/* 📱 Mobile Filter */}
      <div className="md:hidden w-full px-4 mb-10 relative z-[100]">
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); }}
          className="w-full flex items-center justify-between border-b border-[#C8A97E]/30 pb-3 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] bg-transparent"
        >
          <span className="text-[#8C8A86] font-light">Filter by:</span>
          <span className="text-[#2C2A26] font-medium flex items-center gap-2">
            <span className="truncate max-w-[150px]">{activeFilter}</span>
            <svg className={`w-3.5 h-3.5 text-[#C8A97E] shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        
        <div className={`absolute top-full left-4 right-4 bg-white border border-[#E5E5E5] shadow-2xl shadow-black/10 transition-all duration-300 origin-top z-[100] ${isDropdownOpen ? 'opacity-100 scale-y-100 mt-2 pointer-events-auto' : 'opacity-0 scale-y-95 mt-0 pointer-events-none'}`}>
          <div className="max-h-[50vh] overflow-y-auto py-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={(e) => { 
                  e.preventDefault();
                  setActiveFilter(category); 
                  setIsDropdownOpen(false); 
                }}
                className={`w-full text-left px-5 py-4 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] transition-colors ${activeFilter === category ? 'bg-[#F9F8F6] text-[#C8A97E] font-medium border-l-2 border-[#C8A97E]' : 'text-[#8C8A86] font-light hover:bg-[#F9F8F6] hover:text-[#2C2A26] border-l-2 border-transparent'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 💻 Desktop Layout */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start w-full px-4 sm:px-6">
        
        <aside className="hidden md:flex flex-col w-48 lg:w-56 shrink-0 sticky top-24 z-20">
          <span className="text-[#C8A97E] text-[10px] uppercase font-medium tracking-[0.3em] mb-8 border-b border-[#C8A97E]/20 pb-4">
            Categories
          </span>
          <div className="flex flex-col gap-5 items-start">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={(e) => { e.preventDefault(); setActiveFilter(category); }}
                className="relative group text-left transition-all duration-300 flex items-center"
              >
                <span className={`absolute -left-5 w-1.5 h-1.5 rounded-full bg-[#C8A97E] transition-all duration-300 ${activeFilter === category ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                <span className={`text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 ${activeFilter === category ? 'text-[#2C2A26] font-semibold' : 'text-[#8C8A86] font-light group-hover:text-[#C8A97E]'}`}>
                  {category}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* 👉 ขวา: Grid สินค้า & เลขหน้า */}
        <div className="flex-1 w-full flex flex-col relative z-10">
          {paginatedCollections.length === 0 ? (
            <div className="text-center py-20 border border-[#E5E5E5] rounded-sm bg-white/50 relative z-10">
              <span className="text-[#C8A97E] text-[10px] uppercase tracking-[0.3em] font-light">No Collections in this category</span>
            </div>
          ) : (
            <>
              {/* ตะกร้าสินค้า */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:gap-x-8 lg:gap-y-16 w-full">
                {paginatedCollections.map((group) => {
                  const slides = group.products
                    ?.filter((p: any) => p.image_url !== null && p.image_url !== "")
                    .map((p: any) => ({
                      image_url: p.image_url,
                      price: p.price,
                      sku: p.sku,
                      // ✅ เพิ่ม 2 บรรทัดนี้เข้าไป ส่งข้อมูลให้ลูกด้วย!
                      discount_value: p.discount_value,
                      discount_type: p.discount_type
                    })) || []

                  if (slides.length === 0 && group.cover_image_url) {
                    slides.push({ 
                      image_url: group.cover_image_url, 
                      price: null, 
                      sku: "",
                      discount_value: null,
                      discount_type: null
                    })
                  }

                  return (
                    <CollectionCard key={group.id} group={group} slides={slides} />
                  )
                })}
              </div>

              {/* แทนที่ปุ่ม Prev / Next เดิมด้วยโค้ดนี้ครับ */}
{totalPages > 1 && (
  <div className="flex justify-center items-center gap-1 sm:gap-2 mt-16 sm:mt-24 border-t border-[#E5E5E5] pt-10 flex-wrap relative z-[9999]">
    
    <div 
      role="button"
      onClick={(e) => { 
        if(currentPage === 1) return;
        e.preventDefault(); 
        handlePageChange(currentPage - 1); 
      }}
      className={`relative z-[9999] pointer-events-auto cursor-pointer text-[10px] uppercase tracking-[0.2em] px-2 py-2 transition-colors select-none ${currentPage === 1 ? 'text-[#8C8A86]/30 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#C8A97E]'}`}
    >
      Prev
    </div>
    
    <div className="flex gap-1 relative z-[9999]">
      {renderPagination()}
    </div>

    <div 
      role="button"
      onClick={(e) => { 
        if(currentPage === totalPages) return;
        e.preventDefault(); 
        handlePageChange(currentPage + 1); 
      }}
      className={`relative z-[9999] pointer-events-auto cursor-pointer text-[10px] uppercase tracking-[0.2em] px-2 py-2 transition-colors select-none ${currentPage === totalPages ? 'text-[#8C8A86]/30 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#C8A97E]'}`}
    >
      Next
    </div>
  </div>
)}
            </>
          )}
        </div>

      </div>
    </div>
  )
}