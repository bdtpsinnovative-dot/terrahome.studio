'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/src/supabase/client';

const Mail = () => <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const MapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const Phone = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const Globe = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;

type CategoryGroup = { label: string; items: string[] };

export default function Footer() {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([{ label: "All", items: [] }]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("collection_groups").select("product_sup, products(id)");

        // ดึงเฉพาะหมวดหมู่ที่มีสินค้า ตัดตัวซ้ำ แล้วเรียง A-Z
        const rawCategories = [...new Set(((data ?? []) as any[])
          .filter(d => d.products?.length)
          .map(d => d.product_sup)
          .filter(Boolean))].sort();

        const grouped: Record<string, string[]> = {};
        const newCategoryGroups: CategoryGroup[] = [{ label: "All", items: [] }];

        // จับหมวดหมู่ย่อยมัดรวมกลุ่มหลัก ถ้าไม่เข้าพวกก็ปล่อยแยกเดี่ยว
        rawCategories.forEach(cat => {
          const lower = cat.toLowerCase();
          const key = (cat === "Candle Holder" || lower.startsWith("decorative") || lower.startsWith("decotative")) ? "Decorative"
            : lower.startsWith("doll ") ? "Doll"
              : lower.startsWith("vase") ? "Vase"
                : lower.startsWith("wall art ") ? "Wall Art" : cat;

          if (key !== cat) {
            (grouped[key] ||= []).push(cat);
          } else {
            newCategoryGroups.push({ label: cat, items: [cat] });
          }
        });

        // ดันพวกที่จัดกลุ่มแล้วเข้า array กลาง
        Object.entries(grouped).forEach(([label, items]) => newCategoryGroups.push({ label, items }));

        // เรียงลำดับ A-Z อีกรอบตามชื่อกลุ่ม
        newCategoryGroups.sort((a, b) => a.label.localeCompare(b.label));

        setCategoryGroups(newCategoryGroups);
      } catch (error) {
        console.error("Failed to fetch footer categories:", error);
      }
    };
    fetchCategories();
  }, []);

  return (
    <footer className="w-full flex flex-col font-sans antialiased text-[#4A4238] mt-20 md:mt-28">

      {/* 1. Main Footer Content */}
      <div className="bg-[#c6b59d] border-t-[1px] border-[#A89885] pt-16 pb-4 px-6 md:px-12 xl:px-16 w-full">
        <div className="max-w-[1380px] mx-auto">

          {/* Main Layout: Flex for better fluid wrapping on smaller screens */}
          <div className="flex flex-col lg:flex-row justify-between gap-10 lg:gap-6 xl:gap-8 items-start mb-8">

            {/* Col 1: Logo & Description */}
            <div className="w-full lg:w-[20%] xl:w-[16%] flex flex-col items-start text-left shrink-0 pt-4 lg:pt-5 lg:-ml-4 xl:-ml-6">
              <div className="mb-6 flex flex-col items-start w-full">
                <h2 className="font-serif text-[28px] tracking-[0.15em] text-[#6E4F32] flex justify-start items-center mb-1"><img src="/logo.png" alt="logo" className="w-[150px]" /></h2>
              </div>
              <p className="text-xs leading-relaxed text-[#4A4238] font-normal max-w-[240px] mb-8">
                Thoughtful home decor and objects that bring warmth, balance, and quiet living into everyday spaces.
              </p>
              <div className="w-8 h-[1px] bg-[#9C8C7A] mb-8"></div>
              {/* Social Icons (Not linked yet per request) */}
              <div className="flex justify-center lg:justify-start space-x-3.5 w-full">
              </div>
            </div>

            {/* การ์ด คอนเท็น*/}
            <div className="w-full lg:w-[40%] xl:w-[40%] flex justify-start lg:-mt-9 relative z-20 group">
              <div className="relative w-full max-w-[460px] bg-transparent rounded-xl shadow-[0_10px_40px_rgba(60,50,40,0.04)] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_rgba(60,50,40,0.08)] hover:-translate-y-1">

                {/*เงาปลอม */}
                <div className="absolute right-[1%] bottom-[-5%] w-[25%] h-[15%] bg-[#2F241A]/50 blur-[20px] rounded-[100%] z-0 pointer-events-none transition-all duration-700 group-hover:scale-110"></div>

                {/* Background Image Container */}
                <div
                  className="absolute right-0 bottom-0 w-[55%] h-[95%] bg-no-repeat opacity-[0.75] mix-blend-multiply z-0 pointer-events-none transition-transform duration-700 group-hover:scale-105 drop-shadow-[-5px_8px_12px_rgba(80,60,40,0.25)]"
                  style={{
                    backgroundImage: "url('https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1782277705238-624.webp')",
                    backgroundPosition: "bottom right",
                    backgroundSize: "contain"
                  }}
                >
                </div>

                {/* Soft Gradient Mask for image fading */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/10 to-transparent pointer-events-none z-0"></div>

                {/* Card Content */}
                <div className="relative z-10 p-6 xl:p-8 pr-[25%] flex flex-col h-full justify-center">
                  <div className="flex items-start gap-3.5 mb-6">
                    <div className="w-8 h-8 rounded-full bg-[#EAE3D9]/60 flex items-center justify-center text-[#7A695C] shrink-0 mt-0.5 shadow-inner border border-white/60">
                      <MapPin />
                    </div>
                    <div>
                      <h4 className="font-bold text-[10.5px] xl:text-[11.5px] tracking-[0.2em] uppercase text-[#3A352F] mb-2.5 leading-snug">
                        TPS GARDEN FURNITURE CO., LTD
                      </h4>
                      <p className="text-[11px] leading-[1.8] text-[#635A51] font-normal tracking-wide">
                        351/7-8 Soi Bangkok-Nonthaburi 13,<br />
                        Bangkok-Nonthaburi Road, Bang Sue,<br />
                        Bang Sue District, Bangkok 10800
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <a href="tel:+6625871234" className="flex items-center gap-3.5 group/link w-fit">
                      <div className="w-7 h-7 rounded-full bg-[#EAE3D9]/40 flex items-center justify-center text-[#7A695C] shrink-0 transition-all duration-300 group-hover/link:bg-[#DED5C8] group-hover/link:text-[#3A352F] shadow-sm border border-white/50">
                        <Phone />
                      </div>
                      <p className="text-[11px] text-[#635A51] font-normal tracking-wide transition-colors duration-300 group-hover/link:text-[#3A352F]">
                        +66 2 587 1234
                      </p>
                    </a>

                    <a href="mailto:info@tpsgardenfurniture.com" className="flex items-center gap-3.5 group/link w-fit">
                      <div className="w-7 h-7 rounded-full bg-[#EAE3D9]/40 flex items-center justify-center text-[#7A695C] shrink-0 transition-all duration-300 group-hover/link:bg-[#DED5C8] group-hover/link:text-[#3A352F] shadow-sm border border-white/50">
                        <Mail />
                      </div>
                      <p className="text-[11px] text-[#635A51] font-normal tracking-wide transition-colors duration-300 group-hover/link:text-[#3A352F]">
                        info@tpsgardenfurniture.com
                      </p>
                    </a>

                    <a href="https://www.tpsgardenfurniture.com" target="_blank" rel="noreferrer" className="flex items-center gap-3.5 group/link w-fit">
                      <div className="w-7 h-7 rounded-full bg-[#EAE3D9]/40 flex items-center justify-center text-[#7A695C] shrink-0 transition-all duration-300 group-hover/link:bg-[#DED5C8] group-hover/link:text-[#3A352F] shadow-sm border border-white/50">
                        <Globe />
                      </div>
                      <p className="text-[11px] text-[#635A51] font-normal tracking-wide transition-colors duration-300 group-hover/link:text-[#3A352F]">
                        www.tpsgardenfurniture.com
                      </p>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Links & Hours (Remaining space) */}
            <div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-5 pt-4 lg:pt-5">

              {/* GET IN TOUCH */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-2">GET IN TOUCH</h5>
                  <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                </div>
                <ul className="space-y-3.5 text-xs text-[#5A524A] font-normal">
                  <li><span className="hover:text-[#2A251F] transition cursor-pointer whitespace-nowrap">Contact Us</span></li>
                  <li><span className="hover:text-[#2A251F] transition cursor-pointer whitespace-nowrap">Book An Appointment</span></li>
                </ul>
                <div className="flex items-start gap-2.5 text-xs text-[#5A524A] font-normal leading-relaxed">

                </div>
              </div>

              {/* CATEGORIES */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-2">CATEGORIES</h5>
                  <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                </div>
                <div className="flex flex-col gap-3.5">
                  {categoryGroups.map(group => {
                    const isStandalone = group.items.length === 0 || (group.items.length === 1 && group.items[0] === group.label);

                    if (isStandalone) {
                      const href = group.label.toLowerCase() === "all" ? "/prop" : `/prop?category=${encodeURIComponent(group.label)}`;
                      return (
                        <Link key={group.label} href={href} className="text-xs text-[#5A524A] font-normal uppercase tracking-wide hover:text-[#2A251F] transition block w-fit">
                          {group.label}
                        </Link>
                      );
                    }

                    return (
                      <details key={group.label} className="group">
                        <summary className="text-xs text-[#5A524A] font-normal uppercase tracking-wide cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between hover:text-[#2A251F] transition lg:w-[85%]">
                          <span>{group.label}</span>
                          <span className="text-[9px] text-[#8C7A6B] transition-transform duration-300 group-open:rotate-180">▼</span>
                        </summary>
                        <ul className="mt-2 mb-1 space-y-2 pl-3 border-l border-[#9C8C7A]/50">
                          {group.items.map(item => {
                            // ใช้ Regex ตัดคำนำหน้ากลุ่มทิ้ง ไม่ต้อง if/else ให้เมื่อย
                            const display = item.replace(/^(Decorative|Decotative|Doll|Wall Art|Vase)\s+/i, "");

                            return (
                              <li key={item}>
                                <Link href={`/prop?category=${encodeURIComponent(item)}`} className="text-[10.5px] text-[#766E65] hover:text-[#2A251F] transition cursor-pointer block w-fit">
                                  {display}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })}
                </div>
              </div>

              {/* OPENING HOURS & ILLUSTRATION */}
              <div className="flex flex-col relative w-full lg:max-w-[200px]">
                <div className="mb-6">
                  <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-2">OPENING HOURS</h5>
                  <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                </div>
                <table className="w-full text-left text-xs text-[#5A524A] font-normal border-separate border-spacing-y-2.5">
                  <tbody>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Monday</td><td className="text-left whitespace-nowrap">From 9:15 am</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Tuesday</td><td className="text-left whitespace-nowrap">Closed</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Wednesday</td><td className="text-left whitespace-nowrap">From 9:00 am</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Thursday</td><td className="text-left whitespace-nowrap">From 9:00 am</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Friday</td><td className="text-left whitespace-nowrap">From 9:00 am</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Saturday</td><td className="text-left whitespace-nowrap">From 9:00 am</td></tr>
                    <tr><td className="pr-4 align-top whitespace-nowrap">Sunday</td><td className="text-left whitespace-nowrap">Closed</td></tr>
                  </tbody>
                </table>

                {/* Decorative Arch Illustration (Positioned outside the table on desktop) */}
                <div className="hidden xl:flex absolute bottom-[-10px] -right-[130px] w-[110px] h-[190px] items-end justify-center opacity-[0.15] pointer-events-none">
                  <svg viewBox="0 0 100 150" fill="none" stroke="#6E4F32" strokeWidth="0.8" className="w-full h-full">
                    {/* Minimalist Arch */}
                    <path d="M 15 150 L 15 65 A 35 35 0 0 1 85 65 L 85 150" />
                    {/* Floor Line */}
                    <path d="M 0 150 L 100 150" />

                    {/* Minimalist Pot (Trapezoid) */}
                    <path d="M 38 150 L 33 115 L 67 115 L 62 150 Z" />
                    {/* Pot Details (Line across the top) */}
                    <path d="M 35 125 L 65 125" />

                    {/* Main Plant Stem */}
                    <path d="M 50 115 Q 45 80 55 45" />

                    {/* Minimalist Leaves */}
                    <path d="M 49 95 Q 25 90 35 75 Q 45 80 48 90" fill="#6E4F32" fillOpacity="0.05" />
                    <path d="M 51 85 Q 75 80 65 65 Q 55 70 52 80" fill="#6E4F32" fillOpacity="0.05" />
                    <path d="M 52 65 Q 35 60 40 45 Q 50 55 53 60" fill="#6E4F32" fillOpacity="0.05" />
                    <path d="M 54 50 Q 70 45 65 35 Q 55 40 55 48" fill="#6E4F32" fillOpacity="0.05" />
                    {/* Top leaf */}
                    <path d="M 55 45 Q 45 30 55 25 Q 60 35 55 45" fill="#6E4F32" fillOpacity="0.05" />

                    {/* Accent dots (pebbles/soil) */}
                    <circle cx="42" cy="112" r="0.6" fill="#6E4F32" />
                    <circle cx="58" cy="113" r="0.6" fill="#6E4F32" />
                    <circle cx="50" cy="111" r="0.6" fill="#6E4F32" />
                  </svg>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div className="relative border-t border-[#9C8C7A] pt-4 flex flex-col md:flex-row items-center justify-between text-[7px] md:text-[8px] tracking-[0.25em] uppercase text-[#8C7A6B] gap-3">
            <div className="flex items-center gap-6">
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A] hidden md:block"></div>
              <p>© 2025 TERRA HOME STUDIO. ALL RIGHTS RESERVED.</p>
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A] hidden md:block"></div>
            </div>

            {/* Center dots decoration on desktop */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1.5">
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A]"></div>
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A]"></div>
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A]"></div>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A] hidden md:block"></div>
              <p>DESIGNED FOR QUIET LIVING</p>
              <div className="w-[3px] h-[3px] rounded-full bg-[#9C8C7A] hidden md:block"></div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Bottom Banner */}
      <div className="relative w-full h-[250px] md:h-[300px] overflow-hidden">
        <img
          src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780392557796-349.webp"
          alt="TERRA Home Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center p-6 text-center">
          <p className="font-serif text-white text-sm md:text-base lg:text-lg tracking-wide leading-relaxed max-w-xl drop-shadow-md">
            More than decor,<br />
            TERRA Home Studio is about shaping spaces<br />
            filled with warmth, balance, and quiet living.
          </p>
        </div>
      </div>

    </footer>
  );
}
