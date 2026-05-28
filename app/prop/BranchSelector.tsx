// app/prop/BranchSelector.tsx
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

export default function BranchSelector({ branches }: { branches: Branch[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // อ่านค่า branch จาก URL ถ้าไม่มีให้ถือว่าเป็น "all"
  const currentBranchId = searchParams.get("branch") || "all"

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 💡 สร้างตัวเลือก "All Locations"
  const allOption: Branch = {
    id: "all",
    branch_code: "ALL",
    branch_name: "All",
  }

  // รวม All เข้าไปกับสาขาที่ดึงมาจาก DB
  const options = [allOption, ...branches]
  
  // หาสาขาที่ถูกเลือกอยู่ปัจจุบัน
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

  // ฟังก์ชันตอนกดเลือกสาขา ให้เปลี่ยน URL (เช่น /prop?branch=1)
  const handleSelect = (branchId: string | number) => {
    setIsOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    
    if (branchId === "all") {
      params.delete("branch") // ถ้าเลือก All ให้ลบ param ออกเพื่อให้ URL สะอาด
    } else {
      params.set("branch", branchId.toString())
    }
    
    // อัปเดต URL โดยไม่เปลี่ยนหน้า (scroll: false เพื่อไม่ให้หน้าเด้งกลับไปบนสุด)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  if (branches.length === 0) return null

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[10px] font-medium tracking-[0.2em] text-[#8C8A86] hover:text-[#C8A97E] transition-colors uppercase"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate max-w-[120px]">{selectedBranch.branch_name}</span>
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute top-full right-0 mt-6 w-56 bg-white border border-[#E5E5E5] shadow-2xl transition-all duration-300 origin-top-right z-[100] ${
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="px-5 py-3 text-[9px] uppercase tracking-[0.3em] text-[#C8A97E] font-medium border-b border-[#F9F8F6] bg-[#F9F8F6]/50">
          Select Location
        </div>
        <div className="max-h-[40vh] overflow-y-auto py-1">
          {options.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelect(branch.id)}
              className={`w-full text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center justify-between ${
                selectedBranch.id.toString() === branch.id.toString()
                  ? 'bg-[#F9F8F6] text-[#C8A97E] font-medium'
                  : 'text-[#8C8A86] hover:bg-[#F9F8F6] hover:text-[#2C2A26]'
              }`}
            >
              {branch.branch_name}
              {selectedBranch.id.toString() === branch.id.toString() && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8A97E]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}