"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

const HERO_BANNERS = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170108353-289.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781493997242-568.webp",
];

interface JournalSection {
  number: string;
  title: string;
  thaiTitle: string;
  categoryQuery: string;
  englishText: string;
  thaiText: string;
  images: string[];
  imageAlt: string;
}

const JOURNAL_SECTIONS: JournalSection[] = [
  {
    number: "01",
    title: "ORNAMENT",
    thaiTitle: "ของประดับตกแต่ง",
    categoryQuery: "Sculpture",
    englishText:
      "Ornaments that bring a quiet sense of character to the home. Thoughtfully chosen forms, textures, and details add a refined finishing touch to spaces designed to be lived in and admired.",
    thaiText:
      "ของประดับที่เติมเสน่ห์อย่างเรียบสงบให้กับพื้นที่ ผ่านรูปทรง พื้นผิว และรายละเอียดที่คัดสรรอย่างพิถีพิถัน เพื่อเติมเต็มบ้านด้วยสัมผัสแห่งความงามที่เหนือกาลเวลา",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075153365-143.webp?v=1779075154654",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075136272-330.webp?v=1779075137565",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781494014928-487.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350021339-69.webp?v=1786350020719",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350023530-371.webp?v=1786350022988",
    ],
    imageAlt: "Terra Studio Ornament Collection",
  },
  {
    number: "02",
    title: "BOOKENDS",
    thaiTitle: "ตกแต่งชั้นหนังสือ",
    categoryQuery: "BOOKED",
    englishText:
      "More than a functional piece, bookends become an elegant expression of personal taste. Designed to complement your collection, they bring structure, character, and a sense of quiet sophistication to every shelf.",
    thaiText:
      "มากกว่าของใช้สำหรับจัดวางหนังสือ Bookends คือรายละเอียดที่สะท้อนรสนิยมส่วนตัว เติมความเป็นระเบียบ คาแรกเตอร์ และความสง่างามอย่าง understated ให้กับทุกชั้นวาง",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781494047650-726.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779078544795-355.webp?v=1779078545748",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779078565880-634.webp?v=1779078566854",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779088760685-836.webp?v=1779088761520",
    ],
    imageAlt: "Terra Studio Bookends Collection",
  },
  {
    number: "03",
    title: "CANDLE HOLDERS",
    thaiTitle: "เชิงเทียน",
    categoryQuery: "CANDLE HOLDERS",
    englishText:
      "Candle holders bring warmth and atmosphere into the everyday. With sculptural silhouettes and refined details, each piece creates an intimate presence that elevates the mood of any space.",
    thaiText:
      "เชิงเทียนช่วยเติมความอบอุ่นและบรรยากาศให้กับช่วงเวลาในทุกวัน ด้วยรูปทรงที่มีมิติและรายละเอียดอันประณีต ช่วยสร้างความละมุนและยกระดับบรรยากาศให้กับทุกพื้นที่",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787545755823-349.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781062599943-712.webp?v=1781062601540",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582702709-840.webp?v=1781582704453",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582779997-837.webp?v=1781582780070",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582820399-976.webp?v=1781582820424",
    ],
    imageAlt: "Terra Studio Candle Holders Collection",
  },
  {
    number: "04",
    title: "DECORATIVE OBJECTS",
    thaiTitle: "ของตกแต่งและวัตถุทางศิลปะ",
    categoryQuery: "Accessories",
    englishText:
      "Decorative objects are the details that give a space its identity. A considered balance of form, texture, and proportion, each piece adds depth and distinction to the art of living.",
    thaiText:
      "ของตกแต่งคือรายละเอียดที่ทำให้พื้นที่มีเอกลักษณ์ ผ่านความสมดุลของรูปทรง พื้นผิว และสัดส่วน แต่ละชิ้นช่วยเติมมิติและความโดดเด่นให้กับศิลปะแห่งการใช้ชีวิต",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604706503-265.webp?v=1786604707101",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350044803-666.webp?v=1786350044169",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350045685-631.webp?v=1786350045084",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350087279-446.webp?v=1786350087140",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350090888-392.webp?v=1786350090482",
    ],
    imageAlt: "Terra Studio Decorative Objects Collection",
  },
  {
    number: "05",
    title: "DOLLS & TOYS",
    thaiTitle: "ตุ๊กตาและของเล่นตกแต่ง",
    categoryQuery: "Figure",
    englishText:
      "A playful expression of design, thoughtfully created to bring warmth and personality into the home. Dolls and toys become charming accents that add a softer, more personal character to every space.",
    thaiText:
      "เติมความขี้เล่นผ่านงานออกแบบที่ยังคงไว้ซึ่งความประณีต ช่วยเพิ่มความอบอุ่นและตัวตนให้กับบ้าน พร้อมสร้างเสน่ห์ที่นุ่มนวลและเป็นกันเองในทุกพื้นที่",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604772503-762.webp?v=1786604773067",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604774505-403.webp?v=1786604775122",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604776504-274.webp?v=1786604777190",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604778504-554.webp?v=1786604779109",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779097945917-948.webp?v=1779097947269",
    ],
    imageAlt: "Terra Studio Dolls and Toys Collection",
  },
  {
    number: "06",
    title: "TABLEWARE",
    thaiTitle: "เครื่องใช้บนโต๊ะอาหาร",
    categoryQuery: "Dining & Tableware",
    englishText:
      "Tableware transforms everyday rituals into moments of beauty. Thoughtfully designed pieces bring together form and function, creating a table setting that feels effortlessly elegant and timeless.",
    thaiText:
      "Tableware เปลี่ยนช่วงเวลาในชีวิตประจำวันให้กลายเป็นช่วงเวลาที่งดงาม ผสานรูปทรงและฟังก์ชันอย่างลงตัว เพื่อสร้างบรรยากาศบนโต๊ะอาหารที่เรียบหรูและเหนือกาลเวลา",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786439826243-927.webp?v=1786439827911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350175135-402.webp?v=1786350174880",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350176468-964.webp?v=1786350175899",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350177488-614.webp?v=1786350176950",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786432839307-904.webp?v=1786432841077",
    ],
    imageAlt: "Terra Studio Tableware Collection",
  },
  {
    number: "07",
    title: "TRAYS",
    thaiTitle: "ถาดตกแต่งและเสิร์ฟ",
    categoryQuery: "Trays",
    englishText:
      "Defined by both beauty and purpose, trays bring effortless order to the art of display. From everyday essentials to treasured objects, each piece creates a refined composition within the home.",
    thaiText:
      "ถาดที่ผสานความงามเข้ากับประโยชน์ใช้สอย ช่วยจัดวางสิ่งของอย่างมีระเบียบและมีสไตล์ ตั้งแต่ของใช้ในชีวิตประจำวันไปจนถึงของชิ้นโปรด ล้วนกลายเป็นองค์ประกอบที่งดงามของพื้นที่",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781494032603-453.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786439826243-927.webp?v=1786439827911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779076767119-215.webp?v=1779076769682",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779076786238-5.webp?v=1779076787979",
    ],
    imageAlt: "Terra Studio Trays Collection",
  },
  {
    number: "08",
    title: "VESSELS",
    thaiTitle: "แจกันและภาชนะ",
    categoryQuery: "Vase & Vessels",
    englishText:
      "Vessels bring sculptural beauty into the home. Defined by graceful forms, refined proportions, and timeless character, they stand beautifully on their own or as part of a considered arrangement.",
    thaiText:
      "ภาชนะที่ถ่ายทอดความงามผ่านรูปทรงอันสง่างาม สัดส่วนที่ลงตัว และคาแรกเตอร์เหนือกาลเวลา สามารถโดดเด่นได้ด้วยตัวเอง หรือผสานเข้ากับองค์ประกอบอื่นได้อย่างมีรสนิยม",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170155375-345.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350038342-287.webp?v=1786350037911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350039477-151.webp?v=1786350038863",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350040478-8.webp?v=1786350039891",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350240589-906.webp?v=1786350240296",
    ],
    imageAlt: "Terra Studio Vessels Collection",
  },
  {
    number: "09",
    title: "ART & WALL DECOR",
    thaiTitle: "งานศิลปะและของตกแต่งผนัง",
    categoryQuery: "Art & walldecor",
    englishText:
      "Art and wall décor shape the atmosphere and identity of a space. Carefully selected pieces create visual balance, introduce character, and turn empty walls into an expression of personal taste.",
    thaiText:
      "งานศิลปะและของตกแต่งผนังช่วยกำหนดบรรยากาศและตัวตนของพื้นที่ ผ่านชิ้นงานที่คัดสรรอย่างตั้งใจ เพื่อสร้างสมดุลทางสายตา เติมคาแรกเตอร์ และเปลี่ยนผนังธรรมดาให้กลายเป็นพื้นที่ที่สะท้อนรสนิยม",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779269612983-684.webp?v=1779269613167",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779269532491-461.webp?v=1779269532722",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786675412963-359.webp?v=1786675413486",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786675414339-365.webp?v=1786675414726",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604706503-265.webp?v=1786604707101",
    ],
    imageAlt: "Terra Studio Art & Wall Decor Collection",
  },
];

// Interactive Category Slider Component (สไตล์เดียวกับหน้ารวมสินค้า CollectionCard)
function SectionImageSlider({ section }: { section: JournalSection }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const images = section.images && section.images.length > 0 ? section.images : [];

  // Subtle auto-slide every 5 seconds when not hovered
  useEffect(() => {
    if (isHovered || images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, images.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className="group relative aspect-square w-full max-w-[520px] mx-auto rounded-3xl overflow-hidden bg-[#F2EDE6] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#E5DFD5]/60 flex items-center justify-center p-8 sm:p-12 select-none transition-all duration-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/prop?category=${encodeURIComponent(section.categoryQuery)}`}
        className="relative w-full h-full flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={images[activeIndex]}
            src={images[activeIndex]}
            alt={`${section.imageAlt} - Photo ${activeIndex + 1}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-contain mix-blend-multiply drop-shadow-sm transform group-hover:scale-105 transition-transform duration-700"
          />
        </AnimatePresence>
      </Link>

      {/* Navigation Arrows (ปรากฏเมื่อมีรูปมากกว่า 1 รูป) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Image"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-[#1C1A18] shadow-md border border-[#E5DFD5]/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Image"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-[#1C1A18] shadow-md border border-[#E5DFD5]/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:scale-105 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Slide Indicator Dots (กดเพื่อเปลี่ยนรูปได้) */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-md z-10 pointer-events-auto">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex(idx);
              }}
              aria-label={`View Image ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JournalPage() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#1C1A18] selection:bg-[#84492C] selection:text-[#FAF7F2] flex flex-col">
      
      {/* =========================================================================
          1. TOP HERO BANNER (Full-Width Edge-to-Edge เต็มจอแบบรูปแรก สมูท 100%)
          ========================================================================= */}
      <div className="relative w-full h-[45vh] lg:h-[55vh] overflow-hidden bg-[#2F2420]">
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
              opacity: { duration: 1.5, ease: "easeInOut" },
              scale: { duration: 6, ease: "easeOut" },
            }}
          />
        ))}

        {/* Top Navbar Dimmer & Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />

        {/* ชั้นไล่สีครีมละลายขอบล่างกลืนกับพื้นหลังหน้าเว็บ */}
        <div className="absolute bottom-0 left-0 w-full h-12 md:h-20 bg-gradient-to-t from-[#F9F6F0] via-[#F9F6F0]/50 to-transparent pointer-events-none z-20" />
        
        <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-12 lg:left-16 text-white z-30">
          <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.3em] uppercase opacity-85 block mb-1.5 drop-shadow-sm">
            Terra Studio Editorial
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-[0.1em] font-light drop-shadow-md">
            Living With Art & Design
          </h1>
        </div>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12 lg:right-16 flex gap-2.5 z-30">
          {HERO_BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentBannerIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-400 drop-shadow-sm ${
                i === currentBannerIndex ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          2. 9 EDITORIAL SECTIONS (ZIG-ZAG LAYOUT WITH INTERACTIVE CAROUSEL)
          ========================================================================= */}
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-8 lg:px-12 pt-16 md:pt-24 pb-32">
        <div className="flex flex-col space-y-24 md:space-y-36 lg:space-y-44">
          {JOURNAL_SECTIONS.map((section, index) => {
            // Even index (0, 2, 4, 6, 8) = Image on Left, Text on Right
            // Odd index (1, 3, 5, 7) = Text on Left, Image on Right
            const isImageLeft = index % 2 === 0;

            return (
              <motion.article
                key={section.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-20 items-center"
              >
                {/* Image Column with Slider */}
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
                  {/* Category Number & Title */}
                  <div className="mb-6">
                    <span className="text-[11px] font-semibold tracking-[0.25em] text-[#84492C] uppercase block mb-2">
                      {section.number} — {section.thaiTitle}
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl uppercase tracking-[0.1em] text-[#1C1A18] font-normal leading-tight">
                      {section.title}
                    </h2>
                  </div>

                  {/* Editorial Text (English & Thai) */}
                  <div className="space-y-4 mb-8">
                    <p className="text-[#2C2723] text-sm sm:text-[15px] leading-relaxed font-normal">
                      {section.englishText}
                    </p>
                    <p className="text-[#736B63] text-sm sm:text-[14.5px] leading-relaxed font-normal">
                      {section.thaiText}
                    </p>
                  </div>

                  {/* CTA Link */}
                  <div>
                    <Link
                      href={`/prop?category=${encodeURIComponent(section.categoryQuery)}`}
                      className="group inline-flex items-center gap-2 border-b border-[#84492C]/40 pb-1.5 hover:border-[#84492C] transition-all"
                    >
                      <span className="text-[11px] sm:text-[12px] font-medium tracking-[0.2em] uppercase text-[#84492C]">
                        Explore {section.title}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[#84492C] transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
}