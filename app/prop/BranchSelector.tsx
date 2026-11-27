"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import { MapPin, ChevronDown, X, Check, Compass, List } from "lucide-react"
import { getBranchType, getBranchLocationHint, Branch } from "./branchUtils"

const BranchMiniMap = dynamic(() => import("./BranchMiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[260px] flex flex-col items-center justify-center bg-[#F5F2EB]/50 gap-2">
      <span className="w-6 h-6 border-2 border-[#84492C]/20 border-t-[#84492C] rounded-full animate-spin" />
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#84492C]">Loading Mini Map...</span>
    </div>
  ),
})

const BranchModal = dynamic(() => import("./BranchModal"), {
  ssr: false,
})

export default function BranchSelector({
  branches,
  isLightPage = true
}: {
  branches: Branch[]
  isLightPage?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentBranchId = searchParams.get("branch") || "all"

  const [isOpen, setIsOpen] = useState(false)
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"map" | "list">("list")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoading(false)
  }, [searchParams])

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const allOption: Branch = {
    id: "all",
    branch_code: "ALL",
    branch_name: "All",
  }

  const options = [allOption, ...branches]
  const selectedBranch =
    options.find(
      (b) => b.id.toString() === currentBranchId || (b.branch_code && b.branch_code.toString() === currentBranchId)
    ) || allOption

  const categorizedBranches = useMemo(() => {
    const showrooms: Branch[] = []
    const warehouses: Branch[] = []
    const events: Branch[] = []

    for (const b of branches) {
      const type = getBranchType(b.branch_name, b.branch_code)
      if (type === "warehouse") warehouses.push(b)
      else if (type === "event") events.push(b)
      else showrooms.push(b)
    }

    return { showrooms, warehouses, events }
  }, [branches])

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const right = Math.max(16, window.innerWidth - rect.right)
      const top = rect.bottom + 8
      setCoords({ top, right })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updateCoords()

    const handleScrollOrResize = () => {
      updateCoords()
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      // Ignore if target was removed from DOM during click (e.g. Leaflet popup close button)
      if (!target || !document.contains(target)) return

      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, updateCoords])

  // ล็อกการเลื่อนหน้าจอด้านหลังเมื่อเปิดเมนูแบบ Bottom Sheet บนมือถือ
  useEffect(() => {
    if (isOpen && isMobile) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen, isMobile])

  const handleSelect = (branchId: string | number) => {
    setIsOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (branchId === "all") {
      params.delete("branch")
    } else {
      params.set("branch", branchId.toString())
    }
    // เปลี่ยนสาขาให้รีเซ็ตกลับไปหน้า 1 เสมอ
    params.set("page", "1")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return
    setIsLoading(true)
    router.push(`?${nextQuery}`, { scroll: false })
  }

  if (branches.length === 0) return null

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#EFE9E1]/65 backdrop-blur-[2px]" role="status" aria-live="polite">
          <div className="flex min-w-[150px] flex-col items-center gap-3 rounded-sm border border-[#C4B5A5]/50 bg-[#F9F6F0]/95 px-8 py-6 shadow-[0_12px_40px_rgba(58,56,53,0.12)]">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-[#84492C]/20 border-t-[#84492C]" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#84492C]">Loading...</span>
          </div>
        </div>
      )}

      {/* ปุ่มเลือกสาขา */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            setViewMode("list")
          }
          setIsOpen(!isOpen)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current branch: ${selectedBranch.branch_name}. Click to change branch.`}
        className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium tracking-[0.18em] sm:tracking-[0.22em] uppercase transition-colors duration-300 touch-manipulation select-none py-1.5 px-2 rounded-sm hover:bg-[#F0EFEB]/60 ${
          isLightPage ? 'text-[#8C8A86] hover:text-[#3A3835]' : 'text-white/80 hover:text-white'
        } ${isOpen ? 'text-[#84492C] font-semibold bg-[#F0EFEB]/80' : ''}`}
      >
        <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${isOpen ? 'text-[#84492C]' : 'text-[#8C8A86]'}`} />
        <span className="truncate max-w-[130px] sm:max-w-[240px]">
          {selectedBranch.branch_name}
        </span>
        <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 🌟 Dropdown Menu เรนเดอร์ผ่าน Portal เพื่อไม่ให้โดนตัดขอบจาก overflow ของ parent ใดๆ */}
      {mounted && isOpen && createPortal(
        isMobile ? (
          /* Mobile Bottom Sheet */
          <div className="fixed inset-0 z-[99998] flex flex-col justify-end">
            {/* Backdrop ปิดเมนูเมื่อแตะข้างนอก */}
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Drawer */}
            <div
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Select Location"
              className="relative z-[99999] bg-[#FDFCFB] rounded-t-2xl border-t border-[#E5E5E5] shadow-2xl pb-6 max-h-[88vh] flex flex-col transition-all duration-200 overflow-hidden"
            >
              {/* แถบลากด้านบน */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-[#D5D2CA] rounded-full" />
              </div>

              {/* ส่วนหัว Drawer พร้อมตัวสลับ Mini Map / List */}
              <div className="flex items-center justify-between px-4 pb-2.5 pt-1 border-b border-[#F0EFEB]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-4 h-4 text-[#84492C] shrink-0" />
                  <span className="text-[11px] uppercase tracking-[0.22em] text-[#3A3835] font-semibold truncate">
                    SELECT LOCATION
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-sm bg-[#EDE8E1] p-0.5 border border-[#D5D2CA]/60 text-[9px] tracking-wider">
                    <button
                      type="button"
                      onClick={() => setViewMode("map")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                        viewMode === "map"
                          ? "bg-[#FAF8F5] text-[#84492C] font-semibold shadow-xs"
                          : "text-[#6F6861] hover:text-[#3A3835]"
                      }`}
                    >
                      <Compass className="w-3 h-3" />
                      <span>MAP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                        viewMode === "list"
                          ? "bg-[#FAF8F5] text-[#84492C] font-semibold shadow-xs"
                          : "text-[#6F6861] hover:text-[#3A3835]"
                      }`}
                    >
                      <List className="w-3 h-3" />
                      <span>LIST</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-[#8C8A86] hover:text-[#3A3835] active:scale-95 transition-transform"
                    aria-label="Close branch selector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* เนื้อหา Drawer: สลับได้ระหว่าง Mini Map และ List */}
              {viewMode === "map" ? (
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <BranchMiniMap
                    branches={branches}
                    selectedBranchId={selectedBranch.id}
                    onSelectBranch={handleSelect}
                    onOpenExpandModal={() => {
                      setIsOpen(false)
                      setIsExpandModalOpen(true)
                    }}
                    isMobile={true}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain py-2 divide-y divide-[#F0EFEB]/80">
                  {/* All option */}
                  <button
                    type="button"
                    onClick={() => handleSelect("all")}
                    className={`w-full text-left px-5 py-3 text-[12px] uppercase tracking-[0.16em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] ${
                      selectedBranch.id === "all"
                        ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                        : "text-[#3A3835] hover:bg-[#F9F8F6]"
                    }`}
                  >
                    <span className="font-medium">ALL LOCATIONS</span>
                    {selectedBranch.id === "all" && <Check className="w-4 h-4 text-[#84492C]" />}
                  </button>

                  {/* Showrooms */}
                  {categorizedBranches.showrooms.length > 0 && (
                    <div className="pt-2">
                      <div className="px-5 py-1 text-[9px] uppercase tracking-[0.2em] font-semibold text-[#84492C] bg-[#FAF8F5]">
                        SHOWROOMS ({categorizedBranches.showrooms.length})
                      </div>
                      {categorizedBranches.showrooms.map((b) => {
                        const isActive = selectedBranch.id.toString() === b.id.toString()
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelect(b.id)}
                            className={`w-full text-left px-5 py-2.5 text-[11.5px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] ${
                              isActive
                                ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                                : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]"
                            }`}
                          >
                            <span>{b.branch_name.trim()}</span>
                            {isActive && <Check className="w-4 h-4 text-[#84492C] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Warehouses */}
                  {categorizedBranches.warehouses.length > 0 && (
                    <div className="pt-2">
                      <div className="px-5 py-1 text-[9px] uppercase tracking-[0.2em] font-semibold text-[#6F6861] bg-[#FAF8F5]">
                        WAREHOUSES ({categorizedBranches.warehouses.length})
                      </div>
                      {categorizedBranches.warehouses.map((b) => {
                        const isActive = selectedBranch.id.toString() === b.id.toString()
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelect(b.id)}
                            className={`w-full text-left px-5 py-2.5 text-[11.5px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] ${
                              isActive
                                ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                                : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]"
                            }`}
                          >
                            <span>{b.branch_name.trim()}</span>
                            {isActive && <Check className="w-4 h-4 text-[#84492C] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Events */}
                  {categorizedBranches.events.length > 0 && (
                    <div className="pt-2">
                      <div className="px-5 py-1 text-[9px] uppercase tracking-[0.2em] font-semibold text-[#84492C] bg-[#FAF8F5]">
                        SPECIAL EVENTS & POP-UPS
                      </div>
                      {categorizedBranches.events.map((b) => {
                        const isActive = selectedBranch.id.toString() === b.id.toString()
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelect(b.id)}
                            className={`w-full text-left px-5 py-2.5 text-[11.5px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] ${
                              isActive
                                ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                                : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]"
                            }`}
                          >
                            <span>{b.branch_name.trim()}</span>
                            {isActive && <Check className="w-4 h-4 text-[#84492C] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Desktop Floating Dropdown Menu */
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Select Location"
            style={{
              position: "fixed",
              top: `${coords?.top ?? 0}px`,
              right: `${coords?.right ?? 16}px`,
              zIndex: 99999,
            }}
            className={`bg-[#FDFCFB] border border-[#E5E5E5] shadow-[0_16px_48px_-10px_rgba(0,0,0,0.18)] origin-top-right transition-all duration-200 overflow-hidden rounded-md ${
              viewMode === "map" ? "w-[520px] sm:w-[580px] md:w-[620px]" : "w-max min-w-[340px] max-w-[440px]"
            }`}
          >
            {/* ส่วนหัว Dropdown พร้อมตัวสลับ Mini Map / List */}
            <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-[#F0EFEB] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#84492C] shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#3A3835] font-semibold truncate">
                  SELECT LOCATION
                </span>
                <span className="text-[9px] text-[#A8A29E] font-normal lowercase tracking-normal shrink-0">
                  ({options.length})
                </span>
              </div>

              {/* View Switcher: MINI MAP vs LIST */}
              <div className="flex items-center bg-[#EDE8E1] p-0.5 rounded border border-[#D5D2CA]/60 text-[9px] tracking-wider shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                    viewMode === "map"
                      ? "bg-[#FAF8F5] text-[#84492C] font-semibold shadow-xs"
                      : "text-[#6F6861] hover:text-[#3A3835]"
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>MINI MAP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xs transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#FAF8F5] text-[#84492C] font-semibold shadow-xs"
                      : "text-[#6F6861] hover:text-[#3A3835]"
                  }`}
                >
                  <List className="w-3 h-3" />
                  <span>LIST</span>
                </button>
              </div>
            </div>

            {/* เนื้อหา Dropdown: สลับได้ระหว่าง Mini Map และ List */}
            {viewMode === "map" ? (
              <BranchMiniMap
                branches={branches}
                selectedBranchId={selectedBranch.id}
                onSelectBranch={handleSelect}
                onOpenExpandModal={() => {
                  setIsOpen(false)
                  setIsExpandModalOpen(true)
                }}
              />
            ) : (
              <div className="flex flex-col py-1.5 max-h-[380px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent] divide-y divide-[#F0EFEB]/80">
                {/* All option */}
                <button
                  type="button"
                  onClick={() => handleSelect("all")}
                  className={`w-full text-left px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors flex items-center justify-between group cursor-pointer ${
                    selectedBranch.id === "all"
                      ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                      : "text-[#3A3835] hover:bg-[#F9F8F6]"
                  }`}
                >
                  <span className="font-medium">ALL LOCATIONS</span>
                  {selectedBranch.id === "all" && <Check className="w-4 h-4 text-[#84492C]" />}
                </button>

                {/* Showrooms */}
                {categorizedBranches.showrooms.length > 0 && (
                  <div className="pt-2">
                    <div className="px-5 py-1 text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#84492C] bg-[#FAF8F5]">
                      SHOWROOMS ({categorizedBranches.showrooms.length})
                    </div>
                    {categorizedBranches.showrooms.map((b) => {
                      const isActive = selectedBranch.id.toString() === b.id.toString()
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelect(b.id)}
                          className={`w-full text-left px-5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between group cursor-pointer ${
                            isActive
                              ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                              : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#292524]"
                          }`}
                        >
                          <span>{b.branch_name.trim()}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Warehouses */}
                {categorizedBranches.warehouses.length > 0 && (
                  <div className="pt-2">
                    <div className="px-5 py-1 text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#6F6861] bg-[#FAF8F5]">
                      WAREHOUSES ({categorizedBranches.warehouses.length})
                    </div>
                    {categorizedBranches.warehouses.map((b) => {
                      const isActive = selectedBranch.id.toString() === b.id.toString()
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelect(b.id)}
                          className={`w-full text-left px-5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between group cursor-pointer ${
                            isActive
                              ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                              : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#292524]"
                          }`}
                        >
                          <span>{b.branch_name.trim()}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Events */}
                {categorizedBranches.events.length > 0 && (
                  <div className="pt-2">
                    <div className="px-5 py-1 text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#84492C] bg-[#FAF8F5]">
                      SPECIAL EVENTS & POP-UPS
                    </div>
                    {categorizedBranches.events.map((b) => {
                      const isActive = selectedBranch.id.toString() === b.id.toString()
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelect(b.id)}
                          className={`w-full text-left px-5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between group cursor-pointer ${
                            isActive
                              ? "text-[#84492C] font-semibold bg-[#F9F8F6]"
                              : "text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#292524]"
                          }`}
                        >
                          <span>{b.branch_name.trim()}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        document.body
      )}

      {/* 🌟 3. FULL-SCREEN LUXURY STUDIO MAP MODAL (เปิดเต็มจอแยกอิสระ ไม่ชนกับ Dropdown) */}
      {isExpandModalOpen && (
        <BranchModal
          branches={branches}
          selectedBranchId={selectedBranch.id}
          onSelectBranch={handleSelect}
          onClose={() => setIsExpandModalOpen(false)}
        />
      )}
    </>
  )
}
