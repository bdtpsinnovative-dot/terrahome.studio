"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Share2, Copy, Download, Check, X, Loader2, Smartphone, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import html2canvas from "html2canvas"
import { BRAND_DARK_LOGO_BASE64 } from "../constants/brandLogo"

export interface CatalogItem {
  id: string | number
  name: string
  sku?: string
  imageUrl?: string
  price?: number | null
  discountedPrice?: number | null
  discountValue?: number | null
  discountType?: string | null
  outOfStock?: boolean
}

interface PageScreenshotShareProps {
  categoryName?: string
  items: CatalogItem[]
  currentPage?: number
  totalPages?: number
  className?: string
  showFloatingButton?: boolean
}

function getCleanImageUrl(url?: string): string {
  if (!url) return ""
  if (url.startsWith("data:")) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}cors=1`
}

export default function PageScreenshotShare({
  categoryName = "ALL COLLECTIONS",
  items = [],
  currentPage = 1,
  totalPages = 1,
  className = "",
  showFloatingButton = true,
}: PageScreenshotShareProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"mobile" | "desktop">("mobile")
  const [itemsPerSheet, setItemsPerSheet] = useState<number>(8) // Default 8 items for beautiful proportions
  const [currentSheet, setCurrentSheet] = useState<number>(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [copySuccess, setCopySuccess] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [flashActive, setFlashActive] = useState(false)

  const mobileContainerRef = useRef<HTMLDivElement | null>(null)
  const desktopContainerRef = useRef<HTMLDivElement | null>(null)

  // Calculate sheets
  const totalSheets = Math.ceil(items.length / itemsPerSheet) || 1
  const sheetItems = items.slice((currentSheet - 1) * itemsPerSheet, currentSheet * itemsPerSheet)

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true)
    }
  }, [])

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Generate screenshot of the current tab & sheet
  const generateCapture = useCallback(async (tab: "mobile" | "desktop", sheetNum: number, perSheet: number) => {
    const container = tab === "mobile" ? mobileContainerRef.current : desktopContainerRef.current
    if (!container) return

    setIsGenerating(true)
    try {
      // Small pause to allow React render cycle to paint DOM
      await new Promise((r) => setTimeout(r, 100))

      // รอให้รูปภาพทั้งหมดใน Container โหลดและถอดรหัสเสร็จ 100% ก่อนแคปเจอร์
      const imgElements = Array.from(container.querySelectorAll("img"))
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete && img.naturalHeight > 0) {
            return img.decode ? img.decode().catch(() => {}) : Promise.resolve()
          }
          return new Promise<void>((resolve) => {
            let done = false
            const finish = () => {
              if (done) return
              done = true
              if (img.decode) {
                img.decode().then(() => resolve()).catch(() => resolve())
              } else {
                resolve()
              }
            }
            img.onload = finish
            img.onerror = () => {
              if (done) return
              done = true
              resolve()
            }
            // Timeout ป้องกันค้างไม่เกิน 3.5 วินาที
            setTimeout(finish, 3500)
          })
        })
      )

      await new Promise((r) => setTimeout(r, 100))

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: tab === "mobile" ? 2 : 1.5,
        backgroundColor: "#FAF8F5",
        logging: false,
        imageTimeout: 15000,
      })

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            setPreviewBlob(blob)
            setPreviewUrl(url)
          }
          setIsGenerating(false)
        },
        "image/png",
        0.92
      )
    } catch (err) {
      console.error("Screenshot capture error:", err)
      setIsGenerating(false)
    }
  }, [])

  // Open modal and generate initial capture
  const handleOpenModal = () => {
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 250)
    setIsModalOpen(true)
    generateCapture(activeTab, currentSheet, itemsPerSheet)
  }

  // Switch format tab
  const handleTabChange = (tab: "mobile" | "desktop") => {
    setActiveTab(tab)
    generateCapture(tab, currentSheet, itemsPerSheet)
  }

  // Change items per sheet (8, 12, 16, 40)
  const handleItemsPerSheetChange = (count: number) => {
    setItemsPerSheet(count)
    setCurrentSheet(1)
    generateCapture(activeTab, 1, count)
  }

  // Change sheet
  const handleSheetChange = (newSheet: number) => {
    if (newSheet < 1 || newSheet > totalSheets) return
    setCurrentSheet(newSheet)
    generateCapture(activeTab, newSheet, itemsPerSheet)
  }

  // 1. Copy Image to Clipboard (Ctrl+V)
  const handleCopyImage = async () => {
    if (!previewBlob) return
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": previewBlob,
          }),
        ])
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2500)
      } else {
        handleDownload()
      }
    } catch (err) {
      console.warn("Copy to clipboard failed:", err)
      handleDownload()
    }
  }

  // 2. Native Share (LINE, Messenger)
  const handleNativeShare = async () => {
    if (!previewBlob) return
    const filename = `terrahome-${activeTab}-sheet${currentSheet}.png`
    const file = new File([previewBlob], filename, { type: "image/png" })

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Terra Home Studio Collections",
          text: `รายการสินค้า Terra Home Studio (${categoryName} • แผ่นที่ ${currentSheet}/${totalSheets})`,
        })
      } else if (navigator.share) {
        await navigator.share({
          title: "Terra Home Studio Collections",
          url: window.location.href,
        })
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Native share error:", err)
      }
    }
  }

  // 3. Download Image
  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = `terrahome-${activeTab}-sheet${currentSheet}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      {/* Visual Flash effect */}
      {flashActive && (
        <div className="fixed inset-0 z-[9999] pointer-events-none bg-white/70 backdrop-blur-[2px] transition-opacity duration-300" />
      )}

      {/* 1. ปุ่ม Toolbar ข้างตัวกรอง */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`flex items-center gap-1.5 px-3 py-2 bg-[#84492C] hover:bg-[#6f3b23] text-white rounded-[2px] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] shadow-sm transition-all duration-200 active:scale-95 shrink-0 cursor-pointer ${className}`}
        title="แชร์ภาพหน้าจอแบบมือถือ หรือ แบบคอมพิวเตอร์"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>แชร์ภาพหน้าเว็บ</span>
      </button>

      {/* 2. ปุ่มลอยอยู่เหนือปุ่มสอบถามสินค้าอย่างลงตัว */}
      {showFloatingButton && (
        <div
          className="fixed z-40 no-screenshot"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + 3.4rem)",
          }}
          data-no-screenshot="true"
        >
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#3A3835] hover:bg-[#84492C] text-white rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] shadow-lg transition-all duration-200 active:scale-95 border border-white/20 cursor-pointer group"
            title="แชร์ภาพหน้าเว็บ (เลือกแบบมือถือ หรือ คอมพิวเตอร์)"
          >
            <div className="p-1 rounded-full bg-[#84492C] group-hover:bg-white text-white group-hover:text-[#84492C] transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span>แชร์ภาพหน้าเว็บ</span>
          </button>
        </div>
      )}

      {/* 3. Modal พรีวิว พร้อมแท็บเลือก: [แบบมือถือ] | [แบบหน้าจอคอม] + เลือกจำนวนสินค้าต่อแผ่น */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm no-screenshot"
          data-no-screenshot="true"
        >
          <div className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#3A3835]/10 bg-[#F4F1EB]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#84492C]" />
                <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-[#3A3835]">
                  แชร์ภาพหน้าเว็บ (เลือกรูปแบบและจำนวนสินค้า)
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="p-1 rounded-[2px] text-[#8C8A86] hover:text-[#3A3835] hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Bar: Format Switcher + Items Per Sheet Selector */}
            <div className="px-5 py-3 border-b border-[#3A3835]/10 bg-white flex flex-wrap items-center justify-between gap-3">
              {/* Format Switcher */}
              <div className="flex items-center gap-1 bg-[#F4F1EB] p-1 rounded-[3px]">
                <button
                  type="button"
                  onClick={() => handleTabChange("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "mobile"
                      ? "bg-[#84492C] text-white shadow-xs"
                      : "text-[#3A3835] hover:text-[#84492C]"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>มือถือ (2 คอลัมน์)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "desktop"
                      ? "bg-[#84492C] text-white shadow-xs"
                      : "text-[#3A3835] hover:text-[#84492C]"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>คอม (4 คอลัมน์)</span>
                </button>
              </div>

              {/* Items Per Sheet Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8A86] tracking-wider">
                  สินค้าต่อรูป:
                </span>
                <div className="flex items-center gap-1 bg-[#F4F1EB] p-1 rounded-[3px]">
                  {[8, 12, 16, 40].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleItemsPerSheetChange(count)}
                      className={`px-2.5 py-1 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer ${
                        itemsPerSheet === count
                          ? "bg-[#84492C] text-white shadow-xs"
                          : "text-[#3A3835] hover:bg-black/5"
                      }`}
                    >
                      {count === 40 ? "ทั้งหมด" : `${count} ชิ้น`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet Pagination Bar (if totalSheets > 1) */}
            {totalSheets > 1 && (
              <div className="px-5 py-2 border-b border-[#3A3835]/10 bg-[#FAF8F5] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#3A3835]">
                  <span>แผ่นที่ {currentSheet} จากทั้งหมด {totalSheets} แผ่น</span>
                  <span className="text-[10px] text-[#8C8A86] font-normal">
                    (แสดงสินค้าลำดับที่ {(currentSheet - 1) * itemsPerSheet + 1} - {Math.min(currentSheet * itemsPerSheet, items.length)})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentSheet === 1 || isGenerating}
                    onClick={() => handleSheetChange(currentSheet - 1)}
                    className="px-2.5 py-1 bg-white border border-[#3A3835]/15 hover:border-[#84492C] rounded-[2px] text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    ก่อนหน้า
                  </button>
                  <button
                    type="button"
                    disabled={currentSheet === totalSheets || isGenerating}
                    onClick={() => handleSheetChange(currentSheet + 1)}
                    className="px-2.5 py-1 bg-white border border-[#3A3835]/15 hover:border-[#84492C] rounded-[2px] text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    ถัดไป
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Body: Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] bg-[#EAE7E0]/40">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#84492C]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs uppercase tracking-wider font-semibold text-[#3A3835]">
                    กำลังเรนเดอร์ภาพแผ่นที่ {currentSheet} ({activeTab === "mobile" ? "หน้าจอมือถือ" : "หน้าจอคอม"})...
                  </p>
                </div>
              ) : previewUrl ? (
                <div className="relative max-w-full shadow-lg rounded-[2px] overflow-hidden border border-[#3A3835]/15 max-h-[50vh]">
                  <img
                    src={previewUrl}
                    alt="Captured Webpage Preview"
                    className="w-full h-auto block select-none max-h-[50vh] object-contain"
                  />
                </div>
              ) : (
                <button
                  onClick={() => generateCapture(activeTab, currentSheet, itemsPerSheet)}
                  className="px-4 py-2 text-xs bg-[#84492C] text-white rounded-[2px] cursor-pointer"
                >
                  ลองสร้างใหม่อีกครั้ง
                </button>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-[#3A3835]/10 bg-[#FAF8F5] flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Native Share for Mobile */}
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    disabled={isGenerating || !previewBlob}
                    className="col-span-2 py-3.5 px-4 bg-[#84492C] hover:bg-[#6e3b22] text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-[2px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    แชร์เข้า LINE / ส่งแชทลูกค้า (แผ่นที่ {currentSheet})
                  </button>
                )}

                {/* Copy Image (Ctrl+V into chat) */}
                <button
                  onClick={handleCopyImage}
                  disabled={isGenerating || !previewBlob}
                  className={`py-3 px-3 border border-[#3A3835]/20 hover:border-[#84492C] text-[10px] font-bold tracking-[0.12em] uppercase rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer ${
                    copySuccess
                      ? "bg-[#84492C] text-white border-[#84492C]"
                      : "bg-white text-[#3A3835] hover:text-[#84492C]"
                  } ${!canNativeShare ? "col-span-1" : ""}`}
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      คัดลอกรูปแล้ว! (วางในแชทได้เลย)
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      คัดลอกรูปภาพแผ่นที่ {currentSheet}
                    </>
                  )}
                </button>

                {/* Download PNG */}
                <button
                  onClick={handleDownload}
                  disabled={isGenerating || !previewUrl}
                  className={`py-3 px-3 bg-white border border-[#3A3835]/20 hover:border-[#84492C] text-[#3A3835] hover:text-[#84492C] text-[10px] font-bold tracking-[0.12em] uppercase rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer ${
                    !canNativeShare ? "col-span-1" : ""
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  บันทึกรูป PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* OFF-SCREEN RENDER CONTAINERS FOR 100% CRISP SCREENSHOTS   */}
      {/* ============================================================ */}

      {/* 1. MOBILE CONTAINER (720px width, 2 columns, beautiful proportions) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "720px",
          backgroundColor: "#F9F6F0",
          color: "#3A3835",
          padding: "36px 30px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          zIndex: -100,
        }}
        ref={mobileContainerRef}
      >
        {/* Brand Header with Exact Website Logo */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <img
            src={BRAND_DARK_LOGO_BASE64}
            alt="TERRA HOME STUDIO"
            width={170}
            height={57}
            style={{
              width: "170px",
              height: "57px",
              margin: "0 auto 12px auto",
              display: "block",
            }}
          />
          <div style={{ padding: "5px 14px", backgroundColor: "#EBE7DF", display: "inline-block", borderRadius: "2px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#3A3835", textTransform: "uppercase" }}>
            {categoryName} {totalSheets > 1 ? `• SHEET ${currentSheet}/${totalSheets}` : ""}
          </div>
        </div>

        {/* 2-Column Product Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {sheetItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "3px",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "1px solid rgba(58,56,53,0.08)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              {/* Product Image */}
              <div style={{ width: "100%", height: "200px", backgroundColor: "#FAF8F5", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", overflow: "hidden" }}>
                {item.imageUrl ? (
                  <img src={getCleanImageUrl(item.imageUrl)}
                    alt={item.name}
                    crossOrigin="anonymous"
                    style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain", mixBlendMode: "multiply" }}
                  />
                ) : (
                  <span style={{ fontSize: "10px", color: "#8C8A86", textTransform: "uppercase", letterSpacing: "0.1em" }}>NO IMAGE</span>
                )}
              </div>

              {/* Product Info */}
              <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", margin: "0 0 6px 0", color: "#3A3835", lineHeight: 1.3, maxHeight: "28px", overflow: "hidden" }}>
                {item.name}
              </h3>

              {item.outOfStock ? (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#84492C", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  PRE-ORDER
                </span>
              ) : item.discountedPrice && item.price && item.discountedPrice < item.price ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9px", color: "#8C8A86", textDecoration: "line-through" }}>
                    THB {Number(item.price).toLocaleString()}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#84492C" }}>
                    THB {Number(item.discountedPrice).toLocaleString()}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#3A3835" }}>
                  {item.price && item.price > 0 ? `THB ${Number(item.price).toLocaleString()}` : "POA"}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #D5CFC5", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#3A3835", fontWeight: 600, letterSpacing: "0.05em" }}>
            terrahome-studio.com
          </span>
          <span style={{ fontSize: "10px", color: "#84492C", fontWeight: 600, letterSpacing: "0.05em" }}>
            Minimalist Ceramic & Home Decor
          </span>
        </div>
      </div>

      {/* 2. DESKTOP CONTAINER (1320px width, 4 columns, wide elegant look) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "1320px",
          backgroundColor: "#F9F6F0",
          color: "#3A3835",
          padding: "44px 40px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          zIndex: -100,
        }}
        ref={desktopContainerRef}
      >
        {/* Brand Header with Exact Website Logo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #D5CFC5", paddingBottom: "18px", marginBottom: "26px" }}>
          <div>
            <img
              src={BRAND_DARK_LOGO_BASE64}
              alt="TERRA HOME STUDIO"
              width={180}
              height={60}
              style={{
                width: "180px",
                height: "60px",
                display: "block",
              }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ padding: "7px 16px", backgroundColor: "#EBE7DF", borderRadius: "2px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#3A3835", textTransform: "uppercase" }}>
              {categoryName} {totalSheets > 1 ? `• SHEET ${currentSheet}/${totalSheets}` : ""}
            </span>
          </div>
        </div>

        {/* 4-Column Product Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
          {sheetItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "3px",
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "1px solid rgba(58,56,53,0.08)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              {/* Product Image */}
              <div style={{ width: "100%", height: "220px", backgroundColor: "#FAF8F5", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", overflow: "hidden" }}>
                {item.imageUrl ? (
                  <img src={getCleanImageUrl(item.imageUrl)}
                    alt={item.name}
                    crossOrigin="anonymous"
                    style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain", mixBlendMode: "multiply" }}
                  />
                ) : (
                  <span style={{ fontSize: "11px", color: "#8C8A86", textTransform: "uppercase", letterSpacing: "0.1em" }}>NO IMAGE</span>
                )}
              </div>

              {/* Product Info */}
              <h3 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", margin: "0 0 8px 0", color: "#3A3835", lineHeight: 1.3, maxHeight: "30px", overflow: "hidden" }}>
                {item.name}
              </h3>

              {item.outOfStock ? (
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#84492C", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  PRE-ORDER
                </span>
              ) : item.discountedPrice && item.price && item.discountedPrice < item.price ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#8C8A86", textDecoration: "line-through" }}>
                    THB {Number(item.price).toLocaleString()}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#84492C" }}>
                    THB {Number(item.discountedPrice).toLocaleString()}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#3A3835" }}>
                  {item.price && item.price > 0 ? `THB ${Number(item.price).toLocaleString()}` : "POA"}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #D5CFC5", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#3A3835", fontWeight: 600, letterSpacing: "0.08em" }}>
            terrahome-studio.com
          </span>
          <span style={{ fontSize: "12px", color: "#84492C", fontWeight: 600, letterSpacing: "0.08em" }}>
            Minimalist Ceramic & Home Decor Objects
          </span>
        </div>
      </div>
    </>
  )
}
