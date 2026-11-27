"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation, Compass, Check, X, ChevronDown, MapPin, Maximize2 } from "lucide-react"
import {
  Branch,
  getCleanBranchName,
  getMapPinBranchName,
  getBranchType,
  getBranchTypeLabel,
  getBranchLocationHint,
} from "./branchUtils"

interface BranchModalProps {
  branches: Branch[]
  selectedBranchId: string | number
  onSelectBranch: (branchId: string | number) => void
  onClose: () => void
}

function ModalMapController({
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

  // Invalidate map size on mount and after modal animation completes
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    const t3 = setTimeout(() => map.invalidateSize(), 600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [map])

  // Fly to active branch with street-level luxury zoom
  useEffect(() => {
    if (activeBranch && activeBranch.displayLat && activeBranch.displayLng) {
      map.flyTo([activeBranch.displayLat, activeBranch.displayLng], 15.5, { duration: 0.9 })
    }
  }, [activeBranch, map])

  // Fit Bangkok metropolitan hub
  useEffect(() => {
    if (fitBangkokTrigger > 0 && branches.length > 0) {
      const bkkBranches = branches.filter(
        (b) => b.latitude && b.latitude > 13.5 && b.latitude < 14.0
      )
      const target = bkkBranches.length > 0 ? bkkBranches : branches
      const bounds = L.latLngBounds(target.map((b) => [b.displayLat, b.displayLng]))
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13.5 })
      }
    }
  }, [fitBangkokTrigger, branches, map])

  // Fit all branches nationwide
  useEffect(() => {
    if (fitAllTrigger > 0 && branches.length > 0) {
      const bounds = L.latLngBounds(branches.map((b) => [b.displayLat, b.displayLng]))
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12.5 })
      }
    }
  }, [fitAllTrigger, branches, map])

  return null
}

export default function BranchModal({
  branches,
  selectedBranchId,
  onSelectBranch,
  onClose,
}: BranchModalProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({})
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  const validBranches = branches.filter(
    (b) => typeof b.latitude === "number" && typeof b.longitude === "number" && !isNaN(b.latitude) && !isNaN(b.longitude)
  )

  // Smart Micro-Offset for co-located branches
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

  // ESC key to close modal and body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // Close internal dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isDropdownOpen])

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

  const handleSelectAndClose = (branchId: string | number) => {
    onClose()
    onSelectBranch(branchId)
  }

  // 📍 Luxury Teardrop Pin Icon with Floating Name Pill Badge
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

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] max-h-[840px] bg-[#FAF8F5] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#D5D2CA] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Terra Studio Fullscreen Map"
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
              onClick={onClose}
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
            <div ref={dropdownRef} className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                    isDropdownOpen ? "rotate-180 text-[#84492C]" : ""
                  }`}
                />
              </button>

              {/* Expanded Dropdown inside Modal */}
              {isDropdownOpen && (
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
                        setIsDropdownOpen(false)
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
                            handlePickBranch(b)
                            setIsDropdownOpen(false)
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

            {/* Quick Floating Map Action Buttons */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={handleFitBangkok}
                title="โฟกัสสาขากรุงเทพฯ (Bangkok Hub)"
                className="px-2.5 py-1.5 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded-lg shadow-sm text-[10px] font-semibold tracking-wider transition-colors cursor-pointer"
              >
                BKK
              </button>
              <button
                type="button"
                onClick={handleFitAllNationwide}
                title="แสดงทุกสาขาทั่วประเทศรวมภูเก็ต (All Nationwide)"
                className="w-8 h-8 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded-lg shadow-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLocateMe}
                title="ตำแหน่งของฉัน (Locate Me)"
                className="w-8 h-8 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded-lg shadow-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
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

            <ModalMapController
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
                        onClick={() => handleSelectAndClose(branch.id)}
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
                  onClick={() => handlePickBranch(b)}
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
              onClick={() => handleSelectAndClose(activeBranch ? activeBranch.id : "all")}
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
  )
}
