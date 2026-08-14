'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { HARDCODED_CATEGORIES } from '@/app/constants/categories';

const MapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const FacebookIcon = () => <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V7.2c0-.8.5-1.2 1.4-1.2H18V2.2A22 22 0 0 0 14.9 2C11.8 2 10 3.8 10 7v1.5H7V13h3v9h4v-9h3.3l.7-4.5H14Z" /></svg>;
const InstagramIcon = () => <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>;

type CategoryGroup = { label: string; items: string[] };

export default function Footer() {
  const categoryGroups = useMemo(() => {
    const rawCategories = [...HARDCODED_CATEGORIES].sort();

    const grouped: Record<string, string[]> = {};
    const newCategoryGroups: CategoryGroup[] = [{ label: "All", items: [] }];

    // จับหมวดหมู่ย่อยมัดรวมกลุ่มหลัก ถ้าไม่เข้าพวกก็ปล่อยแยกเดี่ยว
    rawCategories.forEach(cat => {
      const lower = cat.toLowerCase();
      const key = (lower.startsWith("decorative") || lower.startsWith("decotative")) ? "Decorative"
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

    return newCategoryGroups;
  }, []);

  return (
    <footer className="w-full flex flex-col font-sans antialiased text-[#4A4238]">

      {/* Bottom Banner — รูปเบลอเป็น background, Content วางทับ */}
      <div className="relative w-full overflow-hidden">

        {/* Background Layer with Mask for seamless fade from ANY page background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            maskImage: 'linear-gradient(to bottom, transparent 0px, black 160px)', 
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 160px)' 
          }}
        >
          {/* Background Image - minimal blur to show photo clearly */}
          <img
            src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780392557796-349.webp"
            alt="TERRA Home Banner"
            title="TERRA Home Banner"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          {/* Overlay: same tone as About page bg */}
          <div className="absolute inset-0 bg-[#DFD6CE]/33"></div>
        </div>

        {/* Main Footer Content overlaid on top */}
        <div className="relative z-10 pt-6 pb-1 px-6 md:px-12 xl:px-16 w-full">
          <div className="max-w-[1380px] mx-auto">

            {/* Main Layout: Flex for better fluid wrapping on smaller screens */}
            <div className="flex flex-col lg:flex-row justify-between gap-6 lg:gap-6 xl:gap-8 items-start">

              {/* Col 1: Logo & Description */}
              <div className="w-full lg:w-[20%] xl:w-[16%] flex flex-col items-start text-left shrink-0 lg:-ml-4 xl:-ml-6">
                <div className="mb-2 flex flex-col items-start w-full">
                  <h2 className="font-serif text-[28px] tracking-[0.15em] text-[#6E4F32] flex justify-start items-center mb-1"><img src="/logo.png" alt="logo" title="Terra Home Studio Logo" className="w-[150px]" /></h2>
                </div>
                <p className="text-xs leading-relaxed text-[#2A231D] font-medium max-w-[240px] mb-2">
                  Thoughtful home decor and objects that bring warmth, balance, and quiet living into everyday spaces.
                </p>
                <div className="w-8 h-[1px] bg-[#9C8C7A] mb-2"></div>
              </div>

              {/* การ์ด คอนเท็น*/}
              <div className="w-full lg:w-[35%] xl:w-[32%] flex justify-start relative z-20">
                <div className="relative w-full max-w-[460px]">

                  {/* Contact Content */}
                  <div className="relative z-10 flex flex-col h-full justify-center">
                    <div className="flex items-start gap-3.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#EAE3D9]/60 flex items-center justify-center text-[#7A695C] shrink-0 mt-0.5 shadow-inner border border-white/60">
                        <MapPin />
                      </div>
                      <div>
                        <h4 className="font-bold text-[10.5px] xl:text-[11.5px] tracking-[0.2em] uppercase text-[#3A352F] mb-2.5 leading-snug">
                          TPS GARDEN FURNITURE CO., LTD
                        </h4>
                        <p className="text-[11px] leading-[1.8] text-[#2A231D] font-medium tracking-wide">
                          351/7-8 Soi Bangkok-Nonthaburi 13,<br />
                          Bangkok-Nonthaburi Road, Bang Sue,<br />
                          Bang Sue District, Bangkok 10800
                        </p>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col space-y-2">
                      <a
                        href="https://web.facebook.com/Terra.home.studio/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="flex items-center gap-3.5 group/link w-fit"
                      >
                        <span className="w-7 h-7 rounded-full bg-[#EAE3D9]/40 border border-white/50 flex items-center justify-center text-[#7A695C] shadow-sm transition-colors group-hover/link:bg-[#DED5C8] group-hover/link:text-[#3A352F]">
                          <FacebookIcon />
                        </span>
                        <span className="text-[11px] text-[#2A231D] font-medium tracking-wide transition-colors group-hover/link:text-black">
                          Facebook
                        </span>
                      </a>
                      <a
                        href="https://www.instagram.com/terra.home.studio/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="flex items-center gap-3.5 group/link w-fit"
                      >
                        <span className="w-7 h-7 rounded-full bg-[#EAE3D9]/40 border border-white/50 flex items-center justify-center text-[#7A695C] shadow-sm transition-colors group-hover/link:bg-[#DED5C8] group-hover/link:text-[#3A352F]">
                          <InstagramIcon />
                        </span>
                        <span className="text-[11px] text-[#2A231D] font-medium tracking-wide transition-colors group-hover/link:text-black">
                          Instagram
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 3: Links & Hours (Remaining space) */}
              <div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1.8fr_1.2fr] gap-4">

                {/* GET IN TOUCH */}
                <div className="flex flex-col">
                  <div className="mb-2">
                    <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-1">GET IN TOUCH</h5>
                    <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                  </div>
                  <ul className="space-y-2 text-xs text-[#2A231D] font-medium">
                    <li><span className="hover:text-black transition cursor-pointer whitespace-nowrap">Contact Us</span></li>
                    <li><span className="hover:text-black transition cursor-pointer whitespace-nowrap">Book An Appointment</span></li>
                  </ul>
                  <div className="flex items-start gap-2.5 text-xs text-[#5A524A] font-normal leading-relaxed">

                  </div>
                </div>

                {/* CATEGORIES */}
                <div className="flex flex-col col-span-1">
                  <div className="mb-2">
                    <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-1">CATEGORIES</h5>
                    <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                  </div>
                  {/* แบ่ง 2 คอลัมน์ 5-5 */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {categoryGroups.map(group => {
                      const isStandalone = group.items.length === 0 || (group.items.length === 1 && group.items[0] === group.label);

                      if (isStandalone) {
                        const href = group.label.toLowerCase() === "all" ? "/prop" : `/prop?category=${encodeURIComponent(group.label)}`;
                        return (
                          <Link key={group.label} href={href} prefetch={false} title={group.label} className="text-xs text-[#2A231D] font-medium uppercase tracking-wide hover:text-black transition block w-fit whitespace-nowrap">
                            {group.label}
                          </Link>
                        );
                      }

                      return (
                        <details key={group.label} className="group">
                          <summary className="text-xs text-[#2A231D] font-medium uppercase tracking-wide cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between hover:text-black transition whitespace-nowrap">
                            <span>{group.label}</span>
                            <span className="text-[9px] text-[#5A524A] transition-transform duration-300 group-open:rotate-180 ml-1">▼</span>
                          </summary>
                          <ul className="mt-1 mb-1 space-y-1 pl-3 border-l border-[#9C8C7A]/50">
                            {group.items.map(item => {
                              // ใช้ Regex ตัดคำนำหน้ากลุ่มทิ้ง ไม่ต้อง if/else ให้เมื่อย
                              const display = item.replace(/^(Decorative|Decotative|Doll|Wall Art|Vase)\s+/i, "");

                              return (
                                <li key={item}>
                                  <Link href={`/prop?category=${encodeURIComponent(item)}`} prefetch={false} title={display} className="text-[10.5px] text-[#3A352F] font-medium hover:text-black transition cursor-pointer block w-fit whitespace-nowrap">
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
                  <div className="mb-2">
                    <h5 className="font-bold uppercase text-[#3A352F] text-[13px] tracking-[0.2em] mb-1">OPENING HOURS</h5>
                    <div className="w-8 h-[1px] bg-[#9C8C7A]"></div>
                  </div>
                  <table className="w-full text-left text-xs text-[#2A231D] font-medium border-separate border-spacing-y-1">
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

                </div>

              </div>

            </div>

            {/* Bottom Copyright Bar */}
            <div className="relative border-t border-[#9C8C7A]/60 pt-2 flex flex-col md:flex-row items-center justify-between text-[7px] md:text-[8px] tracking-[0.25em] uppercase text-[#3A352F] font-semibold gap-3">
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
      </div>

    </footer>
  );
}
