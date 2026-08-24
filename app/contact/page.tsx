"use client";

import { useState } from "react";
// 🌟 1. นำเข้า Variants เพิ่มเข้ามาตรงนี้ครับ
import { motion, Variants } from "framer-motion"; 
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import Footer from "@/app/components/Footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  // 🌟 2. ใส่ : Variants ต่อท้ายชื่อตัวแปร เพื่อกำกับ Type ครับ
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  // 🌟 3. ใส่ : Variants ตรงนี้ด้วยเหมือนกันครับ
  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 60, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1c1b19] font-sans antialiased flex flex-col justify-between">
      <div className="pt-28 pb-20 px-4 sm:px-8 lg:px-16 flex-1">
        <motion.div 
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        {/* Header Title สไตล์นิตยสาร */}
        <div className="border-b border-[#e1ded7] pb-12 mb-16">
          <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.25em] text-[#767167] mb-3">
            Get In Touch
          </motion.p>
          <motion.h1 variants={itemVariants} className="text-3xl md:text-5xl font-light tracking-tight uppercase text-[#1c1b19]">
            Contact Studio
          </motion.h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left Side: Contact Details (40%) */}
          <motion.div variants={itemVariants} className="lg:col-span-5 space-y-12">
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] font-medium text-[#1c1b19] mb-4">ร่วมงานกับเรา</h2>
              <p className="text-[#646057] text-sm leading-relaxed max-w-sm">
                หากมีข้อสงสัยเกี่ยวกับระบบ สต็อกสินค้าพรอพ หรือต้องการนัดหมายเข้าชมสตูดิโอ สามารถติดต่อเราได้ทางช่องทางด้านล่างนี้ครับ
              </p>
            </div>

            <div className="space-y-6 border-t border-[#e1ded7] pt-8">
              {[
                { icon: Phone, label: "Phone", val: "+66 82 XXX XXXX" },
                { icon: Mail, label: "Email", val: "contact@terrastudio.com" },
                { icon: MapPin, label: "Location", val: "Bangkok - Nonthaburi, Thailand" }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ x: 6 }}
                  className="flex items-start gap-4 group cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-[#767167] mt-0.5 group-hover:text-[#1c1b19] transition-colors" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#9a9488] mb-0.5">{item.label}</p>
                    <p className="text-sm font-light text-[#1c1b19]">{item.val}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side: Editorial Form (60%) */}
          <motion.div variants={itemVariants} className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="relative z-0 w-full group">
                  <input
                    type="text"
                    required
                    placeholder=" "
                    className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                    ชื่อผู้ติดต่อ / Name
                  </label>
                </div>

                <div className="relative z-0 w-full group">
                  <input
                    type="email"
                    required
                    placeholder=" "
                    className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                    อีเมล / Email
                  </label>
                </div>
              </div>

              <div className="relative z-0 w-full group pt-4">
                <textarea
                  required
                  rows={4}
                  placeholder=" "
                  className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300 resize-none"
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-7 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  ข้อความ / Message
                </label>
              </div>

              <div className="pt-4">
                <motion.button
                  type="submit"
                  whileHover={{ gap: "24px" }}
                  className="inline-flex items-center gap-4 border-b border-[#1c1b19] pb-2 text-xs uppercase tracking-[0.2em] font-medium text-[#1c1b19] transition-all duration-300 group"
                >
                  <span>Send Message</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}