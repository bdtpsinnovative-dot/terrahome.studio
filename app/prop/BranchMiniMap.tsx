"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation, Compass, Check, Maximize2 } from "lucide-react"
import {
  Branch,
  getCleanBranchName,
  getMapPinBranchName,
  getBranchType,
  getBranchTypeLabel,
  getBranchLocationHint,
} from "./branchUtils"

// Re-export for backward compatibility
export {
  getCleanBranchName,
  getMapPinBranchName,
  getBranchType,
  getBranchTypeLabel,
  getBranchLocationHint,
}
export type { Branch }

interface BranchMiniMapProps {
  branches: Branch[]
  selectedBranchId: string | number
  onSelectBranch: (branchId: string | number) => void
  onOpenExpandModal?: () => void
  isMobile?: boolean
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
  onOpenExpandModal,
  isMobile = false,
}: BranchMiniMapProps) {
  const validBranches = branches.filter(
    (b) => typeof b.latitude === "number" && typeof b.longitude === "number" && !isNaN(b.latitude) && !isNaN(b.longitude)
  )

  // 🌟 Smart Micro-Offset: Prevents pins at identical buildings from stacking!
  const processedBranches = validBranches.map((branch, i) => {
    let lat = branch.latitude!
    let lng = branch.longitude!
    for (let j = 0; j < i; j++) {
      const prev = validBranches[j]
      if (prev.latitude && prev.longitude) {
        const dLat = Math.abs(lat - prev.latitude)
        const dLng = Math.abs(lng - prev.longitude)
        if (dLat < 0.0018 && dLng < 0.0018) {
          lat += 0.0012
          lng += 0.0016
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

  const defaultCenter: [number, number] = initiallySelected
    ? [initiallySelected.displayLat, initiallySelected.displayLng]
    : [13.7466, 100.5681]

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  const handlePickBranch = (branch: Branch & { displayLat: number; displayLng: number }) => {
    setActiveBranch(branch)
    const key = `${branch.latitude},${branch.longitude}`
    setTimeout(() => {
      markerRefs.current[key]?.openPopup()
    }, 250)
  }

  const handleFitBangkok = () => {
    setActiveBranch(null)
    setFitBangkokTrigger((c) => c + 1)
  }

  const handleFitAllNationwide = () => {
    setActiveBranch(null)
    setFitAllTrigger((c) => c + 1)
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งครับ")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(coords)
        setActiveBranch({
          id: "user-loc",
          branch_code: "USER",
          branch_name: "ตำแหน่งปัจจุบันของคุณ",
          latitude: coords[0],
          longitude: coords[1],
          displayLat: coords[0],
          displayLng: coords[1],
        })
      },
      (err) => {
        console.warn("Geolocation warning:", err)
        alert("โปรดอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่งเพื่อใช้งานฟังก์ชันนี้นะครับ")
      },
      { enableHighAccuracy: true }
    )
  }

  // 📍 Luxury Teardrop Map Pin: High-DPI SVG with glowing terracotta when active
  const createTeardropIcon = (
    branch: Branch & { displayLat: number; displayLng: number },
    isFocused: boolean,
    isCurrent: boolean
  ) => {
    const pinLabel = getMapPinBranchName(branch.branch_name)
    const type = getBranchType(branch.branch_name)
    const pinColor = isFocused ? "#84492C" : isCurrent ? "#84492C" : "#FAF8F5"
    const strokeColor = isFocused ? "#FAF8F5" : "#84492C"
    const dotColor = isFocused || isCurrent ? "#FAF8F5" : type === "warehouse" ? "#6F6861" : "#84492C"
    const scale = isFocused ? "scale(1.18)" : isCurrent ? "scale(1.08)" : "scale(1)"
    const zIndex = isFocused ? 500 : isCurrent ? 350 : 30
    const iconPrefix = type === "warehouse" ? "📦" : type === "event" ? "🎪" : "🏬"

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
          <!-- 🏷️ Floating Branch Name Pill Badge (Always Visible!) -->
          <div style="
            position: absolute;
            bottom: 43px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isFocused ? "#84492C" : isCurrent ? "#84492C" : "rgba(253, 252, 251, 0.96)"};
            color: ${isFocused || isCurrent ? "#FFFFFF" : "#3A3835"};
            font-size: ${isFocused ? "10px" : "9.5px"};
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: ${isFocused ? "3px 9px" : "2px 8px"};
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: ${
              isFocused
                ? "0 4px 14px rgba(132, 73, 44, 0.45), 0 1px 3px rgba(0,0,0,0.2)"
                : "0 2px 8px rgba(58, 56, 53, 0.18), 0 1px 2px rgba(0,0,0,0.06)"
            };
            letter-spacing: 0.04em;
            pointer-events: none;
            border: 1px solid ${isFocused || isCurrent ? "rgba(255, 255, 255, 0.7)" : "rgba(132, 73, 44, 0.3)"};
            display: flex;
            align-items: center;
            gap: 4px;
            backdrop-filter: blur(4px);
            transition: all 0.2s ease;
          ">
            <span style="font-size: 10px; line-height: 1;">${iconPrefix}</span>
            <span>${pinLabel}</span>
          </div>

          <!-- 📍 Teardrop Pin SVG -->
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" style="filter: drop-shadow(0 4px 10px rgba(58,56,53,${isFocused ? "0.45" : "0.22"}));">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${pinColor}" stroke="${strokeColor}" stroke-width="2" />
            <circle cx="16" cy="15" r="5" fill="${dotColor}" />
          </svg>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -68],
    })
  }

  const userMarkerIcon = L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="width: 14px; height: 14px; background-color: #84492C; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(132,73,44,0.4); position: relative;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #84492C; opacity: 0.35; transform: scale(2);"></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })

  return (
    <div className="flex flex-col w-full font-sans select-none">
      {/* 🗺️ Mini Map Display Container */}
      <div className={`relative w-full ${isMobile ? "h-[270px]" : "h-[330px]"} rounded-md overflow-hidden border border-[#D5D2CA]/80 bg-[#EAE7E0]`}>
        <MapContainer
          center={defaultCenter}
          zoom={12.5}
          scrollWheelZoom={false}
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

        {/* 🧭 ปุ่มควบคุมด่วนบน Mini Map พร้อมปุ่ม [ ⛶ ขยายเต็มจอ ] */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col items-end gap-1.5">
          {/* 🌟 ปุ่มขยายแผนที่เต็มจอ (EXPAND FULLSCREEN MODAL) */}
          {onOpenExpandModal && (
            <button
              type="button"
              onClick={onOpenExpandModal}
              title="ขยายแผนที่เต็มจอ (Expand Fullscreen Map)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white rounded-md shadow-md text-[10px] uppercase font-medium tracking-wider transition-all cursor-pointer active:scale-95 border border-white/30"
            >
              <Maximize2 className="w-3.5 h-3.5 text-white" />
              <span className="font-semibold">ขยายแผนที่ (EXPAND)</span>
            </button>
          )}

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

      {/* 🏷️ แถบเลื่อนชิปสาขาแนวนอนด้านล่างแผนที่ */}
      <div className="py-2.5 px-0.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => {
            setActiveBranch(null)
            handleFitBangkok()
          }}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer border whitespace-nowrap ${
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
              onClick={() => handlePickBranch(b)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full transition-all cursor-pointer border whitespace-nowrap ${
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

      {/* 📌 แถบล่าง: แสดงสถานะสาขาที่กำลังดู + ปุ่มเลือกเพื่อกรองสินค้า */}
      <div className="pt-2 pb-1 px-1 border-t border-[#D5D2CA]/60 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[9px] uppercase tracking-wider text-[#8C8A86] truncate">
            {activeBranch ? getBranchTypeLabel(activeBranch.branch_name) : "มุมมองภาพรวมทุกพื้นที่"}
          </span>
          <span className="text-[11px] font-medium text-[#3A3835] truncate">
            {activeBranch ? activeBranch.branch_name : "แสดงสินค้าทุกสาขา (ALL LOCATIONS)"}
          </span>
        </div>

        {activeBranch ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.latitude},${activeBranch.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Google Maps"
              className="p-1.5 border border-[#D5D2CA] text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/40 rounded transition-colors bg-white cursor-pointer shadow-xs text-[10px] flex items-center justify-center"
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onSelectBranch(activeBranch.id)}
              className="px-3.5 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10.5px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เลือก {getCleanBranchName(activeBranch.branch_name)}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSelectBranch("all")}
            className="px-3.5 py-1.5 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[10.5px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>เลือกดูทุกสาขา</span>
          </button>
        )}
      </div>
    </div>
  )
}
