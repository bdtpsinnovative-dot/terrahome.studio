"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, X, Maximize2, Compass } from 'lucide-react'

interface BranchMapProps {
  activeStock: any[]
  productImage: string
  productName: string
  userLocation: [number, number] | null
  setUserLocation: (loc: [number, number] | null) => void
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
}

function MapController({ 
  userLocation, 
  selectedBranch,
  activeStock,
  autoFit = false
}: { 
  userLocation: [number, number] | null
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
  activeStock: any[]
  autoFit?: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 13, { duration: 1.5 })
    }
  }, [userLocation, map])

  useEffect(() => {
    if (selectedBranch) {
      map.flyTo([selectedBranch.lat, selectedBranch.lng], 15, { duration: 1.5 })
    }
  }, [selectedBranch, map])

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
      
      if (autoFit && !selectedBranch && !userLocation && activeStock.length > 0) {
        const bounds = L.latLngBounds(
          activeStock
            .filter(s => s.branches?.latitude && s.branches?.longitude)
            .map(s => [Number(s.branches.latitude), Number(s.branches.longitude)])
        )
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1 })
        }
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [map, activeStock, selectedBranch, userLocation, autoFit])

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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync prop changes to internal selected branch
  useEffect(() => {
    if (selectedBranch) {
      setInternalSelectedBranch(selectedBranch)
    }
  }, [selectedBranch])

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
  }

  const tileUrl = process.env.NEXT_PUBLIC_CARTO_API_KEY
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  const renderMarkers = () => (
    <>
      {validLocations.map((stockItem, idx) => (
        <Marker 
          key={idx} 
          position={[stockItem.branches.latitude, stockItem.branches.longitude]}
          icon={createCustomIcon(stockItem.qty)}
        >
          <Popup className="font-sans border-none shadow-xl rounded-xl min-w-[170px]">
            <div className="flex flex-col items-center text-center p-1.5">
              <span className="text-[8px] uppercase tracking-[0.25em] text-[#84492C] font-semibold mb-1">
                TERRA STUDIO
              </span>
              <p className="font-medium text-[#3A3835] mb-2 text-[12px] leading-snug">
                {stockItem.branches.branch_name}
              </p>
              <div className="text-[10px] text-[#84492C] font-medium bg-[#F5F2EB] px-2.5 py-1 rounded-sm w-full font-mono mb-2">
                IN STOCK: {stockItem.qty}
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${stockItem.branches.latitude},${stockItem.branches.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Get directions to ${stockItem.branches.branch_name} branch on Google Maps`}
                className="w-full bg-[#3A3835] text-white hover:bg-[#84492C] text-[9.5px] uppercase font-medium tracking-[0.15em] py-2 px-3 rounded-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Navigation className="w-3 h-3" />
                Directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup className="font-sans border-none shadow-lg rounded-xl">
            <div className="text-center font-medium text-[11px] text-[#3A3835] px-2 py-1 tracking-wide">
              📍 YOUR CURRENT LOCATION
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )

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
            onClick={() => setIsModalOpen(true)}
            className="bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] backdrop-blur-md border border-[#3A3835]/15 text-[#3A3835] hover:text-[#84492C] hover:border-[#84492C]/50 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium transition-all duration-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ขยายแผนที่ดูแบบเต็มหน้าต่าง"
          >
            <Maximize2 className="w-3 h-3 text-[#84492C]" />
            <span>ขยายแผนที่</span>
          </button>
        </div>

        <MapContainer 
          center={[centerLat, centerLng]} 
          zoom={12} 
          style={{ width: '100%', height: '100%', zIndex: 1 }}
          scrollWheelZoom={false} 
          zoomControl={false} 
        >
          <MapController 
            userLocation={userLocation} 
            selectedBranch={internalSelectedBranch} 
            activeStock={activeStock}
            autoFit={false}
          />
          <TileLayer attribution={tileAttribution} url={tileUrl} />
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

            {/* 🗺️ MODAL BODY: Full-Bleed Map with Smart Responsive Branch Cards */}
            <div className="flex-1 relative w-full h-full min-h-0 bg-[#EAE7E0] overflow-hidden">
              
              {/* 📋 SMART RESPONSIVE BRANCH PANEL 
                  - บนคอม (Desktop): กล่องกระจกลอยฝั่งซ้าย กว้างพอดี 320px เรียงลงมา ไม่บังแผนที่
                  - บนมือถือ (Mobile): ย้ายมาลอยด้านล่างสุด เป็นการ์ดเลื่อนแนวนอน (Horizontal Swipe) สูงเพียง 110px ไม่บังแผนที่ด้านบนเด็ดขาด ไม่ว่าจะ 2, 4 หรือ 10 สาขา!
              */}
              <div className="
                absolute z-[1000]
                bottom-3 left-3 right-3
                md:bottom-auto md:top-4 md:left-4 md:right-auto md:w-[320px] md:max-h-[calc(100%-32px)]
                bg-[#FAF8F5]/92 backdrop-blur-md rounded-xl border border-[#D5D2CA]/90 shadow-[0_12px_36px_-8px_rgba(58,56,53,0.18)]
                flex flex-col overflow-hidden transition-all
              ">
                {/* Panel Header */}
                <div className="px-3.5 py-2 sm:py-2.5 border-b border-[#D5D2CA]/60 bg-white/60 flex items-center justify-between shrink-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#84492C]">
                    Available Locations ({validLocations.length})
                  </span>
                  <span className="text-[8.5px] text-[#8C8A86] tracking-wide font-light">
                    {validLocations.length > 2 ? 'เลื่อนดูสาขาเพิ่มเติม →' : 'คลิกเพื่อดูหมุด'}
                  </span>
                </div>

                {/* Branch Cards: 
                    📱 มือถือ: เลื่อนแนวนอน (flex-row overflow-x-auto) ไม่บังแผนที่ด้านบน
                    💻 คอม: ลิสต์แนวตั้ง (md:flex-col md:overflow-y-auto) พอดีด้านซ้าย
                */}
                <div className="
                  p-2 sm:p-2.5 
                  flex flex-row md:flex-col gap-2 
                  overflow-x-auto md:overflow-x-hidden md:overflow-y-auto 
                  snap-x md:snap-none 
                  [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]
                ">
                  {validLocations.map((s: any, idx: number) => {
                    const isSelected = internalSelectedBranch?.lat === Number(s.branches.latitude) && 
                                       internalSelectedBranch?.lng === Number(s.branches.longitude)

                    return (
                      <div 
                        key={idx}
                        onClick={() => handleSelectBranchInMap(Number(s.branches.latitude), Number(s.branches.longitude))}
                        className={`
                          p-2.5 sm:p-3 rounded-lg transition-all duration-200 cursor-pointer border flex flex-col justify-between shrink-0
                          w-[220px] sm:w-[250px] md:w-full snap-center
                          ${isSelected
                            ? 'bg-white border-[#84492C] shadow-sm ring-1 ring-[#84492C]/20'
                            : 'bg-white/80 border-[#D5D2CA]/60 hover:bg-white hover:border-[#84492C]/40 hover:shadow-2xs'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className={`text-[10.5px] sm:text-[11px] font-medium uppercase tracking-[0.1em] leading-snug line-clamp-2 ${isSelected ? 'text-[#84492C]' : 'text-[#3A3835]'}`}>
                            {s.branches?.branch_name || 'TERRA BRANCH'}
                          </span>
                          <span className="text-[8.5px] font-mono tracking-wider text-[#84492C] bg-[#84492C]/8 px-1.5 py-0.5 rounded-xs shrink-0 font-semibold whitespace-nowrap">
                            {s.qty} IN STOCK
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#3A3835]/5 text-[9.5px]">
                          {s.distance !== null && s.distance !== undefined ? (
                            <span className="text-[#8C8A86] font-mono flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-[#84492C]" /> {s.distance.toFixed(1)} km
                            </span>
                          ) : (
                            <span className="text-[#8C8A86] text-[8.5px] tracking-wide font-light">
                              แตะเพื่อซูมหมุด
                            </span>
                          )}

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} 
                            className="text-[#84492C] hover:text-[#3A3835] text-[9px] uppercase tracking-[0.12em] font-medium flex items-center gap-1 transition-colors"
                            title="เปิด Google Maps นำทาง"
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            <span>นำทาง</span>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 🗺️ MAP CONTAINER (เต็มพื้นที่ 100% ยิ่งใหญ่ สบายตา) */}
              <div className="w-full h-full">
                <MapContainer 
                  center={[centerLat, centerLng]} 
                  zoom={13} 
                  style={{ width: '100%', height: '100%', zIndex: 1 }}
                  scrollWheelZoom={true} 
                  zoomControl={true} 
                >
                  <MapController 
                    userLocation={userLocation} 
                    selectedBranch={internalSelectedBranch} 
                    activeStock={activeStock}
                    autoFit={true}
                  />
                  <TileLayer attribution={tileAttribution} url={tileUrl} />
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
