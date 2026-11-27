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
  autoFit = false,
  offsetCenter = false
}: { 
  userLocation: [number, number] | null
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
  activeStock: any[]
  autoFit?: boolean
  offsetCenter?: boolean
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
          map.flyToBounds(bounds, { 
            paddingTopLeft: offsetCenter ? [320, 40] : [40, 40],
            paddingBottomRight: [40, 40],
            duration: 1 
          })
        }
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [map, activeStock, selectedBranch, userLocation, autoFit, offsetCenter])

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
        <div style="background: white; border: 1.5px solid #84492C; border-radius: 6px; padding: 3px; box-shadow: 0 4px 16px rgba(132,73,44,0.18); display: flex; flex-direction: column; align-items: center; width: 44px; height: 44px; position: relative; transition: transform 0.2s;">
          <img src="${productImage}" alt="Pin" style="width: 100%; height: 100%; object-fit: contain; mix-blend-multiply;" />
          <div style="position: absolute; bottom: -10px; background: #84492C; color: white; font-size: 9px; font-weight: 600; padding: 0px 5px; border-radius: 8px; border: 1.5px solid white; font-family: monospace; letter-spacing: 0.05em;">
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
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #84492C; opacity: 0.3; transform: scale(1.8);"></div>
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
          <Popup className="font-sans border-none shadow-xl rounded-xl min-w-[160px]">
            <div className="flex flex-col items-center text-center p-1 font-sans">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#C8A97E] mb-1 font-medium">
                TERRA STUDIO
              </span>
              <p className="font-medium text-[#3A3835] mb-2 text-xs tracking-wide">
                {stockItem.branches.branch_name}
              </p>
              <div className="text-[10px] font-mono text-[#84492C] font-semibold bg-[#F5F2EB] px-2.5 py-1 rounded-md inline-block w-full">
                {stockItem.qty} IN STOCK
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${stockItem.branches.latitude},${stockItem.branches.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Get directions to ${stockItem.branches.branch_name} branch on Google Maps`}
                className="mt-2.5 w-full bg-[#3A3835] text-white text-[9px] uppercase font-medium tracking-[0.18em] py-1.5 px-3 rounded-sm flex items-center justify-center gap-1.5 hover:bg-[#84492C] transition-colors shadow-2xs"
              >
                <Navigation className="w-3 h-3" />
                <span>DIRECTIONS</span>
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup className="font-sans border-none shadow-lg rounded-xl">
            <div className="text-center font-mono text-xs text-[#84492C] px-2 py-1">
              📍 Current Location
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )

  return (
    <>
      {/* 🌟 1. INLINE PREVIEW MAP (เรียบหรู สบายตา พร้อมปุ่มแคปซูล Frosted Glass แบบ Quiet Luxury) */}
      <div className="mt-4 relative w-full h-[320px] rounded-xl overflow-hidden border border-[#D5D2CA] shadow-xs bg-[#EAE7E0]">
        
        {/* Floating Minimalist Capsule on Top Right */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center bg-[#FAF8F5]/90 backdrop-blur-md border border-[#D5D2CA] rounded-full p-1 shadow-sm">
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-[#78716C] hover:text-[#84492C] transition-colors cursor-pointer"
            title="Locate my position"
          >
            <Navigation className="w-3 h-3 text-[#84492C]" />
            <span>Near Me</span>
          </button>

          <div className="w-px h-3.5 bg-[#D5D2CA]" />

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-[#3A3835] hover:text-[#84492C] transition-colors cursor-pointer"
            title="Expand Fullscreen Map"
          >
            <Maximize2 className="w-3 h-3 text-[#84492C]" />
            <span>Expand Map</span>
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

      {/* 🌟 2. LUXURY POPUP MODAL DIALOG (แผนที่เต็ม 100% ไร้พื้นที่ว่าง พร้อมการ์ดสาขาลอยทรงมินิมอล) */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl h-[84vh] max-h-[800px] bg-[#FAF8F5] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-[#D5D2CA] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 🏷️ MODAL HEADER (Minimalist Editorial Style) */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-[#D5D2CA] bg-[#FAF8F5] flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#C8A97E] font-medium">
                  Boutique Availability & Locations
                </span>
                <h3 className="font-serif text-sm sm:text-base uppercase tracking-wider text-[#3A3835] font-normal mt-0.5 truncate max-w-lg">
                  {productName}
                </h3>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D5D2CA] bg-white/80 hover:bg-white text-[#78716C] hover:text-[#84492C] text-[10px] uppercase tracking-[0.18em] font-medium transition-all cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3 h-3 text-[#84492C]" />
                  <span>My Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-[#D5D2CA] bg-white/80 hover:bg-white text-[#3A3835] hover:text-[#84492C] flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                </button>
              </div>
            </div>

            {/* 🗺️ MODAL BODY: FULL-WIDTH MAP WITH FLOATING SLEEK BOUTIQUE CARD */}
            <div className="flex-1 relative w-full h-full overflow-hidden bg-[#EAE7E0]">
              
              {/* 📋 Floating Glassmorphic Boutique List Card (ไม่กินครึ่งจอ ไม่ทิ้งพื้นที่ขาวว่าง) */}
              <div className="absolute top-4 left-4 z-[1000] w-[275px] sm:w-[295px] max-h-[calc(100%-32px)] bg-[#FAF8F5]/92 backdrop-blur-md rounded-xl border border-[#D5D2CA] shadow-[0_8px_30px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-[#D5D2CA]/60 flex items-center justify-between shrink-0 bg-[#FAF8F5]/80">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#84492C]"></span>
                    <span className="text-[9px] uppercase tracking-[0.22em] text-[#84492C] font-semibold">
                      Stores In Stock
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#8C8A86] tracking-wider">
                    {validLocations.length} Branches
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin] [scrollbar-color:#D5D2CA_transparent]">
                  {validLocations.map((s: any, idx: number) => {
                    const isSelected = internalSelectedBranch?.lat === Number(s.branches.latitude) && 
                                       internalSelectedBranch?.lng === Number(s.branches.longitude)

                    return (
                      <div 
                        key={idx}
                        onClick={() => handleSelectBranchInMap(Number(s.branches.latitude), Number(s.branches.longitude))}
                        className={`p-3 rounded-lg transition-all duration-200 cursor-pointer border flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-white border-[#84492C] shadow-xs'
                            : 'bg-white/60 border-[#D5D2CA]/60 hover:bg-white hover:border-[#84492C]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[11px] font-medium uppercase tracking-[0.12em] leading-snug ${isSelected ? 'text-[#84492C] font-semibold' : 'text-[#3A3835]'}`}>
                            {s.branches?.branch_name || 'TERRA BRANCH'}
                          </span>
                          <span className="text-[9px] font-mono text-[#84492C] font-semibold bg-[#84492C]/10 px-1.5 py-0.5 rounded-[2px] shrink-0">
                            {s.qty} PCS
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#D5D2CA]/40 text-[10px]">
                          {s.distance !== null && s.distance !== undefined ? (
                            <span className="text-[#8C8A86] font-mono text-[9px] flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-[#84492C]" /> {s.distance.toFixed(1)} km
                            </span>
                          ) : (
                            <span className="text-[#A8A29E] text-[9px] uppercase tracking-wider">
                              In Stock
                            </span>
                          )}

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} 
                            className="text-[#84492C] hover:underline uppercase text-[9px] tracking-widest font-semibold flex items-center gap-1"
                            title="Get directions on Google Maps"
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            <span>Map</span>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 🗺️ Map Container (Full 100% Width & Height) */}
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
                  offsetCenter={true}
                />
                <TileLayer attribution={tileAttribution} url={tileUrl} />
                {renderMarkers()}
              </MapContainer>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
