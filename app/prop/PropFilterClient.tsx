"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import CollectionCard from "./CollectionCard"
import BranchSelector from "./BranchSelector"
import PropBanner from "./PropBanner"
import { CATEGORY_DISPLAY_NAMES } from "@/app/constants/categories"
import ProductFilterDrawer from "@/app/components/ProductFilterDrawer"
import VisualImageSearch, { type ImageSearchResult } from "@/app/components/VisualImageSearch"
import {
  filterCollectionsByCategory,
  getBannerImageForCategory,
  isNoCategoryFilter,
  productColorValues,
  productMaterialValues,
  selectedAttributeValues,
  selectedMaterialValues,
} from "./productFilterModel"

export default function PropFilterClient({
  collections,
  branches,
  hotProductIds = [],
  bannerGroups = [],
  allBannerImages = [],
}: {
  collections: any[]
  branches: any[]
  hotProductIds?: number[]
  bannerGroups?: any[]
  allBannerImages?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialCategory = searchParams.get('category') || "All"
  const initialPage = Number(searchParams.get('page')) || 1
  const initialSearch = searchParams.get('search') || "" // 🌟 1. ดึงค่าค้นหาเริ่มต้นจาก URL
  const initialAttribute = searchParams.get('attribute') || "ALL_ATTRIBUTE"
  const initialMaterial = searchParams.get('material') || ""
  const initialFilterOpen = searchParams.get('filter') === "open"

  const [activeFilter, setActiveFilter] = useState(initialCategory)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchQuery, setSearchQuery] = useState(initialSearch) // 🌟 2. เพิ่ม State สำหรับเก็บบล็อกคำค้นหา
  const [activeImageSearch, setActiveImageSearch] = useState<ImageSearchResult | null>(null)
  const [attributeFilter, setAttributeFilter] = useState(initialAttribute)
  const [materialFilter, setMaterialFilter] = useState(initialMaterial)

  const [isSidebarOpen, setIsSidebarOpen] = useState(initialFilterOpen)
  const [openColorPanel, setOpenColorPanel] = useState(false)
  const [openMaterialPanel, setOpenMaterialPanel] = useState(false)
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  const isFilterOpen = isSidebarOpen

  const activeBannerImage = useMemo(() => {
    return getBannerImageForCategory(activeFilter, bannerGroups)
  }, [activeFilter, bannerGroups])

  const hasBanner = !!activeBannerImage || (allBannerImages && allBannerImages.length > 0)

  const closeSidebar = () => {
    setIsSidebarOpen(false)
    setOpenColorPanel(false)
    setOpenMaterialPanel(false)
    if (searchParams.get('filter') === 'open') {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('filter')
      const query = params.toString()
      window.history.replaceState(null, '', `${pathname}${query ? `?${query}` : ''}`)
    }
  }

  const handleOpenFilter = () => {
    setOpenColorPanel(false)
    setOpenMaterialPanel(false)
    setIsSidebarOpen(true)
  }

  const handleOpenColorPanel = () => {
    setOpenColorPanel(true)
    setOpenMaterialPanel(false)
    setIsSidebarOpen(true)
  }

  const handleOpenMaterialPanel = () => {
    setOpenColorPanel(false)
    setOpenMaterialPanel(true)
    setIsSidebarOpen(true)
  }

  const handleClearFilters = () => {
    setActiveFilter('All')
    setSearchQuery('')
    setActiveImageSearch(null)
    setAttributeFilter('ALL_ATTRIBUTE')
    setMaterialFilter('')
    setCurrentPage(1)
    setOpenColorPanel(false)
    setOpenMaterialPanel(false)
    updateURL('All', 1, '', 'ALL_ATTRIBUTE', '', false)
    closeSidebar()
  }

  const itemsPerPage = 40
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsNavigationPending(false)
    const urlCategory = searchParams.get('category') || "All"
    const urlPage = Number(searchParams.get('page')) || 1
    const urlSearch = searchParams.get('search') || ""
    const urlAttribute = searchParams.get('attribute') || "ALL_ATTRIBUTE"
    const urlMaterial = searchParams.get('material') || ""
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
    setSearchQuery(urlSearch)
    setAttributeFilter(urlAttribute)
    setMaterialFilter(urlMaterial)
  }, [searchParams])

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      const urlCategory = url.searchParams.get('category') || "All"
      const urlPage = Number(url.searchParams.get('page')) || 1
      const urlSearch = url.searchParams.get('search') || ""
      const urlAttribute = url.searchParams.get('attribute') || "ALL_ATTRIBUTE"
      const urlMaterial = url.searchParams.get('material') || ""
      setActiveFilter(urlCategory)
      setCurrentPage(urlPage)
      setSearchQuery(urlSearch)
      setAttributeFilter(urlAttribute)
      setMaterialFilter(urlMaterial)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const updateURL = (
    newFilter: string,
    newPage: number,
    newSearch: string,
    newAttribute = attributeFilter,
    newMaterial: string | boolean = materialFilter,
    _showLoading = false
  ) => {
    const actualMaterial = typeof newMaterial === 'string' ? newMaterial : materialFilter

    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : searchParams.toString())

    if (newFilter && newFilter !== "All") params.set('category', newFilter)
    else params.delete('category')

    if (newPage > 1) params.set('page', newPage.toString())
    else params.delete('page')

    if (newSearch) params.set('search', newSearch)
    else params.delete('search')

    if (newAttribute && newAttribute !== "ALL_ATTRIBUTE") params.set('attribute', newAttribute)
    else params.delete('attribute')

    if (actualMaterial && actualMaterial !== "ALL_MATERIAL") params.set('material', actualMaterial)
    else params.delete('material')

    // Choosing a filter is an in-page action; the explicit open state belongs only to the navbar/filter entry point.
    params.delete('filter')

    const query = params.toString()
    const targetPath = `${pathname}${query ? `?${query}` : ''}`
    const currentPath = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    if (targetPath === currentPath) return

    if (typeof window !== "undefined") {
      window.history.pushState(null, '', targetPath)
    }
  }

  const handleCategoryChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1)
    setAttributeFilter("ALL_ATTRIBUTE")
    setMaterialFilter("")
    setOpenColorPanel(false)
    setOpenMaterialPanel(false)
    updateURL(filterValue, 1, searchQuery, "ALL_ATTRIBUTE", "")
    closeSidebar()
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
    updateURL(activeFilter, 1, val, attributeFilter, materialFilter, false)
  }

  const categoryFilteredCollections = useMemo(
    () => filterCollectionsByCategory(collections, activeFilter, hotProductIds),
    [activeFilter, collections, hotProductIds]
  )

  const selectedColors = useMemo(() => selectedAttributeValues(attributeFilter), [attributeFilter])
  const selectedMaterials = useMemo(() => selectedMaterialValues(materialFilter), [materialFilter])
  const hasActiveFilters = activeFilter !== 'All' || selectedColors.length > 0 || selectedMaterials.length > 0 || searchQuery.trim() !== '' || activeImageSearch !== null || currentPage > 1

  const handleColorsChange = (filterValue: string, colors: string[]) => {
    const nextAttribute = colors.length > 0 ? colors.join(",") : "ALL_ATTRIBUTE"
    if (filterValue !== activeFilter) setActiveFilter(filterValue)
    setAttributeFilter(nextAttribute)
    setCurrentPage(1)
    updateURL(filterValue, 1, searchQuery, nextAttribute, materialFilter)
  }

  const handleMaterialsChange = (materials: string[]) => {
    const nextMaterial = materials.length > 0 ? materials.join(",") : ""
    setMaterialFilter(nextMaterial)
    setCurrentPage(1)
    updateURL(activeFilter, 1, searchQuery, attributeFilter, nextMaterial)
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
            product.category_id === 'prop' && productColorValues(product).some((color) => selectedColorSet.has(color))
          ),
        }))
        .filter((group) => group.products.length > 0)
    }

    if (selectedMaterials.length > 0) {
      const selectedMaterialSet = new Set(selectedMaterials)
      result = result
        .map((group) => ({
          ...group,
          products: (group.products || []).filter((product: any) =>
            product.category_id === 'prop' && productMaterialValues(product).some((mat) => selectedMaterialSet.has(mat))
          ),
        }))
        .filter((group) => group.products.length > 0)
    }

    if (activeImageSearch) {
      const matchedIds = new Set(activeImageSearch.matchedProductIds || [])
      const similarityMap = new Map((activeImageSearch.matches || []).map((m) => [Number(m.id), Number(m.similarity)]))

      if (matchedIds.size > 0) {
        result = result
          .map((group) => {
            const matchingGroupProducts = (group.products || []).filter((p: any) =>
              p.category_id === 'prop' && matchedIds.has(Number(p.id))
            )
            matchingGroupProducts.sort((a: any, b: any) => (similarityMap.get(Number(b.id)) || 0) - (similarityMap.get(Number(a.id)) || 0))
            return {
              ...group,
              products: matchingGroupProducts,
              maxSimilarity: Math.max(...matchingGroupProducts.map((p: any) => similarityMap.get(Number(p.id)) || 0), 0),
            }
          })
          .filter((group) => group.products.length > 0)

        // Sort collection groups so the most visually similar group comes first
        result.sort((a: any, b: any) => (b.maxSimilarity || 0) - (a.maxSimilarity || 0))
      }
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(group => {
        const matchGroupName = group.name?.toLowerCase().includes(query)
        const matchProducts = group.products?.some((p: any) =>
          p.category_id === 'prop' && (p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query))
        )
        return matchGroupName || matchProducts
      })
    }

    return result
  }, [categoryFilteredCollections, searchQuery, selectedColors, selectedMaterials, activeImageSearch])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)

  const renderPagination = () => {
    const pageItems: Array<number | 'ellipsis-left' | 'ellipsis-right'> = []

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) pageItems.push(page)
    } else {
      pageItems.push(1)

      const startPage = Math.max(2, currentPage - 1)
      const endPage = Math.min(totalPages - 1, currentPage + 1)

      if (startPage > 2) pageItems.push('ellipsis-left')
      for (let page = startPage; page <= endPage; page += 1) pageItems.push(page)
      if (endPage < totalPages - 1) pageItems.push('ellipsis-right')

      pageItems.push(totalPages)
    }

    return pageItems.map((item) => {
      if (typeof item !== 'number') {
        return (
          <span key={item} className="flex h-8 w-8 items-center justify-center text-[11px] text-[#8C8A86]" aria-hidden="true">
            …
          </span>
        )
      }

      return (
        <button
          key={item}
          onClick={() => handlePageChange(item)}
          className={`w-8 h-8 text-[11px] font-mono transition-all duration-300 ${currentPage === item
            ? 'text-[#3A3835] border-b border-[#3A3835] font-bold'
            : 'text-[#8C8A86] hover:text-[#3A3835]'
            }`}
        >
          {item}
        </button>
      )
    })
  };

  const getDisplayTitle = () => {
    if (activeFilter === "All") return "Product"
    if (activeFilter === "SPECIAL_DISCOUNT") return "SPECIAL OFFERS"
    if (activeFilter === "PRE_ORDER") return "PRE-ORDER"
    if (activeFilter === "IN_STOCK" || activeFilter === "READY_TO_SHIP") return "IN STOCK"
    if (isNoCategoryFilter(activeFilter)) return "ไม่มี (ไม่มี product_sup)"
    if (CATEGORY_DISPLAY_NAMES[activeFilter]) return CATEGORY_DISPLAY_NAMES[activeFilter].toUpperCase()
    return activeFilter.toUpperCase()
  };

  return (
    <>
      {/* 1. ตัวแบนเนอร์ด้านบน — Navbar กลางอยู่ใน app/layout.tsx */}
      {hasBanner && (
        <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden">
          <PropBanner
            allImages={allBannerImages}
            activeImage={activeBannerImage}
            categoryName={activeFilter || "All"}
          />
        </div>
      )}

      {/* 2. โซนเนื้อหาสินค้าด้านล่าง */}
      <div className={`max-w-[1600px] mx-auto w-full px-4 lg:py-16 pb-24 ${hasBanner ? 'pt-4 lg:pt-0' : 'pt-24 lg:pt-28'}`}>
        <div className="w-full scroll-mt-32" ref={topRef}>
      {isNavigationPending && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#EFE9E1]/65 backdrop-blur-[2px]" role="status" aria-live="polite">
          <div className="flex min-w-[150px] flex-col items-center gap-3 rounded-sm border border-[#C4B5A5]/50 bg-[#F9F6F0]/95 px-8 py-6 shadow-[0_12px_40px_rgba(58,56,53,0.12)]">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-[#84492C]/20 border-t-[#84492C]" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#84492C]">Loading...</span>
          </div>
        </div>
      )}

      <ProductFilterDrawer
        open={isFilterOpen}
        openColorPanel={openColorPanel}
        openMaterialPanel={openMaterialPanel}
        collections={collections}
        activeCategory={activeFilter}
        selectedColors={selectedColors}
        selectedMaterials={selectedMaterials}
        onClose={() => closeSidebar()}
        onCategoryChange={handleCategoryChange}
        onColorsChange={handleColorsChange}
        onMaterialsChange={handleMaterialsChange}
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
              <div className="min-w-0 w-full sm:w-72">
                <VisualImageSearch
                  value={searchQuery}
                  placeholder="SEARCH PROPS, SKU..."
                  onChange={handleSearchChange}
                  activeImage={activeImageSearch}
                  onImageSearch={(img) => {
                    if (img) {
                      // บังคับเคลียร์หมวดหมู่และฟิลเตอร์สีทั้งหมดให้เป็น All เพื่อให้ผลการค้นหาด้วยภาพเจอสินค้าครบทุกหมวด
                      setActiveFilter('All')
                      setAttributeFilter('ALL_ATTRIBUTE')
                      setMaterialFilter('')
                      setOpenColorPanel(false)
                      setOpenMaterialPanel(false)
                      setIsSidebarOpen(false)
                      updateURL('All', 1, searchQuery, 'ALL_ATTRIBUTE', '', false)
                    }
                    setActiveImageSearch(img)
                    setCurrentPage(1)
                  }}
                />
              </div>

              <div className="flex min-w-0 items-center justify-between sm:justify-end gap-4 shrink-0 pb-0.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D5D2CA]/20 sm:border-none">
                <button
                  type="button"
                  onClick={handleOpenFilter}
                  aria-expanded={isFilterOpen && !openColorPanel}
                  aria-controls="prop-product-filter-drawer"
                  className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b border-transparent px-1 text-[9px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation select-none ${isFilterOpen && !openColorPanel ? 'text-[#84492C]' : 'text-[#6F6861]'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[14px] h-[14px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  <span>FILTER</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  className={`flex h-10 shrink-0 items-center justify-center border-b border-transparent px-1 text-[9px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 touch-manipulation select-none ${hasActiveFilters
                    ? 'text-[#B5473C] hover:border-[#B5473C]/50 hover:text-[#8F2F29]'
                    : 'cursor-not-allowed text-[#B7B0A8]/70'
                    }`}
                  aria-label="Clear filters"
                >
                  CLEAR
                </button>

                <button
                  type="button"
                  onClick={handleOpenColorPanel}
                  aria-label="Open color filter"
                  aria-expanded={isFilterOpen && openColorPanel}
                  aria-controls="prop-product-filter-color-drawer"
                  className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b border-transparent px-1 text-[9px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation select-none ${isFilterOpen && openColorPanel ? 'text-[#84492C]' : selectedColors.length > 0 ? 'text-[#84492C]' : 'text-[#6F6861]'}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[16px] w-[16px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c-4.7 0-8.5 3.3-8.5 7.5 0 3.9 3 6.5 6.4 6.5h1.2c.8 0 1.4.6 1.4 1.4 0 .6.5 1.1 1.1 1.1h.7c3.8 0 6.7-3 6.7-6.8 0-5.4-4-9.7-9-9.7Z" />
                    <circle cx="8" cy="9" r="1.15" fill="#C26E4B" stroke="none" />
                    <circle cx="12" cy="6.8" r="1.15" fill="#8EA6B8" stroke="none" />
                    <circle cx="16.2" cy="8.2" r="1.15" fill="#B99A65" stroke="none" />
                    <circle cx="17" cy="12.2" r="1.15" fill="#7F8F6C" stroke="none" />
                  </svg>
                  <span>COLOR</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenMaterialPanel}
                  aria-label="Open material filter"
                  aria-expanded={isFilterOpen && openMaterialPanel}
                  aria-controls="prop-product-filter-material-drawer"
                  className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b border-transparent px-1 text-[9px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#84492C]/40 hover:text-[#84492C] touch-manipulation select-none ${isFilterOpen && openMaterialPanel ? 'text-[#84492C]' : selectedMaterials.length > 0 ? 'text-[#84492C]' : 'text-[#6F6861]'}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[16px] w-[16px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  <span>MATERIAL</span>
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
                    const preferredProducts = group.products?.filter((product: any) => {
                      const stockQty = (product.stock || []).reduce((sum: number, stockItem: any) => sum + Number(stockItem?.qty || 0), 0)
                      return stockQty > 0
                    }) || []

                    const productSlides = (preferredProducts.length > 0 ? preferredProducts : group.products || [])
                      .filter((p: any) => p.image_url !== null && p.image_url !== "")
                      .map((p: any) => ({
                        image_url: p.image_url,
                        price: p.price,
                        sku: p.sku,
                        name: p.name,
                        discount_value: p.discount_value,
                        discount_type: p.discount_type,
                        availability_status: p.availability_status,
                      }))

                    const slides = productSlides.length > 0 ? productSlides : (group.cover_image_url ? [
                      {
                        image_url: group.cover_image_url,
                        price: null,
                        sku: "",
                        name: group.name || "",
                        discount_value: null,
                        discount_type: null,
                        availability_status: preferredProducts[0]?.availability_status || group.products?.[0]?.availability_status,
                      }
                    ] : [])

                    return (
                      <div key={group.id} className="border-b border-r border-[#D5D2CA]/70 py-8 px-4 md:py-12 md:px-6 flex flex-col justify-between items-center relative">
                        <CollectionCard group={group} slides={slides} />
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-wrap justify-center items-center gap-4 mt-12 pb-16 border-t border-[#D5D2CA]/30 pt-8 max-w-full overflow-hidden">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`text-[10px] uppercase tracking-[0.2em] ${currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#3A3835]'}`}>Prev</button>
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1">{renderPagination()}</div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={`text-[10px] uppercase tracking-[0.2em] ${currentPage === totalPages ? 'opacity-20 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#3A3835]'}`}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
      </div>
    </>
  )
}
