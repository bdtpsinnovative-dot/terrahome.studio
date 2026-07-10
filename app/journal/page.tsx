"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

const FEATURED_ARTICLE = {
  id: 1,
  title: "ศิลปะแห่งความสงบนิ่ง: การผสานประติมากรรมเข้ากับพื้นที่อยู่อาศัยยุคใหม่",
  category: "INTERIOR STYLING",
  date: "08.06.2026",
  image: "/journal/On line-17.jpg",
  excerpt: "ค้นพบวิธีการจัดวางวัตถุตกแต่งและประติมากรรมรูปทรงแอ็บสแตรกต์ เพื่อสร้างจุดนำสายตาที่เรียบง่ายแต่เปี่ยมไปด้วยพลัง ท่ามกลางความวุ่นวายของชีวิตเมือง"
};

const ARTICLES = [
  {
    id: 2,
    title: "สุนทรียภาพแห่งความผ่อนคลาย: ยกระดับกิจวัตรประจำวันด้วยสัมผัสจากหินธรรมชาติและกลิ่นหอม",
    category: "BATH & WELLNESS",
    date: "05.06.2026",
    image: "/journal/On line-37.jpg"
  },
  {
    id: 3,
    title: "ความขี้เล่นที่ถูกคัดสรร: ศิลปะการจัดวางของตกแต่งให้ดูสนุกแต่ยังคงความหรูหรา",
    category: "CURATED OBJECTS",
    date: "28.05.2026",
    image: "/journal/On line-40.jpg"
  }
];

export default function JournalPage() {
  const fadeUp: Variants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1c1b19] pt-32 pb-24 px-4 sm:px-8 lg:px-12 xl:px-16 selection:bg-[#1c1b19] selection:text-[#f4f1eb]">
      <div className="max-w-[1440px] mx-auto">
        
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between border-b border-[#1c1b19] pb-10"
        >
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-medium tracking-[0.25em] text-[#767167] uppercase">
              Terrahome Studio
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-[5.5rem] font-light tracking-tighter uppercase leading-[0.9] -ml-1">
              Journal <br className="hidden md:block"/> & Insights
            </h1>
          </div>
          <div className="mt-8 md:mt-0 text-right">
             <span className="text-[10px] font-medium tracking-widest text-[#767167] uppercase">
                Est. 2026
             </span>
          </div>
        </motion.div>

        {/* Featured Article - Editorial Style */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-32 group cursor-pointer"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            
            {/* Featured Content (Left side on Desktop) */}
            <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1">
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-[10px] font-bold tracking-[0.2em] bg-[#1c1b19] text-[#f4f1eb] px-3 py-1.5 uppercase">
                    Featured
                  </span>
                  <span className="text-[10px] text-[#767167] tracking-[0.15em] uppercase">{FEATURED_ARTICLE.category}</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal leading-[1.15] tracking-tight mb-8 group-hover:text-[#646057] transition-colors duration-500">
                  {FEATURED_ARTICLE.title}
                </h2>
                <p className="text-[#646057] text-sm md:text-base leading-relaxed mb-12 max-w-md">
                  {FEATURED_ARTICLE.excerpt}
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <div className="inline-flex items-center gap-4 border-b border-[#1c1b19] pb-1.5 group/btn">
                  <span className="text-xs font-medium tracking-[0.15em] uppercase">
                    Read the Story
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-2 transition-transform duration-300" />
                </div>
              </motion.div>
            </div>

            {/* Featured Image (Right side on Desktop) */}
            <div className="lg:col-span-7 relative h-[60vh] lg:h-[75vh] w-full overflow-hidden order-1 lg:order-2 bg-[#ece9e4]">
              <motion.img
                variants={fadeUp}
                src={FEATURED_ARTICLE.image}
                alt={FEATURED_ARTICLE.title}
                className="absolute inset-0 w-full h-full object-cover transform scale-100 group-hover:scale-[1.03] transition-transform duration-[1.5s] ease-out grayscale-[15%] group-hover:grayscale-0"
              />
              <div className="absolute top-6 right-6 lg:top-8 lg:right-8 mix-blend-difference text-white">
                <span className="text-xs tracking-widest">{FEATURED_ARTICLE.date}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Articles */}
        <div className="border-t border-[#1c1b19]/20 pt-16">
          <div className="flex justify-between items-end mb-16">
            <h3 className="text-3xl font-light tracking-tight uppercase">Recent Reads</h3>
            <span className="text-[10px] font-medium tracking-widest text-[#767167] uppercase hidden md:block">
              Latest Knowledge
            </span>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-16"
          >
            {ARTICLES.map((article) => (
              <motion.article 
                key={article.id} 
                variants={fadeUp}
                className="group cursor-pointer flex flex-col"
              >
                {/* Image Box */}
                <div className="relative aspect-[4/3] overflow-hidden mb-8 bg-[#ece9e4]">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-[1.2s] ease-out grayscale-[15%] group-hover:grayscale-0"
                  />
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                  
                  {/* Read More Text overlaid */}
                  <div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 mix-blend-difference">
                     <span className="text-[10px] font-medium tracking-[0.2em] uppercase border-b border-white pb-1">Read Article</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-[10px] font-bold text-[#1c1b19] tracking-[0.15em] uppercase">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-[#767167] tracking-widest">
                    {article.date}
                  </span>
                </div>
                
                {/* Title */}
                <h4 className="text-2xl font-normal leading-snug tracking-tight group-hover:text-[#646057] transition-colors duration-300">
                  {article.title}
                </h4>
              </motion.article>
            ))}
          </motion.div>
        </div>

      </div>
    </div>
  );
}