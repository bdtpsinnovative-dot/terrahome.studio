'use client';

import React, { useMemo, useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/src/supabase/client';
import { HARDCODED_CATEGORIES } from '@/app/constants/categories';

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

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    router.refresh();
    setIsLoading(false);
  };

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isProfileOpen && !(e.target as Element).closest('.profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // ล็อกหน้าจอไม่ให้เลื่อนตอนเปิดเมนู 3 ขีด
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isMobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMobileMenuOpen(false);
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
    const decorativeItems = [
      { fullValue: "Decorative Bath", displayLabel: "Bath" },
      { fullValue: "Decorative Box", displayLabel: "Box" },
      { fullValue: "Decorative Toy", displayLabel: "Toy" },
    ];

    const dollItems = [
      { fullValue: "Doll Animal", displayLabel: "Animal" },
      { fullValue: "Doll Human", displayLabel: "Human" },
      { fullValue: "Doll Object", displayLabel: "Object" },
      { fullValue: "Doll Plant", displayLabel: "Plant" },
    ];

    const vaseItems = [
      { fullValue: "Vase Ceramic 3D Printing", displayLabel: "Ceramic 3D Printing" },
      { fullValue: "Vase Ceramic Handmade", displayLabel: "Ceramic Handmade" },
      { fullValue: "Vase Glass Handmade", displayLabel: "Glass Handmade" },
      { fullValue: "Vase Normal", displayLabel: "Normal" },
    ];

    const wallArtItems = [
      { fullValue: "Wall Art 3D Material", displayLabel: "3D Material" },
      { fullValue: "Wall Art 3D Physical Painting", displayLabel: "3D Physical Painting" },
      { fullValue: "Wall Art Digital Print  ", displayLabel: "Digital Print" },
      { fullValue: "Wall Art Hand Craft 100%", displayLabel: "Hand Craft 100%" },
      { fullValue: "Wall Art Hand Craft 50%", displayLabel: "Hand Craft 50%" },
      { fullValue: "Wall Art Hand Craft 80%", displayLabel: "Hand Craft 80%" },
    ];

    return [
      { label: "All", isGroup: false, items: [{ fullValue: "All", displayLabel: "All" }] },
      { label: "Art Object", isGroup: false, items: [{ fullValue: "Art Object", displayLabel: "Art Object" }] },
      { label: "Book End", isGroup: false, items: [{ fullValue: "Book End", displayLabel: "Book End" }] },
      { label: "Candle Holder", isGroup: false, items: [{ fullValue: "Candle Holder", displayLabel: "Candle Holder" }] },
      { label: "Decorative", isGroup: true, items: decorativeItems },
      { label: "Doll", isGroup: true, items: dollItems },
      { label: "Kitchenware", isGroup: false, items: [{ fullValue: "Kitchenware", displayLabel: "Kitchenware" }] },
      { label: "Tray", isGroup: false, items: [{ fullValue: "Tray", displayLabel: "Tray" }] },
      { label: "Vase", isGroup: true, items: vaseItems },
      { label: "Wall Art", isGroup: true, items: wallArtItems },
      {
        label: "SALE OFFERS %",
        isGroup: false,
        items: [{ fullValue: "SPECIAL_DISCOUNT", displayLabel: "SALE OFFERS %" }],
        isSpecial: true
      }
    ];
  }, []);

  const darkBannerPages = ['/', '/prop', '/about'];
  const isDarkBannerPage = darkBannerPages.some(path => pathname === path || pathname.startsWith('/prop'));

  const activeLightMode = !isDarkBannerPage || isLightMode;

  const textColor = isScrolled
    ? 'text-[#84492C]'
    : (activeLightMode ? 'text-[#3A3835]' : 'text-white');

  const textHoverColor = isScrolled
    ? 'hover:text-[#3A3835]'
    : (activeLightMode ? 'hover:text-[#84492C]' : 'hover:text-white');

  const textMutedColor = isScrolled
    ? 'text-[#84492C]/70'
    : (activeLightMode ? 'text-[#8C8A86]' : 'text-white/80');

  const borderColor = isScrolled
    ? 'border-[#84492C]'
    : (activeLightMode ? 'border-[#3A3835]' : 'border-white');

  const hamburgerLineColor = isScrolled
    ? 'bg-[#84492C]'
    : (activeLightMode ? 'bg-[#3A3835]' : 'bg-white');

  const logoPath = '/logo.png';

  const logoFilter = (isScrolled || isMobileMenuOpen)
    ? ''
    : (activeLightMode ? 'brightness-0 contrast-200' : '');

  const dropDownBg = "bg-[#F4EBE6]/60 backdrop-blur-2xl border border-[#84492C]/10 shadow-[0_20px_50px_rgba(132,73,44,0.1)]";
  const innerTitleColor = 'text-[#3A3835] border-[#3A3835]/15';
  const innerTextColor = 'text-[#6B645E]';
  const innerActiveTextColor = 'text-[#3A3835]';
  const innerTextHoverColor = 'hover:text-[#84492C]';
  const innerDotBg = 'bg-[#3A3835]';
  const innerPlusColor = 'text-[#8C8A86]';
  const innerSubBorderColor = 'border-[#3A3835]/10';

  const navContainerClass = `fixed top-0 transition-all duration-500 ${isScrolled || isMobileMenuOpen
      ? 'bg-white/10 border-b border-[#84492C]/5 backdrop-blur-lg shadow-[0_2px_20px_rgba(0,0,0,0.02)]'
      : 'bg-transparent'
    }`;

  const createCategoryUrl = (categoryValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryValue === 'All') {
      params.delete('category');
    } else {
      params.set('category', categoryValue);
    }
    params.delete('page');

    const query = params.toString();
    return `/prop${query ? `?${query}` : ''}`;
  };

  const homeDecorMainUrl = createCategoryUrl('All');

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-[9999] cursor-wait" />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-[#121212]/80 backdrop-blur-md flex flex-col items-center justify-center z-[99999] cursor-wait animate-fade-in">
          <div className="w-14 h-14 border-4 border-white/10 border-t-[#C8A97E] rounded-full animate-spin mb-4"></div>
          <h2 className="text-[#C8A97E] text-xs uppercase tracking-[0.3em] font-light animate-pulse">
            Loading...
          </h2>
        </div>
      )}

      {/* ─── Mobile Overlay Menu — Reference Match ─────────────────────── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes mobileMenuReveal {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .mob-nav-item {
          opacity: 0;
          animation: mobileMenuReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .mob-nav-item:nth-child(1) { animation-delay: 0.08s; }
        .mob-nav-item:nth-child(2) { animation-delay: 0.16s; }
        .mob-nav-item:nth-child(3) { animation-delay: 0.24s; }
        .mob-nav-item:nth-child(4) { animation-delay: 0.32s; }
        .mob-util-item {
          opacity: 0;
          animation: mobileMenuReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .mob-util-item:nth-child(1) { animation-delay: 0.42s; }
        .mob-util-item:nth-child(2) { animation-delay: 0.50s; }
        .mob-util-item:nth-child(3) { animation-delay: 0.58s; }
        .mob-nav-row { transition: color 0.25s ease; }
        .mob-nav-row:hover .mob-nav-label { color: #B8834A; }
        .mob-nav-row:hover .mob-nav-num   { color: #B8834A; }
        .mob-nav-row:hover .mob-nav-icon  { color: #B8834A; }
      `}} />

      <div
        className={`fixed inset-0 z-[9999] lg:hidden transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
      >
        {/* ─── BACKDROP (Full Screen Dim) ─── */}
        <button
          className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-sm cursor-default"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
          tabIndex={-1}
        />

        {/* ─── LEFT PANEL (Drawer) ─── */}
        <div
          className={`relative flex flex-col w-[85%] sm:w-[60%] max-w-[400px] h-full bg-[#EFE9E1] shadow-2xl transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          style={{ transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* ── Header: Logo + Close ── */}
          <div className="flex items-start justify-between px-6 pt-7 pb-2">
            {/* Logo text */}
            <Link href="/" title="Terra Home Studio" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, '/'); }} className="flex flex-col leading-none select-none">
              <span className="font-serif text-[#3A3835] text-[22px] tracking-[0.12em] font-medium">TERRA</span>
              <span className="text-[7.5px] uppercase tracking-[0.28em] text-[#8C8A86] font-light -mt-0.5">HOME STUDIO</span>
            </Link>

            {/* × Close */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              className="text-[#3A3835] hover:text-[#B8834A] transition-colors duration-300 p-1 -mr-1 -mt-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Nav Links & Utilities (Vertically Centered) ── */}
          {isMobileMenuOpen && (
            <div className="flex-grow flex flex-col justify-center pb-16">
              <nav className="flex flex-col px-5">
              {[
                { num: '01', label: 'HOME DECOR', href: homeDecorMainUrl, url: homeDecorMainUrl, active: isActive('/prop') },
                { num: '02', label: 'ART & GALLERY', href: '/journal', url: '/journal', active: isActive('/journal') },
                { num: '03', label: 'ABOUT', href: '/about', url: '/about', active: isActive('/about') },
                { num: '04', label: 'CONTACT', href: '/contact', url: '/contact', active: isActive('/contact') },
              ].map(({ num, label, href, url, active }) => (
                <div key={num} className="mob-nav-item">
                  <Link
                    href={href}
                    title={label}
                    onClick={(e) => handleNavClick(e, url)}
                    className="mob-nav-row flex items-baseline gap-4 py-[16px] w-full group"
                  >
                    <span className={`mob-nav-num text-[10px] tracking-[0.2em] font-light flex-shrink-0 transition-colors ${active ? 'text-[#B8834A]' : 'text-[#8C8A86] group-hover:text-[#B8834A]'}`}>
                      {num}
                    </span>
                    <span
                      className={`mob-nav-label font-serif leading-tight transition-colors ${active ? 'text-[#B8834A] font-semibold' : 'text-[#3A3835] font-normal group-hover:text-[#B8834A]'}`}
                      style={{ fontSize: 'clamp(26px, 6vw, 34px)' }}
                    >
                      {label}
                    </span>
                  </Link>
                </div>
              ))}
              </nav>
              
              {/* ── Utility Section: cart / profile / sign out ── */}
              <div className="absolute bottom-8 left-0 right-0 px-8">
                <div className="flex items-center justify-between border-t border-[#C4B5A5]/40 pt-5">
                {user ? (
                  <>
                    <Link href="/cart" title="Shopping Cart" onClick={() => setIsMobileMenuOpen(false)}
                      className="mob-util-item flex flex-col items-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-[18px] h-[18px] text-[#8C8A86] flex-shrink-0 group-hover:text-[#B8834A] transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                      </svg>
                      <span className="font-sans uppercase text-[9px] tracking-[0.15em] text-[#8C8A86] group-hover:text-[#B8834A] transition-colors">cart</span>
                    </Link>

                    <Link href="/profile" title="My Profile" onClick={() => setIsMobileMenuOpen(false)}
                      className="mob-util-item flex flex-col items-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-[18px] h-[18px] text-[#8C8A86] flex-shrink-0 group-hover:text-[#B8834A] transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span className="font-sans uppercase text-[9px] tracking-[0.15em] text-[#8C8A86] group-hover:text-[#B8834A] transition-colors">profile</span>
                    </Link>

                    <button onClick={handleSignOut}
                      className="mob-util-item flex flex-col items-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-[18px] h-[18px] text-[#C0614A] flex-shrink-0 group-hover:text-red-600 transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                      </svg>
                      <span className="font-sans uppercase text-[9px] tracking-[0.15em] text-[#C0614A] group-hover:text-red-600 transition-colors">sign out</span>
                    </button>
                  </>
                ) : (
                  <Link href="/login" title="Login or Register" onClick={() => setIsMobileMenuOpen(false)}
                    className="mob-util-item flex items-center justify-center gap-3 w-full group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-[18px] h-[18px] text-[#8C8A86] flex-shrink-0 group-hover:text-[#B8834A] transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" />
                    </svg>
                    <span className="font-sans uppercase text-[10px] tracking-[0.15em] text-[#8C8A86] group-hover:text-[#B8834A] transition-colors">Login / Register</span>
                  </Link>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🛠️ ปรับ Flex Layout ใหม่ ถ่วงน้ำหนักซ้าย-ขวา ป้องกันการชนกัน 100% */}
      <nav className={`left-0 right-0 z-50 px-6 md:px-8 xl:px-12 py-3 md:py-4 flex justify-between items-center w-full h-20 md:h-24 transition-all duration-300 ${navContainerClass}`}>

        {/* ---------------- 1. ฝั่งซ้าย (basis-0 min-w-0 คือเคล็ดลับกันจอแตก) ---------------- */}
        <div className="hidden lg:flex flex-1 basis-0 min-w-0 items-center justify-start">
          {/* 🌟 เติม whitespace-nowrap เข้าไปที่บรรทัดด้านล่างนี้ครับ */}
          <div className={`hidden lg:flex items-center space-x-4 lg:space-x-5 xl:space-x-10 whitespace-nowrap text-[9.5px] xl:text-[11px] tracking-[0.15em] xl:tracking-[0.25em] uppercase font-normal h-full ${textColor}`}>
            <Link href="/about" title="About Us" onClick={(e) => handleNavClick(e, '/about')} className={`transition duration-300 ${isActive('/about') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}>
              About
            </Link>

            <div className="relative group h-full flex items-center">
              <Link href={homeDecorMainUrl} title="Home Decor" onClick={(e) => handleNavClick(e, homeDecorMainUrl)} className={`transition duration-300 ${isActive('/prop') ? `${textColor} border-b ${borderColor} pb-1 font-medium` : `${textMutedColor} ${textHoverColor}`}`}>
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
                        const targetUrl = createCategoryUrl(item.fullValue);
                        return (
                          <Link key={item.fullValue} href={targetUrl} title={item.displayLabel || group.label} onClick={(e) => handleNavClick(e, targetUrl)} className={`w-full mt-2 pt-5 border-t ${innerTitleColor} flex items-center group/item`}>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 transition-colors duration-300 text-[#C25B4E] hover:text-[#9e463a]">
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
                        const targetUrl = createCategoryUrl(item.fullValue);
                        return (
                          <Link key={item.fullValue} href={targetUrl} title={item.displayLabel || group.label} onClick={(e) => handleNavClick(e, targetUrl)} className="relative flex items-center w-full pl-5 group/item">
                            <span className={`absolute left-0 w-1.5 h-1.5 rounded-full ${innerDotBg} transition-all duration-300 ${isItemActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover/item:opacity-50 group-hover/item:scale-100'}`} />
                            <span className={`text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${isItemActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}>
                              {item.displayLabel}
                            </span>
                          </Link>
                        );
                      }
                      const isExpanded = expandedGroups.includes(group.label);
                      const isGroupActive = group.items.some(item => currentCategory === item.fullValue) || (currentCategory === group.label.toUpperCase());
                      const groupUrl = createCategoryUrl(group.label.toUpperCase());
                      return (
                        <div key={group.label} className="w-full flex flex-col pl-5 relative">
                          <div className="flex items-center justify-between w-full text-left">
                            <Link
                              href={groupUrl}
                              onClick={(e) => handleNavClick(e, groupUrl)}
                              className="flex-1 py-1 group/btn"
                            >
                              <span className={`text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${isGroupActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}>
                                {group.label}
                              </span>
                            </Link>
                            <button type="button" onClick={(e) => toggleGroup(e, group.label)} className="p-1 min-w-[28px] text-right">
                              <span className={`${innerPlusColor} text-[12px] font-light transition-transform duration-300`}>
                                {isExpanded ? '−' : '+'}
                              </span>
                            </button>
                          </div>
                          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[300px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className={`flex flex-col gap-4 pl-3 ml-0.5 border-l ${innerSubBorderColor}`}>
                              {group.items.map(item => {
                                const isSubActive = currentCategory === item.fullValue;
                                const subTargetUrl = createCategoryUrl(item.fullValue);
                                return (
                                  <Link key={item.fullValue} href={subTargetUrl} title={item.displayLabel} onClick={(e) => handleNavClick(e, subTargetUrl)} className={`text-[9.5px] uppercase tracking-[0.15em] transition-colors duration-300 ${isSubActive ? `${innerActiveTextColor} font-bold` : `${innerTextColor} font-medium ${innerTextHoverColor}`}`}>
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

            <Link href="/journal" title="Art & Gallery" onClick={(e) => handleNavClick(e, '/journal')} className={`transition duration-300 ${isActive('/journal') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}>
              Art & Gallery
            </Link>
            <Link href="/contact" title="Contact Us" onClick={(e) => handleNavClick(e, '/contact')} className={`transition duration-300 ${isActive('/contact') ? `${textColor} border-b ${borderColor} pb-1` : `${textMutedColor} ${textHoverColor}`}`}>
              Contact
            </Link>
          </div>
        </div>

        {/* ---------------- 2. ตรงกลาง (โลโก้) ---------------- */}
        <div className="flex-shrink-0 flex items-center justify-center select-none z-10 px-2 lg:px-4">
          <Link href="/" title="Terra Home Studio" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, '/'); }} className="block transition-transform duration-300 hover:scale-105">
            <img
              src={logoPath}
              alt="Terra Home Studio Logo"
              title="Terra Home Studio Logo"
              className={`w-auto h-7 sm:h-8 md:h-10 lg:h-11 object-contain transition-all duration-500 ${logoFilter}`}
            />
          </Link>
        </div>

        {/* ---------------- 3. ฝั่งขวา ---------------- */}
        <div className={`flex-1 basis-0 min-w-0 flex items-center justify-end ${isMobileMenuOpen ? 'text-[#3A3835]' : textColor}`}>

          {/* 🌟 โซนจอคอม (Desktop) จะซ่อนปุ่ม 3 ขีด โชว์แค่ User/Cart */}
          <div className="hidden lg:flex items-center space-x-4 lg:space-x-6">
            {user ? (
              <>
                <Link href="/cart" title="Shopping Cart" className="hover:opacity-60 transition duration-300 p-1.5 flex items-center justify-center relative" aria-label="Cart">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] md:w-[20px] md:h-[20px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#84492C] rounded-full"></span>
                </Link>

                <div className="relative profile-dropdown-container">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`hover:opacity-80 transition duration-300 flex items-center justify-center pl-1 rounded-full ${isProfileOpen ? 'ring-2 ring-[#84492C]/30' : ''}`}
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        title="Profile"
                        className={`w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border ${borderColor}`}
                      />
                    ) : (
                      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full border ${borderColor} flex items-center justify-center bg-gray-200 text-gray-500`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>

                  <div className={`absolute top-full right-0 mt-4 w-48 ${dropDownBg} rounded-sm transition-all duration-300 transform origin-top-right z-50 ${isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                    <div className="py-2 flex flex-col font-sans">
                      <div className="px-4 py-3 border-b border-[#3A3835]/10 mb-1">
                        <p className="text-[9px] uppercase tracking-wider text-[#6B645E] truncate">Signed in as</p>
                        <p className="text-[11px] font-medium text-[#3A3835] truncate mt-0.5">{user.email}</p>
                      </div>

                      <Link
                        href="/profile"
                        title="My Profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-[#3A3835] hover:bg-white/40 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-[#8C8A86]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                        My Profile
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-red-700/80 hover:text-red-700 hover:bg-red-50/50 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 opacity-70">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Link href="/login" title="Login" className="hover:opacity-60 transition duration-300 p-1.5 flex items-center justify-center" aria-label="Login">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] md:w-[20px] md:h-[20px]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </Link>
            )}
          </div>

          {/* เติม <button ตรงนี้ครับ */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden hover:opacity-60 transition duration-300 flex flex-col justify-center items-center space-y-[6px] w-8 h-8 relative z-[110]"
            aria-label="Menu"
          >
            <span className={`w-[22px] h-[1.5px] block transition-all duration-300 ${isMobileMenuOpen ? 'bg-[#3A3835] rotate-45 translate-y-[7.5px]' : hamburgerLineColor}`}></span>
            <span className={`w-[22px] h-[1.5px] block transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : hamburgerLineColor}`}></span>
            <span className={`w-[22px] h-[1.5px] block transition-all duration-300 ${isMobileMenuOpen ? 'bg-[#3A3835] -rotate-45 -translate-y-[7.5px]' : hamburgerLineColor}`}></span>
          </button>

        </div>

      </nav>
    </>
  );
}