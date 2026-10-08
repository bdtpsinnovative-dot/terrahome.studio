"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Share2, Download, Copy, Check, X, Loader2, QrCode } from "lucide-react"
import QRCode from "qrcode"

export interface ProductShareData {
  id: string | number
  name: string
  sku: string
  imageUrl?: string
  price: number
  discountedPrice?: number | null
  discountValue?: number | null
  discountType?: string | null
  outOfStock?: boolean
  material?: string
  widthCm?: string | number
  lengthCm?: string | number
  heightCm?: string | number
  categoryName?: string
  url?: string
}

interface ProductShareCardModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductShareData
}

export default function ProductShareCardModal({
  isOpen,
  onClose,
  product,
}: ProductShareCardModalProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Check if browser supports native share with files
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true)
    }
  }, [])

  const generateCard = useCallback(async () => {
    setIsGenerating(true)
    setErrorMessage(null)

    try {
      const canvas = document.createElement("canvas")
      canvasRef.current = canvas

      // High-res dimensions: 1080 x 1440 px (3:4 aspect ratio)
      const width = 1080
      const height = 1440
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not initialize 2D context")

      // 1. Background fill
      ctx.fillStyle = "#F7F5F0"
      ctx.fillRect(0, 0, width, height)

      // 2. Subtle outer border & inner padding
      ctx.strokeStyle = "#E2DDD5"
      ctx.lineWidth = 2
      ctx.strokeRect(30, 30, width - 60, height - 60)

      // Corner accents
      const accentSize = 14
      ctx.fillStyle = "#84492C"
      // Top-left
      ctx.fillRect(28, 28, accentSize, 4)
      ctx.fillRect(28, 28, 4, accentSize)
      // Top-right
      ctx.fillRect(width - 28 - accentSize, 28, accentSize, 4)
      ctx.fillRect(width - 32, 28, 4, accentSize)
      // Bottom-left
      ctx.fillRect(28, height - 32, accentSize, 4)
      ctx.fillRect(28, height - 28 - accentSize, 4, accentSize)
      // Bottom-right
      ctx.fillRect(width - 28 - accentSize, height - 32, accentSize, 4)
      ctx.fillRect(width - 32, height - 28 - accentSize, 4, accentSize)

      // 3. Header: Brand Logo & Tagline
      ctx.textAlign = "center"
      ctx.fillStyle = "#3A3835"
      ctx.font = "normal 600 32px 'Optima', 'Didot', 'Bodoni MT', 'Cinzel', serif"
      ctx.fillText("TERRA HOME STUDIO", width / 2, 90)

      ctx.fillStyle = "#84492C"
      ctx.font = "normal 600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      ctx.fillText("C R A F T E D   F O R   C A L M   L I V I N G", width / 2, 120)

      // Divider line under header
      ctx.strokeStyle = "#DDD7CD"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(100, 142)
      ctx.lineTo(width - 100, 142)
      ctx.stroke()

      // 4. Product Image Container
      const imgBoxX = 60
      const imgBoxY = 165
      const imgBoxW = width - 120
      const imgBoxH = 650

      ctx.fillStyle = "#EDEAE3"
      ctx.beginPath()
      ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 6)
      ctx.fill()

      // Load Product Image (direct first since R2 supports CORS with Origin, proxy as fallback)
      if (product.imageUrl) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => {
              // Try fallback via proxy
              const fallback = new Image()
              fallback.crossOrigin = "anonymous"
              fallback.onload = () => {
                img.src = fallback.src
                resolve()
              }
              fallback.onerror = () => reject(new Error("Image failed to load"))
              fallback.src = `/api/proxy-image?url=${encodeURIComponent(product.imageUrl!)}`
            }
            img.src = product.imageUrl!
          })

          // Calculate aspect ratio containment
          const padding = 50
          const maxImgW = imgBoxW - padding * 2
          const maxImgH = imgBoxH - padding * 2
          const imgRatio = img.naturalWidth / img.naturalHeight
          let renderW = maxImgW
          let renderH = maxImgW / imgRatio

          if (renderH > maxImgH) {
            renderH = maxImgH
            renderW = maxImgH * imgRatio
          }

          const renderX = imgBoxX + (imgBoxW - renderW) / 2
          const renderY = imgBoxY + (imgBoxH - renderH) / 2

          ctx.drawImage(img, renderX, renderY, renderW, renderH)
        } catch {
          // Fallback if image fails to render
          ctx.fillStyle = "#8C8A86"
          ctx.font = "normal 16px sans-serif"
          ctx.fillText("TERRA HOME COLLECTION", width / 2, imgBoxY + imgBoxH / 2)
        }
      } else {
        ctx.fillStyle = "#8C8A86"
        ctx.font = "normal 16px sans-serif"
        ctx.fillText("TERRA HOME COLLECTION", width / 2, imgBoxY + imgBoxH / 2)
      }

      // 5. SKU & Category Badge
      const badgeY = 855
      const skuLabel = product.sku ? `SKU: ${product.sku}` : "COLLECTION ITEM"
      ctx.textAlign = "left"
      ctx.fillStyle = "#84492C"
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif"
      ctx.fillText(skuLabel.toUpperCase(), 70, badgeY)

      // 6. Product Title (wrap if needed)
      ctx.fillStyle = "#3A3835"
      ctx.font = "normal 700 36px 'Optima', 'Didot', 'Bodoni MT', serif"
      const title = product.name.toUpperCase()

      // Simple text wrapper
      const maxTitleWidth = width - 140
      const words = title.split(" ")
      let line = ""
      let lineY = badgeY + 45

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxTitleWidth && n > 0) {
          ctx.fillText(line.trim(), 70, lineY)
          line = words[n] + " "
          lineY += 44
        } else {
          line = testLine
        }
      }
      ctx.fillText(line.trim(), 70, lineY)

      // 7. Price Section
      const priceY = lineY + 52
      const isDiscounted =
        product.discountedPrice !== null &&
        product.discountedPrice !== undefined &&
        Number(product.discountedPrice) < Number(product.price)

      if (product.outOfStock) {
        ctx.fillStyle = "#DC2626"
        ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText("SOLD OUT", 70, priceY)
      } else if (isDiscounted) {
        const discPriceStr = `THB ${Number(product.discountedPrice).toLocaleString()}`
        const origPriceStr = `THB ${Number(product.price).toLocaleString()}`

        // Discounted Price
        ctx.fillStyle = "#84492C"
        ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText(discPriceStr, 70, priceY)

        const discMetrics = ctx.measureText(discPriceStr)
        const origX = 70 + discMetrics.width + 25

        // Original Strikethrough Price
        ctx.fillStyle = "#8C8A86"
        ctx.font = "normal 20px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText(origPriceStr, origX, priceY - 3)

        const origMetrics = ctx.measureText(origPriceStr)
        ctx.strokeStyle = "#8C8A86"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(origX, priceY - 10)
        ctx.lineTo(origX + origMetrics.width, priceY - 10)
        ctx.stroke()

        // Discount tag
        if (product.discountValue) {
          const discountTag =
            product.discountType === "PERCENT"
              ? `-${product.discountValue}%`
              : `-฿${product.discountValue}`
          const badgeX = origX + origMetrics.width + 16
          ctx.fillStyle = "#DC2626"
          ctx.fillRect(badgeX, priceY - 26, 70, 26)
          ctx.fillStyle = "#FFFFFF"
          ctx.font = "bold 13px sans-serif"
          ctx.textAlign = "center"
          ctx.fillText(discountTag, badgeX + 35, priceY - 8)
          ctx.textAlign = "left"
        }
      } else {
        const priceStr =
          product.price > 0 ? `THB ${Number(product.price).toLocaleString()}` : "POA"
        ctx.fillStyle = "#84492C"
        ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText(priceStr, 70, priceY)
      }

      // 8. Specifications Grid (Material, W x D x H)
      const specBoxY = priceY + 30
      const specBoxW = width - 140
      const specBoxH = 85

      ctx.fillStyle = "#EFECE5"
      ctx.beginPath()
      ctx.roundRect(70, specBoxY, specBoxW, specBoxH, 4)
      ctx.fill()

      const colW = specBoxW / 4
      const specsData = [
        { label: "MATERIAL", value: product.material || "-" },
        { label: "WIDTH", value: product.widthCm ? `${product.widthCm} cm` : "-" },
        { label: "DEPTH", value: product.lengthCm ? `${product.lengthCm} cm` : "-" },
        { label: "HEIGHT", value: product.heightCm ? `${product.heightCm} cm` : "-" },
      ]

      ctx.textAlign = "center"
      specsData.forEach((spec, i) => {
        const colCenterX = 70 + colW * i + colW / 2

        if (i > 0) {
          ctx.strokeStyle = "#DDD7CD"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(70 + colW * i, specBoxY + 15)
          ctx.lineTo(70 + colW * i, specBoxY + specBoxH - 15)
          ctx.stroke()
        }

        ctx.fillStyle = "#8C8A86"
        ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText(spec.label, colCenterX, specBoxY + 32)

        ctx.fillStyle = "#3A3835"
        ctx.font = "600 15px -apple-system, BlinkMacSystemFont, sans-serif"
        ctx.fillText(String(spec.value), colCenterX, specBoxY + 62)
      })

      // 9. Bottom Footer: QR Code & Website details
      const footerDividerY = specBoxY + specBoxH + 30
      ctx.strokeStyle = "#DDD7CD"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(70, footerDividerY)
      ctx.lineTo(width - 70, footerDividerY)
      ctx.stroke()

      const targetUrl =
        product.url || (typeof window !== "undefined" ? window.location.href : "https://terrahome-studio.com")

      // Generate high-contrast QR Code
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#3A3835",
          light: "#FFFFFF",
        },
      })

      const qrImg = new Image()
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = reject
        qrImg.src = qrDataUrl
      })

      const qrX = 70
      const qrY = footerDividerY + 22
      const qrSize = 110

      // White background card for QR code
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.roundRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4)
      ctx.fill()
      ctx.strokeStyle = "#DDD7CD"
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

      // Text next to QR code
      const textX = qrX + qrSize + 32
      ctx.textAlign = "left"

      ctx.fillStyle = "#3A3835"
      ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'LINESeedSansTH', sans-serif"
      ctx.fillText("สแกนเพื่อดูรายละเอียดสินค้าบนเว็บไซต์", textX, qrY + 32)

      ctx.fillStyle = "#84492C"
      ctx.font = "normal 14px -apple-system, BlinkMacSystemFont, sans-serif"
      ctx.fillText("terrahome-studio.com", textX, qrY + 62)

      ctx.fillStyle = "#8C8A86"
      ctx.font = "normal 12px -apple-system, BlinkMacSystemFont, sans-serif"
      ctx.fillText("Minimalist Ceramic & Home Decor • LINE: @terrahome", textX, qrY + 88)

      // Export canvas to Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setImageBlob(blob)
            setImageUrl(URL.createObjectURL(blob))
            setIsGenerating(false)
          } else {
            throw new Error("Canvas export failed")
          }
        },
        "image/png",
        0.95
      )
    } catch (err: any) {
      console.error("Card generation failed:", err)
      setErrorMessage("เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง")
      setIsGenerating(false)
    }
  }, [product])

  // Trigger generation when modal opens
  useEffect(() => {
    if (isOpen) {
      generateCard()
    } else {
      setImageBlob(null)
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
        setImageUrl(null)
      }
    }
  }, [isOpen, generateCard])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  // 1. Native Share (LINE, Messenger, AirDrop, Save Image)
  const handleNativeShare = async () => {
    if (!imageBlob) return
    const file = new File([imageBlob], `${product.sku || "product"}-terrahome.png`, {
      type: "image/png",
    })

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: product.name,
          text: `${product.name} | Terra Home Studio`,
        })
      } else if (navigator.share) {
        await navigator.share({
          title: product.name,
          url: product.url || window.location.href,
        })
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Share failed:", err)
      }
    }
  }

  // 2. Copy Image to Clipboard (Super fast for LINE PC / Facebook Chat)
  const handleCopyImage = async () => {
    if (!imageBlob) return
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": imageBlob,
          }),
        ])
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2500)
      } else {
        // Fallback: trigger download if clipboard API not available
        handleDownload()
      }
    } catch (err) {
      console.warn("Copy to clipboard failed:", err)
      handleDownload()
    }
  }

  // 3. Download Image
  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = `${product.sku || "terrahome-product"}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 4. Copy URL
  const handleCopyUrl = async () => {
    const url = product.url || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.warn("Copy URL failed:", err)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#FAF8F5] rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3A3835]/10 bg-[#F4F1EB]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#84492C]" />
            <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-[#3A3835]">
              การ์ดสินค้าสำหรับแชร์ (PRODUCT CARD)
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-[2px] text-[#8C8A86] hover:text-[#3A3835] hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Image Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[350px] bg-[#EAE7E0]/40">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#84492C]">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs uppercase tracking-wider font-medium text-[#3A3835]">
                กำลังสร้างรูปภาพระดับพรีเมียม...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-red-600 mb-4">{errorMessage}</p>
              <button
                onClick={generateCard}
                className="px-4 py-2 text-xs bg-[#84492C] text-white rounded-[2px]"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : imageUrl ? (
            <div className="relative group max-w-[340px] w-full shadow-lg rounded-[3px] overflow-hidden border border-[#3A3835]/10">
              <img
                src={imageUrl}
                alt="Product Share Card Preview"
                className="w-full h-auto block select-none"
              />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-[2px] tracking-wider uppercase backdrop-blur-sm pointer-events-none">
                PREVIEW 1080×1440
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#3A3835]/10 bg-[#FAF8F5] flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Native Share button (iOS/Android LINE, Messenger, etc.) */}
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={isGenerating || !imageBlob}
                className="col-span-2 py-3.5 px-4 bg-[#84492C] hover:bg-[#6e3b22] text-white text-[11px] font-bold tracking-[0.15em] uppercase rounded-[2px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                แชร์เข้า LINE / ส่งแชทลูกค้า
              </button>
            )}

            {/* Copy Image Button (Ctrl+V into chat instantly) */}
            <button
              onClick={handleCopyImage}
              disabled={isGenerating || !imageBlob}
              className={`py-3 px-3 border border-[#3A3835]/20 hover:border-[#84492C] text-[10px] font-bold tracking-[0.12em] uppercase rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 ${
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
                  คัดลอกรูปภาพ
                </>
              )}
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownload}
              disabled={isGenerating || !imageUrl}
              className={`py-3 px-3 bg-white border border-[#3A3835]/20 hover:border-[#84492C] text-[#3A3835] hover:text-[#84492C] text-[10px] font-bold tracking-[0.12em] uppercase rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 ${
                !canNativeShare ? "col-span-1" : ""
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              บันทึกรูป PNG
            </button>
          </div>

          {/* Quick Copy Link */}
          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full py-2 text-center text-[10px] text-[#8C8A86] hover:text-[#84492C] transition-colors flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-3 h-3" />
            {linkCopied ? "คัดลอกลิงก์หน้าเว็บเรียบร้อยแล้ว!" : "คัดลอกลิงก์หน้าสินค้านี้"}
          </button>
        </div>
      </div>
    </div>
  )
}
