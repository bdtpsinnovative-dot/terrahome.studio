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

  const [activeFilter, setActiveFilter] = useState(initialCategory)
  const [currentPage, setCurrentPage] = useState(initialPage)
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const initialExpandedGroups = useMemo(() => {
    if (initialCategory.startsWith("Decorative ") || initialCategory === "Candle Holder") return ["DECORATIVE"]
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
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
  }, [searchParams])

  const updateURL = (newFilter: string, newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newFilter && newFilter !== "All") params.set('category', newFilter)
    else params.delete('category')
    
    if (newPage > 1) params.set('page', newPage.toString())
    else params.delete('page')

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleFilterChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1) 
    updateURL(filterValue, 1) 
    setIsSidebarOpen(false) 
  }

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => prev.includes(groupLabel) ? prev.filter(g => g !== groupLabel) : [...prev, groupLabel])
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    updateURL(activeFilter, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCollections = activeFilter === "All" 
    ? collections 
    : activeFilter === "SPECIAL_DISCOUNT"
      ? collections.filter(group => group.products?.some((p: any) => p.discount_value !== null))
      : collections.filter(group => group.product_sup === activeFilter)

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
      if (cat === "Candle Holder" || cat.startsWith("Decorative") || cat.startsWith("Decotative")) {
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
    if (activeFilter === "All") return "LIVING ROOM"
    if (activeFilter === "SPECIAL_DISCOUNT") return "SPECIAL OFFERS"
    return activeFilter.replace(/^(Decorative|Doll|Wall Art|Decotative)\s+/i, '').toUpperCase()
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col gap-4 items-start w-full text-left pb-10 pl-6 pr-4">
      {structuredCategories.map((menuItem, idx) => {
        if (menuItem.isSpecial) {
          const isActive = activeFilter === menuItem.fullValue
          return (
            <div key={menuItem.fullValue} className="w-full mt-2 pt-4 border-t border-[#D5D2CA]/40">
              <button 
                onClick={(e) => { e.preventDefault(); handleFilterChange(menuItem.fullValue); }} 
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border rounded-md transition-all duration-300 shadow-sm
                  ${isActive ? 'bg-[#DC2626] border-[#DC2626] text-white' : 'bg-transparent border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {menuItem.label}
              </button>
            </div>
          )
        }

        if (!menuItem.isGroup) {
          const isActive = activeFilter === menuItem.fullValue
          return (
            <button key={`${menuItem.label}-${idx}`} onClick={(e) => { e.preventDefault(); if (menuItem.fullValue !== "ART_OBJECT_EMPTY") handleFilterChange(menuItem.fullValue); }} className="text-left w-full group flex items-center transition-all duration-300 relative justify-start">
              {isActive && menuItem.label === "ALL" && <span className="absolute -left-3 w-1 h-1 rounded-full bg-[#3A3835]" />}
              <span className={`text-[10px] uppercase tracking-[0.25em] text-left ${isActive ? 'text-[#3A3835] font-semibold' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>{menuItem.label}</span>
            </button>
          )
        }

        const isExpanded = expandedGroups.includes(menuItem.label)
        const hasActiveChild = menuItem.items.some((child: any) => activeFilter === child.fullValue)
        return (
          <div key={menuItem.label} className="w-full flex flex-col items-start text-left">
            <button onClick={(e) => { e.preventDefault(); toggleGroup(menuItem.label); }} className="flex items-center justify-between w-full text-left group py-0.5">
              <span className={`text-[10px] uppercase tracking-[0.25em] text-left ${hasActiveChild || isExpanded ? 'text-[#3A3835] font-medium' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>{menuItem.label}</span>
              <span className="text-[#8C8A86] text-[10px] font-extralight tracking-widest pl-2 opacity-60">{isExpanded ? '—' : '+'}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full ${isExpanded ? 'max-h-[500px] mt-3 mb-2 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3 pl-8 ml-0.5 border-l border-[#D5D2CA]/40 items-start text-left">
                {menuItem.items.map((childItem: any) => {
                  const isChildActive = activeFilter === childItem.fullValue
                  return (
                    <button key={childItem.fullValue} onClick={(e) => { e.preventDefault(); handleFilterChange(childItem.fullValue); }} className="text-left w-full group flex items-center relative justify-start">
                      {isChildActive && <span className="absolute -left-3 w-1 h-1 rounded-full bg-[#3A3835]" />}
                      <span className={`text-[9.5px] uppercase tracking-[0.2em] text-left ${isChildActive ? 'text-[#3A3835] font-semibold' : 'text-[#8C8A86]/70 font-light hover:text-[#3A3835]'}`}>{childItem.displayLabel}</span>
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
      
      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 bottom-0 w-64 bg-[#EBE8E1] pt-24 border-r border-[#D5D2CA] transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-6 mb-6 flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-[#3A3835]">Filters</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-xs uppercase tracking-widest text-[#8C8A86]">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {renderSidebarContent()}
          </div>
        </div>
      </div>

      <div className="flex flex-row items-start w-full px-0 relative">
        
        {/* 🌟 ปรับขนาดฟอนต์ให้เล็กลง ลดความกว้างกล่อง และใส่ overflow-hidden ป้องกันการแทงทะลุกรอบ 100% */}
        <div className="hidden md:flex sticky top-32 z-40 h-[calc(100vh-200px)] w-48 shrink-0 flex-col items-center justify-center select-none border-r border-[#D5D2CA]/70 bg-transparent overflow-hidden">
          <span className="-rotate-90 tracking-[0.3em] text-[28px] lg:text-[32px] font-medium uppercase whitespace-nowrap origin-center text-[#000000] opacity-20">
            Home Decor Collections
          </span>
        </div>

        <div className="flex-1 w-full flex flex-col relative z-10 px-4 md:pl-6 md:pr-6">
          
          <div className="flex justify-between items-end pb-5 mb-0 pt-6">
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8C8A86] border border-[#D5D2CA] px-2.5 py-1 rounded-sm bg-white/50 active:bg-[#EBE8E1]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Filter Menu
              </button>
              <h2 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal">
                {getDisplayTitle()}
              </h2>
            </div>
            
            <div className="pb-1">
              {branches && branches.length > 0 && (
                <BranchSelector branches={branches} isLightPage={true} />
              )}
            </div>
          </div>

          <div className="w-full border-t border-[#D5D2CA]/70">
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