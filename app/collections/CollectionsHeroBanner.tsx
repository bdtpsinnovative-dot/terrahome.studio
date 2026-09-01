"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const HERO_BANNERS = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170108353-289.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781493997242-568.webp",
];

export default function CollectionsHeroBanner() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[40vh] sm:h-[48vh] lg:h-[55vh] overflow-hidden bg-[#241C18]">
      {HERO_BANNERS.map((src, idx) => (
        <motion.img
          key={`${src}-${idx}`}
          src={src}
          alt={`Terra Studio Collection Slide ${idx + 1}`}
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

      {/* Top and Bottom Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-20 md:h-28 bg-gradient-to-t from-[#E5DDD3] via-[#E5DDD3]/60 to-transparent pointer-events-none z-20" />



      {/* Slide dots */}
      <div className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12 lg:right-16 flex gap-2.5 z-30">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentBannerIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-400 drop-shadow-sm cursor-pointer ${
              i === currentBannerIndex ? "w-8 bg-white" : "w-2.5 bg-white/40 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
