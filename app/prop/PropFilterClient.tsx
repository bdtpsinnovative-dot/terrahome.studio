"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation" 
import CollectionCard from "./CollectionCard"
import BranchSelector from "./BranchSelector"

export default function PropFilterClient({ collections, branches }: { collections: any[], branches: any[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialCategory = searchParams.get('category') || "All"
  const initialPage = Number(searchParams.get('page')) || 1
  const initialSearch = searchParams.get('search') || "" // 🌟 1. ดึงค่าค้นหาเริ่มต้นจาก URL

  const [activeFilter, setActiveFilter] = useState(initialCategory)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchQuery, setSearchQuery] = useState(initialSearch) // 🌟 2. เพิ่ม State สำหรับเก็บบล็อกคำค้นหา
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const initialExpandedGroups = useMemo(() => {
    if ((initialCategory.startsWith("Decorative ") || initialCategory.startsWith("Decotative ")) && !initialCategory.toLowerCase().includes("candle holder")) return ["DECORATIVE"]
    if (initialCategory.startsWith("Doll ")) return ["DOLL"]
    if (initialCategory.startsWith("Wall Art ")) return ["WALL ART"]
    return []
  }, [initialCategory])

  const [expandedGroups, setExpandedGroups] = useState<string[]>(initialExpandedGroups)
  
  const itemsPerPage = 40
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const urlCategory = searchParams.get('category') || "All"
    const urlPage = Number(searchParams.get('page')) || 1
    const urlSearch = searchParams.get('search') || "" // 🌟 3. คอยดักฟังเผื่อมีการล้าง URL หรือเปลี่ยนค่าจากภายนอก
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
    setSearchQuery(urlSearch)
  }, [searchParams])

  // 🌟 4. อัปเดตฟังก์ชันเพื่อรองรับพารามิเตอร์การค้นหาบนแถบที่อยู่ URL
  const updateURL = (newFilter: string, newPage: number, newSearch: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newFilter && newFilter !== "All") params.set('category', newFilter)
    else params.delete('category')
    
    if (newPage > 1) params.set('page', newPage.toString())
    else params.delete('page')

    if (newSearch) params.set('search', newSearch)
    else params.delete('search')

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleFilterChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1) 
    updateURL(filterValue, 1, searchQuery) // 🌟 ส่งค่าค้นหาปัจจุบันไปด้วย
    setIsSidebarOpen(false) 
  }

  // 🌟 5. สร้างฟังก์ชันการจัดการเมื่อผู้ใช้พิมพ์ค้นหา
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1) // รีเซ็ตหน้ากลับไปที่ 1 เสมอเวลาคนค้นหาใหม่
    updateURL(activeFilter, 1, val)
  }

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => prev.includes(groupLabel) ? prev.filter(g => g !== groupLabel) : [...prev, groupLabel])
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    updateURL(activeFilter, page, searchQuery); // 🌟 ส่งค่าค้นหาปัจจุบันไปด้วย
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🌟 6. เจาะระบบกรองข้อมูลตัวเก่ง: เอาทั้งหมวดหมู่ และคำค้นหามามัดรวมกัน
  const filteredCollections = useMemo(() => {
    // กรองตามหมวดหมู่ก่อน
    let result = activeFilter === "All" 
      ? collections 
      : activeFilter === "SPECIAL_DISCOUNT"
        ? collections.filter(group => group.products?.some((p: any) => p.discount_value !== null))
        : collections.filter(group => group.product_sup === activeFilter)

    // ถ้ามีการพิมพ์คำค้นหา ให้ทำการสแกนทะลวงเข้าไปกรองต่อทันที
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(group => {
        const matchGroupName = group.name?.toLowerCase().includes(query)
        const matchProducts = group.products?.some((p: any) => 
          p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query)
        )
        return matchGroupName || matchProducts
      })
    }

    return result
  }, [activeFilter, collections, searchQuery])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)

  const structuredCategories = useMemo(() => {
    const cats = new Set<string>()
    collections.forEach(group => {
      if (group.product_sup) cats.add(group.product_sup)
    })
    const rawCategories = Array.from(cats).sort()

    const decorativeItems: any[] = []
    const dollItems: any[] = []
    const wallArtItems: any[] = []
    const independentItems: any[] = []

    rawCategories.forEach(cat => {
      if ((cat.startsWith("Decorative") || cat.startsWith("Decotative")) && !cat.toLowerCase().includes("candle holder")) {
        decorativeItems.push({ fullValue: cat, displayLabel: cat.toUpperCase() })
      } 
      else if (cat.startsWith("Doll ")) {
        dollItems.push({ fullValue: cat, displayLabel: cat.toUpperCase() })
      } 
      else if (cat.startsWith("Wall Art ")) {
        wallArtItems.push({ fullValue: cat, displayLabel: cat.toUpperCase() })
      } 
      else {
        independentItems.push({ fullValue: cat, displayLabel: cat.toUpperCase() })
      }
    })

    const finalMenu: any[] = [{ label: "ALL", isGroup: false, fullValue: "All" }]

    const artObject = independentItems.find(i => i.displayLabel.includes("ART OBJECT"))
    if (artObject) finalMenu.push({ label: artObject.displayLabel, isGroup: false, fullValue: artObject.fullValue })
    else finalMenu.push({ label: "ART OBJECT", isGroup: false, fullValue: "ART_OBJECT_EMPTY" })

    const bookEnd = independentItems.find(i => i.displayLabel.includes("BOOK END"))
    if (bookEnd) finalMenu.push({ label: bookEnd.displayLabel, isGroup: false, fullValue: bookEnd.fullValue })

    finalMenu.push({ label: "DECORATIVE", isGroup: true, items: decorativeItems })
    if (dollItems.length > 0) finalMenu.push({ label: "DOLL", isGroup: true, items: dollItems })

    independentItems.forEach(item => {
      if (!item.displayLabel.includes("ART OBJECT") && !item.displayLabel.includes("BOOK END")) {
        finalMenu.push({ label: item.displayLabel, isGroup: false, fullValue: item.fullValue })
      }
    })

    if (wallArtItems.length > 0) finalMenu.push({ label: "WALL ART", isGroup: true, items: wallArtItems })

    finalMenu.push({ 
      label: "SALE OFFERS %", 
      isGroup: false, 
      fullValue: "SPECIAL_DISCOUNT",
      isSpecial: true 
    })

    return finalMenu
  }, [collections])

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 text-[11px] font-mono transition-all duration-300 ${
            currentPage === i 
            ? 'text-[#3A3835] border-b border-[#3A3835] font-bold' 
            : 'text-[#8C8A86] hover:text-[#3A3835]'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  const getDisplayTitle = () => {
    if (activeFilter === "All") return "Home Decor"
    if (activeFilter === "SPECIAL_DISCOUNT") return "SPECIAL OFFERS"
    return activeFilter.replace(/^(Decorative|Doll|Wall Art|Decotative)\s+/i, '').toUpperCase()
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col w-full text-left pb-12 pt-2 px-6">
      {structuredCategories.map((menuItem, idx) => {
        if (menuItem.isSpecial) {
          const isActive = activeFilter === menuItem.fullValue
          return (
            <div key={menuItem.fullValue} className="w-full py-1 mt-6 border-t border-[#C4B5A5]/30 pt-6">
              <button 
                onClick={(e) => { e.preventDefault(); handleFilterChange(menuItem.fullValue); }} 
                className={`w-full flex items-center justify-between text-left group transition-all duration-300`}
              >
                <span className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${isActive ? 'text-[#84492C] font-semibold' : 'text-[#84492C]/80 font-medium group-hover:text-[#84492C]'}`}>
                  {menuItem.label}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#84492C]' : 'text-[#84492C]/60 group-hover:text-[#84492C]'}`}>
                  <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )
        }

        if (!menuItem.isGroup) {
          const isActive = activeFilter === menuItem.fullValue
          return (
            <button key={`${menuItem.label}-${idx}`} onClick={(e) => { e.preventDefault(); if (menuItem.fullValue !== "ART_OBJECT_EMPTY") handleFilterChange(menuItem.fullValue); }} className="text-left w-full group py-3 transition-all duration-300">
              <span className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${isActive ? 'text-[#84492C] font-semibold' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                {menuItem.label}
              </span>
            </button>
          )
        }

        const isExpanded = expandedGroups.includes(menuItem.label)
        const hasActiveChild = menuItem.items.some((child: any) => activeFilter === child.fullValue)
        return (
          <div key={menuItem.label} className="w-full flex flex-col items-start text-left">
            <button onClick={(e) => { e.preventDefault(); toggleGroup(menuItem.label); }} className="flex items-center justify-between w-full text-left group py-3">
              <span className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${hasActiveChild || isExpanded ? 'text-[#3A3835] font-medium' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                {menuItem.label}
              </span>
              <span className={`text-[12px] font-light transition-transform duration-300 ${isExpanded ? 'text-[#3A3835]' : 'text-[#8C8A86]/60'}`}>
                {isExpanded ? '−' : '+'}
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col pl-4 pb-2 pt-1 items-start text-left">
                {menuItem.items.map((childItem: any) => {
                  const isChildActive = activeFilter === childItem.fullValue
                  return (
                    <button key={childItem.fullValue} onClick={(e) => { e.preventDefault(); handleFilterChange(childItem.fullValue); }} className="text-left w-full group py-2.5 transition-colors duration-300">
                      <span className={`text-[10px] uppercase tracking-[0.2em] ${isChildActive ? 'text-[#84492C] font-semibold' : 'text-[#8C8A86]/80 font-light group-hover:text-[#3A3835]'}`}>
                        {childItem.displayLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );

  return (
    <div className="w-full scroll-mt-32" ref={topRef}>
      
      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-400 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[340px] bg-[#EFE9E1] pt-12 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-8 pb-6 flex justify-between items-center border-b border-[#C4B5A5]/30 mb-6">
            <span className="text-[11px] uppercase tracking-[0.3em] font-medium text-[#3A3835]">Filters</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-[#3A3835] hover:text-[#B8834A] transition-colors p-1 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-2">
            {renderSidebarContent()}
          </div>
        </div>
      </div>

      <div className="flex flex-row items-start w-full px-0 relative">
        
        <div className="hidden md:flex sticky top-32 z-40 h-[calc(100vh-200px)] w-48 shrink-0 flex-col items-center justify-center select-none border-r border-[#84492C]/20 bg-transparent overflow-hidden">
          <span className="-rotate-90 tracking-[0.3em] text-[28px] lg:text-[32px] font-medium uppercase whitespace-nowrap origin-center text-[#84492C] opacity-20">
            Home Decor Collections
          </span>
        </div>

        <div className="flex-1 w-full flex flex-col relative z-10 px-4 md:pl-6 md:pr-6">
          
          {/* 🌟 7. ส่วนหัวแบบปรับสไตล์ใหม่: ย้ายหัวข้อ และนำ Search Bar มาจัดวางให้สวยงาม คลีนๆ เข้ากับธีมหน้าเว็บ */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-5 mb-0 pt-6 gap-4 border-b border-[#D5D2CA]/30">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden flex items-center justify-center gap-2 mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#3A3835] border border-[#C4B5A5]/80 px-4 py-2.5 bg-white/50 backdrop-blur-sm active:bg-[#EFE9E1] transition-all duration-300 w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Filter Menu
              </button>
              <h1 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal">
                {getDisplayTitle()}
              </h1>
            </div>
            
            {/* 🌟 กล่องค้นหาพรีเมียม สไตล์เรียบหรู คลีน มินิมอล พร้อมปุ่มล้างค่าคำค้นหา ✕ */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-64 group">
                <input
                  type="text"
                  placeholder="SEARCH PROPS, SKU..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-white/60 backdrop-blur-sm pl-3 pr-8 py-1.5 border border-[#D5D2CA] text-[11px] font-mono tracking-wider text-[#3A3835] uppercase placeholder-[#8C8A86]/50 outline-none focus:border-[#3A3835] focus:bg-white transition-all duration-300 rounded-sm"
                />
                {searchQuery ? (
                  <button 
                    onClick={() => handleSearchChange("")} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8A86] hover:text-[#3A3835] text-[11px] transition-colors"
                  >
                    ✕
                  </button>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8A86]/60 pointer-events-none group-hover:text-[#3A3835] transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                  </svg>
                )}
              </div>

              <div className="pb-0.5">
                {branches && branches.length > 0 && (
                  <BranchSelector branches={branches} isLightPage={true} />
                )}
              </div>
            </div>
          </div>

          <div className="w-full border-t border-[#D5D2CA]/70 mt-0">
            {filteredCollections.length === 0 ? (
              <div className="text-center py-24">
                <span className="text-[#8C8A86] text-[10px] uppercase tracking-[0.3em] font-light">No Collections Discovered</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 w-full relative">
                  {filteredCollections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((group) => {
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
                      <div key={group.id} className="border-b border-r border-[#D5D2CA]/70 py-8 px-4 md:py-12 md:px-6 flex flex-col justify-between items-center relative">
                        <CollectionCard group={group} slides={slides} />
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-12 pb-16 border-t border-[#D5D2CA]/30 pt-8">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`text-[10px] uppercase tracking-[0.2em] ${currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#3A3835]'}`}>Prev</button>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={`text-[10px] uppercase tracking-[0.2em] ${currentPage === totalPages ? 'opacity-20 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#3A3835]'}`}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  ) 
}