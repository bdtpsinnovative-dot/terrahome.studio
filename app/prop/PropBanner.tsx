"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface PropBannerProps {
  allImages: string[];      
  activeImage: string | null; 
  categoryName: string;
}

export default function PropBanner({ allImages, activeImage, categoryName }: PropBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeImage || allImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
    }, 4500); 

    return () => clearInterval(timer);
  }, [activeImage, allImages.length]);

  // 1. ถ้าลูกค้ากดเลือกหมวดหมู่เฉพาะ (มีรูป activeImage) 
  if (activeImage) {
    return (
      <div className="relative top-0 left-0 w-full h-[45vh] lg:h-[55vh] z-0 overflow-hidden bg-[#2F2420]">
        {/* 🔥 1. เปลี่ยน object-center เป็น object-[center_75%] เพื่อกดมุมกล้องลงมาหาโต๊ะสินค้าครับนาย */}
        {/* 🔥 2. ลดแรงซูม initial scale จาก 1.12 เหลือ 1.05 ภาพจะได้ไม่โดนบีบตัดขอบเยอะเกินไปครับ */}
        <motion.img 
          src={activeImage} 
          alt={`${categoryName} Banner`} 
          className="w-full h-full object-cover object-[center_75%]" 
          initial={{ scale: 1.05, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}    
          transition={{ duration: 2.5, ease: "easeOut" }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
        
        {/* ชั้นไล่สีครีมละลายขอบล่าง */}
        <div className="absolute bottom-0 left-0 w-full h-16 md:h-24 bg-gradient-to-t from-[#EBE8E1] via-[#EBE8E1]/40 to-transparent pointer-events-none z-20" />
      </div>
    );
  }

  // 2. ถ้ากด ALL (ไม่มี activeImage) ให้ทำสไลด์เฟดเลื่อนรูป
  if (allImages.length > 0) {
    return (
      <div className="relative top-0 left-0 w-full h-[45vh] lg:h-[55vh] z-0 overflow-hidden bg-[#2F2420]">
        {allImages.map((src, idx) => (
          <motion.img
            key={`${src}-${idx}`} 
            src={src}
            alt={`Terra Banner Slide ${idx}`}
            // 🔥 ปรับตำแหน่งโฟกัสกล้องลงมา 75% เหมือนกันครับ
            className="absolute inset-0 w-full h-full object-cover object-[center_75%]"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: idx === currentIndex ? 1 : 0,
              scale: idx === currentIndex ? 1 : 1.05 
            }}
            transition={{ 
              opacity: { duration: 1.2 }, 
              scale: { duration: 4.5, ease: "easeOut" } 
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
        
        {/* ชั้นไล่สีครีมละลายขอบล่าง */}
      <div className="absolute bottom-0 left-0 w-full h-6 md:h-10 bg-gradient-to-t from-[#EBE8E1] to-transparent pointer-events-none z-20" />
      </div>
    );
  }

  return null;
}