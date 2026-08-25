"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "@/app/components/Footer";
import { createClient } from "@/src/supabase/client";

const HERO_BANNERS = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170108353-289.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781493997242-568.webp",
];

interface JournalSection {
  id?: string;
  number: string;
  title: string;
  thaiTitle: string;
  categoryQuery: string;
  englishText: string;
  thaiText: string;
  images: string[];
  imageAlt: string;
}

function SectionImageSlider({ section }: { section: JournalSection }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isDraggingRef = useRef(false);
  const router = useRouter();

  const images = section.images && section.images.length > 0 ? section.images : ["/placeholder.webp"];

  useEffect(() => {
    if (isHovered || isDraggingRef.current || images.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, images.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 25;
    const velocityThreshold = 150;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % images.length);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setDirection(-1);
      setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  const handleCardClick = () => {
    if (!isDraggingRef.current) {
      router.push(`/prop?category=${encodeURIComponent(section.categoryQuery)}`);
    }
  };

  return (
    <div
      className="group relative aspect-square w-full max-w-[540px] mx-auto rounded-3xl overflow-hidden bg-[#F4EFEA] shadow-lg border border-[#E7E2D9]/80 flex items-center justify-center p-0 select-none transition-all duration-500 hover:shadow-2xl cursor-grab active:cursor-grabbing touch-pan-y"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={activeIndex}
            custom={direction}
            drag={images.length > 1 ? "x" : false}
            dragDirectionLock={true}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto"
          >
            <img
              src={images[activeIndex]}
              alt={`${section.imageAlt} - Photo ${activeIndex + 1}`}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none select-none transform group-hover:scale-106 transition-transform duration-700 ease-out"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <div onClick={(e) => e.stopPropagation()} className="contents">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Image"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white text-[#1C1A18] shadow-lg border border-[#E5DFD5] backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Image"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white text-[#1C1A18] shadow-lg border border-[#E5DFD5] backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Slide Indicator Dots */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md z-10 pointer-events-auto shadow-md"
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDirection(idx > activeIndex ? 1 : -1);
                setActiveIndex(idx);
              }}
              aria-label={`View Image ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [sections, setSections] = useState<JournalSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Live Categories from Supabase
  useEffect(() => {
    async function fetchCollections() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("journal_categories")
          .select(`
            *,
            images:journal_images ( id, image_url, sort_order, is_active )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: JournalSection[] = data.map((cat: any) => {
            const rawImgs = (cat.images || []).filter((i: any) => i.is_active);
            rawImgs.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            const imgUrls = rawImgs.map((i: any) => i.image_url);

            return {
              id: cat.id,
              number: String(cat.sort_order || 1).padStart(2, "0"),
              title: cat.title_en,
              thaiTitle: cat.title_th || cat.title_en,
              categoryQuery: cat.category_query || cat.title_en,
              englishText: cat.description_en || "",
              thaiText: cat.description_th || "",
              images: imgUrls.length > 0 ? imgUrls : (cat.cover_image_url ? [cat.cover_image_url] : []),
              imageAlt: `Terra Studio ${cat.title_en} Collection`,
            };
          });
          setSections(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch live collections:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCollections();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1A18] selection:bg-[#84492C] selection:text-[#FAF7F2] flex flex-col font-sans">
      
      {/* Top Hero Banner */}
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

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/60 to-transparent pointer-events-none z-20" />

        <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-12 lg:left-16 text-white z-30">
          <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.35em] uppercase opacity-85 block mb-1.5 drop-shadow-sm">
            Terra Studio Editorial
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-[0.12em] font-light drop-shadow-md">
            Living With Art & Design
          </h1>
        </div>

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

      {/* Dynamic Editorial Sections */}
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-8 lg:px-12 pt-16 md:pt-24 pb-36">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center text-[#84492C] gap-3">
            <div className="w-8 h-8 border-2 border-[#84492C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs uppercase tracking-widest text-[#736B63]">Loading Collections...</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-28 md:space-y-44">
            {sections.map((section, index) => {
              const isImageLeft = index % 2 === 0;

              return (
                <motion.article
                  key={section.id || section.number}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px", amount: 0.1 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-14 lg:gap-20 items-center"
                >
                  {/* Image Column with Full-Bleed Slider */}
                  <div
                    className={`lg:col-span-6 w-full ${
                      isImageLeft ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <SectionImageSlider section={section} />
                  </div>

                  {/* Content Column */}
                  <div
                    className={`lg:col-span-6 flex flex-col justify-center ${
                      isImageLeft ? "lg:order-2 lg:pl-6" : "lg:order-1 lg:pr-6"
                    }`}
                  >
                    <div className="mb-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] text-[#84492C] uppercase">
                          {section.number}
                        </span>
                        <span className="text-[#84492C]/40 text-xs font-light">—</span>
                        <span className="text-xs sm:text-[13.5px] font-semibold text-[#84492C] tracking-normal">
                          {section.thaiTitle}
                        </span>
                      </div>
                      <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl uppercase tracking-[0.1em] text-[#1C1A18] font-light leading-tight">
                        {section.title}
                      </h2>
                    </div>

                    <div className="space-y-3 mb-8">
                      {section.englishText && (
                        <p className="text-[#2D2824] text-sm sm:text-[15px] leading-relaxed font-normal">
                          {section.englishText}
                        </p>
                      )}
                      {section.thaiText && (
                        <p className="text-[#554C43] text-xs sm:text-[14.5px] leading-relaxed font-normal">
                          {section.thaiText}
                        </p>
                      )}
                    </div>

                    <div>
                      <Link
                        href={`/prop?category=${encodeURIComponent(section.categoryQuery)}`}
                        className="group inline-flex items-center gap-2 text-[11px] sm:text-[12px] font-medium tracking-[0.25em] uppercase text-[#84492C] border-b border-[#84492C]/40 pb-1 hover:border-[#84492C] transition-all duration-300"
                      >
                        <span>Explore {section.title}</span>
                        <ArrowUpRight className="w-4 h-4 text-[#84492C] transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
