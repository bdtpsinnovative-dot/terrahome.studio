"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation, Compass, Check, Maximize2, X, ChevronDown, MapPin } from "lucide-react"

export interface Branch {
  id: string | number
  branch_code: string
  branch_name: string
  latitude?: number
  longitude?: number
}

interface BranchMiniMapProps {
  branches: Branch[]
  selectedBranchId: string | number
  onSelectBranch: (branchId: string | number) => void
  isMobile?: boolean
}

export function getCleanBranchName(name: string): string {
  if (!name) return "TERRA BRANCH"
  return name
    .replace(/^SHOWROOM\s+TERRA\s+/i, "")
    .replace(/^SHOWROOM\s+/i, "")
    .replace(/^EVENT\s+FIND\s+-\s+/i, "")
    .replace(/^WAREHOUSE\s+/i, "WH: ")
    .trim()
}

export function getBranchType(branchName: string): "showroom" | "warehouse" | "event" {
  const lower = (branchName || "").toLowerCase()
  if (lower.includes("warehouse") || lower.includes("คลัง")) return "warehouse"
  if (lower.includes("event") || lower.includes("find")) return "event"
  return "showroom"
}

export function getBranchTypeLabel(branchName: string): string {
  const type = getBranchType(branchName)
  if (type === "warehouse") return "คลังสินค้า • WAREHOUSE"
  if (type === "event") return "อีเวนต์พิเศษ • EVENT"
  return "โชว์รูม • SHOWROOM"
}

export function getBranchLocationHint(branchName: string): string {
  const lower = (branchName || "").toLowerCase()
  if (lower.includes("sukhumvit")) return "สุขุมวิท 26 • กรุงเทพฯ"
  if (lower.includes("central world") || lower.includes("sesia")) return "เซ็นทรัลเวิลด์ • กรุงเทพฯ"
  if (lower.includes("pradit") || lower.includes("manutham")) return "เลียบด่วนรามอินทรา • กรุงเทพฯ"
  if (lower.includes("ladprao")) return "ลาดพร้าว • กรุงเทพฯ"
  if (lower.includes("kaset")) return "เกษตร-นวมินทร์ • กรุงเทพฯ"
  if (lower.includes("phuket")) return "เมืองภูเก็ต • ภาคใต้"
  if (lower.includes("ayutthaya")) return "พระนครศรีอยุธยา"
  if (lower.includes("nonthaburi")) return "บางบัวทอง • นนทบุรี"
  if (lower.includes("bangkok")) return "บางซื่อ • กรุงเทพฯ"
  if (lower.includes("find")) return "ศูนย์ฯ สิริกิติ์ • กรุงเทพฯ"
  return "กรุงเทพมหานคร"
}

function MiniMapController({
  activeBranch,
  branches,
  fitBangkokTrigger,
  fitAllTrigger,
}: {
  activeBranch: (Branch & { displayLat: number; displayLng: number }) | null
  branches: (Branch & { displayLat: number; displayLng: number })[]
  fitBangkokTrigger: number
  fitAllTrigger: number
}) {
  const map = useMap()

  // Invalidate map size on mount and animation completion
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])

  // Fly to active branch with street-level luxury zoom
  useEffect(() => {
    if (activeBranch && activeBranch.displayLat && activeBranch.displayLng) {
      map.flyTo([activeBranch.displayLat, activeBranch.displayLng], 15.5, { duration: 0.9 })
    }
  }, [activeBranch, map])

  // Fit Bangkok area (focused view avoiding nationwide collapse)
  useEffect(() => {
    if (fitBangkokTrigger > 0 && branches.length > 0) {
      const bkkBranches = branches.filter(
        (b) => b.latitude && b.latitude > 13.5 && b.latitude < 14.0 // Focused Bangkok metropolitan showroom hub
      )
      const target = bkkBranches.length > 0 ? bkkBranches : branches
      const bounds = L.latLngBounds(target.map((b) => [b.displayLat, b.displayLng]))
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13.5 })
      }
    }
  }, [fitBangkokTrigger, branches, map])

  // Fit all branches nationwide
  useEffect(() => {
    if (fitAllTrigger > 0 && branches.length > 0) {
      const bounds = L.latLngBounds(branches.map((b) => [b.displayLat, b.displayLng]))
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12.5 })
      }
    }
  }, [fitAllTrigger, branches, map])

  return null
}

export default function BranchMiniMap({
  branches,
  selectedBranchId,
  onSelectBranch,
  isMobile = false,
}: BranchMiniMapProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalDropdownOpen, setIsModalDropdownOpen] = useState(false)

  const validBranches = branches.filter(
    (b) => typeof b.latitude === "number" && typeof b.longitude === "number" && !isNaN(b.latitude) && !isNaN(b.longitude)
  )

  // 🌟 Smart Micro-Offset: Prevents pins at identical buildings (e.g. Pradit Manutham & Wooden Ladprao) from stacking!
  const processedBranches = validBranches.map((branch, i) => {
    let lat = branch.latitude!
    let lng = branch.longitude!
    for (let j = 0; j < i; j++) {
      const prev = validBranches[j]
      if (prev.latitude && prev.longitude) {
        const dLat = Math.abs(lat - prev.latitude)
        const dLng = Math.abs(lng - prev.longitude)
        if (dLat < 0.0006 && dLng < 0.0006) {
          lat += 0.0004
          lng += 0.0005
          break
        }
      }
    }
    return { ...branch, displayLat: lat, displayLng: lng }
  })

  const initiallySelected = processedBranches.find((b) => b.id.toString() === selectedBranchId.toString()) || null
  const [activeBranch, setActiveBranch] = useState<(Branch & { displayLat: number; displayLng: number }) | null>(
    () => initiallySelected
  )
  const [fitBangkokTrigger, setFitBangkokTrigger] = useState<number>(() => (initiallySelected ? 0 : 1))
  const [fitAllTrigger, setFitAllTrigger] = useState<number>(0)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({})
  const modalMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({})
  const modalDropdownRef = useRef<HTMLDivElement>(null)

  // Handle ESC key for modal and lock body scroll
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden"
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsModalOpen(false)
      }
      window.addEventListener("keydown", handleKeyDown)
      return () => {
        document.body.style.overflow = "unset"
        window.removeEventListener("keydown", handleKeyDown)
      }
    } else {
      document.body.style.overflow = "unset"
    }
  }, [isModalOpen])

  // Close modal dropdown on outside click
  useEffect(() => {
    if (!isModalDropdownOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (modalDropdownRef.current && !modalDropdownRef.current.contains(e.target as Node)) {
        setIsModalDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isModalDropdownOpen])

  const defaultCenter: [number, number] = initiallySelected
    ? [initiallySelected.displayLat, initiallySelected.displayLng]
    : [13.7466, 100.5681] // Center around Sukhumvit / Siam Bangkok

  // Standard OpenStreetMap tiles - 100% free with NO "API KEY REQUIRED" watermark
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  const handlePickBranch = (branch: Branch & { displayLat: number; displayLng: number }, isModal = false) => {
    setActiveBranch(branch)
    const key = `${branch.latitude},${branch.longitude}`
    setTimeout(() => {
      if (isModal) {
        modalMarkerRefs.current[key]?.openPopup()
      } else {
        markerRefs.current[key]?.openPopup()
      }
    }, 250)
  }

  const handleFitBangkok = () => {
    setActiveBranch(null)
    setFitBangkokTrigger((prev) => prev + 1)
  }

  const handleFitAllNationwide = () => {
    setActiveBranch(null)
    setFitAllTrigger((prev) => prev + 1)
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ไม่รองรับการระบุพิกัดครับ")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setActiveBranch(null)
      },
      (err) => {
        console.warn("Geolocation failed:", err)
        alert("ไม่สามารถระบุพิกัดได้ โปรดอนุญาตสิทธิ์เข้าถึงตำแหน่งในเบราว์เซอร์ครับ")
      },
      { enableHighAccuracy: true }
    )
  }

  const handleSelectAndCloseModal = (branchId: string | number) => {
    setIsModalOpen(false)
    onSelectBranch(branchId)
  }

  // 📍 Luxury Teardrop Map Pin: High-DPI SVG with glowing terracotta when active
  const createTeardropIcon = (
    branch: Branch & { displayLat: number; displayLng: number },
    isFocused: boolean,
    isCurrent: boolean
  ) => {
    const clean = getCleanBranchName(branch.branch_name)
    const type = getBranchType(branch.branch_name)
    const pinColor = isFocused ? "#84492C" : isCurrent ? "#84492C" : "#FAF8F5"
    const strokeColor = isFocused ? "#FAF8F5" : "#84492C"
    const dotColor = isFocused || isCurrent ? "#FAF8F5" : type === "warehouse" ? "#6F6861" : "#84492C"
    const scale = isFocused ? "scale(1.22)" : isCurrent ? "scale(1.12)" : "scale(1)"
    const zIndex = isFocused ? 300 : isCurrent ? 200 : 20

    return L.divIcon({
      className: "bg-transparent border-none",
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 40px;
          transform: translate(-50%, -100%) ${scale};
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          z-index: ${zIndex};
        ">
          <!-- Teardrop Pin SVG -->
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" style="filter: drop-shadow(0 4px 10px rgba(58,56,53,${isFocused ? "0.4" : "0.2"}));">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${pinColor}" stroke="${strokeColor}" stroke-width="2" />
            <circle cx="16" cy="15" r="5" fill="${dotColor}" />
          </svg>

          <!-- Floating Label: Only shown when selected/focused to eliminate overlapping clutter! -->
          ${
            isFocused || isCurrent
              ? `
              <div style="
                position: absolute;
                bottom: 44px;
                left: 50%;
                transform: translateX(-50%);
                background: ${isFocused ? "#84492C" : "#3A3835"};
                color: #FFFFFF;
                font-size: 10.5px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 3px 9px;
                border-radius: 6px;
                white-space: nowrap;
                box-shadow: 0 4px 14px rgba(0,0,0,0.28);
                letter-spacing: 0.04em;
                pointer-events: none;
                border: 1px solid rgba(255,255,255,0.3);
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span>${clean}</span>
              </div>
            `
              : ""
          }
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -42],
    })
  }

  const userMarkerIcon = L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="width: 14px; height: 14px; background-color: #84492C; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(132,73,44,0.5); position: relative; transform: translate(-50%, -50%);">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #84492C; opacity: 0.35; transform: scale(2);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -10],
  })

  return (
    <div className="flex flex-col w-full bg-[#FAF8F5]">
      {/* 🗺️ 1. Interactive Mini Map View (ขนาดใหญ่ขึ้น กว้างสบายตา) */}
      <div
        className={`relative w-full ${isMobile ? "h-[320px]" : "h-[330px]"} bg-[#EAE7E0] overflow-hidden border-b border-[#D5D2CA]/60`}
        style={{
          filter: "contrast(0.97) brightness(1.01)",
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={12.5}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full z-0 font-sans"
        >
          <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />
          <ZoomControl position="bottomright" />

          <MiniMapController
            activeBranch={activeBranch}
            branches={processedBranches}
            fitBangkokTrigger={fitBangkokTrigger}
            fitAllTrigger={fitAllTrigger}
          />

          {processedBranches.map((branch) => {
            const key = `${branch.latitude},${branch.longitude}`
            const isFocused = activeBranch?.id === branch.id
            const isCurrent = branch.id.toString() === selectedBranchId.toString()

            return (
              <Marker
                key={branch.id}
                ref={(ref) => {
                  if (ref) markerRefs.current[key] = ref
                }}
                position={[branch.displayLat, branch.displayLng]}
                icon={createTeardropIcon(branch, isFocused, isCurrent)}
                eventHandlers={{
                  click: () => setActiveBranch(branch),
                }}
              >
                <Popup className="terra-luxury-popup font-sans border-none">
                  <div className="flex flex-col items-center text-center p-0.5 min-w-[180px] max-w-[220px]">
                    <span className="text-[8px] uppercase tracking-[0.25em] text-[#84492C] font-semibold mb-0.5">
                      {getBranchTypeLabel(branch.branch_name)}
                    </span>
                    <p className="font-serif text-[#3A3835] mb-1 text-[13px] uppercase tracking-[0.05em] font-medium leading-snug">
                      {branch.branch_name}
                    </p>
                    <span className="text-[9.5px] text-[#8C8A86] mb-2">
                      {getBranchLocationHint(branch.branch_name)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectBranch(branch.id)}
                      className="w-full mb-1.5 py-1.5 px-3 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>เลือกสาขานี้</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Google Maps"
                      className="w-full py-1 px-3 border border-[#D5D2CA] text-[#6F6861] hover:text-[#3A3835] text-[9.5px] uppercase font-medium tracking-[0.14em] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer bg-white"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>นำทาง (Google Maps)</span>
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {userLocation && (
            <Marker position={userLocation} icon={userMarkerIcon}>
              <Popup className="terra-luxury-popup font-sans border-none">
                <div className="text-center font-medium text-[11px] text-[#3A3835] px-2 py-1 tracking-wide">
                  📍 ตำแหน่งปัจจุบันของคุณ
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* 🧭 ปุ่มควบคุมด่วนบน Mini Map พร้อมปุ่ม [ ⛶ ขยายเต็มจอ ] ตามที่นายต้องการ! */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col items-end gap-1.5">
          {/* 🌟 ปุ่มขยายแผนที่เต็มจอ (EXPAND FULLSCREEN MODAL) */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="ขยายแผนที่เต็มจอ (Expand Fullscreen Map)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white rounded-md shadow-md text-[10px] uppercase font-medium tracking-wider transition-all cursor-pointer active:scale-95 border border-white/30"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
            <span className="font-semibold">ขยายแผนที่ (EXPAND)</span>
          </button>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleFitBangkok}
              title="โฟกัสสาขากรุงเทพฯ (Bangkok Hub)"
              className="px-2 py-1 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded shadow-xs text-[9px] font-semibold tracking-wider transition-colors cursor-pointer"
            >
              BKK
            </button>
            <button
              type="button"
              onClick={handleFitAllNationwide}
              title="แสดงทุกสาขาทั่วประเทศรวมภูเก็ต (All Nationwide)"
              className="w-7 h-7 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded shadow-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              title="ตำแหน่งของฉัน (Locate Me)"
              className="w-7 h-7 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded shadow-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 🏷️ 2. Quick Horizontal Branch Selector Chips (แยกหมวดหมู่ชัดเจน สบายตา) */}
      <div className="px-3 py-2 bg-[#F7F4EE] border-b border-[#D5D2CA]/60 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setActiveBranch(null)
              handleFitBangkok()
            }}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
              activeBranch === null && selectedBranchId === "all"
                ? "bg-[#84492C] text-white border-[#84492C] font-medium shadow-xs"
                : activeBranch === null
                ? "bg-[#EAE4D9] text-[#3A3835] border-[#D5D2CA] font-medium"
                : "bg-[#FAF8F5] text-[#6F6861] border-[#D5D2CA] hover:text-[#3A3835]"
            }`}
          >
            🌍 ทุกสาขา (ALL)
          </button>

          {processedBranches.map((branch) => {
            const isFocused = activeBranch?.id === branch.id
            const isCurrent = branch.id.toString() === selectedBranchId.toString()
            const clean = getCleanBranchName(branch.branch_name)
            const type = getBranchType(branch.branch_name)
            const iconPrefix = type === "warehouse" ? "📦" : type === "event" ? "🎪" : "🏬"

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handlePickBranch(branch)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                  isFocused
                    ? "bg-[#84492C] text-white border-[#84492C] font-medium shadow-xs"
                    : isCurrent
                    ? "bg-[#FAF8F5] text-[#84492C] border-[#84492C] font-semibold"
                    : "bg-[#FAF8F5] text-[#6F6861] border-[#D5D2CA] hover:border-[#84492C]/40 hover:text-[#3A3835]"
                }`}
              >
                {iconPrefix} {clean}
              </button>
            )
          })}
        </div>
      </div>

      {/* 🌟 3. Selected Branch Action Card */}
      <div className="p-3 bg-[#FAF8F5] flex flex-col gap-2">
        {activeBranch ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8.5px] uppercase tracking-[0.2em] font-semibold px-2 py-0.5 rounded-full bg-[#EAE4D9] text-[#84492C]">
                  {getBranchTypeLabel(activeBranch.branch_name)}
                </span>
                <span className="text-[10px] text-[#8C8A86] truncate">
                  {getBranchLocationHint(activeBranch.branch_name)}
                </span>
              </div>
              <p className="text-[12.5px] font-medium text-[#3A3835] truncate uppercase tracking-wide">
                {activeBranch.branch_name}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.latitude},${activeBranch.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Google Maps"
                className="p-2 border border-[#D5D2CA] text-[#6F6861] hover:text-[#84492C] hover:border-[#84492C]/40 rounded transition-colors bg-white cursor-pointer shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => onSelectBranch(activeBranch.id)}
                className="px-3.5 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10.5px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <Check className="w-3.5 h-3.5" />
                <span>เลือกสาขานี้</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#84492C] font-medium">
                มุมมองภาพรวมทุกพื้นที่
              </span>
              <p className="text-[12.5px] font-medium text-[#3A3835] truncate uppercase tracking-wide">
                แสดงสินค้าทุกสาขา (ALL LOCATIONS)
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectBranch("all")}
              className="px-3.5 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10.5px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เลือกดูทุกสาขา</span>
            </button>
          </div>
        )}
      </div>

      {/* 🌟 4. FULLSCREEN STUDIO MAP MODAL (เปิดเมื่อกดปุ่มขยายแผนที่) */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] max-h-[840px] bg-[#FAF8F5] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#D5D2CA] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 🏷️ Modal Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#D5D2CA]/70 bg-[#FAF8F5] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#84492C]/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#84492C]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-sm sm:text-base uppercase tracking-[0.18em] text-[#3A3835] font-medium truncate">
                      Terra Studio · Showroom Map & Locations
                    </h3>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-[#8C8A86] font-light truncate">
                      เลือกดูสาขาและแผนที่นำทาง ({validBranches.length} สาขา)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D5D2CA] bg-white hover:bg-[#FAF8F5] text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/50 text-[10px] uppercase tracking-[0.16em] font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#84492C]" />
                    <span>ตำแหน่งของฉัน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 rounded-full border border-[#D5D2CA] bg-white hover:bg-[#3A3835] text-[#3A3835] hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs"
                    aria-label="Close modal"
                    title="ปิด (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 🗺️ Modal Full-Bleed Map */}
              <div className="flex-1 relative w-full h-full min-h-0 bg-[#EAE7E0] overflow-hidden">
                {/* 📍 Top Floating Branch Dropdown inside Modal */}
                <div className="absolute top-3.5 left-3.5 right-3.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
                  <div ref={modalDropdownRef} className="relative pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setIsModalDropdownOpen(!isModalDropdownOpen)}
                      className="bg-[#FAF8F5]/95 hover:bg-[#FAF8F5] backdrop-blur-md border border-[#D5D2CA] text-[#3A3835] hover:border-[#84492C]/50 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-left transition-all duration-200 shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#84492C]/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#84492C]" />
                      </div>

                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-[7.5px] sm:text-[8px] uppercase tracking-[0.16em] text-[#8C8A86] font-medium leading-none mb-0.5">
                          เลือกสาขา
                        </span>
                        <span className="text-[10.5px] sm:text-[11.5px] uppercase tracking-[0.08em] font-medium text-[#3A3835] truncate max-w-[150px] sm:max-w-[220px] leading-tight">
                          {activeBranch ? activeBranch.branch_name : "แสดงทุกสาขา (ALL)"}
                        </span>
                      </div>

                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#8C8A86] transition-transform duration-200 shrink-0 ${
                          isModalDropdownOpen ? "rotate-180 text-[#84492C]" : ""
                        }`}
                      />
                    </button>

                    {/* Expanded Dropdown inside Modal */}
                    {isModalDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1.5 w-[280px] sm:w-[320px] bg-[#FAF8F5] border border-[#D5D2CA] rounded-xl shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-[1001]">
                        <div className="px-3.5 py-2 border-b border-[#D5D2CA]/60 bg-white/70 flex items-center justify-between">
                          <span className="text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#84492C]">
                            สาขาทั้งหมด ({processedBranches.length})
                          </span>
                          <span className="text-[8.5px] text-[#8C8A86] font-light">คลิกเพื่อดูหมุด</span>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto divide-y divide-[#D5D2CA]/40 [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBranch(null)
                              handleFitBangkok()
                              setIsModalDropdownOpen(false)
                            }}
                            className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                              activeBranch === null ? "bg-white text-[#84492C] font-semibold" : "hover:bg-white/80 text-[#3A3835]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {activeBranch === null ? (
                                <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-[#D5D2CA] shrink-0" />
                              )}
                              <span className="text-[11px] uppercase tracking-wide">🌍 ทุกสาขา (ALL LOCATIONS)</span>
                            </div>
                          </button>

                          {processedBranches.map((b) => {
                            const isSelected = activeBranch?.id === b.id
                            const clean = getCleanBranchName(b.branch_name)

                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  handlePickBranch(b, true)
                                  setIsModalDropdownOpen(false)
                                }}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected ? "bg-white text-[#84492C] font-semibold" : "hover:bg-white/80 text-[#3A3835]"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-full border border-[#D5D2CA] shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-[11px] uppercase tracking-[0.06em] font-medium truncate">
                                      {clean}
                                    </div>
                                    <div className="text-[8.5px] text-[#8C8A86] mt-0.5 truncate">
                                      {getBranchLocationHint(b.branch_name)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal MapContainer */}
                <MapContainer
                  center={defaultCenter}
                  zoom={13}
                  scrollWheelZoom={true}
                  zoomControl={false}
                  className="w-full h-full z-0 font-sans"
                >
                  <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />
                  <ZoomControl position="bottomright" />

                  <MiniMapController
                    activeBranch={activeBranch}
                    branches={processedBranches}
                    fitBangkokTrigger={fitBangkokTrigger}
                    fitAllTrigger={fitAllTrigger}
                  />

                  {processedBranches.map((branch) => {
                    const key = `${branch.latitude},${branch.longitude}`
                    const isFocused = activeBranch?.id === branch.id
                    const isCurrent = branch.id.toString() === selectedBranchId.toString()

                    return (
                      <Marker
                        key={branch.id}
                        ref={(ref) => {
                          if (ref) modalMarkerRefs.current[key] = ref
                        }}
                        position={[branch.displayLat, branch.displayLng]}
                        icon={createTeardropIcon(branch, isFocused, isCurrent)}
                        eventHandlers={{
                          click: () => setActiveBranch(branch),
                        }}
                      >
                        <Popup className="terra-luxury-popup font-sans border-none">
                          <div className="flex flex-col items-center text-center p-0.5 min-w-[180px] max-w-[220px]">
                            <span className="text-[8px] uppercase tracking-[0.25em] text-[#84492C] font-semibold mb-0.5">
                              {getBranchTypeLabel(branch.branch_name)}
                            </span>
                            <p className="font-serif text-[#3A3835] mb-1 text-[13px] uppercase tracking-[0.05em] font-medium leading-snug">
                              {branch.branch_name}
                            </p>
                            <span className="text-[9.5px] text-[#8C8A86] mb-2">
                              {getBranchLocationHint(branch.branch_name)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleSelectAndCloseModal(branch.id)}
                              className="w-full mb-1.5 py-1.5 px-3 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>เลือกสาขานี้</span>
                            </button>

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Google Maps"
                              className="w-full py-1 px-3 border border-[#D5D2CA] text-[#6F6861] hover:text-[#3A3835] text-[9.5px] uppercase font-medium tracking-[0.14em] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer bg-white"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              <span>นำทาง (Google Maps)</span>
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}

                  {userLocation && (
                    <Marker position={userLocation} icon={userMarkerIcon}>
                      <Popup className="terra-luxury-popup font-sans border-none">
                        <div className="text-center font-medium text-[11px] text-[#3A3835] px-2 py-1 tracking-wide">
                          📍 ตำแหน่งปัจจุบันของคุณ
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* 🏷️ Modal Bottom Bar: Branch Chips & Selection Action */}
              <div className="p-3 sm:p-4 bg-[#FAF8F5] border-t border-[#D5D2CA]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBranch(null)
                      handleFitBangkok()
                    }}
                    className={`px-3 py-1.5 text-[10.5px] uppercase tracking-wider rounded-full transition-all cursor-pointer border whitespace-nowrap ${
                      activeBranch === null
                        ? "bg-[#84492C] text-white border-[#84492C] font-medium shadow-xs"
                        : "bg-white text-[#6F6861] border-[#D5D2CA] hover:text-[#3A3835]"
                    }`}
                  >
                    🌍 ทุกสาขา (ALL)
                  </button>

                  {processedBranches.map((b) => {
                    const isFocused = activeBranch?.id === b.id
                    const clean = getCleanBranchName(b.branch_name)
                    const type = getBranchType(b.branch_name)
                    const iconPrefix = type === "warehouse" ? "📦" : type === "event" ? "🎪" : "🏬"

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handlePickBranch(b, true)}
                        className={`px-3 py-1.5 text-[10.5px] uppercase tracking-wider rounded-full transition-all cursor-pointer border whitespace-nowrap ${
                          isFocused
                            ? "bg-[#84492C] text-white border-[#84492C] font-medium shadow-xs"
                            : "bg-white text-[#6F6861] border-[#D5D2CA] hover:border-[#84492C]/40 hover:text-[#3A3835]"
                        }`}
                      >
                        {iconPrefix} {clean}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#D5D2CA]/40">
                  {activeBranch && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.latitude},${activeBranch.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Google Maps"
                      className="px-3.5 py-2 border border-[#D5D2CA] text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/40 rounded-lg transition-colors bg-white cursor-pointer shadow-xs text-[10px] uppercase font-medium tracking-wider flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>นำทาง</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectAndCloseModal(activeBranch ? activeBranch.id : "all")}
                    className="px-5 py-2 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[11px] uppercase font-medium tracking-[0.16em] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>{activeBranch ? `เลือก ${getCleanBranchName(activeBranch.branch_name)}` : "เลือกดูทุกสาขา"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
