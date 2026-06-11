"use client";

import { useState, useEffect } from "react";
// 🌟 1. นำเข้า motion จาก framer-motion มาใช้งาน
import { motion } from "framer-motion";

interface PropBannerProps {
  allImages: string[];      // รูปทั้งหมดในระบบสำหรับหน้า ALL
  activeImage: string | null; // รูปเฉพาะหมวดหมู่ถ้ามีการกดเลือก
  categoryName: string;
}

export default function PropBanner({ allImages, activeImage, categoryName }: PropBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🌟 Effect สำหรับรันสไลด์เฟดวนไปเรื่อยๆ (ทำงานเฉพาะตอนกด ALL หรือไม่มี activeImage)
  useEffect(() => {
    if (activeImage || allImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
    }, 4500); // ⏱️ เปลี่ยนรูปทุกๆ 4.5 วินาที

    return () => clearInterval(timer);
  }, [activeImage, allImages.length]);

  // 1. ถ้าลูกค้ากดเลือกหมวดหมู่เฉพาะ (มีรูป activeImage) ให้โชว์รูปเดียวนิ่งๆ สวยๆ
  if (activeImage) {
    return (
      <div className="absolute top-0 left-0 w-full h-[30vh] lg:h-[40vh] z-0 overflow-hidden bg-[#2F2420]">
        {/* 🌟 2. เปลี่ยน img เป็น motion.img พร้อมใส่เอฟเฟกต์ซูมออก */}
        <motion.img 
          src={activeImage} 
          alt={`${categoryName} Banner`} 
          className="w-full h-full object-cover object-center" 
          initial={{ scale: 1.12, opacity: 0 }} // เริ่มต้นขยาย 12% และโปร่งใส
          animate={{ scale: 1, opacity: 1 }}    // ค่อยๆ หดกลับมาขนาดปกติและสว่างขึ้น
          transition={{ duration: 2.5, ease: "easeOut" }} // ใช้เวลา 2.5 วิ
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
      </div>
    );
  }

  // 2. ถ้ากด ALL (ไม่มี activeImage) ให้ทำสไลด์เฟดเลื่อนรูปไปเรื่อยๆ
  if (allImages.length > 0) {
    return (
      <div className="absolute top-0 left-0 w-full h-[30vh] lg:h-[40vh] z-0 overflow-hidden bg-[#2F2420]">
        {allImages.map((src, idx) => (
          // 🌟 3. อัปเกรดสไลด์ด้วย motion.img ให้ซูมออกทุกครั้งที่เปลี่ยนรูป
          <motion.img
            key={`${src}-${idx}`} 
            src={src}
            alt={`Terra Banner Slide ${idx}`}
            className="absolute inset-0 w-full h-full object-cover object-center"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ 
              opacity: idx === currentIndex ? 1 : 0,
              scale: idx === currentIndex ? 1 : 1.12 // ซูมออกเฉพาะรูปที่กำลังโชว์อยู่
            }}
            transition={{ 
              opacity: { duration: 1.2 }, // จังหวะเฟดเปลี่ยนรูปใช้เวลา 1.2 วิ
              scale: { duration: 4.5, ease: "easeOut" } // จังหวะซูมออกให้ไหลยาวๆ 4.5 วิ (เท่ากับเวลาเปลี่ยนสไลด์)
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent pointer-events-none" />
      </div>
    );
  }

  return null;
}