"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ClipboardEvent } from "react";
import { Camera, Image as ImageIcon, Loader2, ScanLine, Sparkles, UploadCloud, X, AlertCircle } from "lucide-react";
import styles from "./VisualImageSearch.module.css";

export type VisualSearchState = "default" | "loading" | "error" | "success";
export type VisualSearchPreviewState = "default" | "hover" | "focus" | "active";

export type ImageSearchResult = {
  imageUrl: string;
  name: string;
  matchedProductIds?: number[];
  matches?: Array<{
    id: number;
    name: string;
    sku: string;
    price: number;
    image_url: string;
    similarity: number;
  }>;
};

type VisualImageSearchProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onImageSearch?: (result: ImageSearchResult | null) => void;
  activeImage?: ImageSearchResult | null;
  state?: VisualSearchState;
  disabled?: boolean;
  preview?: boolean;
  previewState?: VisualSearchPreviewState;
  previewModalOpen?: boolean;
  className?: string;
};

export default function VisualImageSearch({
  value = "",
  placeholder = "SEARCH PROPS, SKU...",
  onChange,
  onImageSearch,
  activeImage = null,
  state = "default",
  disabled = false,
  preview = false,
  previewState = "default",
  previewModalOpen = false,
  className = "",
}: VisualImageSearchProps) {
  const [isModalOpen, setIsModalOpen] = useState(previewModalOpen);
  const [isDragging, setIsDragging] = useState(false);
  const [internalState, setInternalState] = useState<VisualSearchState>(state);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewModalOpen !== undefined && preview) {
      setIsModalOpen(previewModalOpen);
    }
  }, [previewModalOpen, preview]);

  useEffect(() => {
    if (!preview) {
      setInternalState(state);
    }
  }, [state, preview]);

  // Process Real Image File through Backend CLIP API
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WEBP)");
      setInternalState("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("ขนาดไฟล์ใหญ่เกิน 10MB กรุณาเลือกภาพที่ขนาดเล็กลง");
      setInternalState("error");
      return;
    }

    setErrorMessage(null);
    setInternalState("loading");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setAnalyzingImage(dataUrl);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/search/image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "เกิดข้อผิดพลาดในการค้นหาด้วยภาพ");
        }

        const data = await res.json();
        const matches = data.matches || [];
        const matchedProductIds = matches.map((m: any) => Number(m.id));

        const result: ImageSearchResult = {
          imageUrl: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
          matchedProductIds,
          matches,
        };

        setInternalState("success");
        onImageSearch?.(result);

        // Close modal after brief success feedback
        setTimeout(() => {
          setIsModalOpen(false);
          setAnalyzingImage(null);
          setInternalState("default");
        }, 500);
      } catch (err: any) {
        console.error("Image search error:", err);
        setErrorMessage(err.message || "ไม่สามารถวิเคราะห์ภาพได้ โปรดลองอีกครั้ง");
        setInternalState("error");
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processImageFile(file);
    }
    // reset input
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processImageFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Clipboard Paste (Cmd+V / Ctrl+V)
  const handlePaste = (e: ClipboardEvent<HTMLInputElement | HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          void processImageFile(file);
          break;
        }
      }
    }
  };

  const handleClearActiveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSearch?.(null);
  };

  const activeHoverClass = previewState === "hover" ? styles.isHover : "";
  const activeFocusClass = previewState === "focus" ? styles.isFocus : "";
  const activeActiveClass = previewState === "active" ? styles.isActive : "";

  return (
    <div className={`${styles.container} ${className}`} onPaste={handlePaste}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload image to search"
        className="hidden"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Main Search Bar Wrapper */}
      <div
        className={`${styles.searchWrapper} ${activeHoverClass} ${activeFocusClass} ${
          isDragging ? styles.isDragging : ""
        } ${activeImage ? styles.hasActiveImage : ""} ${disabled ? styles.isDisabled : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Active Image Badge inside Search Input */}
        {activeImage && (
          <div className={styles.activeImagePill} title={`Image Search: ${activeImage.name}`}>
            <img src={activeImage.imageUrl} alt="Search Reference" className={styles.activeThumbnail} />
            <span className={styles.pillLabel}>{activeImage.name || "IMAGE"}</span>
            <button
              type="button"
              onClick={handleClearActiveImage}
              className={styles.pillClearBtn}
              aria-label="Clear image search"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <input
          ref={searchInputRef}
          type="text"
          value={value}
          placeholder={activeImage ? "FILTER RESULTS BY TEXT..." : placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={styles.inputField}
        />

        {/* Action Buttons: Clear Text + Camera Lens Icon */}
        <div className={styles.actionsGroup}>
          {value && (
            <button
              type="button"
              onClick={() => onChange?.("")}
              className={styles.actionBtn}
              aria-label="Clear search text"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}

          {/* Visual Search Camera Icon */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
            aria-label="Search with image"
            title="ค้นหาด้วยภาพ (Drag & drop or Paste image)"
            className={`${styles.actionBtn} ${activeHoverClass} ${activeFocusClass} ${activeActiveClass} ${
              activeImage || isModalOpen ? styles.activeLens : ""
            }`}
          >
            {internalState === "loading" ? (
              <Loader2 size={13} className="animate-spin text-[#84492C]" />
            ) : (
              <Camera size={14} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Visual Search Dropzone Modal */}
      {isModalOpen && (
        <div
          className={styles.dropModalBackdrop}
          onClick={() => {
            if (internalState !== "loading") setIsModalOpen(false);
          }}
        >
          <div
            className={styles.dropModalCard}
            onClick={(e) => e.stopPropagation()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className={styles.modalHeader}>
              <div className="flex items-center gap-2">
                <ScanLine size={16} className="text-[#84492C]" />
                <h3 className={styles.modalTitle}>Search by Image</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={styles.modalCloseBtn}
                aria-label="Close image search modal"
              >
                <X size={14} />
              </button>
            </div>

            {internalState === "loading" ? (
              <div className={styles.analyzingBox}>
                <div className={styles.scanPreviewContainer}>
                  {analyzingImage && (
                    <img src={analyzingImage} alt="Scanning" className={styles.scanPreviewImage} />
                  )}
                  <div className={styles.scanLaser} />
                </div>
                <p className={styles.analyzingLabel}>Analyzing Visual Features...</p>
                <span className={styles.analyzingSubtitle}>Matching textures, shapes & color palettes</span>
              </div>
            ) : (
              <div>
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.isDragOver : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.dropIconWrap}>
                    <UploadCloud size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className={styles.dropPrimaryText}>ลากภาพมาวางที่นี่ หรือคลิกเพื่ออัปโหลด</p>
                    <p className={styles.dropSecondaryText}>รองรับไฟล์ JPG, PNG, WEBP (สูงสุด 10MB)</p>
                  </div>
                  <div className={styles.dropPasteBadge}>
                    <span>หรือกด</span>
                    <kbd className="px-1 py-0.5 bg-white border border-[#D5D2CA] rounded text-[8px]">⌘ V</kbd>
                    <span>/</span>
                    <kbd className="px-1 py-0.5 bg-white border border-[#D5D2CA] rounded text-[8px]">Ctrl V</kbd>
                    <span>เพื่อวางภาพ</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={13} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
