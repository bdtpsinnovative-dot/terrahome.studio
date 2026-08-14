"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import CollectionCard from "./CollectionCard"
import BranchSelector from "./BranchSelector"
import { CATEGORY_DISPLAY_NAMES } from "@/app/constants/categories"
import ProductFilterDrawer from "@/app/components/ProductFilterDrawer"
import {
  filterCollectionsByCategory,
  productColorValues,
  selectedAttributeValues,
} from "./productFilterModel"

export default function PropFilterClient({ collections, branches, hotProductIds = [] }: { collections: any[], branches: any[], hotProductIds?: number[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialCategory = searchParams.get('category') || "All"
  const initialPage = Number(searchParams.get('page')) || 1
  const initialSearch = searchParams.get('search') || "" // 🌟 1. ดึงค่าค้นหาเริ่มต้นจาก URL
  const initialAttribute = searchParams.get('attribute') || "ALL_ATTRIBUTE"
  const initialFilterOpen = searchParams.get('filter') === "open"

  const [activeFilter, setActiveFilter] = useState(initialCategory)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchQuery, setSearchQuery] = useState(initialSearch) // 🌟 2. เพิ่ม State สำหรับเก็บบล็อกคำค้นหา
  const [attributeFilter, setAttributeFilter] = useState(initialAttribute)

  const [isSidebarOpen, setIsSidebarOpen] = useState(initialFilterOpen)
  const isFilterOpen = isSidebarOpen || searchParams.get('filter') === 'open'

  const closeSidebar = (clearUrl = true) => {
    setIsSidebarOpen(false)
    if (clearUrl && searchParams.get('filter') === 'open') {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('filter')
      const query = params.toString()
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    }
  }

  const itemsPerPage = 40
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const urlCategory = searchParams.get('category') || "All"
    const urlPage = Number(searchParams.get('page')) || 1
    const urlSearch = searchParams.get('search') || ""
    const urlAttribute = searchParams.get('attribute') || "ALL_ATTRIBUTE"
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
    setSearchQuery(urlSearch)
    setAttributeFilter(urlAttribute)
  }, [searchParams])

  const updateURL = (newFilter: string, newPage: number, newSearch: string, newAttribute = attributeFilter) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newFilter && newFilter !== "All") params.set('category', newFilter)
    else params.delete('category')

    if (newPage > 1) params.set('page', newPage.toString())
    else params.delete('page')

    if (newSearch) params.set('search', newSearch)
    else params.delete('search')

    if (newAttribute && newAttribute !== "ALL_ATTRIBUTE") params.set('attribute', newAttribute)
    else params.delete('attribute')

    // Choosing a filter is an in-page action; the explicit open state belongs only to the navbar/filter entry point.
    params.delete('filter')

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1)
    setAttributeFilter("ALL_ATTRIBUTE")
    updateURL(filterValue, 1, searchQuery, "ALL_ATTRIBUTE")
    closeSidebar(false)
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
    updateURL(activeFilter, 1, val)
  }

  const categoryFilteredCollections = useMemo(
    () => filterCollectionsByCategory(collections, activeFilter, hotProductIds),
    [activeFilter, collections, hotProductIds]
  )

  const selectedColors = useMemo(() => selectedAttributeValues(attributeFilter), [attributeFilter])

  const handleColorsChange = (filterValue: string, colors: string[]) => {
    const nextAttribute = colors.length > 0 ? colors.join(",") : "ALL_ATTRIBUTE"
    if (filterValue !== activeFilter) setActiveFilter(filterValue)
    setAttributeFilter(nextAttribute)
    setCurrentPage(1)
    updateURL(filterValue, 1, searchQuery, nextAttribute)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    updateURL(activeFilter, page, searchQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCollections = useMemo(() => {
    let result = categoryFilteredCollections

    if (selectedColors.length > 0) {
      const selectedColorSet = new Set(selectedColors)
      result = result
        .map((group) => ({
          ...group,
          products: (group.products || []).filter((product: any) =>
            productColorValues(product).some((color) => selectedColorSet.has(color))
          ),
        }))
        .filter((group) => group.products.length > 0)
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
  }, [categoryFilteredCollections, searchQuery, selectedColors])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 text-[11px] font-mono transition-all duration-300 ${currentPage === i
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
    if (activeFilter === "All") return "Product"
    if (activeFilter === "SPECIAL_DISCOUNT") return "SPECIAL OFFERS"
    if (activeFilter === "PRE_ORDER") return "PRE-ORDER"
    if (CATEGORY_DISPLAY_NAMES[activeFilter]) return CATEGORY_DISPLAY_NAMES[activeFilter]
    return activeFilter.replace(/^(Decorative|Doll|Wall Art|Decotative)\s+/i, '').toUpperCase()
  };

  return (
    <div className="w-full scroll-mt-32" ref={topRef}>
      <ProductFilterDrawer
        open={isFilterOpen}
        collections={collections}
        activeCategory={activeFilter}
        selectedColors={selectedColors}
        onClose={() => closeSidebar()}
        onCategoryChange={handleCategoryChange}
        onColorsChange={handleColorsChange}
        hotProductIds={hotProductIds}
        idPrefix="prop-product-filter"
      />

      <div className="flex flex-row items-start w-full px-0 relative">

        <div className="hidden xl:flex sticky top-32 z-10 h-[calc(100vh-200px)] w-48 shrink-0 flex-col items-center justify-center select-none border-r border-[#84492C]/20 bg-transparent overflow-hidden">
          <span className="-rotate-90 tracking-[0.3em] text-[28px] lg:text-[32px] font-medium uppercase whitespace-nowrap origin-center text-[#84492C] opacity-20">
            Home Decor Collections
          </span>
        </div>

        <div className="flex-1 w-full flex flex-col relative z-10 px-4 md:pl-6 md:pr-6">

          {/* 🌟 7. ส่วนหัวแบบปรับสไตล์ใหม่: ย้ายหัวข้อ และนำ Search Bar มาจัดวางให้สวยงาม คลีนๆ เข้ากับธีมหน้าเว็บ */}
          <div className="flex min-w-0 flex-col lg:flex-row justify-between items-start lg:items-end pb-5 mb-0 pt-6 gap-4 border-b border-[#D5D2CA]/30">
            <div className="flex min-w-0 flex-col gap-1.5 w-full lg:w-auto">
              <h1 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal">
                {getDisplayTitle()}
              </h1>
            </div>

            {/* 🌟 กล่องค้นหาพรีเมียม สไตล์เรียบหรู คลีน มินิมอล พร้อมปุ่ม FILTER และ BranchSelector */}
            <div className="flex min-w-0 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-6 w-full lg:w-auto justify-end">
              <div className="relative min-w-0 w-full sm:w-64 group">
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

              <div className="flex min-w-0 items-center justify-between sm:justify-end gap-5 shrink-0 pb-0.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D5D2CA]/20 sm:border-none">
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(true)
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('filter', 'open')
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
                  }}
                  aria-expanded={isFilterOpen}
                  aria-controls="prop-product-filter-drawer"
                  className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11px] font-medium tracking-[0.25em] uppercase text-[#8C8A86] hover:text-[#3A3835] transition-colors duration-300 touch-manipulation select-none"
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
                <div id="products" className="grid grid-cols-2 lg:grid-cols-4 w-full relative scroll-mt-24">
                  {filteredCollections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((group) => {
                    const slides = group.cover_image_url ? [
                      {
                        image_url: group.cover_image_url,
                        price: null,
                        sku: "",
                        name: group.name || "",
                        discount_value: null,
                        discount_type: null,
                        availability_status: group.products?.[0]?.availability_status,
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
                        availability_status: p.availability_status,
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
