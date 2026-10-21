"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { Mail, Phone, MapPin, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import Footer from "@/app/components/Footer";
import { createClient } from "@/src/supabase/client";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (!formData.name.trim()) {
        setErrorMsg("กรุณากรอกชื่อผู้ติดต่อ");
        setSubmitting(false);
        return;
      }
      if (!formData.email.trim() && !formData.phone.trim()) {
        setErrorMsg("กรุณาระบุอีเมลหรือเบอร์โทรศัพท์");
        setSubmitting(false);
        return;
      }

      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "-";

      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("contact_inquiries")
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
          source: "terrahome",
          status: "new",
        });

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        setErrorMsg("เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง");
      } else {
        setSubmitted(true);
        setFormData({ name: "", email: "", phone: "", message: "" });
      }
    } catch (err: any) {
      console.error("Error submitting contact inquiry:", err);
      setErrorMsg("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
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
        {/* Header Title */}
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
            {submitted ? (
              <div className="p-8 border border-[#cdcac1] bg-white/50 rounded-xl space-y-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                <h3 className="text-lg uppercase tracking-wider font-medium text-[#1c1b19]">
                  ส่งข้อความเรียบร้อยแล้ว
                </h3>
                <p className="text-sm text-[#646057]">
                  ทีมงาน TERRA HOME ได้รับข้อความของท่านแล้ว และจะติดต่อกลับโดยเร็วที่สุดครับ
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs uppercase tracking-[0.15em] border-b border-[#1c1b19] pb-1 font-medium cursor-pointer"
                >
                  ส่งข้อความอื่นเพิ่มเติม
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {errorMsg && (
                  <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="relative z-0 w-full group">
                    <input
                      type="text"
                      required
                      placeholder=" "
                      value={formData.name}
                      className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                      ชื่อผู้ติดต่อ / Name
                    </label>
                  </div>

                  <div className="relative z-0 w-full group">
                    <input
                      type="tel"
                      placeholder=" "
                      value={formData.phone}
                      className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300"
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                      เบอร์โทร / Phone
                    </label>
                  </div>

                  <div className="relative z-0 w-full group">
                    <input
                      type="email"
                      required
                      placeholder=" "
                      value={formData.email}
                      className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300"
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                      อีเมล / Email
                    </label>
                  </div>
                </div>

                <div className="relative z-0 w-full group pt-2">
                  <textarea
                    required
                    rows={4}
                    placeholder=" "
                    value={formData.message}
                    className="block py-3 px-0 w-full text-sm text-[#1c1b19] bg-transparent border-0 border-b border-[#cdcac1] appearance-none focus:outline-none focus:ring-0 focus:border-[#1c1b19] peer transition-colors duration-300 resize-none"
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  <label className="peer-focus:font-medium absolute text-xs uppercase tracking-wider text-[#767167] duration-300 transform -translate-y-6 scale-75 top-5 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#1c1b19] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                    ข้อความ / Message
                  </label>
                </div>

                <div className="pt-2">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ gap: "24px" }}
                    className="inline-flex items-center gap-4 border-b border-[#1c1b19] pb-2 text-xs uppercase tracking-[0.2em] font-medium text-[#1c1b19] transition-all duration-300 group cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span>Sending...</span>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
