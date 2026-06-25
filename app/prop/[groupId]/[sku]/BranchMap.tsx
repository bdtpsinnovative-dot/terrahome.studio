"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation } from 'lucide-react'

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
  isFullscreen,
  activeStock
}: { 
  userLocation: [number, number] | null
  selectedBranch: { lat: number; lng: number; timestamp: number } | null
  isFullscreen: boolean
  activeStock: any[]
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
      
      if (isFullscreen && !selectedBranch && !userLocation && activeStock.length > 0) {
          const bounds = L.latLngBounds(
            activeStock
              .filter(s => s.branches?.latitude && s.branches?.longitude)
              .map(s => [Number(s.branches.latitude), Number(s.branches.longitude)])
          )
          if(bounds.isValid()) {
             map.flyToBounds(bounds, { padding: [50, 50], duration: 1 })
          }
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [isFullscreen, map, activeStock, selectedBranch, userLocation])

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [internalSelectedBranch, setInternalSelectedBranch] = useState<{ lat: number; lng: number; timestamp: number } | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    if(selectedBranch) {
      setInternalSelectedBranch(selectedBranch)
    }
  }, [selectedBranch])

  if (!mounted) return null

  const validLocations = activeStock.filter(
    (s) => s.branches?.latitude && s.branches?.longitude
  )

  if (validLocations.length === 0) return null

  const centerLat = validLocations[0].branches.latitude
  const centerLng = validLocations[0].branches.longitude

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    document.body.style.overflow = !isFullscreen ? 'hidden' : 'unset'
  }

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
        alert("ไม่สามารถดึงตำแหน่งได้ โปรดเปิดสิทธิ์เข้าถึงพิกัดในเบราว์เซอร์ก่อนนะครับนาย")
      },
      { enableHighAccuracy: true }
    )
  }

  const createCustomIcon = (qty: number) => {
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="background: white; border: 2px solid #84492C; border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(132,73,44,0.15); display: flex; flex-direction: column; align-items: center; width: 50px; height: 50px; position: relative;">
          <img src="${productImage}" alt="Branch Map Pin" title="Branch Map" style="width: 100%; height: 100%; object-fit: contain; mix-blend-multiply;" />
          <div style="position: absolute; bottom: -12px; background: #84492C; color: white; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 12px; border: 2px solid white; font-family: sans-serif;">
            ${qty}
          </div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -55]
    })
  }

  const userIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.2); position: relative;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; transform: scale(1.6);"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  })

  const handleSelectBranchInMap = (lat: number, lng: number) => {
    setInternalSelectedBranch({ lat, lng, timestamp: Date.now() })
  }

  return (
    <div 
      className={`
        mt-4 border border-[#3A3835]/10 transition-all duration-300 ease-in-out
        ${isFullscreen 
          /* 🔥 1. แก้ไขตรงนี้ครับนาย! จากเดิม fixed inset-0 ร่นขอบบนลงมาหลบใต้เนวบาร์ดื้อๆ ด้วย top-[88px] 
             และปรับระดับความลึกให้อยู่ระนาบพอดีเป๊ะ ไม่โดนสับหัวขาดแล้วครับนายครับ */
          ? 'fixed top-[88px] left-0 right-0 bottom-0 w-screen h-[calc(100vh-88px)] z-[9000] m-0 rounded-none bg-[#EAE7E0]' 
          : 'relative w-full h-[350px] rounded-sm z-0' 
        }
      `}
    >
      
      <div className="absolute top-4 right-4 z-[10000] flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-white text-[#3A3835] border border-[#3A3835]/10 p-3 rounded-xl shadow-md hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center"
          title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6m-6 12v4.5M15 15h4.5M15 15l6 6m-6-6v4.5M9 15H4.5M9 15l-6 6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>

        <button
          onClick={handleLocateMe}
          className="bg-white text-[#3b82f6] border border-[#3A3835]/10 p-3 rounded-xl shadow-md hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center"
          title="My Location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
        </button>
      </div>

      {isFullscreen && (
        /* 🔥 2. ปรับระยะความสูงของกล่องลิสต์ด้านซ้าย (max-h) ให้หดลงหลบระนาบ 88px เพื่อไม่ให้ทลักขอบตูดจอครับนายครับ */
        <div className="absolute top-4 left-4 z-[10000] w-80 max-h-[calc(100vh-120px)] overflow-y-auto bg-white/95 backdrop-blur-md border border-[#3A3835]/10 rounded-xl shadow-xl flex flex-col hide-scrollbar">
          <div className="p-4 border-b border-[#3A3835]/5 bg-white sticky top-0 z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#3A3835]">Available Branches</h3>
            <p className="text-[10px] text-gray-500 mt-1">{productName}</p>
          </div>
          
          <div className="flex flex-col p-2 gap-1">
            {activeStock.map((s: any, idx: number) => {
              const isSelected = internalSelectedBranch?.lat === Number(s.branches.latitude) && 
                                 internalSelectedBranch?.lng === Number(s.branches.longitude)
                                 
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (s.branches?.latitude && s.branches?.longitude) {
                      handleSelectBranchInMap(Number(s.branches.latitude), Number(s.branches.longitude))
                    }
                  }}
                  className={`flex justify-between items-center text-[11px] uppercase tracking-wider p-3 rounded-lg cursor-pointer transition-all duration-200 border 
                    ${isSelected 
                      ? 'bg-[#F5F2EB] border-[#84492C] shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-[#3A3835]/10'
                    }
                  `}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium ${isSelected ? 'text-[#84492C]' : 'text-[#3A3835]'}`}>
                      {s.branches?.branch_name || 'Unknown Branch'}
                    </span>
                    {s.distance !== null && s.distance !== undefined && (
                      <span className="text-[10px] text-[#3b82f6] font-medium font-mono lowercase tracking-normal flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {s.distance.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#84492C]"></span>
                      <span className="font-mono text-gray-500 font-semibold">{s.qty}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} 
                      className="text-[#8C8A86] hover:text-[#84492C] p-2 rounded-md transition-colors"
                      title="Get directions on Google Maps"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={12} 
        style={{ width: '100%', height: '100%', zIndex: 10 }}
        scrollWheelZoom={isFullscreen} 
        zoomControl={false} 
      >
        <MapController 
          userLocation={userLocation} 
          selectedBranch={internalSelectedBranch} 
          isFullscreen={isFullscreen}
          activeStock={activeStock}
        />

        <TileLayer
          attribution='© <a href="https://carto.com/" title="CARTO maps service">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {validLocations.map((stockItem, idx) => (
          <Marker 
            key={idx} 
            position={[stockItem.branches.latitude, stockItem.branches.longitude]}
            icon={createCustomIcon(stockItem.qty)}
          >
            <Popup className="font-sans border-none shadow-xl rounded-xl min-w-[150px]">
              <div className="flex flex-col items-center text-center p-1">
                <p className="text-[10px] uppercase tracking-widest text-[#8C8A86] mb-1">
                  Location
                </p>
                <p className="font-semibold text-[#3A3835] mb-2 text-sm">
                  {stockItem.branches.branch_name}
                </p>
                <p className="text-xs text-[#84492C] font-medium bg-[#F5F2EB] px-2 py-1 rounded-md inline-block w-full">
                  In Stock: {stockItem.qty}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${stockItem.branches.latitude},${stockItem.branches.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Get directions to ${stockItem.branches.branch_name} branch on Google Maps`}
                  className="mt-3 w-full bg-[#3a3835] text-white text-[10px] uppercase font-bold tracking-wider py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-[#84492C] transition-colors shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup className="font-sans border-none shadow-lg rounded-xl">
              <div className="text-center font-semibold text-sm text-[#3b82f6] px-2 py-1">
                Your Location
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .hide-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: #3A3835/10;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}