"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, X, Maximize2, Sparkles } from "lucide-react";
import Footer from "@/app/components/Footer";
import { createClient } from "@/src/supabase/client";

const HERO_BANNERS = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170108353-289.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781493997242-568.webp",
];

interface JournalCategoryItem {
  id: string;
  number: string;
  title_en: string;
  title_th: string;
  slug: string;
  category_query: string;
  description_en: string;
  description_th: string;
  cover_image_url: string | null;
  images: { id: number; image_url: string; alt_text?: string }[];
}

/**
 * คำนวณตำแหน่ง Grid ให้มีรูปใหญ่ 2x2 ถึง 3 รูปต่อหมวดหมู่ สลับซ้าย-ขวาลงตัว
 */
function getImageGridStyle(imgIdx: number, isEven: boolean, totalImages: number) {
  // หากรูปน้อยกว่า 6 รูป ให้แสดงตามปกติ
  if (totalImages < 6) {
    if (imgIdx === 0) {
      return {
        className: "col-span-2 md:col-span-2 md:row-span-2 aspect-square",
        isHero: true,
      };
    }
    return {
      className: "col-span-1 aspect-square",
      isHero: false,
    };
  }

  // รูปแบบการวางรูปใหญ่ 3 รูป (Left -> Right -> Left หรือ Right -> Left -> Right)
  if (isEven) {
    switch (imgIdx) {
      case 0:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1 aspect-square", isHero: true };
      case 1:
        return { className: "col-span-1 md:col-start-3 md:row-start-1 aspect-square", isHero: false };
      case 2:
        return { className: "col-span-1 md:col-start-3 md:row-start-2 aspect-square", isHero: false };
      case 3:
        return { className: "col-span-1 md:col-start-1 md:row-start-3 aspect-square", isHero: false };
      case 4:
        return { className: "col-span-1 md:col-start-1 md:row-start-4 aspect-square", isHero: false };
      case 5:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-2 md:row-start-3 aspect-square", isHero: true };
      case 6:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-5 aspect-square", isHero: true };
      case 7:
        return { className: "col-span-1 md:col-start-3 md:row-start-5 aspect-square", isHero: false };
      case 8:
        return { className: "col-span-1 md:col-start-3 md:row-start-6 aspect-square", isHero: false };
      default:
        return { className: "col-span-1 aspect-square", isHero: false };
    }
  } else {
    switch (imgIdx) {
      case 0:
        return { className: "col-span-1 md:col-start-1 md:row-start-1 aspect-square", isHero: false };
      case 1:
        return { className: "col-span-1 md:col-start-1 md:row-start-2 aspect-square", isHero: false };
      case 2:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-2 md:row-start-1 aspect-square", isHero: true };
      case 3:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-3 aspect-square", isHero: true };
      case 4:
        return { className: "col-span-1 md:col-start-3 md:row-start-3 aspect-square", isHero: false };
      case 5:
        return { className: "col-span-1 md:col-start-3 md:row-start-4 aspect-square", isHero: false };
      case 6:
        return { className: "col-span-1 md:col-start-1 md:row-start-5 aspect-square", isHero: false };
      case 7:
        return { className: "col-span-1 md:col-start-1 md:row-start-6 aspect-square", isHero: false };
      case 8:
        return { className: "col-span-2 md:col-span-2 md:row-span-2 md:col-start-2 md:row-start-5 aspect-square", isHero: true };
      default:
        return { className: "col-span-1 aspect-square", isHero: false };
    }
  }
}

export default function JournalPage() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [categories, setCategories] = useState<JournalCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; categoryQuery: string } | null>(null);

  // Banner Slideshow Auto Rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Live Categories and Images from Supabase
  useEffect(() => {
    async function fetchJournal() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("journal_categories")
          .select(`
            *,
            images:journal_images ( id, image_url, sort_order, alt_text, is_active )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: JournalCategoryItem[] = data.map((cat: any) => {
            const rawImgs = (cat.images || []).filter((i: any) => i.is_active);
            rawImgs.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

            return {
              id: cat.id,
              number: String(cat.sort_order || 1).padStart(2, "0"),
              title_en: cat.title_en,
              title_th: cat.title_th || cat.title_en,
              slug: cat.slug,
              category_query: cat.category_query || cat.title_en,
              description_en: cat.description_en || "",
              description_th: cat.description_th || "",
              cover_image_url: cat.cover_image_url || (rawImgs[0]?.image_url ?? null),
              images: rawImgs,
            };
          });
          setCategories(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch live journal categories:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJournal();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1A18] selection:bg-[#84492C] selection:text-[#FAF7F2] flex flex-col font-sans">
      
      {/* =========================================================================
          1. TOP HERO BANNER (Full-Width Edge-to-Edge หรูหรา ไร้รอยต่อ)
          ========================================================================= */}
      <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden bg-[#241C18]">
        {HERO_BANNERS.map((src, idx) => (
          <motion.img
            key={`${src}-${idx}`}
            src={src}
            alt={`Terra Studio Journal Hero Slide ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover object-[center_75%]"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{
              opacity: idx === currentBannerIndex ? 1 : 0,
              scale: idx === currentBannerIndex ? 1 : 1.05,
            }}
            transition={{
              opacity: { duration: 1.6, ease: "easeInOut" },
              scale: { duration: 6, ease: "easeOut" },
            }}
          />
        ))}

        {/* Top Navbar Dimmer & Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />

        {/* ชั้นไล่สีครีมละลายขอบล่างกลืนกับพื้นหลังหน้าเว็บ */}
        <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/60 to-transparent pointer-events-none z-20" />
        
        <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-12 lg:left-16 text-white z-30">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[10px] sm:text-[11px] font-medium tracking-[0.35em] uppercase block mb-1.5 drop-shadow-sm"
          >
            Terra Studio Editorial
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-[0.12em] font-light drop-shadow-md"
          >
            Living With Art & Design
          </motion.h1>
        </div>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12 lg:right-16 flex gap-2.5 z-30">
          {HERO_BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentBannerIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-400 drop-shadow-sm cursor-pointer ${
                i === currentBannerIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          2. LUXURY EDITORIAL CATEGORY SECTIONS (Scroll Animation Reveal สุดสมูท)
          ========================================================================= */}
      <main className="max-w-[1400px] mx-auto w-full px-4 sm:px-8 lg:px-12 pt-16 md:pt-24 pb-36 flex-1">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center text-[#84492C] gap-3">
            <div className="w-8 h-8 border-2 border-[#84492C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs uppercase tracking-widest text-[#736B63]">Loading Editorial Collections...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-32 text-center text-[#736B63]">
            <p className="text-sm">ไม่พบรูปภาพในระบบ</p>
          </div>
        ) : (
          <div className="space-y-32 md:space-y-48">
            {categories.map((category, catIndex) => {
              const isEven = catIndex % 2 === 0;

              return (
                <motion.section
                  key={category.id}
                  id={category.slug}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px", amount: 0.08 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-8 md:space-y-12"
                >
                  {/* Section Header สไตล์ Luxury Editorial สลับฝั่ง ซ้าย-ขวา */}
                  <div
                    className={`flex flex-col md:flex-row md:items-end justify-between gap-6 pb-5 border-b border-[#1C1A18]/10 ${
                      isEven ? "" : "md:flex-row-reverse"
                    }`}
                  >
                    {/* Text Block */}
                    <motion.div
                      initial={{ opacity: 0, x: isEven ? -25 : 25 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className={`space-y-3 ${isEven ? "text-left" : "md:text-right"}`}
                    >
                      {/* Number + Thai Title Badge */}
                      <div className={`flex items-center gap-2 ${isEven ? "justify-start" : "md:justify-end"}`}>
                        <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] text-[#84492C] uppercase">
                          {category.number}
                        </span>
                        <span className="text-[#84492C]/40 text-xs font-light">—</span>
                        <span className="text-xs sm:text-[13.5px] font-semibold text-[#84492C] tracking-normal">
                          {category.title_th}
                        </span>
                      </div>

                      {/* Main Title English */}
                      <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] uppercase tracking-[0.1em] text-[#1C1A18] font-light leading-tight">
                        {category.title_en}
                      </h2>

                      {/* Descriptions (English & Thai) */}
                      <div className={`space-y-1.5 max-w-2xl ${isEven ? "" : "md:ml-auto"}`}>
                        {category.description_en && (
                          <p className="text-xs sm:text-[14.5px] text-[#2D2824] leading-relaxed font-normal">
                            {category.description_en}
                          </p>
                        )}
                        {category.description_th && (
                          <p className="text-xs sm:text-[14px] text-[#554C43] leading-relaxed font-normal">
                            {category.description_th}
                          </p>
                        )}
                      </div>
                    </motion.div>

                    {/* Explore Link */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.25 }}
                      className="shrink-0 pb-1"
                    >
                      <Link
                        href={`/prop?category=${encodeURIComponent(category.category_query)}`}
                        className={`group inline-flex items-center gap-2 text-[11px] sm:text-[12px] font-medium tracking-[0.25em] uppercase text-[#84492C] border-b border-[#84492C]/40 pb-1 hover:border-[#84492C] transition-all duration-300 ${
                          isEven ? "" : "flex-row-reverse"
                        }`}
                      >
                        <span>Explore {category.title_en}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Grid of Images with Multiple 2x2 Feature Tiles (Scroll Reveal แบบ Cascade Stagger) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                    {category.images.map((img, imgIdx) => {
                      const { className: gridPlacement, isHero } = getImageGridStyle(imgIdx, isEven, category.images.length);

                      return (
                        <Link
                          key={img.id}
                          href={`/collections/${category.slug}/${img.id}`}
                          className={`group relative rounded-2xl md:rounded-3xl overflow-hidden bg-[#F4EFEA] border border-[#E7E2D9]/80 shadow-xs hover:shadow-2xl transition-all duration-500 cursor-pointer block ${gridPlacement}`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 35, scale: 0.97 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-40px", amount: 0.12 }}
                            transition={{
                              duration: 0.7,
                              delay: (imgIdx % 3) * 0.1,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            whileHover={{ y: -6, transition: { duration: 0.3, ease: "easeOut" } }}
                            className="w-full h-full relative"
                          >
                            <img
                              src={img.image_url}
                              alt={img.alt_text || `${category.title_en} image ${imgIdx + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106 select-none"
                            />

                            {/* Hero Badge for 2x2 Feature Images */}
                            {isHero && (
                              <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-medium tracking-[0.2em] uppercase border border-white/20">
                                <Sparkles size={11} className="text-[#F2C94C]" />
                                <span>Featured Collection</span>
                              </div>
                            )}

                            {/* Subtle Luxury Gradient Overlay on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4 sm:p-6">
                              <span className="text-[11px] sm:text-xs tracking-[0.25em] text-white uppercase font-medium drop-shadow-sm">
                                ดูสินค้าในภาพนี้
                              </span>
                              <div className="p-2 rounded-full bg-white/95 text-[#1C1A18] shadow-md backdrop-blur-xs">
                                <ArrowUpRight size={16} />
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          3. LIGHTBOX MODAL (คลิกดูรูปขยายใหญ่คมชัด พร้อมปุ่มไปดูสินค้า)
          ========================================================================= */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] w-full bg-[#FDFBF7] rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 md:p-10 cursor-default border border-[#E5DFD5]"
            >
              {/* Close Button (z-50 ไม่โดนบัง และกดง่ายชัดเจน 100%) */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white text-[#1C1A18] hover:bg-[#84492C] hover:text-white shadow-lg border border-[#E5DFD5] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                title="ปิดหน้าต่าง"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2.5} />
              </button>

              <div className="w-full flex-1 min-h-[260px] max-h-[58vh] flex items-center justify-center p-2 pt-8 sm:pt-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-w-full max-h-[52vh] object-contain drop-shadow-md rounded-xl"
                />
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-[#E5DFD5] mt-auto">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-[#84492C]">
                    Collection
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl uppercase tracking-wider text-[#1C1A18] font-light">
                    {previewImage.title}
                  </h3>
                </div>

                <Link
                  href={`/prop?category=${encodeURIComponent(previewImage.categoryQuery)}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#84492C] hover:bg-[#6c3920] text-white text-xs font-semibold tracking-[0.2em] uppercase rounded-full shadow-sm transition-all cursor-pointer"
                >
                  <span>View in Store</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}