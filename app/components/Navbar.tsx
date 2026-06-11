'use client';

// 🌟 1. นำเข้า useEffect เพิ่มเข้ามาครับ
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Navbar({ collections = [], isLightMode = false }: { collections?: any[], isLightMode?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get('category');
  const view = searchParams.get('view'); 

  const isActive = (path: string) => pathname.startsWith(path);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  // 🌟 2. เพิ่ม State ตัวจับการเลื่อนหน้าจอ
  const [isScrolled, setIsScrolled] = useState(false);

  // 🌟 3. ใช้ useEffect จับว่าผู้ใช้เลื่อนหน้าจอลงมาเกิน 20px หรือยัง
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // เช็คทันทีตอนโหลดหน้า
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleGroup = (e: React.MouseEvent, groupLabel: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGroups(prev => 
      prev.includes(groupLabel) ? prev.filter(g => g !== groupLabel) : [...prev, groupLabel]
    );
  };

  const structuredCategories = useMemo(() => {
    const finalCollections = collections && collections.length > 0 ? collections : [];

    const cats = new Set<string>();
    finalCollections.forEach(group => {
      if (group && group.product_sup) cats.add(group.product_sup);
    });
    const rawCategories = Array.from(cats).sort();

    const groups: { label: string, isGroup: boolean, items: { fullValue: string, displayLabel: string }[], isSpecial?: boolean }[] = [
      { label: "All", isGroup: false, items: [{ fullValue: "All", displayLabel: "All" }] }
    ];

    const decorativeItems: any[] = [];
    const dollItems: any[] = [];
    const wallArtItems: any[] = [];
    const vaseItems: any[] = [];
    const others: any[] = [];

    rawCategories.forEach(cat => {
      const lowerCat = cat.toLowerCase();

      if (cat === "Candle Holder" || cat.startsWith("Decorative") || cat.startsWith("Decotative")) {
        let display = cat;
        if (cat.startsWith("Decorative ")) display = cat.replace("Decorative ", "");
        else if (cat.startsWith("Decotative ")) display = cat.replace("Decotative ", "");
        decorativeItems.push({ fullValue: cat, displayLabel: display });
      }
      else if (cat.startsWith("Doll ")) {
        dollItems.push({ fullValue: cat, displayLabel: cat.replace("Doll ", "") });
      }
      else if (cat.startsWith("Wall Art ")) {
        wallArtItems.push({ fullValue: cat, displayLabel: cat.replace("Wall Art ", "") });
      }
      else if (lowerCat.startsWith("vase")) {
        let display = cat;
        if (lowerCat.startsWith("vase ")) {
          display = cat.replace(/^Vase\s+/i, ""); 
        }
        vaseItems.push({ fullValue: cat, displayLabel: display });
      }
      else {
        others.push({ fullValue: cat, displayLabel: cat });
      }
    });

    others.forEach(item => {
      groups.push({ label: item.displayLabel, isGroup: false, items: [item] });
    });

    if (decorativeItems.length > 0) groups.push({ label: "Decorative", isGroup: true, items: decorativeItems });
    if (dollItems.length > 0) groups.push({ label: "Doll", isGroup: true, items: dollItems });
    if (wallArtItems.length > 0) groups.push({ label: "Wall Art", isGroup: true, items: wallArtItems });
    if (vaseItems.length > 0) groups.push({ label: "Vase", isGroup: true, items: vaseItems }); 

    const allGroup = groups.shift();
    groups.sort((a, b) => a.label.localeCompare(b.label));
    if (allGroup) groups.unshift(allGroup);

    groups.push({
      label: "SALE OFFERS %",
      isGroup: false,
      items: [{ fullValue: "SPECIAL_DISCOUNT", displayLabel: "SALE OFFERS %" }],
      isSpecial: true
    });

    return groups;
  }, [collections]);

  const isAboutPage = view === 'about';
  const activeLightMode = isLightMode || isAboutPage;

  const textColor = isAboutPage ? 'text-black' : (activeLightMode ? 'text-[#3A3835]' : 'text-white');
  const textHoverColor = isAboutPage ? 'hover:text-black' : (activeLightMode ? 'hover:text-[#3A3835]' : 'hover:text-white');
  const textMutedColor = isAboutPage ? 'text-black/70' : (activeLightMode ? 'text-[#8C8A86]' : 'text-white/80');
  const borderColor = isAboutPage ? 'border-black' : (activeLightMode ? 'border-[#3A3835]' : 'border-white');
  
  const dropDownBg = "bg-[#D9D1C5]/40 border-white/20 backdrop-blur-2xl";

  const hamburgerLineColor = activeLightMode ? 'bg-[#3A3835]' : 'bg-white';
  const logoFilter = activeLightMode ? 'brightness-0 contrast-200' : '';
// 🌟 4. อัปเกรด Class ของ Navbar: ใช้สี #84492C ไล่สี Gradient เนียนๆ สไตล์ Overlay
  const navPosition = (isLightMode && view !== 'about') ? 'sticky' : (isScrolled ? 'fixed' : 'absolute');
  
  const navContainerClass = `${navPosition} top-0 transition-all duration-500 ${
    isScrolled
      ? (activeLightMode
          // 🟢 โทนสว่าง: ใช้สี #84492C (ความเข้ม 80%) เฟดไล่ลงมาหาใส
          ? 'bg-gradient-to-b from-[#84492C]/80 to-transparent backdrop-blur-md' 
          // 🟢 โทนมืด: ใช้สี #84492C (ความเข้ม 60% เพื่อไม่ให้ทึบเกินไปในจอมืด) เฟดไล่ลงมาหาใส
          : 'bg-gradient-to-b from-[#84492C]/60 to-transparent backdrop-blur-md') 
      : 'bg-transparent' // ตอนอยู่บนสุดให้ใสเนียนไปกับพื้นหลัง
  }`;
  return (
    <nav className={`left-0 right-0 z-50 px-8 md:px-12 py-5 md:py-6 flex justify-between items-center w-full h-24 md:h-28 transition-all duration-300 ${navContainerClass}`}>
      
      <div className={`hidden md:flex items-center space-x-8 lg:space-x-12 text-[11px] tracking-[0.25em] uppercase font-normal h-full ${textColor}`}>
        <Link 
          href="/about" 
          className={`transition duration-300 ${isActive('/about') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
        >
          About
        </Link>

        <div className="relative group h-full flex items-center">
          <Link 
            href="/prop" 
            className={`transition duration-300 ${isActive('/prop') ? `${textColor} border-b ${borderColor} pb-1 font-medium` : `${textMutedColor} ${textHoverColor}`}`}
          >
            HOME DECOR
          </Link>

          <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
            <div className={`${dropDownBg} w-[280px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border text-left rounded-sm`}>
              
              <div className="text-[#3A3835] dark:text-white/90 text-[10px] uppercase font-semibold tracking-[0.3em] mb-5 border-b border-black/10 dark:border-white/10 pb-4">
                Categories
              </div>

              <div className="flex flex-col gap-4">
                {structuredCategories.map((group, idx) => {
                  if (group.isSpecial) {
                    const item = group.items[0];
                    const isItemActive = currentCategory === item.fullValue;
                    return (
                      <Link
                        key={item.fullValue}
                        href={`/prop?category=${encodeURIComponent(item.fullValue)}`}
                        className="w-full mt-2 pt-3 border-t border-black/5 dark:border-white/5 flex items-center group/item"
                      >
                        <span className={`text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 transition-colors duration-300 ${isItemActive ? 'text-[#DC2626]' : 'text-[#c24b38] hover:text-[#DC2626]'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          {group.label}
                        </span>
                      </Link>
                    )
                  }

                  if (!group.isGroup) {
                    const item = group.items[0];
                    const isItemActive = (item.fullValue === 'All' && !currentCategory) || (currentCategory === item.fullValue);

                    return (
                      <Link 
                        key={item.fullValue} 
                        href={`/prop${item.fullValue !== 'All' ? `?category=${encodeURIComponent(item.fullValue)}` : ''}`}
                        className="relative flex items-center w-full pl-4 group/item"
                      >
                        <span className={`absolute left-0 w-1.5 h-1.5 rounded-full bg-[#3A3835] dark:bg-white transition-all duration-300 ${isItemActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover/item:opacity-50 group-hover/item:scale-100'}`} />
                        
                        <span className={`text-[10.5px] uppercase tracking-[0.2em] transition-colors duration-300 ${isItemActive ? 'text-black dark:text-white font-bold' : 'text-[#4A3E3D] dark:text-white/80 hover:text-black dark:hover:text-white'}`}>
                          {item.displayLabel}
                        </span>
                      </Link>
                    );
                  }

                  const isExpanded = expandedGroups.includes(group.label);
                  const isGroupActive = group.items.some(item => currentCategory === item.fullValue);

                  return (
                    <div key={group.label} className="w-full flex flex-col pl-4 relative">
                      <button 
                        onClick={(e) => toggleGroup(e, group.label)} 
                        className="flex items-center justify-between w-full text-left group/btn"
                      >
                        <span className={`text-[10.5px] uppercase tracking-[0.2em] transition-colors duration-300 ${isGroupActive ? 'text-black dark:text-white font-bold' : 'text-[#4A3E3D] dark:text-white/80 hover:text-black dark:hover:text-white'}`}>
                          {group.label}
                        </span>
                        <span className="text-[#4A3E3D] dark:text-white/60 text-[12px] font-light transition-transform duration-300">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[300px] mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col gap-3 pl-3 ml-0.5 border-l border-black/10 dark:border-white/10">
                          {group.items.map(item => {
                            const isSubActive = currentCategory === item.fullValue;
                            return (
                              <Link 
                                key={item.fullValue} 
                                href={`/prop?category=${encodeURIComponent(item.fullValue)}`}
                                className={`text-[10px] uppercase tracking-[0.15em] transition-colors duration-300 ${isSubActive ? 'text-black dark:text-white font-bold' : 'text-[#4A3E3D]/80 dark:text-white/70 hover:text-black dark:hover:text-white'}`}
                              >
                                {item.displayLabel}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        <Link 
          href="/journal" 
          className={`transition duration-300 ${isActive('/journal') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
        >
          Art & Gallery
        </Link>
        <Link 
          href="/contact" 
          className={`transition duration-300 ${isActive('/contact') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
        >
          Contact
        </Link>
      </div>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center flex items-center justify-center select-none">
        <Link href="/" className="block transition-transform duration-300 hover:scale-105">
          <img 
            src="/logo.png" 
            alt="Terra Home Studio Logo" 
            className={`w-auto h-10 sm:h-11 md:h-14 lg:h-15 object-contain ${logoFilter}`}
          />
        </Link>
      </div>

      <div className={`flex items-center space-x-6 lg:space-x-8 ${textColor}`}>
        <button className={`hover:opacity-60 transition duration-300 p-1 flex items-center justify-center`} aria-label="Search">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] md:w-5 md:h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M16.5 10.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
          </svg>
        </button>
        
        <button className="hover:opacity-60 transition duration-300 flex flex-col justify-center space-y-[5px] group h-5 p-1" aria-label="Menu">
          <span className={`w-[22px] md:w-[25px] h-[1px] ${hamburgerLineColor} block transition-all duration-300 group-hover:opacity-60`}></span>
          <span className={`w-[22px] md:w-[25px] h-[1px] ${hamburgerLineColor} block transition-all duration-300 group-hover:opacity-60`}></span>
          <span className={`w-[22px] md:w-[25px] h-[1px] ${hamburgerLineColor} block transition-all duration-300 group-hover:opacity-60`}></span>
        </button>
      </div>

    </nav>
  );
}