"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import CollectionCard from "./CollectionCard"
import BranchSelector from "./BranchSelector"
import { CATEGORY_DISPLAY_NAMES } from "@/app/constants/categories"

type ColorOption = {
  value: string
  label: string
  count: number
  swatch: string | null
}

const COLOR_PRESENTATION: Record<string, { label: string; swatch: string }> = {
  beige: { label: "Beige", swatch: "oklch(82% 0.035 78)" },
  black: { label: "Black", swatch: "oklch(22% 0.012 65)" },
  blue: { label: "Blue", swatch: "oklch(56% 0.13 250)" },
  brown: { label: "Brown", swatch: "oklch(43% 0.07 58)" },
  gold: { label: "Gold", swatch: "oklch(72% 0.115 78)" },
  green: { label: "Green", swatch: "oklch(51% 0.1 145)" },
  grey: { label: "Grey", swatch: "oklch(60% 0.012 70)" },
  orange: { label: "Orange", swatch: "oklch(68% 0.16 52)" },
  pink: { label: "Pink", swatch: "oklch(75% 0.09 8)" },
  purple: { label: "Purple", swatch: "oklch(53% 0.13 305)" },
  red: { label: "Red", swatch: "oklch(55% 0.18 28)" },
  silver: { label: "Silver", swatch: "oklch(78% 0.012 245)" },
  white: { label: "White", swatch: "oklch(97% 0.008 80)" },
  yellow: { label: "Yellow", swatch: "oklch(84% 0.15 92)" },
}

const COLOR_ALIASES: Record<string, string> = {
  gray: "grey",
}

function normalizeAttribute(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase()
  return COLOR_ALIASES[normalized] || normalized
}

function attributeValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(attributeValues)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const namedValue = record.name ?? record.label ?? record.value
    return namedValue === undefined ? [] : attributeValues(namedValue)
  }
  if (typeof value !== "string") return []
  return value
    .split(/[,/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function productColorValues(product: any): string[] {
  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {}
  const rawValues = [
    product?.color,
    product?.colour,
    product?.colors,
    product?.colours,
    specs.color,
    specs.colour,
    specs.colors,
    specs.colours,
    specs.tone,
    specs.color_tone,
    specs.colour_tone,
    specs.colorTone,
  ]

  return Array.from(new Set(rawValues.flatMap(attributeValues).map(normalizeAttribute)))
}

function colorLabel(value: string) {
  if (COLOR_PRESENTATION[value]) return COLOR_PRESENTATION[value].label
  return value.replace(/\b\w/g, (character) => character.toUpperCase())
}

function selectedAttributeValues(value: string) {
  if (!value || value === "ALL_ATTRIBUTE") return []
  return Array.from(new Set(value.split(",").map(normalizeAttribute).filter(Boolean)))
}

function filterCollectionsByCategory(collections: any[], activeFilter: string, hotProductIds: number[]) {
  const filterUpper = activeFilter.toUpperCase().trim()

  if (activeFilter === "All") return collections

  if (activeFilter === "HOT_ITEM") {
    const hotIdSet = new Set(hotProductIds)
    return collections
      .filter((group) => group.products?.some((product: any) => hotIdSet.has(Number(product.id))))
      .map((group) => ({
        ...group,
        products: group.products
          .filter((product: any) => hotIdSet.has(Number(product.id)))
          .sort((a: any, b: any) => (a.hot_rank || Infinity) - (b.hot_rank || Infinity)),
      }))
  }

  if (activeFilter === "SPECIAL_DISCOUNT") {
    return collections.filter((group) => group.products?.some((product: any) => product.discount_value !== null))
  }

  if (activeFilter === "PRE_ORDER") {
    return collections
      .filter((group) => group.products?.some((product: any) => product.availability_status === "preorder"))
      .map((group) => ({
        ...group,
        products: group.products.filter((product: any) => product.availability_status === "preorder"),
      }))
  }

  if (filterUpper === "DECORATIVE") {
    return collections.filter((group) => {
      const sup = (group.product_sup || "").trim().toLowerCase()
      return (sup.startsWith("decorative") || sup.startsWith("decotative")) && !sup.includes("candle holder")
    })
  }

  if (filterUpper === "DOLL") {
    return collections.filter((group) => (group.product_sup || "").trim().toLowerCase().startsWith("doll"))
  }

  if (filterUpper === "VASE") {
    return collections.filter((group) => (group.product_sup || "").trim().toLowerCase().startsWith("vase"))
  }

  if (filterUpper === "WALL ART") {
    return collections.filter((group) => (group.product_sup || "").trim().toLowerCase().startsWith("wall art"))
  }

  const targetTrimmed = activeFilter.trim().toLowerCase()
  return collections.filter((group) => (group.product_sup || "").trim().toLowerCase() === targetTrimmed)
}

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
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false)
  const [colorFilterScope, setColorFilterScope] = useState<string | null>(null)
  const isFilterOpen = isSidebarOpen || searchParams.get('filter') === 'open'

  const closeSidebar = (clearUrl = true) => {
    setIsSidebarOpen(false)
    setIsColorPanelOpen(false)
    setColorFilterScope(null)
    if (clearUrl && searchParams.get('filter') === 'open') {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('filter')
      const query = params.toString()
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    }
  }

  // 🌟 ล็อกไม่ให้หน้าจอหมุนหรือเลื่อนเมื่อเปิดเมนู Filter มือถือ
  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isFilterOpen])

  useEffect(() => {
    if (!isFilterOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setIsSidebarOpen(false)
      setIsColorPanelOpen(false)
      setColorFilterScope(null)
      if (searchParams.get('filter') === 'open') {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('filter')
        const query = params.toString()
        router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isFilterOpen])

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
    const urlAttribute = searchParams.get('attribute') || "ALL_ATTRIBUTE"
    setActiveFilter(urlCategory)
    setCurrentPage(urlPage)
    setSearchQuery(urlSearch)
    setAttributeFilter(urlAttribute)
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

  const handleFilterChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1)
    setAttributeFilter("ALL_ATTRIBUTE")
    updateURL(filterValue, 1, searchQuery, "ALL_ATTRIBUTE")
    closeSidebar(false)

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

  const handleCategoryChange = (filterValue: string) => {
    setActiveFilter(filterValue)
    setCurrentPage(1)
    setAttributeFilter("ALL_ATTRIBUTE")
    updateURL(filterValue, 1, searchQuery, "ALL_ATTRIBUTE")
    closeSidebar(false)

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

  const handleCategoryColor = (filterValue: string) => {
    if (colorFilterScope === filterValue && isColorPanelOpen) {
      setIsColorPanelOpen(false)
      setColorFilterScope(null)
      return
    }

    setColorFilterScope(filterValue)
    setIsSidebarOpen(true)
    setIsColorPanelOpen(true)

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

  const categoryFilteredCollections = useMemo(
    () => filterCollectionsByCategory(collections, activeFilter, hotProductIds),
    [activeFilter, collections, hotProductIds]
  )

  const colorOptions = useMemo<ColorOption[]>(() => {
    const colors = new Map<string, number>()
    const colorScopeCollections = filterCollectionsByCategory(collections, colorFilterScope || activeFilter, hotProductIds)
    for (const group of colorScopeCollections) {
      for (const product of group.products || []) {
        for (const value of productColorValues(product)) {
          colors.set(value, (colors.get(value) || 0) + 1)
        }
      }
    }

    return Array.from(colors.entries())
      .map(([value, count]) => ({
        value,
        label: colorLabel(value),
        count,
        swatch: COLOR_PRESENTATION[value]?.swatch || null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [activeFilter, collections, colorFilterScope, hotProductIds])

  const selectedColors = useMemo(() => selectedAttributeValues(attributeFilter), [attributeFilter])
  const scopedSelectedColors = colorFilterScope && colorFilterScope !== activeFilter ? [] : selectedColors

  const handleAttributeChange = (value: string) => {
    const filterValue = colorFilterScope || activeFilter
    const nextValues = value === "ALL_ATTRIBUTE"
      ? []
      : scopedSelectedColors.includes(value)
        ? scopedSelectedColors.filter((selectedValue) => selectedValue !== value)
        : [...scopedSelectedColors, value]
    const nextAttribute = nextValues.length > 0 ? nextValues.join(",") : "ALL_ATTRIBUTE"

    if (filterValue !== activeFilter) setActiveFilter(filterValue)
    setAttributeFilter(nextAttribute)
    setCurrentPage(1)
    updateURL(filterValue, 1, searchQuery, nextAttribute)
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

      { label: "ART OBJECT", displayLabel: "ORNAMENT", isGroup: false, fullValue: "Art Object" },
      { label: "BOOK END", displayLabel: "BOOKENDS", isGroup: false, fullValue: "Book End" },
      { label: "CANDLE HOLDER", displayLabel: "CANDLE HOLDERS", isGroup: false, fullValue: "Candle Holder" },
      { label: "DECORATIVE", displayLabel: "DECORATIVE OBJECTS", isGroup: true, items: decorativeItems },
      { label: "DOLL", displayLabel: "DOLLS & TOYS", isGroup: true, items: dollItems },
      { label: "KITCHENWARE", displayLabel: "TABLEWARE", isGroup: false, fullValue: "Kitchenware" },
      { label: "TRAY", displayLabel: "TRAYS", isGroup: false, fullValue: "Tray" },
      { label: "VASE", displayLabel: "VESSELS", isGroup: true, items: vaseItems },
      { label: "WALL ART", displayLabel: "ART & WALL DECOR", isGroup: true, items: wallArtItems },
      {
        label: "PRE-ORDER",
        isGroup: false,
        fullValue: "PRE_ORDER",
        isSpecial: true,
      },
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

  const renderSidebarContent = () => (
    <div className="flex w-full flex-col px-3 pb-12 pt-2 text-left sm:px-6">
      {structuredCategories.map((menuItem, idx) => {
        if (menuItem.isSpecial) {
          const isActive = activeFilter === menuItem.fullValue
          return (
            <div key={menuItem.fullValue} className="w-full py-1 mt-6 border-t border-[#C4B5A5]/30 pt-6">
              <button
                onClick={(e) => { e.preventDefault(); handleFilterChange(menuItem.fullValue); }}
                className={`w-full flex items-center justify-between text-left group transition-all duration-300`}
              >
                <span className={`text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${isActive ? 'text-[#84492C] font-semibold' : 'text-[#84492C]/80 font-medium group-hover:text-[#84492C]'}`}>
                  {menuItem.displayLabel || menuItem.label}
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
          const displayLabel = menuItem.displayLabel || menuItem.label
          return (
            <div key={`${menuItem.label}-${idx}`} className="flex w-full items-center gap-1 py-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); if (menuItem.fullValue && menuItem.fullValue !== "ART_OBJECT_EMPTY") handleCategoryChange(menuItem.fullValue); }}
                className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]"
              >
                <span className={`min-w-0 truncate whitespace-nowrap text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${isActive ? 'text-[#84492C] font-semibold' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                  {displayLabel}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (menuItem.fullValue && menuItem.fullValue !== "ART_OBJECT_EMPTY") handleCategoryColor(menuItem.fullValue); }}
                aria-label={`เลือกสีของ ${displayLabel}`}
                title={`เลือกสีของ ${displayLabel}`}
                aria-controls="color-filter-drawer"
                className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-[#E4D8CB] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${isActive ? 'text-[#84492C]' : 'text-[#8C8A86]'}`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[18px] w-[18px]">
                  <circle cx="7" cy="8" r="2.2" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="6" r="2.2" fill="currentColor" stroke="none" opacity=".7" />
                  <circle cx="17" cy="8" r="2.2" fill="currentColor" stroke="none" opacity=".45" />
                  <path strokeLinecap="round" d="M5.5 14.5h13M7 18h10" />
                </svg>
              </button>
            </div>
          )
        }

        const isExpanded = expandedGroups.includes(menuItem.label)
        const hasActiveChild = menuItem.items?.some((child: any) => activeFilter === child.fullValue) || activeFilter === menuItem.label
        return (
          <div key={menuItem.label} className="w-full flex flex-col items-start text-left">
            <div className="flex w-full items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleCategoryChange(menuItem.label); }}
                className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]"
              >
                <span className={`min-w-0 truncate whitespace-nowrap text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${hasActiveChild || isExpanded ? 'text-[#3A3835] font-medium' : 'text-[#8C8A86] font-light group-hover:text-[#3A3835]'}`}>
                  {menuItem.displayLabel || menuItem.label}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCategoryColor(menuItem.label); }}
                aria-label={`เลือกสีของ ${menuItem.displayLabel || menuItem.label}`}
                title={`เลือกสีของ ${menuItem.displayLabel || menuItem.label}`}
                aria-controls="color-filter-drawer"
                className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-[#E4D8CB] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${hasActiveChild ? 'text-[#84492C]' : 'text-[#8C8A86]'}`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[18px] w-[18px]">
                  <circle cx="7" cy="8" r="2.2" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="6" r="2.2" fill="currentColor" stroke="none" opacity=".7" />
                  <circle cx="17" cy="8" r="2.2" fill="currentColor" stroke="none" opacity=".45" />
                  <path strokeLinecap="round" d="M5.5 14.5h13M7 18h10" />
                </svg>
              </button>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGroup(menuItem.label); }} aria-label={`${isExpanded ? 'ยุบ' : 'ขยาย'} ${menuItem.displayLabel || menuItem.label}`} className={`grid min-h-11 min-w-11 shrink-0 place-items-center text-[12px] font-light outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${isExpanded ? 'text-[#3A3835]' : 'text-[#8C8A86]/60'}`}>
                {isExpanded ? '−' : '+'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out w-full ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col pl-4 pb-2 pt-1 items-start text-left">
                {menuItem.items?.map((childItem: any) => {
                  const isChildActive = activeFilter === childItem.fullValue
                  return (
                    <div key={childItem.fullValue} className="flex w-full items-center gap-1 py-1">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleCategoryChange(childItem.fullValue); }}
                        className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]"
                      >
                        <span className={`min-w-0 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.2em] ${isChildActive ? 'text-[#84492C] font-semibold' : 'text-[#8C8A86]/80 font-light group-hover:text-[#3A3835]'}`}>
                          {childItem.displayLabel}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCategoryColor(childItem.fullValue); }}
                        aria-label={`เลือกสีของ ${childItem.displayLabel}`}
                        title={`เลือกสีของ ${childItem.displayLabel}`}
                        aria-controls="color-filter-drawer"
                        className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-[#E4D8CB] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${isChildActive ? 'text-[#84492C]' : 'text-[#8C8A86]'}`}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[18px] w-[18px]">
                          <circle cx="7" cy="8" r="2.2" fill="currentColor" stroke="none" />
                          <circle cx="12" cy="6" r="2.2" fill="currentColor" stroke="none" opacity=".7" />
                          <circle cx="17" cy="8" r="2.2" fill="currentColor" stroke="none" opacity=".45" />
                          <path strokeLinecap="round" d="M5.5 14.5h13M7 18h10" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );

  const renderColorPanel = () => (
    <aside
      id="color-filter-drawer"
      aria-label="Filter products by color"
      className="flex h-full w-[48%] shrink-0 flex-col border-l border-[#C4B5A5]/45 bg-[#F5F0E9] sm:w-[280px]"
    >
      <div className="flex min-h-[77px] items-center justify-between border-b border-[#C4B5A5]/30 px-3 sm:px-6">
        <button
          type="button"
          onClick={() => { setIsColorPanelOpen(false); setColorFilterScope(null) }}
          aria-label="Back to categories"
          className="flex min-h-11 min-w-11 items-center justify-start text-[#3A3835] outline-none hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#3A3835] sm:text-[11px] sm:tracking-[0.3em]">Color</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => handleAttributeChange("ALL_ATTRIBUTE")}
          aria-pressed={scopedSelectedColors.length === 0}
          disabled={scopedSelectedColors.length === 0}
          className={`flex min-h-11 w-full items-center gap-2 px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9] sm:gap-3 sm:px-2 ${scopedSelectedColors.length === 0 ? 'cursor-not-allowed font-semibold text-[#AFA399]' : 'font-light text-[#6F6861] hover:text-[#3A3835]'}`}
        >
          <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#AFA399] bg-[#EFE9E1] text-[9px] text-[#84492C]">×</span>
          <span className="min-w-0 flex-1 whitespace-nowrap text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]">Clear color filter</span>
        </button>

        {colorOptions.map((option) => {
          const isSelected = scopedSelectedColors.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleAttributeChange(option.value)}
              aria-pressed={isSelected}
              className={`group flex min-h-11 w-full items-center gap-2 px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9] sm:gap-3 sm:px-2 ${isSelected ? 'font-semibold text-[#84492C]' : 'font-light text-[#6F6861] hover:text-[#3A3835]'}`}
            >
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 rounded-full border border-[#8F857D]/45 shadow-[inset_0_0_0_1px_oklch(98%_0.006_80_/_0.45)]"
                style={option.swatch ? { backgroundColor: option.swatch } : undefined}
              >
                {!option.swatch && <span className="grid h-full w-full place-items-center text-[8px] text-[#8C8A86]">?</span>}
              </span>
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]">{option.label}</span>
              <span className="shrink-0 font-mono text-[8px] tabular-nums text-[#8C8A86] sm:text-[9px]">{option.count}</span>
              <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center text-[#84492C] ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-9" />
                </svg>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )

  return (
    <div className="w-full scroll-mt-32" ref={topRef}>
      <div className={`fixed inset-0 z-[9999] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-150 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => closeSidebar()} />
        <div className={`absolute bottom-0 left-0 top-0 z-10 flex touch-manipulation shadow-2xl transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-150 ${isColorPanelOpen ? 'w-full sm:w-[620px]' : 'w-[85%] max-w-[340px]'} ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <aside id="filter-drawer" aria-label="Product filters" className={`flex h-full shrink-0 flex-col bg-[#EFE9E1] ${isColorPanelOpen ? 'w-[52%] sm:w-[340px]' : 'w-full'}`}>
          <div className="mb-4 flex min-h-[77px] items-center justify-between border-b border-[#C4B5A5]/30 bg-[#EFE9E1] px-4 sm:px-8">
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#3A3835] sm:text-[11px] sm:tracking-[0.3em]">Filters</span>
            <button type="button" onClick={() => closeSidebar()} aria-label="Close filters" className="-mr-2 grid min-h-11 min-w-11 place-items-center text-[#3A3835] outline-none hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] touch-manipulation">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-2">
            {renderSidebarContent()}
          </div>
          </aside>
          {isColorPanelOpen && renderColorPanel()}
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
                    setColorFilterScope(selectedColors.length > 0 ? activeFilter : null)
                    setIsColorPanelOpen(selectedColors.length > 0)
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('filter', 'open')
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
                  }}
                  aria-expanded={isFilterOpen}
                  aria-controls="filter-drawer"
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
