'use client';

import React, { useMemo, useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

export default function Navbar({ collections = [], isLightMode = false }: { collections?: any[], isLightMode?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const currentCategory = searchParams.get('category');
  
  const isActive = (path: string) => pathname.startsWith(path);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = pathname.startsWith('/prop') ? window.innerHeight * 0.45 : 20;
      setIsScrolled(window.scrollY > triggerHeight);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const currentHref = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (currentHref === href) return;

    e.preventDefault();
    setIsLoading(true); 
    startTransition(() => {
      router.push(href);
    });
  };
  
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

  const darkBannerPages = ['/', '/prop']; 
  const isDarkBannerPage = darkBannerPages.some(path => pathname === path || pathname.startsWith('/prop'));

  const activeLightMode = !isDarkBannerPage || isLightMode;

  // สีเมนูหลักของ Navbar ยังคงเปลี่ยนสีดำ/ขาว ตามฉากหลังเหมือนเดิมครับ
  const textColor = (isScrolled || activeLightMode) ? 'text-[#3A3835]' : 'text-white';
  const textHoverColor = (isScrolled || activeLightMode) ? 'hover:text-[#84492C]' : 'hover:text-white';
  const textMutedColor = (isScrolled || activeLightMode) ? 'text-[#8C8A86]' : 'text-white/80';
  const borderColor = (isScrolled || activeLightMode) ? 'border-[#3A3835]' : 'border-white';
  
  const hamburgerLineColor = (isScrolled || activeLightMode) ? 'bg-[#3A3835]' : 'bg-white';
  const logoFilter = (isScrolled || activeLightMode) ? 'brightness-0 contrast-200' : '';

  // 🔥 1. แก้บั๊กจอดำ: บังคับให้ Dropdown กลายเป็น "กระจกส้มอิฐอ่อนๆ สไตล์ Luxury" ตลอดเวลา 100% ไม่ว่าฉากหลังจะมืดหรือสว่าง!
  const dropDownBg = "bg-[#F4EBE6]/40 backdrop-blur-2xl border border-[#84492C]/20 shadow-[0_20px_50px_rgba(132,73,44,0.15)]";
  const innerTitleColor = 'text-[#3A3835] border-[#3A3835]/15';
  const innerTextColor = 'text-[#6B645E]';
  const innerActiveTextColor = 'text-[#3A3835]';
  const innerTextHoverColor = 'hover:text-[#84492C]';
  const innerDotBg = 'bg-[#3A3835]';
  const innerPlusColor = 'text-[#8C8A86]';
  const innerSubBorderColor = 'border-[#3A3835]/10';

  // 🔥 2. แก้บั๊กไม่วิ่งตามจอ: ล็อกเป็น `fixed` แบบตายตัวเลยครับ Navbar จะเกาะจอวิ่งตามเมาส์ตั้งแต่วินาทีแรกแน่นอน!
  const navContainerClass = `fixed top-0 transition-all duration-500 ${
    isScrolled
      ? (activeLightMode
          ? 'bg-[#EBE8E1]/85 border-b border-[#84492C]/10 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.03)]' 
          : 'bg-white/10 border-b border-white/10 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]') 
      : 'bg-transparent' 
  }`;

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[9999] cursor-wait" />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-[#121212]/80 backdrop-blur-md flex flex-col items-center justify-center z-[99999] cursor-wait animate-fade-in">
          <div className="w-14 h-14 border-4 border-white/10 border-t-[#C8A97E] rounded-full animate-spin mb-4"></div>
          <h2 className="text-[#C8A97E] text-xs uppercase tracking-[0.3em] font-light animate-pulse">
            Loading...
          </h2>
        </div>
      )}

      <nav className={`left-0 right-0 z-50 px-8 md:px-12 py-5 md:py-6 flex justify-between items-center w-full h-32 md:h-36 transition-all duration-300 ${navContainerClass}`}>
        
        <div className={`hidden md:flex items-center space-x-8 lg:space-x-12 text-[11px] tracking-[0.25em] uppercase font-normal h-full ${textColor}`}>
          <Link 
            href="/about" 
            onClick={(e) => handleNavClick(e, '/about')} 
            className={`transition duration-300 ${isActive('/about') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
          >
            About
          </Link>

          <div className="relative group h-full flex items-center">
            <Link 
              href="/prop" 
              onClick={(e) => handleNavClick(e, '/prop')} 
              className={`transition duration-300 ${isActive('/prop') ? `${textColor} border-b ${borderColor} pb-1 font-medium` : `${textMutedColor} ${textHoverColor}`}`}
            >
              HOME DECOR
            </Link>

            <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <div className={`${dropDownBg} w-[290px] p-8 text-left rounded-sm transition-colors duration-300`}>
                
                <div className={`${innerTitleColor} text-[10.5px] uppercase font-bold tracking-[0.25em] mb-6 border-b pb-4`}>
                  Categories
                </div>

                <div className="flex flex-col gap-5">
                  {structuredCategories.map((group, idx) => {
                    
                    if (group.isSpecial) {
                      const item = group.items[0];
                      return (
                        <Link
                          key={item.fullValue}
                          href={`/prop?category=${encodeURIComponent(item.fullValue)}`}
                          onClick={(e) => handleNavClick(e, `/prop?category=${encodeURIComponent(item.fullValue)}`)} 
                          className={`w-full mt-2 pt-5 border-t ${innerTitleColor} flex items-center group/item`}
                        >
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 transition-colors duration-300 text-[#C25B4E] hover:text-[#9e463a]`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5z" clipRule="evenodd" />
                            </svg>
                            {group.label}
                          </span>
                        </Link>
                      )
                    }

                    if (!group.isGroup) {
                      const item = group.items[0];
                      const isItemActive = (item.fullValue === 'All' && !currentCategory) || (currentCategory === item.fullValue);
                      const targetUrl = `/prop${item.fullValue !== 'All' ? `?category=${encodeURIComponent(item.fullValue)}` : ''}`;

                      return (
                        <Link 
                          key={item.fullValue} 
                          href={targetUrl}
                          onClick={(e) => handleNavClick(e, targetUrl)} 
                          className="relative flex items-center w-full pl-5 group/item"
                        >
                          <span className={`absolute left-0 w-1.5 h-1.5 rounded-full ${innerDotBg} transition-all duration-300 ${isItemActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover/item:opacity-50 group-hover/item:scale-100'}`} />
                          
                          <span className={`text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${isItemActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}>
                            {item.displayLabel}
                          </span>
                        </Link>
                      );
                    }

                    const isExpanded = expandedGroups.includes(group.label);
                    const isGroupActive = group.items.some(item => currentCategory === item.fullValue);

                    return (
                      <div key={group.label} className="w-full flex flex-col pl-5 relative">
                        <button 
                          onClick={(e) => toggleGroup(e, group.label)} 
                          className="flex items-center justify-between w-full text-left group/btn"
                        >
                          <span className={`text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${isGroupActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}>
                            {group.label}
                          </span>
                          <span className={`${innerPlusColor} text-[12px] font-light transition-transform duration-300`}>
                            {isExpanded ? '−' : '+'}
                          </span>
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[300px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className={`flex flex-col gap-4 pl-3 ml-0.5 border-l ${innerSubBorderColor}`}>
                            {group.items.map(item => {
                              const isSubActive = currentCategory === item.fullValue;
                              const subTargetUrl = `/prop?category=${encodeURIComponent(item.fullValue)}`;
                              return (
                                <Link 
                                  key={item.fullValue} 
                                  href={subTargetUrl}
                                  onClick={(e) => handleNavClick(e, subTargetUrl)} 
                                  className={`text-[9.5px] uppercase tracking-[0.15em] transition-colors duration-300 ${isSubActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}
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
            onClick={(e) => handleNavClick(e, '/journal')} 
            className={`transition duration-300 ${isActive('/journal') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
          >
            Art & Gallery
          </Link>
          <Link 
            href="/contact" 
            onClick={(e) => handleNavClick(e, '/contact')} 
            className={`transition duration-300 ${isActive('/contact') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}
          >
            Contact
          </Link>
        </div>

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center flex items-center justify-center select-none">
          <Link href="/" onClick={(e) => handleNavClick(e, '/')} className="block transition-transform duration-300 hover:scale-105">
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
    </>
  );
}