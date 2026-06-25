"use client";

// 🌟 1. นำเข้า Variants เพิ่มเข้ามาตรงนี้ครับ
import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

const JOURNALS = [
  {
    id: 1,
    title: "ยกระดับการจัดการคลังสินค้าด้วยระบบ RFID เทคโนโลยีแห่งอนาคต",
    category: "SYSTEM TECH",
    date: "08.06.2026",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    title: "การจัดการสต็อกพรอพ (Props) สถาปัตยกรรมฐานข้อมูลที่ไร้รอยต่อ",
    category: "DATABASE",
    date: "05.06.2026",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    title: "Minimal UI/UX Design เทรนด์การออกแบบระบบหลังบ้านยุค 2026",
    category: "DESIGN TRENDS",
    date: "28.05.2026",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80"
  }
];

export default function JournalPage() {
  // 🌟 2. ใส่ : Variants ต่อท้ายชื่อตัวแปร
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  // 🌟 3. ใส่ : Variants ต่อท้ายชื่อตัวแปร
  const cardVariants: Variants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 50, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1c1b19] py-28 px-4 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-20 flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#e1ded7] pb-10">
          <div className="space-y-2">
            <span className="text-[10px] font-medium tracking-[0.25em] text-[#767167] uppercase">
              Our Notebook
            </span>
            <h1 className="text-3xl md:text-5xl font-light tracking-tight uppercase">
              Journal & Insights
            </h1>
          </div>
          <p className="text-xs text-[#646057] tracking-wider mt-4 md:mt-0">
            TOTAL ARTICLES ({JOURNALS.length})
          </p>
        </div>

        {/* Journal Grid สไตล์เดียวกับหน้าร้านค้าในระบบ */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#e1ded7]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {JOURNALS.map((post) => (
            <motion.article
              key={post.id}
              variants={cardVariants}
              className="group border-r border-b border-[#e1ded7] p-6 bg-transparent flex flex-col h-full transition-colors duration-500 hover:bg-[#ece9e4]/50"
            >
              {/* Image Showcase */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#ece9e4] mb-8">
                <img
                  src={post.image}
                  alt={post.title}
                  title={post.title}
                  className="object-cover w-full h-full transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out grayscale-[20%] group-hover:grayscale-0"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 text-[10px] tracking-[0.15em] bg-[#f4f1eb]/90 backdrop-blur-sm text-[#1c1b19] px-2.5 py-1 uppercase font-medium">
                  {post.category}
                </div>
              </div>

              {/* Meta info & Title */}
              <div className="flex flex-col flex-grow">
                <span className="text-[10px] text-[#9a9488] tracking-widest mb-2">{post.date}</span>
                <h3 className="text-lg font-normal text-[#1c1b19] leading-snug tracking-tight mb-6 line-clamp-2 group-hover:text-[#646057] transition-colors duration-300">
                  {post.title}
                </h3>

                {/* Read More Button Link */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#e1ded7]/60 group/link">
                  <span className="text-[11px] font-medium tracking-widest uppercase text-[#767167] group-hover/link:text-[#1c1b19] transition-colors">
                    Read Article
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#767167] transform -rotate-45 group-hover/link:rotate-0 group-hover/link:text-[#1c1b19] transition-transform duration-300" />
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </div>
  );
}