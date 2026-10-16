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

interface JournalProductItem {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  image_url: string | null;
  status?: string | null;
}

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
  images: {
    id: number;
    image_url: string;
    alt_text?: string;
    products: JournalProductItem[];
  }[];
}

/**
 * คำนวณตำแหน่ง Grid ให้มีรูปใหญ่ 2x2 สลับซ้าย-ขวาอย่างสมดุล ต่อเนื่องไปตลอดทั้งหมวดหมู่
 * รองรับรูปจำนวนมาก (เช่น 10 - 60+ รูป) โดยรูปใหญ่จะโผล่มาสม่ำเสมอทุกๆ 6 รูป
 */
function getImageGridStyle(imgIdx: number, isEven: boolean, totalImages: number) {
  // หากรูปน้อยกว่า 4 รูป ให้รูปแรกเป็นรูปใหญ่
  if (totalImages < 4) {
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

  // รอบละ 6 รูป (Repeating Magazine Pattern Loop)
  const blockSize = 6;
  const blockIdx = Math.floor(imgIdx / blockSize);
  const posInBlock = imgIdx % blockSize;

  // สลับตำแหน่งรูปใหญ่ ซ้าย-ขวา ตามรอบ block และลำดับหมวดหมู่
  const isLeftHeroBlock = (blockIdx + (isEven ? 0 : 1)) % 2 === 0;

  if (isLeftHeroBlock) {
    // บล็อก A: รูปใหญ่อยู่ซ้าย (รูปที่ 0 ของบล็อกเป็นรูปใหญ่ 2x2)
    if (posInBlock === 0) {
      return {
        className: "col-span-2 md:col-span-2 md:row-span-2 aspect-square",
        isHero: true,
      };
    }
    return {
      className: "col-span-1 aspect-square",
      isHero: false,
    };
  } else {
    // บล็อก B: รูปใหญ่อยู่ขวา (รูปที่ 2 ของบล็อกเป็นรูปใหญ่ 2x2)
    if (posInBlock === 2) {
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
}

export default function JournalPage() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [categories, setCategories] = useState<JournalCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; categoryQuery: string } | null>(null);
  const [setPromotionsMap, setSetPromotionsMap] = useState<Record<string, any>>({});

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
        const nowIso = new Date().toISOString();

        const [categoriesRes, promosRes] = await Promise.all([
          supabase
            .from("journal_categories")
            .select(`
              *,
              images:journal_images (
                id,
                image_url,
                sort_order,
                alt_text,
                is_active,
                products_link:journal_image_products (
                  sort_order,
                  product:products (
                    id,
                    name,
                    sku,
                    price,
                    image_url,
                    status
                  )
                )
              )
            `)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("terra_collection_promotions")
            .select(`
              id,
              title,
              promo_scope,
              collection_group_id,
              trigger_type,
              discount_type,
              discount_value,
              start_date,
              end_date,
              usage_limit,
              used_count,
              is_active
            `)
            .eq("is_active", true)
            .eq("trigger_type", "auto"),
        ]);

        if (categoriesRes.error) throw categoriesRes.error;

        if (promosRes.data) {
          const pMap: Record<string, any> = {};
          promosRes.data.forEach((p: any) => {
            if (p.start_date && p.start_date > nowIso) return;
            if (p.end_date && p.end_date < nowIso) return;
            if (p.usage_limit && p.used_count >= p.usage_limit) return;
            if (p.collection_group_id) {
              pMap[String(p.collection_group_id)] = p;
            }
          });
          setSetPromotionsMap(pMap);
        }

        if (categoriesRes.data && categoriesRes.data.length > 0) {
          const mapped: JournalCategoryItem[] = categoriesRes.data.map((cat: any) => {
            const rawImgs = (cat.images || []).filter((i: any) => i.is_active);
            rawImgs.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

            const imagesWithProds = rawImgs.map((img: any) => {
              const pLinks = (img.products_link || []).filter((pl: any) => pl && pl.product);
              pLinks.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
              const prods: JournalProductItem[] = pLinks.map((pl: any) => ({
                id: Number(pl.product.id),
                name: pl.product.name || "ไม่มีชื่อสินค้า",
                sku: pl.product.sku || null,
                price: pl.product.price !== null && pl.product.price !== undefined ? Number(pl.product.price) : null,
                image_url: pl.product.image_url || null,
                status: pl.product.status || null,
              }));

              return {
                id: img.id,
                image_url: img.image_url,
                alt_text: img.alt_text,
                products: prods,
              };
            });

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
              images: imagesWithProds,
            };
          });
          setCategories(mapped.filter((c) => c.images.length > 0));
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
    <div className="min-h-screen bg-[#EAE7E0] text-[#3A3835] selection:bg-[#C8A97E]/20 selection:text-[#3A3835] flex flex-col font-sans">
      
      {/* =========================================================================
          1. TOP HERO BANNER (Full-Width Edge-to-Edge หรูหรา ไร้รอยต่อ)
          ========================================================================= */}
      <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden bg-[#241C18] border-b border-[#D5D2CA]/70">
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

        {/* ชั้นไล่สีละลายขอบล่างกลืนกับพื้นหลังหน้าเว็บ */}
        <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#EAE7E0] via-[#EAE7E0]/60 to-transparent pointer-events-none z-20" />
        
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

        {/* Slide Indicator Lines */}
        <div className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12 lg:right-16 flex gap-2 z-30">
          {HERO_BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentBannerIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-0.5 transition-all duration-400 drop-shadow-sm cursor-pointer ${
                i === currentBannerIndex ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          2. LUXURY EDITORIAL CATEGORY SECTIONS
          ========================================================================= */}
      <main className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-36 flex-1">
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
                <section
                  key={category.id}
                  id={category.slug}
                  className="space-y-8 md:space-y-12"
                >
                  {/* Section Header สไตล์ Luxury Editorial สลับฝั่ง ซ้าย-ขวา */}
                  <div
                    className={`flex flex-col md:flex-row md:items-end justify-between gap-6 pb-5 border-b border-[#D5D2CA]/70 ${
                      isEven ? "" : "md:flex-row-reverse"
                    }`}
                  >
                    {/* Text Block */}
                    <div
                      className={`space-y-2.5 ${isEven ? "text-left" : "md:text-right"}`}
                    >
                      {/* Number + Thai Title Badge */}
                      <div className={`flex items-center gap-2 ${isEven ? "justify-start" : "md:justify-end"}`}>
                        <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#84492C] uppercase">
                          {category.number}
                        </span>
                        <span className="text-[#84492C]/40 text-xs font-light">—</span>
                        <span className="text-xs sm:text-[13px] font-medium text-[#8C8A86] tracking-normal">
                          {category.title_th}
                        </span>
                      </div>

                      {/* Main Title English */}
                      <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl uppercase tracking-[0.1em] text-[#3A3835] font-normal leading-tight">
                        {category.title_en}
                      </h2>

                      {/* Descriptions (English & Thai) */}
                      <div className={`space-y-1 max-w-2xl ${isEven ? "" : "md:ml-auto"}`}>
                        {category.description_en && (
                          <p className="text-xs sm:text-[13.5px] text-[#5A544F] leading-relaxed font-normal">
                            {category.description_en}
                          </p>
                        )}
                        {category.description_th && (
                          <p className="text-xs sm:text-[13px] text-[#7A736B] leading-relaxed font-normal">
                            {category.description_th}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Explore Link */}
                    <div className="shrink-0 pb-1">
                      <Link
                        href={`/prop?category=${encodeURIComponent(category.category_query)}`}
                        className={`group inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-medium tracking-[0.25em] uppercase text-[#84492C] border-b border-[#84492C]/40 hover:border-[#3A3835] hover:text-[#3A3835] pb-1 transition-all duration-300 ${
                          isEven ? "" : "flex-row-reverse"
                        }`}
                      >
                        <span>Explore {category.title_en}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>

                  {/* Grid of Images: Architectural Studio Lookbook Grid with Flush Borders */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-dense border-t border-l border-[#D5D2CA]/70 w-full relative">
                    {category.images.map((img, imgIdx) => {
                      const { className: gridPlacement, isHero } = getImageGridStyle(imgIdx, isEven, category.images.length);
                      const validPrices = (img.products || [])
                        .map((p) => p.price)
                        .filter((p): p is number => typeof p === "number" && p > 0);
                      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                      const promo = setPromotionsMap[String(img.id)];

                      return (
                        <Link
                          key={img.id}
                          href={`/collections/${category.slug}/${img.id}`}
                          className={`group relative overflow-hidden bg-[#F4F1EB] border-r border-b border-[#D5D2CA]/70 transition-colors duration-500 cursor-pointer block ${gridPlacement}`}
                        >
                          <div className="w-full h-full relative overflow-hidden">
                            <img
                              src={img.image_url}
                              alt={img.alt_text || `${category.title_en} image ${imgIdx + 1}`}
                              loading={imgIdx < 6 ? "eager" : "lazy"}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none"
                            />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                              {isHero ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[#3A3835]/85 backdrop-blur-xs text-white text-[8px] font-bold tracking-[0.18em] uppercase shadow-xs">
                                  <Sparkles size={10} className="text-[#C8A97E]" />
                                  <span>Featured Look</span>
                                </div>
                              ) : <span />}

                              {promo && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-[2px] bg-[#84492C] text-white text-[8px] font-bold tracking-wider uppercase shadow-xs">
                                  <span>เซ็ตลด {promo.discount_type === "percentage" ? `${promo.discount_value}%` : `฿${Number(promo.discount_value).toLocaleString()}`}</span>
                                </div>
                              )}
                            </div>

                            {/* Dark Gradient Overlay for bottom readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                            {/* Bottom Product Info Bar */}
                            {img.products && img.products.length > 0 ? (
                              <div className="absolute bottom-0 inset-x-0 z-20 p-2.5 sm:p-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
                                <div className="flex items-center justify-between gap-2">
                                  {/* Products Thumbnail Strip */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex -space-x-1 shrink-0">
                                      {img.products.slice(0, 3).map((prod, pIdx) => (
                                        <div
                                          key={prod.id || pIdx}
                                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-[1px] border border-white/30 overflow-hidden bg-white/20 shrink-0"
                                        >
                                          {prod.image_url ? (
                                            <img
                                              src={prod.image_url}
                                              alt={prod.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[9px] text-white/70">
                                              🏺
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="text-[10px] sm:text-[11px] font-medium text-white tracking-wide truncate leading-tight">
                                        {img.products.length === 1 ? img.products[0].name : `${img.products.length} ชิ้นในลุคนี้`}
                                      </p>
                                      <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-[#C8A97E] leading-tight">
                                        {minPrice !== null ? `เริ่มต้น ฿${minPrice.toLocaleString()}` : "ดูรายละเอียดสินค้า"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* View Arrow Icon */}
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[1px] bg-white/90 text-[#3A3835] flex items-center justify-center shrink-0 group-hover:bg-[#84492C] group-hover:text-white transition-colors duration-300">
                                    <ArrowUpRight size={13} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Fallback overlay if no products linked */
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3 sm:p-4 z-20">
                                <span className="text-[9px] sm:text-[10px] tracking-[0.25em] text-white uppercase font-medium">
                                  ดูสินค้าในภาพนี้
                                </span>
                                <div className="p-1.5 rounded-[1px] bg-white text-[#3A3835]">
                                  <ArrowUpRight size={13} />
                                </div>
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] w-full bg-[#EAE7E0] rounded-[2px] overflow-hidden shadow-2xl flex flex-col items-center p-6 md:p-10 cursor-default border border-[#D5D2CA]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-50 p-2 rounded-[2px] bg-white text-[#3A3835] hover:bg-[#84492C] hover:text-white shadow-sm border border-[#D5D2CA] transition-all cursor-pointer flex items-center justify-center"
                title="ปิดหน้าต่าง"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} />
              </button>

              <div className="w-full flex-1 min-h-[260px] max-h-[58vh] flex items-center justify-center p-2 pt-8 sm:pt-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-w-full max-h-[52vh] object-contain drop-shadow-sm rounded-[2px]"
                />
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-[#D5D2CA]/70 mt-auto">
                <div className="text-center sm:text-left">
                  <span className="text-[9px] tracking-[0.25em] uppercase font-bold text-[#84492C]">
                    Collection
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl uppercase tracking-wider text-[#3A3835] font-normal">
                    {previewImage.title}
                  </h3>
                </div>

                <Link
                  href={`/prop?category=${encodeURIComponent(previewImage.categoryQuery)}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3A3835] hover:bg-[#84492C] text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-[2px] shadow-sm transition-all cursor-pointer"
                >
                  <span>View in Store</span>
                  <ArrowUpRight size={14} />
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