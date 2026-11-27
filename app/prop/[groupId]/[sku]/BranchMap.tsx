"use client"

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, X, Maximize2, Compass, ChevronDown, Check } from 'lucide-react'

interface BranchMapProps {
  activeStock: any[]
  productImage: string
  productName: string
  userLocation: [number, number] | null
  setUserLocation: (loc: [number, number] | null) => void
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
}

function getCleanBranchName(name: string): string {
  if (!name) return 'TERRA BRANCH'
  return name
    .replace(/^SHOWROOM\s+TERRA\s+/i, '')
    .replace(/^SHOWROOM\s+/i, '')
    .replace(/^EVENT\s+FIND\s+-\s+/i, '')
    .trim()
}

function MapController({ 
  userLocation, 
  selectedBranch,
  activeStock,
  autoFit = false,
  targetZoom = 16.5
}: { 
  userLocation: [number, number] | null
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
  activeStock: any[]
  autoFit?: boolean
  targetZoom?: number
}) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 16.5, { duration: 1.2 })
    }
  }, [userLocation, map])

  useEffect(() => {
    if (selectedBranch) {
      map.flyTo([selectedBranch.lat, selectedBranch.lng], targetZoom, { duration: 1.2 })
    }
  }, [selectedBranch, targetZoom, map])

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
      
      if (selectedBranch) {
        map.flyTo([selectedBranch.lat, selectedBranch.lng], targetZoom, { duration: 0.8 })
      } else if (autoFit && !userLocation && activeStock.length > 0) {
        if (activeStock.length === 1) {
          map.flyTo([Number(activeStock[0].branches.latitude), Number(activeStock[0].branches.longitude)], targetZoom, { duration: 0.8 })
        } else {
          const bounds = L.latLngBounds(
            activeStock
              .filter(s => s.branches?.latitude && s.branches?.longitude)
              .map(s => [Number(s.branches.latitude), Number(s.branches.longitude)])
          )
          if (bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: targetZoom, duration: 0.8 })
          }
        }
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [map, activeStock, selectedBranch, userLocation, autoFit, targetZoom])

  return null
}

export default function BranchMap({ 
  activeStock, 
  productImage, 
  productName,
  userLocation,
  setUserLocation,
  selectedBranch
}: BranchMapProps) {
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [internalSelectedBranch, setInternalSelectedBranch] = useState<{ lat: number; lng: number; timestamp: number } | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Sync prop changes to internal selected branch
  useEffect(() => {
    if (selectedBranch) {
      setInternalSelectedBranch(selectedBranch)
    }
  }, [selectedBranch])

  // Automatically open marker popup when internalSelectedBranch changes
  useEffect(() => {
    if (internalSelectedBranch) {
      const key = `${internalSelectedBranch.lat},${internalSelectedBranch.lng}`
      const timer = setTimeout(() => {
        markerRefs.current[key]?.openPopup()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [internalSelectedBranch])

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsModalOpen(false)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = 'unset'
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  if (!mounted) return null

  const validLocations = activeStock.filter(
    (s) => s.branches?.latitude && s.branches?.longitude
  )

  if (validLocations.length === 0) return null

  const centerLat = validLocations[0].branches.latitude
  const centerLng = validLocations[0].branches.longitude

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งครับ")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
      },
      (error) => {
        console.error(error)
        alert("ไม่สามารถดึงตำแหน่งได้ โปรดเปิดสิทธิ์เข้าถึงพิกัดในเบราว์เซอร์ก่อนนะครับ")
      },
      { enableHighAccuracy: true }
    )
  }

  const createCustomIcon = (qty: number) => {
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="background: #FAF8F5; border: 1.5px solid #84492C; border-radius: 6px; padding: 3px; box-shadow: 0 4px 14px rgba(58,56,53,0.18); display: flex; flex-direction: column; align-items: center; width: 44px; height: 44px; position: relative;">
          <img src="${productImage}" alt="Branch Map Pin" title="Branch Map" style="width: 100%; height: 100%; object-fit: contain; mix-blend-multiply;" />
          <div style="position: absolute; bottom: -10px; background: #84492C; color: white; font-size: 9px; font-weight: 600; padding: 0.5px 5px; border-radius: 8px; border: 1.5px solid #FAF8F5; font-family: monospace; letter-spacing: 0.05em;">
            ${qty}
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -48]
    })
  }

  const userIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div style="width: 14px; height: 14px; background-color: #84492C; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(132,73,44,0.4); position: relative;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #84492C; opacity: 0.35; transform: scale(2);"></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  })

  const handleSelectBranchInMap = (lat: number, lng: number) => {
    setInternalSelectedBranch({ lat, lng, timestamp: Date.now() })
    const key = `${lat},${lng}`
    setTimeout(() => {
      markerRefs.current[key]?.openPopup()
    }, 350)
  }

  const handleOpenModal = () => {
    if (!internalSelectedBranch && validLocations.length > 0) {
      setInternalSelectedBranch({
        lat: Number(validLocations[0].branches.latitude),
        lng: Number(validLocations[0].branches.longitude),
        timestamp: Date.now()
      })
    }
    setIsModalOpen(true)
  }

  const tileUrl = process.env.NEXT_PUBLIC_CARTO_API_KEY
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  const renderMarkers = () => (
    <>
      {validLocations.map((stockItem, idx) => {
        const key = `${stockItem.branches.latitude},${stockItem.branches.longitude}`
        return (
          <Marker 
            key={idx} 
            ref={(ref) => {
              if (ref) markerRefs.current[key] = ref
            }}
            position={[stockItem.branches.latitude, stockItem.branches.longitude]}
            icon={createCustomIcon(stockItem.qty)}
          >
            <Popup className="terra-luxury-popup font-sans border-none">
              <div className="flex flex-col items-center text-center p-0.5 min-w-[170px] max-w-[220px]">
                <span className="text-[8px] uppercase tracking-[0.25em] text-[#84492C] font-semibold mb-0.5">
                  TERRA STUDIO
                </span>
                <p className="font-serif text-[#3A3835] mb-2 text-[12.5px] uppercase tracking-[0.06em] font-medium leading-snug">
                  {getCleanBranchName(stockItem.branches.branch_name)}
                </p>
                <div className="text-[9.5px] text-[#84492C] font-medium bg-[#F5F2EB] border border-[#84492C]/15 px-3 py-0.5 rounded-full font-mono mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84492C]"></span>
                  <span>{stockItem.qty} IN STOCK</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${stockItem.branches.latitude},${stockItem.branches.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Get directions to ${stockItem.branches.branch_name} branch on Google Maps`}
                  style={{ color: '#FFFFFF', backgroundColor: '#84492C' }}
                  className="w-full text-white bg-[#84492C] hover:bg-[#6D3B23] text-[9.5px] uppercase font-medium tracking-[0.16em] py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Navigation className="w-3 h-3 text-white" />
                  <span className="text-white">DIRECTIONS (นำทาง)</span>
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup className="terra-luxury-popup font-sans border-none">
            <div className="text-center font-medium text-[11px] text-[#3A3835] px-2 py-1 tracking-wide">
              📍 YOUR CURRENT LOCATION
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )

  const activeSelectedStock = validLocations.find(
    s => internalSelectedBranch?.lat === Number(s.branches.latitude) && 
         internalSelectedBranch?.lng === Number(s.branches.longitude)
  ) || validLocations[0]

  return (
    <>
      {/* 🌟 1. INLINE MAP (ดีไซน์ Quiet Luxury สบายตา ไร้ปุ่มสีจัดจ้าน) */}
      <div className="mt-4 relative w-full h-[320px] rounded-xs overflow-hidden border border-[#D5D2CA]/80 bg-[#EAE7E0] group">
        
        {/* Floating Luxury Action Pills */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] backdrop-blur-md border border-[#3A3835]/15 text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/50 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium transition-all duration-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ค้นหาตำแหน่งของฉัน"
          >
            <Compass className="w-3 h-3 text-[#84492C]" />
            <span className="hidden sm:inline">ตำแหน่งฉัน</span>
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] backdrop-blur-md border border-[#3A3835]/15 text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/50 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium transition-all duration-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ขยายแผนที่ดูแบบเต็มหน้าต่าง"
          >
            <Maximize2 className="w-3 h-3 text-[#84492C]" />
            <span>ขยายแผนที่</span>
          </button>
        </div>

        <MapContainer 
          center={[centerLat, centerLng]} 
          zoom={15} 
          maxZoom={19}
          minZoom={10}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
          scrollWheelZoom={false} 
          zoomControl={false} 
        >
          <MapController 
            userLocation={userLocation} 
            selectedBranch={internalSelectedBranch} 
            activeStock={activeStock}
            autoFit={false}
            targetZoom={15.5}
          />
          <TileLayer maxZoom={19} attribution={tileAttribution} url={tileUrl} />
          {renderMarkers()}
        </MapContainer>
      </div>

      {/* 🌟 2. LUXURY STUDIO MODAL DIALOG (แผนที่เต็มตา 100% พร้อมการ์ดสาขาลอยหรูหรา ไม่กินพื้นที่ ไม่ขาวว่าง) */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] max-h-[820px] bg-[#FAF8F5] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#D5D2CA] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 🏷️ MODAL HEADER (Quiet luxury serif title + minimalist close) */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#D5D2CA]/70 bg-[#FAF8F5] flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84492C] shrink-0"></span>
                  <h3 className="font-serif text-xs sm:text-base uppercase tracking-[0.2em] text-[#3A3835] font-normal truncate">
                    In-Store Availability & Map
                  </h3>
                </div>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-[#8C8A86] mt-0.5 font-light truncate max-w-lg">
                  TERRA STUDIO · {productName}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D5D2CA] bg-white hover:bg-[#FAF8F5] text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/50 text-[10px] uppercase tracking-[0.16em] font-medium transition-all cursor-pointer shadow-2xs"
                >
                  <Compass className="w-3 h-3 text-[#84492C]" />
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

            {/* 🗺️ MODAL BODY: Full-Bleed Map with Luxury Top Dropdown */}
            <div className="flex-1 relative w-full h-full min-h-0 bg-[#EAE7E0] overflow-hidden">
              
              {/* 🌟 TOP FLOATING BAR: Luxury Branch Dropdown Selector (อยู่ด้านบนตามที่นายต้องการ) */}
              <div className="absolute top-3.5 left-3.5 right-3.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
                
                {/* 📍 BRANCH SELECTOR DROPDOWN */}
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
                        {getCleanBranchName(activeSelectedStock?.branches?.branch_name)}
                      </span>
                    </div>

                    <span className="text-[8px] sm:text-[8.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#84492C]/10 text-[#84492C] shrink-0 whitespace-nowrap">
                      {activeSelectedStock?.qty || 0} PCS
                    </span>

                    <ChevronDown className={`w-3.5 h-3.5 text-[#8C8A86] transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180 text-[#84492C]' : ''}`} />
                  </button>

                  {/* 📋 EXPANDED DROPDOWN MENU */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-[280px] sm:w-[320px] bg-[#FAF8F5] border border-[#D5D2CA] rounded-xl shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-[1001]">
                      <div className="px-3.5 py-2 border-b border-[#D5D2CA]/60 bg-white/70 flex items-center justify-between">
                        <span className="text-[8.5px] uppercase tracking-[0.2em] font-semibold text-[#84492C]">
                          สาขาที่มีสินค้า ({validLocations.length})
                        </span>
                        <span className="text-[8.5px] text-[#8C8A86] font-light">
                          คลิกเพื่อดูหมุด
                        </span>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto divide-y divide-[#D5D2CA]/40 [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
                        {validLocations.map((s: any, idx: number) => {
                          const isSelected = internalSelectedBranch?.lat === Number(s.branches.latitude) && 
                                             internalSelectedBranch?.lng === Number(s.branches.longitude)
                          const cleanName = getCleanBranchName(s.branches?.branch_name)

                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => {
                                handleSelectBranchInMap(Number(s.branches.latitude), Number(s.branches.longitude))
                                setIsDropdownOpen(false)
                              }}
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                                isSelected ? 'bg-white text-[#84492C]' : 'hover:bg-white/80 text-[#3A3835]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 text-[#84492C] shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-[#D5D2CA] shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className={`text-[10.5px] sm:text-[11px] uppercase tracking-[0.08em] font-medium truncate ${isSelected ? 'text-[#84492C] font-semibold' : 'text-[#3A3835]'}`}>
                                    {cleanName}
                                  </div>
                                  {s.distance !== null && s.distance !== undefined && (
                                    <div className="text-[8.5px] text-[#8C8A86] font-mono mt-0.5">
                                      ห่าง {s.distance.toFixed(1)} km
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#84492C]/10 text-[#84492C] shrink-0 whitespace-nowrap">
                                {s.qty} IN STOCK
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🧭 LOCATE ME BUTTON (Mobile shortcut on top-right) */}
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="pointer-events-auto sm:hidden bg-[#FAF8F5]/95 hover:bg-[#FAF8F5] backdrop-blur-md border border-[#D5D2CA] text-[#3A3835] hover:text-[#84492C] p-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="ตำแหน่งของฉัน"
                >
                  <Compass className="w-4 h-4 text-[#84492C]" />
                </button>
              </div>

              {/* 🗺️ MAP CONTAINER (เต็มพื้นที่ 100% ยิ่งใหญ่ สบายตา) */}
              <div className="w-full h-full">
                <MapContainer 
                  center={[
                    internalSelectedBranch?.lat || centerLat,
                    internalSelectedBranch?.lng || centerLng
                  ]} 
                  zoom={16.5} 
                  maxZoom={19}
                  minZoom={10}
                  style={{ width: '100%', height: '100%', zIndex: 1 }}
                  scrollWheelZoom={true} 
                  zoomControl={false} 
                >
                  <ZoomControl position="bottomright" />
                  <MapController 
                    userLocation={userLocation} 
                    selectedBranch={internalSelectedBranch} 
                    activeStock={activeStock}
                    autoFit={!internalSelectedBranch}
                    targetZoom={16.5}
                  />
                  <TileLayer maxZoom={19} attribution={tileAttribution} url={tileUrl} />
                  {renderMarkers()}
                </MapContainer>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
