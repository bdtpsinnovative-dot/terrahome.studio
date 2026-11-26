"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, X, Maximize2 } from 'lucide-react'

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
    }, 200)
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
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map')
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
        <div style="background: white; border: 2px solid #84492C; border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(132,73,44,0.18); display: flex; flex-direction: column; align-items: center; width: 48px; height: 48px; position: relative;">
          <img src="${productImage}" alt="Branch Map Pin" title="Branch Map" style="width: 100%; height: 100%; object-fit: contain; mix-blend-multiply;" />
          <div style="position: absolute; bottom: -11px; background: #84492C; color: white; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; border: 2px solid white; font-family: sans-serif; line-height: 1.2;">
            ${qty}
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -52]
    })
  }

  const userIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.25); position: relative;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; transform: scale(1.6);"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  })

  const handleSelectBranchInMap = (lat: number, lng: number) => {
    setInternalSelectedBranch({ lat, lng, timestamp: Date.now() })
    if (mobileTab === 'list') {
      setMobileTab('map')
    }
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
          <Popup className="font-sans border-none shadow-xl rounded-xl min-w-[160px]">
            <div className="flex flex-col items-center text-center p-1">
              <p className="text-[9px] uppercase tracking-widest text-[#8C8A86] mb-1 font-medium">
                TERRA HOME STUDIO
              </p>
              <p className="font-bold text-[#3A3835] mb-2 text-xs">
                {stockItem.branches.branch_name}
              </p>
              <p className="text-xs text-[#84492C] font-semibold bg-[#F5F2EB] px-2.5 py-1 rounded-md inline-block w-full">
                พร้อมส่ง: {stockItem.qty} ชิ้น
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${stockItem.branches.latitude},${stockItem.branches.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Get directions to ${stockItem.branches.branch_name} branch on Google Maps`}
                className="mt-2.5 w-full bg-[#3a3835] text-white text-[10px] uppercase font-bold tracking-wider py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-[#84492C] transition-colors shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5" />
                นำทางบน Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup className="font-sans border-none shadow-lg rounded-xl">
            <div className="text-center font-semibold text-xs text-[#3b82f6] px-2 py-1">
              📍 ตำแหน่งปัจจุบันของคุณ
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )

  return (
    <>
      {/* 🌟 1. INLINE PREVIEW MAP (แสดงในหน้ารายละเอียดสินค้า สวยงาม ขนาดพอดี) */}
      <div className="mt-4 relative w-full h-[320px] rounded-xl overflow-hidden border border-[#3A3835]/15 shadow-xs bg-[#EAE7E0]">
        
        {/* Floating Quick Action Buttons on Top Right */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="bg-white/95 backdrop-blur-xs text-[#3b82f6] border border-[#3A3835]/10 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-white active:scale-95 transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer"
            title="ค้นหาตำแหน่งของฉัน"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ตำแหน่งฉัน</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#84492C] text-white border border-[#84492C] px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#6D3B23] active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-bold tracking-wider cursor-pointer"
            title="ขยายแผนที่ดูแบบเต็มจอ"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ขยายดูแผนที่ใหญ่</span>
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

      {/* 🌟 2. LUXURY POPUP MODAL DIALOG (เปิดเมื่อกดขยาย สบายตา ปิดง่าย ไม่ชนเนวบาร์) */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-6xl h-[88vh] max-h-[850px] bg-[#FAF8F5] rounded-2xl shadow-2xl border border-[#D5D2CA] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 🏷️ MODAL HEADER */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#D5D2CA]/80 bg-[#F5F2EB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#84492C]/10 border border-[#84492C]/20 flex items-center justify-center text-[#84492C] shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#3A3835] truncate">
                    แผนที่และสาขาที่มีสินค้า (IN-STORE AVAILABILITY & MAP)
                  </h3>
                  <p className="text-[11px] text-[#8C8A86] mt-0.5 truncate max-w-md">
                    {productName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5D2CA] bg-white text-[#3b82f6] hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>ตำแหน่งของฉัน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#3A3835]/10 hover:bg-[#3A3835]/15 text-[#3A3835] font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                  <span>ปิด (ESC)</span>
                </button>
              </div>
            </div>

            {/* 📱 MOBILE TAB SELECTOR (เฉพาะหน้าจอมือถือ) */}
            <div className="flex md:hidden p-2 border-b border-[#D5D2CA]/70 bg-[#F5F2EB] shrink-0">
              <div className="grid grid-cols-2 w-full bg-[#EAE7E0] p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mobileTab === 'map' 
                      ? 'bg-white text-[#84492C] shadow-xs' 
                      : 'text-[#8C8A86] hover:text-[#3A3835]'
                  }`}
                >
                  <span>🗺️ แผนที่</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mobileTab === 'list' 
                      ? 'bg-white text-[#84492C] shadow-xs' 
                      : 'text-[#8C8A86] hover:text-[#3A3835]'
                  }`}
                >
                  <span>🏢 สาขาพร้อมส่ง ({validLocations.length})</span>
                </button>
              </div>
            </div>

            {/* 🗺️ MODAL BODY: SPLIT VIEW (Desktop: 2 Columns / Mobile: Switchable Tabs) */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              
              {/* 📋 ฝั่งซ้าย: รายชื่อสาขาทั้งหมดพร้อมสต็อกและปุ่มนำทาง */}
              <div 
                className={`
                  w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#D5D2CA]/70 flex flex-col bg-[#F9F8F6] shrink-0
                  ${mobileTab === 'list' ? 'flex flex-1' : 'hidden md:flex'}
                `}
              >
                <div className="p-3.5 border-b border-[#D5D2CA]/50 bg-white/70 flex items-center justify-between shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#84492C]">
                    สาขาที่มีสินค้า ({validLocations.length} สาขา)
                  </span>
                  <span className="text-[10px] text-[#8C8A86]">
                    คลิกเพื่อซูมแผนที่
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
                  {validLocations.map((s: any, idx: number) => {
                    const isSelected = internalSelectedBranch?.lat === Number(s.branches.latitude) && 
                                       internalSelectedBranch?.lng === Number(s.branches.longitude)

                    return (
                      <div 
                        key={idx}
                        onClick={() => handleSelectBranchInMap(Number(s.branches.latitude), Number(s.branches.longitude))}
                        className={`p-3.5 rounded-xl transition-all duration-200 cursor-pointer border flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-[#F5F2EB] border-[#84492C] shadow-sm'
                            : 'bg-white border-[#D5D2CA]/60 hover:border-[#84492C]/50 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-[#84492C]' : 'text-[#3A3835]'}`}>
                            {s.branches?.branch_name || 'สาขา TERRA'}
                          </span>
                          <span className="bg-[#84492C]/10 text-[#84492C] text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
                            สต็อก: {s.qty}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#3A3835]/5 text-[11px]">
                          {s.distance !== null && s.distance !== undefined ? (
                            <span className="text-[#3b82f6] font-mono font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> ห่าง {s.distance.toFixed(1)} กม.
                            </span>
                          ) : (
                            <span className="text-[#8C8A86] text-[10px]">
                              คลิกเพื่อดูหมุด
                            </span>
                          )}

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} 
                            className="text-[#84492C] hover:underline font-semibold flex items-center gap-1"
                            title="นำทางบน Google Maps"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>นำทาง</span>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 🗺️ ฝั่งขวา: แผนที่แบบเต็มตา ไร้สิ่งบดบัง */}
              <div 
                className={`
                  flex-1 h-full relative bg-[#EAE7E0]
                  ${mobileTab === 'map' ? 'flex flex-1' : 'hidden md:flex'}
                `}
              >
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
