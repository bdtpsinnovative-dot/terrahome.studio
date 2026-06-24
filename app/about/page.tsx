// app/about/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
// import Footer from '../components/Footer'; // อย่าลืม uncomment ตาม path จริงนะครับ

const designers = [
  {
    name: 'Martin (French)',
    image: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904711843-606.webp?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Austin Brow (USA)',
    image: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904702542-917.webp?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Macie White (USA)',
    image: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904693253-556.webp?auto=format&fit=crop&w=900&q=80',
  },
];

export default function AboutPage() {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // ดักจับการเลื่อนเมาส์ (Parallax)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ดักจับแอนิเมชัน Fade ของเนื้อหาด้านล่าง
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('[data-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = Number(entry.target.getAttribute('data-reveal'));
          setVisibleSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
          // เมื่อโชว์แล้วให้เลิก observe จะได้ไม่กระตุกเวลาเลื่อนขึ้นลงอีกรอบ
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id: number) => visibleSections.includes(id);

  // เช็คการเลื่อนหน้าจอเพื่อควบคุมการโผล่ของแจกัน
  const hasScrolledDown = scrollY > 20;

  return (
    <div className="bg-[#D9D1C5] text-[#2c2722] min-h-screen font-sans antialiased overflow-x-hidden">
      {/* ปรับปรุง CSS Animation ให้ดูพรีเมียมและนุ่มนวลขึ้น */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .reveal-anim {
              opacity: 0;
              transform: translateY(50px);
              transition: opacity 1.2s cubic-bezier(0.25, 1, 0.5, 1), transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .reveal-anim.is-visible {
              opacity: 1;
              transform: translateY(0);
            }
            .image-reveal {
              transform: scale(1.05);
              transition: transform 1.5s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .is-visible .image-reveal {
              transform: scale(1);
            }
          `,
        }}
      />

      {/* ================= 1. HERO SECTION (100vh Fullscreen) ================= */}
      <section className="relative w-full h-screen bg-[#FAF8F5]">

        {/* Parallax Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <img
            src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904145195-374.webp?auto=format&fit=crop&w=1800&q=120"
            alt="Minimal architecture exterior"
            className="w-full h-full object-cover object-center transform scale-105"
            style={{
              transform: `translateY(${scrollY * 0.2}px) scale(1.05)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/35 pointer-events-none" />
        </div>

        {/* Sculptural Vase at Bottom-Right */}
        <div className="absolute w-full h-full max-w-[1300px] mx-auto left-0 right-0 pointer-events-none">
          <div
            className={`absolute right-[5%] lg:right-[10%] z-20 w-[55vw] sm:w-[320px] lg:w-[420px] pointer-events-auto
      transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)]
      ${hasScrolledDown
                ? '-bottom-50 lg:-bottom-99 translate-y-0' // 🌟 จุดที่ 1: เพิ่มค่าติดลบให้มากขึ้น (จากเดิม -bottom-40 กับ -bottom-64) เพื่อกดรูปให้ต่ำลงมา
                : 'opacity-0 bottom-[-200px] translate-y-24 pointer-events-none'
              }
    `}
            style={hasScrolledDown ? {
              transform: `translateY(${-scrollY * 0.04}px)` // 🌟 จุดที่ 2: ลดตัวคูณ Parallax ลง (จากเดิม 0.08 ให้เหลือ 0.04 หรือ 0.03) รูปจะได้ไม่ลอยพุ่งขึ้นมาเร็วเกินไปครับ
            } : undefined}
          >
            <img
              src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904603569-581.webp?auto=format&fit=crop&w=800&q=80"
              alt="Sculptural still life"
              className="w-full object-cover aspect-square shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-sm"
            />
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="mx-auto max-w-[1200px] px-6 pt-40 lg:pt-56 pb-24 sm:px-12 flex flex-col gap-32 relative z-10">

        {/* === 1. ABOUT US INTRO === */}
        <section
          data-reveal="1"
          className={`reveal-anim grid gap-8 lg:grid-cols-2 lg:items-start ${isVisible(1) ? 'is-visible' : ''}`}
        >
          <div className="order-2 lg:order-1 pt-2 lg:pr-12">
            <h2 className="text-[#84492C] text-xl lg:text-2xl font-bold uppercase tracking-[0.15em] mb-4">
              ABOUT US
            </h2>
            <p className="text-[#2c2722] font-sans font-medium text-lg lg:text-xl leading-relaxed">
              At TERRA Home Studio, we believe that a thoughtfully designed home has the power to inspire everyday living.
            </p>
          </div>
        </section>

        {/* === 2. FOUNDED STORY === */}
        <section
          data-reveal="2"
          className={`reveal-anim grid gap-12 lg:grid-cols-2 lg:items-center ${isVisible(2) ? 'is-visible' : ''}`}
        >
          <div className="flex justify-start overflow-hidden">
            <img
              src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904646719-860.webp?auto=format&fit=crop&w=1000&q=80"
              alt="Glass decorative object"
              className="w-full max-w-[450px] object-cover aspect-square image-reveal shadow-lg"
            />
          </div>
          <div className="flex flex-col justify-center lg:pl-8">
            <p className="text-[#2c2722] font-sans text-[15px] lg:text-[17px] leading-relaxed lg:leading-loose opacity-90">
              Founded from a passion for timeless interiors and meaningful design, TERRA Home Studio curates decorative pieces that bring warmth, balance, and beauty into modern homes. Inspired by a blend of contemporary, minimalist, Nordic, and wabi-sabi aesthetics, our collections are created to complement spaces that feel both elegant and personal.
            </p>
          </div>
        </section>

        {/* === 3. DESIGNERS SECTION === */}
        <section
          data-reveal="3"
          className={`flex flex-col w-full`}
        >
          {/* Section Header (Reveal independently) */}
          <div className={`mb-12 max-w-2xl reveal-anim ${isVisible(3) ? 'is-visible' : ''}`}>
            <h3 className="text-[#84492C] text-lg lg:text-2xl font-serif font-bold uppercase tracking-[0.15em] mb-4">
              DESIGNERS WE WORK WITH.
            </h3>
            <p className="text-[#2c2722] font-sans font-medium text-lg lg:text-xl leading-relaxed">
              Every piece is thoughtfully designed and meticulously crafted to bring warmth, beauty, and meaning to everyday living.
            </p>
          </div>

          {/* Designers Grid with Staggered Animation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 w-full">
            {designers.map((designer, index) => (
              <div
                key={index}
                className={`flex flex-col items-center group cursor-pointer reveal-anim ${isVisible(3) ? 'is-visible' : ''}`}
                style={{ transitionDelay: `${index * 150}ms` }} // หน่วงเวลาให้โผล่มาทีละคน
              >
                <div className="overflow-hidden aspect-square w-full bg-[#EAE5DF] shadow-md relative">
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                  <img
                    src={designer.image}
                    alt={designer.name}
                    className="w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
                  />
                </div>
                <p className="mt-5 text-center text-[13px] lg:text-sm font-sans font-semibold text-[#2c2722] tracking-wide group-hover:text-[#84492C] transition-colors duration-300">
                  {designer.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* === 4. PHILOSOPHY SECTION === */}
        <section
          data-reveal="4"
          className={`reveal-anim grid gap-12 lg:grid-cols-2 lg:items-start ${isVisible(4) ? 'is-visible' : ''}`}
        >
          <div className="flex justify-start overflow-hidden order-1 lg:order-1">
            <img
              src="https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1780904773560-757.webp?auto=format&fit=crop&w=1200&q=80"
              alt="Collection of vases and decor"
              className="w-full max-w-[450px] object-cover aspect-[4/5] image-reveal shadow-lg"
            />
          </div>
          <div className="flex flex-col justify-start space-y-6 pt-4 lg:pl-8 order-2 lg:order-2">
            <h2 className="text-[#84492C] text-lg lg:text-2xl font-serif font-bold uppercase tracking-[0.15em] mb-2">
              OUR PHILOSOPHY
            </h2>
            <p className="text-[#2c2722] font-sans text-[15px] lg:text-[17px] leading-relaxed lg:leading-loose opacity-90">
              At TERRA Home Studio, we value craftsmanship, authenticity, and intentional design. These principles guide everything we create and inspire us to continually evolve while staying true to our belief that simplicity is timeless.
            </p>
            <p className="text-[#2c2722] font-sans text-[15px] lg:text-[17px] leading-relaxed lg:leading-loose opacity-90 pt-2">
              With TERRA Home Studio, discover a slower, more meaningful way of living—where every detail has a purpose, and every space feels like home.
            </p>
          </div>
        </section>

      </main>

      {/* <Footer /> */}
      <Footer />
    </div>
  );
}