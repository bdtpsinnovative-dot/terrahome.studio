"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface Branch {
  id: string | number
  branch_code: string
  branch_name: string
  latitude?: number
  longitude?: number
}

// รับ isLightPage มาจาก Navbar เพื่อปรับสีตัวหนังสือให้เข้ากับหน้าเว็บ
export default function BranchSelector({ branches, isLightPage = true }: { branches: Branch[], isLightPage?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentBranchId = searchParams.get("branch") || "all"

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoading(false)
  }, [searchParams])

  const allOption: Branch = {
    id: "all",
    branch_code: "ALL",
    branch_name: "All",
  }

  const options = [allOption, ...branches]
  const selectedBranch = options.find(b => b.id.toString() === currentBranchId) || allOption

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (branchId: string | number) => {
    setIsOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (branchId === "all") {
      params.delete("branch")
    } else {
      params.set("branch", branchId.toString())
    }
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
      <div className="relative flex items-center" ref={dropdownRef}>
      {/* 🌟 ปุ่มหมุดปักพร้อมคำว่า ALL ชิดขวา */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[11px] font-medium tracking-[0.25em] uppercase transition-colors duration-300
          ${isLightPage ? 'text-[#8C8A86] hover:text-[#3A3835]' : 'text-white/80 hover:text-white'}
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <span className="truncate max-w-[150px]">{selectedBranch.branch_name}</span>
      </button>

      {/* 🌟 Dropdown Menu ดีไซน์ตามเรฟ (พื้นขาว, ตัวหนังสือทอง) */}
      <div 
        className={`absolute top-full right-0 mt-6 w-[240px] bg-[#FDFCFB] border border-[#E5E5E5] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 origin-top-right z-[100] ${
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium border-b border-[#F0EFEB]">
          Select Location
        </div>
        <div className="flex flex-col py-2">
          {options.map((branch) => {
            const isActive = selectedBranch.id.toString() === branch.id.toString()
            return (
              <button
                key={branch.id}
                onClick={() => handleSelect(branch.id)}
                className={`w-full text-left px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center justify-between group ${
                  isActive
                    ? 'text-[#C8A97E] font-medium bg-[#F9F8F6]/50'
                    : 'text-[#8C8A86] hover:bg-[#F9F8F6] hover:text-[#3A3835]'
                }`}
              >
                {branch.branch_name}
                {/* จุดกลมสีทองสำหรับสาขาที่ถูกเลือก */}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E]" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      </div>
    </>
  )
}
