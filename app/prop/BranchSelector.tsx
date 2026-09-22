"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPortal } from "react-dom"
import { MapPin, ChevronDown, X, Check } from "lucide-react"

interface Branch {
  id: string | number
  branch_code: string
  branch_name: string
  latitude?: number
  longitude?: number
}

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
  const selectedBranch = options.find((b) => b.id.toString() === currentBranchId) || allOption

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

      {/* 🌟 ปุ่มเลือกสาขา */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current branch: ${selectedBranch.branch_name}. Click to change branch.`}
        className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium tracking-[0.18em] sm:tracking-[0.22em] uppercase transition-colors duration-300 touch-manipulation select-none py-1.5 px-2 rounded-sm hover:bg-[#F0EFEB]/60 ${
          isLightPage ? 'text-[#8C8A86] hover:text-[#3A3835]' : 'text-white/80 hover:text-white'
        } ${isOpen ? 'text-[#84492C] font-semibold bg-[#F0EFEB]/80' : ''}`}
      >
        <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${isOpen ? 'text-[#84492C]' : 'text-[#8C8A86]'}`} />
        <span className="truncate max-w-[100px] sm:max-w-[160px]">
          {selectedBranch.branch_name}
        </span>
        <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 🌟 Dropdown Menu เรนเดอร์ผ่าน Portal เพื่อไม่ให้โดนตัดขอบจาก overflow ของ parent ใดๆ */}
      {mounted && isOpen && createPortal(
        isMobile ? (
          /* 📱 Mobile Bottom Sheet */
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
              className="relative z-[99999] bg-[#FDFCFB] rounded-t-2xl border-t border-[#E5E5E5] shadow-2xl pb-8 max-h-[85vh] flex flex-col transition-all duration-200"
            >
              {/* แถบลากด้านบน */}
              <div className="pt-3 pb-2 flex justify-center">
                <div className="w-10 h-1 bg-[#D5D2CA] rounded-full" />
              </div>

              {/* ส่วนหัว Drawer */}
              <div className="flex items-center justify-between px-6 pb-3 border-b border-[#F0EFEB]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C8A97E]" />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium">
                    Select Location / สาขา
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 -mr-1.5 text-[#8C8A86] hover:text-[#3A3835] active:scale-95 transition-transform"
                  aria-label="Close branch selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* รายการสาขาทั้งหมด เลื่อนดูได้ง่ายด้วยนิ้วโป้ง */}
              <div className="flex-1 overflow-y-auto overscroll-contain py-2 divide-y divide-[#F0EFEB]/80">
                {options.map((branch) => {
                  const isActive = selectedBranch.id.toString() === branch.id.toString()
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleSelect(branch.id)}
                      className={`w-full text-left px-6 py-3.5 text-[12px] uppercase tracking-[0.16em] transition-colors flex items-center justify-between active:bg-[#F4F1EA] ${
                        isActive
                          ? 'text-[#C8A97E] font-semibold bg-[#F9F8F6]'
                          : 'text-[#5C5854] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
                      }`}
                    >
                      <span className="truncate pr-3">{branch.branch_name}</span>
                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-[#C8A97E] shrink-0">
                          <span className="text-[9px] tracking-widest font-medium">SELECTED</span>
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full border border-[#D5D2CA] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* 💻 Desktop Floating Dropdown Menu */
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
            className="w-[260px] bg-[#FDFCFB] border border-[#E5E5E5] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.14)] origin-top-right transition-all duration-200"
          >
            <div className="px-5 py-3.5 text-[10px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium border-b border-[#F0EFEB] flex items-center justify-between">
              <span>Select Location</span>
              <span className="text-[9px] text-[#A8A29E] font-normal lowercase tracking-normal">
                ({options.length} locations)
              </span>
            </div>
            <div className="flex flex-col py-1.5 max-h-[360px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
              {options.map((branch) => {
                const isActive = selectedBranch.id.toString() === branch.id.toString()
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleSelect(branch.id)}
                    className={`w-full text-left px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors flex items-center justify-between group ${
                      isActive
                        ? 'text-[#C8A97E] font-medium bg-[#F9F8F6]'
                        : 'text-[#78716C] hover:bg-[#F9F8F6] hover:text-[#292524]'
                    }`}
                  >
                    <span className="truncate pr-2">{branch.branch_name}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E] shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ),
        document.body
      )}
    </>
  )
}
