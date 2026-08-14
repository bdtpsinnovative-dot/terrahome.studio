"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  getColorOptions,
  PRODUCT_FILTER_ITEMS,
  type ProductFilterMenuItem,
} from "@/app/prop/productFilterModel"

type ProductFilterDrawerProps = {
  open: boolean
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
  const value = category.trim().toLowerCase()
  if (value.startsWith("decorative") || value.startsWith("decotative")) return "DECORATIVE"
  if (value.startsWith("doll")) return "DOLL"
  if (value.startsWith("vase")) return "VASE"
  if (value.startsWith("wall art")) return "WALL ART"
  return null
}

export default function ProductFilterDrawer({
  open,
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
    if (open && !wasOpenRef.current) {
      setColorScope(selectedColors.length > 0 ? activeCategory : null)
    }
    if (!open) setColorScope(null)
    wasOpenRef.current = open
  }, [activeCategory, open, selectedColors.length])

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

  const renderColorTrigger = (category: string, label: string, active: boolean) => (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleColorPanel(category)
      }}
      aria-label={`เลือกสีของ ${label}`}
      title={`เลือกสีของ ${label}`}
      aria-expanded={colorScope === category}
      aria-controls={colorDrawerId}
      className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-[#E4D8CB] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${active ? "text-[#84492C]" : "text-[#8C8A86]"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="h-[18px] w-[18px]">
        <circle cx="7" cy="8" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="6" r="2.2" fill="currentColor" stroke="none" opacity=".7" />
        <circle cx="17" cy="8" r="2.2" fill="currentColor" stroke="none" opacity=".45" />
        <path strokeLinecap="round" d="M5.5 14.5h13M7 18h10" />
      </svg>
    </button>
  )

  const renderMenuItem = (item: ProductFilterMenuItem, index: number) => {
    if (item.isSpecial && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      return (
        <div key={item.fullValue} className="mt-6 w-full border-t border-[#C4B5A5]/30 pt-6">
          <button type="button" onClick={() => onCategoryChange(item.fullValue!)} className="group flex min-h-11 w-full items-center justify-between text-left">
            <span className={`text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${isActive ? "font-semibold text-[#84492C]" : "font-medium text-[#84492C]/80 group-hover:text-[#84492C]"}`}>
              {item.displayLabel || item.label}
            </span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-[#84492C]/60" aria-hidden="true">
              <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.879a2.5 2.5 0 0 0 .732 1.767l6.5 6.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )
    }

    if (!item.items && item.fullValue) {
      const isActive = activeCategory === item.fullValue
      const label = item.displayLabel || item.label
      return (
        <div key={`${item.label}-${index}`} className="flex w-full items-center gap-1 py-1">
          <button type="button" onClick={() => onCategoryChange(item.fullValue!)} className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]">
            <span className={`min-w-0 truncate whitespace-nowrap text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${isActive ? "font-semibold text-[#84492C]" : "font-light text-[#8C8A86] group-hover:text-[#3A3835]"}`}>
              {label}
            </span>
          </button>
          {renderColorTrigger(item.fullValue, label, isActive)}
        </div>
      )
    }

    const isExpanded = expandedGroups.includes(item.label)
    const hasActiveChild = item.items?.some((child) => activeCategory === child.fullValue) || activeCategory === item.label
    const label = item.displayLabel || item.label
    return (
      <div key={item.label} className="flex w-full flex-col items-start text-left">
        <div className="flex w-full items-center gap-1">
          <button type="button" onClick={() => onCategoryChange(item.label)} className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]">
            <span className={`min-w-0 truncate whitespace-nowrap text-[10px] uppercase tracking-[0.16em] transition-colors sm:text-[11px] sm:tracking-[0.25em] ${hasActiveChild || isExpanded ? "font-medium text-[#3A3835]" : "font-light text-[#8C8A86] group-hover:text-[#3A3835]"}`}>
              {label}
            </span>
          </button>
          {renderColorTrigger(item.label, label, Boolean(hasActiveChild))}
          <button type="button" onClick={() => toggleGroup(item.label)} aria-label={`${isExpanded ? "ยุบ" : "ขยาย"} ${label}`} className={`grid min-h-11 min-w-11 shrink-0 place-items-center text-[12px] font-light outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1] ${isExpanded ? "text-[#3A3835]" : "text-[#8C8A86]/60"}`}>
            {isExpanded ? "−" : "+"}
          </button>
        </div>
        <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col items-start pb-2 pl-4 pt-1 text-left">
            {item.items?.map((child) => {
              const isActive = activeCategory === child.fullValue
              return (
                <div key={child.fullValue} className="flex w-full items-center gap-1 py-1">
                  <button type="button" onClick={() => onCategoryChange(child.fullValue)} className="group flex min-h-11 min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]">
                    <span className={`min-w-0 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.2em] ${isActive ? "font-semibold text-[#84492C]" : "font-light text-[#8C8A86]/80 group-hover:text-[#3A3835]"}`}>
                      {child.displayLabel}
                    </span>
                  </button>
                  {renderColorTrigger(child.fullValue, child.displayLabel, isActive)}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 ${zIndexClass} transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-150 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button type="button" aria-label="Close product filters" tabIndex={open ? 0 : -1} className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bottom-0 left-0 top-0 flex touch-manipulation shadow-2xl transition-[transform,width] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-150 ${colorScope ? "w-full sm:w-[620px]" : "w-[85%] max-w-[340px]"} ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <aside id={categoryDrawerId} aria-label="Product filters" aria-hidden={!open} className={`flex h-full shrink-0 flex-col bg-[#EFE9E1] ${colorScope ? "w-[52%] sm:w-[340px]" : "w-full"}`}>
          <div className="mb-4 flex min-h-[77px] items-center justify-between border-b border-[#C4B5A5]/30 px-4 sm:px-8">
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#3A3835] sm:text-[11px] sm:tracking-[0.3em]">Filters</span>
            <button type="button" onClick={onClose} aria-label="Close filters" className="-mr-2 grid min-h-11 min-w-11 place-items-center text-[#3A3835] outline-none transition-colors hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE9E1]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-12 pt-2 text-left sm:px-8">
            {PRODUCT_FILTER_ITEMS.map(renderMenuItem)}
          </div>
        </aside>

        {colorScope ? (
          <aside id={colorDrawerId} aria-label="Filter products by color" className="flex h-full w-[48%] shrink-0 flex-col border-l border-[#C4B5A5]/45 bg-[#F5F0E9] sm:w-[280px]">
            <div className="flex min-h-[77px] items-center justify-between border-b border-[#C4B5A5]/30 px-3 sm:px-6">
              <button type="button" onClick={() => setColorScope(null)} aria-label="Back to categories" className="flex min-h-11 min-w-11 items-center justify-start text-[#3A3835] outline-none hover:text-[#B8834A] focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9]">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#3A3835] sm:text-[11px] sm:tracking-[0.3em]">Color</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4">
              <button type="button" onClick={() => onColorsChange(colorScope, [])} aria-pressed={scopedSelectedColors.length === 0} disabled={scopedSelectedColors.length === 0} className={`flex min-h-11 w-full items-center gap-2 px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9] sm:gap-3 sm:px-2 ${scopedSelectedColors.length === 0 ? "cursor-not-allowed font-semibold text-[#AFA399]" : "font-light text-[#6F6861] hover:text-[#3A3835]"}`}>
                <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#AFA399] bg-[#EFE9E1] text-[9px] text-[#84492C]">×</span>
                <span className="min-w-0 flex-1 whitespace-nowrap text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]">Clear color filter</span>
              </button>
              {colorOptions.length > 0 ? colorOptions.map((option) => {
                const isSelected = scopedSelectedColors.includes(option.value)
                return (
                  <button key={option.value} type="button" onClick={() => toggleColor(option.value)} aria-pressed={isSelected} className={`group flex min-h-11 w-full items-center gap-2 px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#84492C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E9] sm:gap-3 sm:px-2 ${isSelected ? "font-semibold text-[#84492C]" : "font-light text-[#6F6861] hover:text-[#3A3835]"}`}>
                    <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border border-[#8F857D]/45 shadow-[inset_0_0_0_1px_oklch(98%_0.006_80_/_0.45)]" style={option.swatch ? { backgroundColor: option.swatch } : undefined}>
                      {!option.swatch ? <span className="grid h-full w-full place-items-center text-[8px] text-[#8C8A86]">?</span> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]">{option.label}</span>
                    <span className="shrink-0 font-mono text-[8px] tabular-nums text-[#8C8A86] sm:text-[9px]">{option.count}</span>
                    <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center text-[#84492C] ${isSelected ? "opacity-100" : "opacity-0"}`}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-9" /></svg>
                    </span>
                  </button>
                )
              }) : <p className="px-2 py-6 text-[9px] uppercase tracking-[0.14em] text-[#8C8A86]">No color data</p>}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
