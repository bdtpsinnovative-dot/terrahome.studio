"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  getColorOptions,
  PRODUCT_FILTER_ITEMS,
  type ProductFilterMenuItem,
} from "@/app/prop/productFilterModel"

type ProductFilterDrawerProps = {
  open: boolean
  openColorPanel?: boolean
  collections: any[]
  activeCategory: string
  selectedColors: string[]
  onClose: () => void
  onCategoryChange: (category: string) => void
  onColorsChange: (category: string, colors: string[]) => void
  hotProductIds?: number[]
  idPrefix?: string
  zIndexClass?: string
}

function groupForCategory(category: string) {
  const value = category.trim().toUpperCase()
  if (value === "VASE & VESSELS" || value === "CERAMIC VASES" || value === "GLASS VASES" || value === "VESSELS" || value === "OTHERS VASE" || value.startsWith("VASE")) return "VASE & VESSELS"
  if (value === "FIGURE" || value === "ANIMAL FIGURE" || value === "HUMAN FIGURE" || value === "PLANT FIGURE" || value === "OTHERS FIGURE" || value.startsWith("DOLL")) return "FIGURE"
  if (value === "ACCESSORIES" || value === "BOX" || value === "TRAYS" || value === "TOY" || value.startsWith("DECORATIVE")) return "ACCESSORIES"
  if (value === "DINING & TABLEWARE" || value === "PLATES & DISHES" || value === "BOWLS" || value === "GLASSWARE" || value === "CUPS & MUGS" || value === "TRAYS & SERVINGWARE" || value === "OTHER DINING & TABLEWARE" || value === "KITCHENWARE") return "DINING & TABLEWARE"
  if (value === "DRESSING & BATH" || value === "BATH ROOM" || value === "DRESSING ROOM" || value.includes("BATH")) return "DRESSING & BATH"
  if (value === "ART & WALL DECOR" || value === "HANDMADE" || value === "3D HANDMADE" || value === "DIGITAL PRINT" || value === "MIXED MEDIA ART" || value === "PHOTO FRAME" || value.startsWith("WALL ART")) return "ART & WALL DECOR"
  return null
}

export default function ProductFilterDrawer({
  open,
  openColorPanel = false,
  collections,
  activeCategory,
  selectedColors,
  onClose,
  onCategoryChange,
  onColorsChange,
  hotProductIds = [],
  idPrefix = "product-filter",
  zIndexClass = "z-[9999]",
}: ProductFilterDrawerProps) {
  const activeGroup = groupForCategory(activeCategory)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(activeGroup ? [activeGroup] : [])
  const [colorScope, setColorScope] = useState<string | null>(null)
  const onCloseRef = useRef(onClose)
  const wasOpenRef = useRef(false)
  const categoryDrawerId = `${idPrefix}-drawer`
  const colorDrawerId = `${idPrefix}-color-drawer`

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setColorScope(null)
      wasOpenRef.current = false
      return
    }

    if (openColorPanel) {
      setColorScope(activeCategory)
    } else {
      setColorScope(null)
    }

    wasOpenRef.current = true
  }, [activeCategory, open, openColorPanel])

  useEffect(() => {
    if (!open) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const group = groupForCategory(activeCategory)
    if (group) setExpandedGroups((current) => current.includes(group) ? current : [...current, group])
  }, [activeCategory, open])

  const colorOptions = useMemo(
    () => colorScope ? getColorOptions(collections, colorScope, hotProductIds) : [],
    [collections, colorScope, hotProductIds],
  )
  const scopedSelectedColors = colorScope === activeCategory ? selectedColors : []

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) => current.includes(label)
      ? current.filter((group) => group !== label)
      : [...current, label])
  }

  const toggleColorPanel = (category: string) => {
    setColorScope((current) => current === category ? null : category)
  }

  const toggleColor = (value: string) => {
    if (!colorScope) return
    const nextColors = scopedSelectedColors.includes(value)
      ? scopedSelectedColors.filter((color) => color !== value)
      : [...scopedSelectedColors, value]
    onColorsChange(colorScope, nextColors)
  }

  const renderMenuItem = (item: ProductFilterMenuItem, index: number) => {
    if (item.isSpecial && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      const isFirstSpecial = index > 0 && !PRODUCT_FILTER_ITEMS[index - 1]?.isSpecial
      return (
        <div key={item.fullValue} className={`w-full ${isFirstSpecial ? "mt-6 border-t border-[#C4B5A5]/35 pt-4" : "py-1"}`}>
          <button 
            type="button" 
            onClick={() => onCategoryChange(item.fullValue!)} 
            className={`group flex min-h-12 w-full items-center justify-between px-3 py-2 rounded-lg transition-all text-left ${isActive ? "bg-[#84492C]/10 text-[#84492C]" : "text-[#84492C] hover:bg-[#84492C]/5"}`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className={`text-[13px] uppercase tracking-[0.22em] transition-colors sm:text-[14px] ${isActive ? "font-bold text-[#84492C]" : "font-medium text-[#84492C]"}`}>
                {item.displayLabel || item.label}
              </span>
              {item.thaiLabel && (
                <span className="text-[11.5px] sm:text-[12px] tracking-normal transition-colors mt-0.5 text-[#84492C]/80 font-normal">
                  {item.thaiLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#84492C] shrink-0" />}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-[#84492C]" aria-hidden="true">
                <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.879a2.5 2.5 0 0 0 .732 1.767l6.5 6.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5Z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        </div>
      )
    }

    if (!item.items && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      const label = item.displayLabel || item.label
      return (
        <div key={`${item.label}-${index}`} className="flex w-full items-center py-0.5">
          <button 
            type="button" 
            onClick={() => onCategoryChange(item.fullValue!)} 
            className={`group flex min-h-12 min-w-0 w-full items-center justify-between px-3 py-2 rounded-xl transition-all text-left outline-none ${isActive ? "bg-[#84492C]/10 text-[#84492C]" : "text-[#3A3835] hover:bg-black/[0.02]"}`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className={`text-[13px] uppercase tracking-[0.22em] transition-colors sm:text-[14px] ${isActive ? "font-bold text-[#84492C]" : "font-medium text-[#3A3835]"}`}>
                {label}
              </span>
              {item.thaiLabel && (
                <span className={`text-[11.5px] sm:text-[12px] tracking-normal transition-colors mt-0.5 ${isActive ? "text-[#84492C] font-medium" : "text-[#807971] font-normal"}`}>
                  {item.thaiLabel}
                </span>
              )}
            </div>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#84492C] shrink-0 ml-2" />}
          </button>
        </div>
      )
    }

    const isExpanded = expandedGroups.includes(item.label)
    const isParentActive = activeCategory === item.label
    const hasActiveChild = item.items?.some((child) => activeCategory === child.fullValue)
    const label = item.displayLabel || item.label
    return (
      <div key={item.label} className="flex w-full flex-col items-start text-left py-0.5">
        <div className="flex w-full items-center gap-1">
          <button 
            type="button" 
            onClick={() => onCategoryChange(item.label)} 
            className={`group flex min-h-12 min-w-0 flex-1 items-center justify-between px-3 py-2 rounded-xl transition-all text-left outline-none ${isParentActive ? "bg-[#84492C]/10 text-[#84492C]" : hasActiveChild ? "text-[#1C1A18]" : "text-[#3A3835] hover:bg-black/[0.02]"}`}
          >
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className={`text-[13px] uppercase tracking-[0.22em] transition-colors sm:text-[14px] ${isParentActive ? "font-bold text-[#84492C]" : hasActiveChild ? "font-semibold text-[#1C1A18]" : isExpanded ? "font-medium text-[#1C1A18]" : "font-medium text-[#3A3835]"}`}>
                {label}
              </span>
              {item.thaiLabel && (
                <span className={`text-[11.5px] sm:text-[12px] tracking-normal transition-colors mt-0.5 ${isParentActive ? "text-[#84492C] font-medium" : "text-[#807971] font-normal"}`}>
                  {item.thaiLabel}
                </span>
              )}
            </div>
            {isParentActive && <span className="h-1.5 w-1.5 rounded-full bg-[#84492C] shrink-0 ml-2" />}
          </button>
          <button 
            type="button" 
            onClick={() => toggleGroup(item.label)} 
            aria-label={`${isExpanded ? "ยุบ" : "ขยาย"} ${label}`} 
            className={`grid min-h-10 min-w-10 shrink-0 place-items-center text-[16px] font-medium rounded-lg outline-none hover:bg-black/[0.04] transition-colors ${isExpanded ? "text-[#1C1A18]" : "text-[#807971]"}`}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
        <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col items-start pb-2 pl-4 pr-1 pt-1 text-left w-full space-y-0.5 border-l border-[#C4B5A5]/30 ml-4 my-1">
            {item.items?.map((child) => {
              const isActive = activeCategory === child.fullValue
              return (
                <div key={child.fullValue} className="flex w-full items-center py-0.5">
                  <button 
                    type="button" 
                    onClick={() => onCategoryChange(child.fullValue)} 
                    className={`group flex min-h-10 min-w-0 w-full items-center justify-between px-3 py-1.5 rounded-lg transition-all text-left outline-none ${isActive ? "bg-[#84492C]/[0.08] text-[#84492C] font-semibold" : "text-[#504A44] hover:bg-black/[0.02]"}`}
                  >
                    <div className="flex flex-col items-start min-w-0 text-left">
                      <span className={`text-[12px] uppercase tracking-[0.18em] sm:text-[12.5px] sm:tracking-[0.2em] ${isActive ? "font-bold text-[#84492C]" : "font-normal text-[#504A44]"}`}>
                        {child.displayLabel}
                      </span>
                      {child.thaiLabel && (
                        <span className={`text-[11px] sm:text-[11.5px] tracking-normal transition-colors mt-0.5 ${isActive ? "text-[#84492C] font-medium" : "text-[#807971] font-normal"}`}>
                          {child.thaiLabel}
                        </span>
                      )}
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#84492C] shrink-0 ml-2" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 ${zIndexClass} transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" aria-label="Close product filters" tabIndex={open ? 0 : -1} className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bottom-0 left-0 top-0 flex w-[92%] max-w-[380px] touch-manipulation overflow-hidden shadow-2xl transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-150 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <aside id={categoryDrawerId} aria-label={colorScope ? "เลือกสีสินค้า" : "Product filters"} aria-hidden={!open} className="flex h-full w-full shrink-0 flex-col bg-[#EFE9E1]">
          <div className="relative mb-4 flex min-h-[77px] items-center justify-between border-b border-[#C4B5A5]/30 px-4 sm:px-8">
            <div className="flex items-center z-10">
              {colorScope && (
                <button type="button" onClick={() => setColorScope(null)} aria-label="กลับไปตัวกรองหมวดหมู่" className="-ml-2 flex min-h-11 items-center gap-1.5 text-[#3A3835] outline-none transition-colors hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-[0.16em]">Back</span>
                </button>
              )}
            </div>

            {/* 🌟 จัดตำแหน่งกึ่งกลาง 100% ด้วย Absolute Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
              <span className="whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.25em] text-[#3A3835] sm:text-[13px] sm:tracking-[0.3em]">
                {colorScope ? "Color" : "Filters"}
              </span>
            </div>

            <div className="flex items-center z-10">
              <button type="button" onClick={onClose} aria-label="Close filters" className="-mr-2 flex min-h-11 min-w-11 items-center justify-center text-[#3A3835] outline-none transition-colors hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-5.5 w-5.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-12 pt-2 text-left sm:px-8">
            {colorScope ? (
              <div id={colorDrawerId} aria-label="Filter products by color">
                {colorOptions.length > 0 ? colorOptions.map((option) => {
                  const isSelected = scopedSelectedColors.includes(option.value)
                  return (
                    <button key={option.value} type="button" onClick={() => toggleColor(option.value)} aria-pressed={isSelected} className={`group flex min-h-11 w-full items-center gap-2 px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] sm:gap-3 sm:px-2 ${isSelected ? "font-semibold text-[#84492C]" : "font-normal text-[#6F6861] hover:text-[#3A3835]"}`}>
                      <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border border-[#8F857D]/45 shadow-[inset_0_0_0_1px_oklch(98%_0.006_80_/_0.45)]" style={option.swatch ? { backgroundColor: option.swatch } : undefined}>
                        {!option.swatch ? <span className="grid h-full w-full place-items-center text-[8px] text-[#8C8A86]">?</span> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] uppercase tracking-[0.16em]">{option.label}</span>
                      <span className="shrink-0 font-mono text-[9px] tabular-nums text-[#8C8A86]">{option.count}</span>
                      <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center text-[#84492C] ${isSelected ? "opacity-100" : "opacity-0"}`}>
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-9" /></svg>
                      </span>
                    </button>
                  )
                }) : <p className="px-2 py-6 text-[9px] uppercase tracking-[0.14em] text-[#8C8A86]">No color data</p>}
              </div>
            ) : PRODUCT_FILTER_ITEMS.map(renderMenuItem)}
          </div>
        </aside>

      </div>
    </div>
  )
}
