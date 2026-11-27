"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Navigation, Compass, Check, Maximize2 } from "lucide-react"

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

function MiniMapController({
  activeBranch,
  branches,
  fitBangkokTrigger,
  fitAllTrigger,
}: {
  activeBranch: Branch | null
  branches: Branch[]
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

  // Fly to active branch
  useEffect(() => {
    if (activeBranch && activeBranch.latitude && activeBranch.longitude) {
      map.flyTo([activeBranch.latitude, activeBranch.longitude], 15.5, { duration: 0.9 })
    }
  }, [activeBranch, map])

  // Fit Bangkok area (focused view avoiding nationwide collapse)
  useEffect(() => {
    if (fitBangkokTrigger > 0 && branches.length > 0) {
      const bkkBranches = branches.filter(
        (b) => b.latitude && b.latitude > 12 && b.latitude < 15
      )
      const target = bkkBranches.length > 0 ? bkkBranches : branches
      const bounds = L.latLngBounds(target.map((b) => [b.latitude!, b.longitude!]))
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 })
      }
    }
  }, [fitBangkokTrigger, branches, map])

  // Fit all branches nationwide (including Phuket)
  useEffect(() => {
    if (fitAllTrigger > 0 && branches.length > 0) {
      const valid = branches.filter((b) => b.latitude && b.longitude)
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map((b) => [b.latitude!, b.longitude!]))
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [25, 25], maxZoom: 13 })
        }
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
  const validBranches = branches.filter(
    (b) => typeof b.latitude === "number" && typeof b.longitude === "number" && !isNaN(b.latitude) && !isNaN(b.longitude)
  )

  const initiallySelected = validBranches.find((b) => b.id.toString() === selectedBranchId.toString()) || null
  const [activeBranch, setActiveBranch] = useState<Branch | null>(() => initiallySelected)
  // Default to Bangkok fit if ALL is selected, so pins don't collapse into a tiny blob with Phuket
  const [fitBangkokTrigger, setFitBangkokTrigger] = useState<number>(() => (initiallySelected ? 0 : 1))
  const [fitAllTrigger, setFitAllTrigger] = useState<number>(0)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({})

  const defaultCenter: [number, number] = initiallySelected
    ? [initiallySelected.latitude!, initiallySelected.longitude!]
    : [13.7466, 100.5681] // Center around Sukhumvit / Central Bangkok

  // Standard OpenStreetMap tiles - 100% free with NO "API KEY REQUIRED" watermark
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  const handlePickBranch = (branch: Branch) => {
    setActiveBranch(branch)
    const key = `${branch.latitude},${branch.longitude}`
    setTimeout(() => {
      markerRefs.current[key]?.openPopup()
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

  // 📍 Luxury Teardrop Map Pin with dynamic label on focus/selection
  const createTeardropIcon = (branch: Branch, isFocused: boolean, isCurrent: boolean) => {
    const clean = getCleanBranchName(branch.branch_name)
    const pinColor = isFocused ? "#84492C" : isCurrent ? "#84492C" : "#FAF8F5"
    const strokeColor = isFocused ? "#FAF8F5" : "#84492C"
    const dotColor = isFocused || isCurrent ? "#FAF8F5" : "#84492C"
    const scale = isFocused ? "scale(1.18)" : isCurrent ? "scale(1.1)" : "scale(1)"
    const zIndex = isFocused ? 200 : isCurrent ? 150 : 10

    return L.divIcon({
      className: "bg-transparent border-none",
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 38px;
          transform: translate(-50%, -100%) ${scale};
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          z-index: ${zIndex};
        ">
          <!-- Teardrop Pin SVG -->
          <svg width="30" height="38" viewBox="0 0 30 38" fill="none" style="filter: drop-shadow(0 4px 8px rgba(58,56,53,0.3));">
            <path d="M15 0C6.716 0 0 6.716 0 15C0 26.25 15 38 15 38C15 38 30 26.25 30 15C30 6.716 23.284 0 15 0Z" fill="${pinColor}" stroke="${strokeColor}" stroke-width="1.8" />
            <circle cx="15" cy="14" r="5" fill="${dotColor}" />
          </svg>

          <!-- Floating Label: shows for active / current branch, and on hover -->
          ${
            isFocused || isCurrent
              ? `
              <div style="
                position: absolute;
                bottom: 42px;
                left: 50%;
                transform: translateX(-50%);
                background: ${isFocused ? "#84492C" : "#3A3835"};
                color: #FFFFFF;
                font-size: 10px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 2.5px 8px;
                border-radius: 4px;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                letter-spacing: 0.04em;
                pointer-events: none;
                border: 1px solid rgba(255,255,255,0.25);
              ">
                ${clean}
              </div>
            `
              : ""
          }
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -40],
    })
  }

  const userMarkerIcon = L.divIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="width: 14px; height: 14px; background-color: #84492C; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(132,73,44,0.4); position: relative; transform: translate(-50%, -50%);">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #84492C; opacity: 0.35; transform: scale(2);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -10],
  })

  return (
    <div className="flex flex-col w-full bg-[#FAF8F5]">
      {/* 🗺️ 1. Interactive Mini Map View */}
      <div className={`relative w-full ${isMobile ? "h-[280px]" : "h-[250px]"} bg-[#EAE7E0] overflow-hidden border-b border-[#D5D2CA]/60`}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full z-0 font-sans"
        >
          <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />
          <ZoomControl position="bottomright" />

          <MiniMapController
            activeBranch={activeBranch}
            branches={validBranches}
            fitBangkokTrigger={fitBangkokTrigger}
            fitAllTrigger={fitAllTrigger}
          />

          {validBranches.map((branch) => {
            const key = `${branch.latitude},${branch.longitude}`
            const isFocused = activeBranch?.id === branch.id
            const isCurrent = branch.id.toString() === selectedBranchId.toString()

            return (
              <Marker
                key={branch.id}
                ref={(ref) => {
                  if (ref) markerRefs.current[key] = ref
                }}
                position={[branch.latitude!, branch.longitude!]}
                icon={createTeardropIcon(branch, isFocused, isCurrent)}
                eventHandlers={{
                  click: () => setActiveBranch(branch),
                }}
              >
                <Popup className="terra-luxury-popup font-sans border-none">
                  <div className="flex flex-col items-center text-center p-0.5 min-w-[170px] max-w-[210px]">
                    <span className="text-[8px] uppercase tracking-[0.25em] text-[#84492C] font-semibold mb-0.5">
                      TERRA STUDIO
                    </span>
                    <p className="font-serif text-[#3A3835] mb-2 text-[12px] uppercase tracking-[0.06em] font-medium leading-snug">
                      {branch.branch_name}
                    </p>

                    <button
                      type="button"
                      onClick={() => onSelectBranch(branch.id)}
                      className="w-full mb-1.5 py-1.5 px-3 bg-[#84492C] hover:bg-[#6D3B23] text-white text-[9.5px] uppercase font-medium tracking-[0.16em] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3 h-3 text-white" />
                      <span>เลือกสาขานี้</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Google Maps"
                      className="w-full py-1 px-3 border border-[#D5D2CA] text-[#6F6861] hover:text-[#3A3835] text-[9px] uppercase font-medium tracking-[0.14em] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer bg-white"
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

        {/* 🧭 ปุ่มควบคุมด่วนบน Mini Map */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleFitBangkok}
            title="ซูมกรุงเทพฯ และปริมณฑล"
            className="px-2 py-1 bg-[#FAF8F5]/95 hover:bg-white text-[#3A3835] hover:text-[#84492C] border border-[#D5D2CA] rounded shadow-xs text-[9px] font-semibold tracking-wider transition-colors cursor-pointer"
          >
            BKK
          </button>
          <button
            type="button"
            onClick={handleFitAllNationwide}
            title="แสดงทุกสาขาทั่วประเทศ (Fit All Nationwide)"
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

      {/* 🏷️ 2. Quick Horizontal Branch Selector Chips */}
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

          {validBranches.map((branch) => {
            const isFocused = activeBranch?.id === branch.id
            const isCurrent = branch.id.toString() === selectedBranchId.toString()
            const clean = getCleanBranchName(branch.branch_name)

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
                📍 {clean}
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
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#84492C] font-medium">
                {activeBranch.id.toString() === selectedBranchId.toString() ? "สาขาที่เลือกอยู่" : "สาขาที่เลือกดูในแผนที่"}
              </span>
              <p className="text-[12px] font-medium text-[#3A3835] truncate uppercase tracking-wide">
                {activeBranch.branch_name}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeBranch.latitude},${activeBranch.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Google Maps"
                className="p-2 border border-[#D5D2CA] text-[#6F6861] hover:text-[#84492C] hover:border-[#84492C]/40 rounded transition-colors bg-white cursor-pointer"
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
                มุมมองภาพรวม
              </span>
              <p className="text-[12px] font-medium text-[#3A3835] truncate uppercase tracking-wide">
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
    </div>
  )
}
