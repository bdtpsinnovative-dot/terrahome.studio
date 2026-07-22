"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation" 
import CollectionCard from "./CollectionCard"
import BranchSelector from "./BranchSelector"
import { HARDCODED_CATEGORIES } from "@/app/constants/categories"

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

  // 🌟 ล็อกไม่ให้หน้าจอหมุนหรือเลื่อนเมื่อเปิดเมนู Filter มือถือ
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isSidebarOpen])

  const initialExpandedGroups = useMemo(() => {
    const catLower = initialCategory.toLowerCase().trim()
    if ((catLower.startsWith("decorative") || catLower.startsWith("decotative")) && !catLower.includes("candle holder")) return ["DECORATIVE"]
    if (catLower.startsWith("doll")) return ["DOLL"]
    if (catLower.startsWith("vase")) return ["VASE"]
    if (catLower.startsWith("wall art")) return ["WALL ART"]
    return []
  }, [initialCategory])

  const [expandedGroups, setExpandedGroups] = useState<string[]>(initialExpandedGroups)
  
  const itemsPerPage = 40
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const urlCategory = searchParams.get('category') || "All"
    const urlPage = Number(searchParams.get('page')) || 1
    const urlSearch = searchParams.get('search') || ""
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
    setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    const catLower = activeFilter.toLowerCase().trim()
    if (catLower.startsWith("doll ")) {
      setExpandedGroups(prev => prev.includes("DOLL") ? prev : [...prev, "DOLL"])
    } else if ((catLower.startsWith("decorative ") || catLower.startsWith("decotative ")) && !catLower.includes("candle holder")) {
      setExpandedGroups(prev => prev.includes("DECORATIVE") ? prev : [...prev, "DECORATIVE"])
    } else if (catLower.startsWith("vase ")) {
      setExpandedGroups(prev => prev.includes("VASE") ? prev : [...prev, "VASE"])
    } else if (catLower.startsWith("wall art ")) {
      setExpandedGroups(prev => prev.includes("WALL ART") ? prev : [...prev, "WALL ART"])
    }
  }, [activeFilter])

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
    updateURL(filterValue, 1, searchQuery)
    setIsSidebarOpen(false)

    const filterLower = filterValue.toLowerCase().trim()
    if (filterLower.startsWith("decorative") || filterLower.startsWith("decotative")) {
      setExpandedGroups(prev => prev.includes("DECORATIVE") ? prev : [...prev, "DECORATIVE"])
    } else if (filterLower.startsWith("doll")) {
      setExpandedGroups(prev => prev.includes("DOLL") ? prev : [...prev, "DOLL"])
    } else if (filterLower.startsWith("vase")) {
      setExpandedGroups(prev => prev.includes("VASE") ? prev : [...prev, "VASE"])
    } else if (filterLower.startsWith("wall art")) {
      setExpandedGroups(prev => prev.includes("WALL ART") ? prev : [...prev, "WALL ART"])
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
    updateURL(activeFilter, 1, val)
  }

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => prev.includes(groupLabel) ? prev.filter(g => g !== groupLabel) : [...prev, groupLabel])
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    updateURL(activeFilter, page, searchQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCollections = useMemo(() => {
    let result = collections

    const filterUpper = activeFilter.toUpperCase().trim()

    if (activeFilter === "All") {
      result = collections
    } else if (activeFilter === "SPECIAL_DISCOUNT") {
      result = collections.filter(group => group.products?.some((p: any) => p.discount_value !== null))
    } else if (filterUpper === "DECORATIVE") {
      result = collections.filter(group => {
        const sup = (group.product_sup || "").trim().toLowerCase()
        return (sup.startsWith("decorative") || sup.startsWith("decotative")) && !sup.includes("candle holder")
      })
    } else if (filterUpper === "DOLL") {
      result = collections.filter(group => {
        const sup = (group.product_sup || "").trim().toLowerCase()
        return sup.startsWith("doll")
      })
    } else if (filterUpper === "VASE") {
      result = collections.filter(group => {
        const sup = (group.product_sup || "").trim().toLowerCase()
        return sup.startsWith("vase")
      })
    } else if (filterUpper === "WALL ART") {
      result = collections.filter(group => {
        const sup = (group.product_sup || "").trim().toLowerCase()
        return sup.startsWith("wall art")
      })
    } else {
      const targetTrimmed = activeFilter.trim().toLowerCase()
      result = collections.filter(group => {
        if (!group.product_sup) return false
        const groupSupTrimmed = group.product_sup.trim().toLowerCase()
        return groupSupTrimmed === targetTrimmed
      })
    }

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
    const decorativeItems = [
      { fullValue: "Decorative Bath", displayLabel: "BATH" },
      { fullValue: "Decorative Box", displayLabel: "BOX" },
      { fullValue: "Decorative Toy", displayLabel: "TOY" },
    ]

    const dollItems = [
      { fullValue: "Doll Animal", displayLabel: "ANIMAL" },
      { fullValue: "Doll Human", displayLabel: "HUMAN" },
      { fullValue: "Doll Object", displayLabel: "OBJECT" },
      { fullValue: "Doll Plant", displayLabel: "PLANT" },
    ]

    const vaseItems = [
      { fullValue: "Vase Ceramic 3D Printing", displayLabel: "CERAMIC 3D PRINTING" },
      { fullValue: "Vase Ceramic Handmade", displayLabel: "CERAMIC HANDMADE" },
      { fullValue: "Vase Glass Handmade", displayLabel: "GLASS HANDMADE" },
      { fullValue: "Vase Normal", displayLabel: "NORMAL" },
    ]

    const wallArtItems = [
      { fullValue: "Wall Art 3D Material", displayLabel: "3D MATERIAL" },
      { fullValue: "Wall Art 3D Physical Painting", displayLabel: "3D PHYSICAL PAINTING" },
      { fullValue: "Wall Art Digital Print  ", displayLabel: "DIGITAL PRINT" },
      { fullValue: "Wall Art Hand Craft 100%", displayLabel: "HAND CRAFT 100%" },
      { fullValue: "Wall Art Hand Craft 50%", displayLabel: "HAND CRAFT 50%" },
      { fullValue: "Wall Art Hand Craft 80%", displayLabel: "HAND CRAFT 80%" },
    ]

    return [
      { label: "ALL", isGroup: false, fullValue: "All" },
      { label: "ART OBJECT", isGroup: false, fullValue: "Art Object" },
      { label: "BOOK END", isGroup: false, fullValue: "Book End" },
      { label: "CANDLE HOLDER", isGroup: false, fullValue: "Candle Holder" },
      { label: "DECORATIVE", isGroup: true, items: decorativeItems },
      { label: "DOLL", isGroup: true, items: dollItems },
      { label: "KITCHENWARE", isGroup: false, fullValue: "Kitchenware" },
      { label: "TRAY", isGroup: false, fullValue: "Tray" },
      { label: "VASE", isGroup: true, items: vaseItems },
      { label: "WALL ART", isGroup: true, items: wallArtItems },
      { 
        label: "SALE OFFERS %", 
        isGroup: false, 
        fullValue: "SPECIAL_DISCOUNT",
        isSpecial: true 
      }
    ]
  }, [])

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
            <button key={`${menuItem.label}-${idx}`} onClick={(e) => { e.preventDefault(); if (menuItem.fullValue && menuItem.fullValue !== "ART_OBJECT_EMPTY") handleFilterChange(menuItem.fullValue); }} className="text-left w-full group py-3 transition-all duration-300">
              <span className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${isActive ? 'text-[#84492C] font-semibold' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                {menuItem.label}
              </span>
            </button>
          )
        }

        const isExpanded = expandedGroups.includes(menuItem.label)
        const hasActiveChild = menuItem.items?.some((child: any) => activeFilter === child.fullValue) || activeFilter === menuItem.label
        return (
          <div key={menuItem.label} className="w-full flex flex-col items-start text-left">
            <div className="flex items-center justify-between w-full gap-2">
              <button onClick={(e) => { e.preventDefault(); handleFilterChange(menuItem.label); }} className="text-left group py-3 flex-1">
                <span className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${hasActiveChild || isExpanded ? 'text-[#3A3835] font-medium' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                  {menuItem.label}
                </span>
              </button>
              <button type="button" onClick={(e) => { e.preventDefault(); toggleGroup(menuItem.label); }} className={`min-w-[32px] h-8 flex items-center justify-center text-[12px] font-light transition-transform duration-300 ${isExpanded ? 'text-[#3A3835]' : 'text-[#8C8A86]/60'}`}>
                {isExpanded ? '−' : '+'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col pl-4 pb-2 pt-1 items-start text-left">
                {menuItem.items?.map((childItem: any) => {
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
      
      <div className={`fixed inset-0 z-[9999] xl:hidden transition-opacity duration-400 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[340px] bg-[#EFE9E1] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col touch-manipulation z-10 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-8 pt-8 pb-6 flex justify-between items-center border-b border-[#C4B5A5]/30 mb-4 bg-[#EFE9E1]">
            <span className="text-[11px] uppercase tracking-[0.3em] font-medium text-[#3A3835]">Filters</span>
            <button type="button" onClick={() => setIsSidebarOpen(false)} className="text-[#3A3835] hover:text-[#B8834A] transition-colors p-1 -mr-2 touch-manipulation">
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
        
        <div className="hidden xl:flex sticky top-32 z-10 h-[calc(100vh-200px)] w-48 shrink-0 flex-col items-center justify-center select-none border-r border-[#84492C]/20 bg-transparent overflow-hidden">
          <span className="-rotate-90 tracking-[0.3em] text-[28px] lg:text-[32px] font-medium uppercase whitespace-nowrap origin-center text-[#84492C] opacity-20">
            Home Decor Collections
          </span>
        </div>

        <div className="flex-1 w-full flex flex-col relative z-10 px-4 md:pl-6 md:pr-6">
          
          {/* 🌟 7. ส่วนหัวแบบปรับสไตล์ใหม่: ย้ายหัวข้อ และนำ Search Bar มาจัดวางให้สวยงาม คลีนๆ เข้ากับธีมหน้าเว็บ */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-5 mb-0 pt-6 gap-4 border-b border-[#D5D2CA]/30">
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <h1 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal">
                {getDisplayTitle()}
              </h1>
            </div>
            
            {/* 🌟 กล่องค้นหาพรีเมียม สไตล์เรียบหรู คลีน มินิมอล พร้อมปุ่ม FILTER และ BranchSelector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 w-full md:w-auto justify-end">
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

              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pb-0.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D5D2CA]/20 sm:border-none">
                <button 
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="xl:hidden flex items-center gap-1.5 text-[11px] font-medium tracking-[0.25em] uppercase text-[#8C8A86] hover:text-[#3A3835] transition-colors duration-300 touch-manipulation select-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  <span>FILTER</span>
                </button>

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
                    const slides = group.cover_image_url ? [
                      {
                        image_url: group.cover_image_url,
                        price: null,
                        sku: "",
                        name: group.name || "",
                        discount_value: null,
                        discount_type: null,
                      }
                    ] : group.products
                      ?.filter((p: any) => p.image_url !== null && p.image_url !== "")
                      .map((p: any) => ({
                        image_url: p.image_url,
                        price: p.price,
                        sku: p.sku,
                        name: p.name,
                        discount_value: p.discount_value,
                        discount_type: p.discount_type,
                      })) || []

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