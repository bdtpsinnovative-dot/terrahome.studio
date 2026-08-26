"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2, MapPin, Navigation, Sparkles, Layers, Package } from "lucide-react";
import { createClient, getSafeSession } from "@/src/supabase/client";
import { trackAnalyticsCta } from "@/app/components/AnalyticsTracker";
import MessengerInquiryButton from "@/app/components/MessengerInquiryButton";

const BranchMap = dynamic(() => import("@/app/prop/[groupId]/[sku]/BranchMap"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-[350px] mt-4 bg-[#F2EFE9] flex flex-col items-center justify-center text-[#84492C] text-[10px] uppercase tracking-widest animate-pulse rounded-[2px]">
      <MapPin className="w-6 h-6 mb-2 opacity-50" />
      Loading Map...
    </div>
  )
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CollectionLookClient({
  collectionImage,
  category,
  linkedProducts,
  recommendedCollections,
  otherLooks,
}: {
  collectionImage: {
    id: number;
    imageUrl: string;
    sortOrder: number;
    altText?: string | null;
  };
  category: {
    id: string;
    slug: string;
    titleEn: string;
    titleTh: string;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
    categoryQuery?: string | null;
    sortOrder: number;
  };
  linkedProducts: any[];
  recommendedCollections?: any[];
  otherLooks?: Array<{ id: number; imageUrl: string; sortOrder: number }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  
  // Set Mode vs Single Product Mode
  const [isFullSetSelected, setIsFullSetSelected] = useState(false);

  // Active product selected from the linked items in this look
  const [activeProduct, setActiveProduct] = useState(() => {
    return linkedProducts[0] || {
      id: 0,
      name: category.titleEn,
      sku: `LOOK-${collectionImage.sortOrder}`,
      price: null,
      specs: {},
      stock: [],
    };
  });

  const getDiscountedPrice = (product: any) => {
    const originalPrice = Number(product?.price || 0);
    const discountValue = Number(product?.discount_value);
    const discountType = product?.discount_type;

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return null;
    if (!Number.isFinite(discountValue) || discountValue <= 0 || !discountType) return originalPrice;

    if (discountType === "PERCENT") return originalPrice * (1 - (discountValue / 100));
    if (discountType === "FIXED") return Math.max(0, originalPrice - discountValue);
    return originalPrice;
  };

  // Full Set Calculations
  const totalSetOriginalPrice = linkedProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const totalSetDiscountedPrice = linkedProducts.reduce((sum, p) => {
    const discounted = getDiscountedPrice(p);
    return sum + (discounted !== null ? discounted : Number(p.price || 0));
  }, 0);
  const hasSetDiscount = totalSetDiscountedPrice < totalSetOriginalPrice && totalSetDiscountedPrice > 0;
  const isSetAvailable = linkedProducts.length > 0;

  const allSetInStock = linkedProducts.every((p) => {
    const stockQty = (p.stock || []).reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0);
    return stockQty > 0;
  });

  const [showStock, setShowStock] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Add to Cart state
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const trackedViewsRef = useRef<Set<number>>(new Set());
  const pendingViewsRef = useRef<Set<number>>(new Set());
  const previousProductRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFullSetSelected) return;
    const productId = Number(activeProduct?.id);
    if (!Number.isSafeInteger(productId) || productId <= 0 || trackedViewsRef.current.has(productId) || pendingViewsRef.current.has(productId)) return;

    if (previousProductRef.current !== null && previousProductRef.current !== productId) {
      window.dispatchEvent(new CustomEvent("prop-product-selected", { detail: { productId, sku: activeProduct?.sku || String(productId) } }));
    }
    previousProductRef.current = productId;
    pendingViewsRef.current.add(productId);

    const payload = JSON.stringify({
      event_type: "product_view",
      product_id: productId,
      collection_group_id: category.slug,
      page_type: "collection_look",
      page_path: window.location.pathname,
      page_entity_id: activeProduct?.sku || String(productId),
    });

    const sendViewEvent = async () => {
      try {
        await fetch("/api/algorithm/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          credentials: "same-origin",
          cache: "no-store",
          keepalive: true,
        });
        trackedViewsRef.current.add(productId);
      } catch (err) {
        // silent
      }
    };

    void sendViewEvent();
  }, [activeProduct?.id, activeProduct?.sku, category.slug, isFullSetSelected]);

  const handleSelectProduct = (product: any) => {
    setIsFullSetSelected(false);
    setActiveProduct(product);
    setShowStock(false);
  };

  const handleSelectFullSet = () => {
    setIsFullSetSelected(true);
    setShowStock(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งครับ");
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoadingLocation(false);
      },
      (error) => {
        console.error(error);
        alert("ไม่สามารถดึงตำแหน่งได้ โปรดเปิดสิทธิ์เข้าถึงพิกัดในเบราว์เซอร์ก่อนนะครับ");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const totalStock = activeProduct.stock?.reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0) || 0;
  const outOfStock = totalStock <= 0;
  const activeDiscountValue = Number(activeProduct?.discount_value);
  const activeDiscountType = activeProduct?.discount_type;
  const activeDiscountedPrice = getDiscountedPrice(activeProduct);
  const hasActiveDiscount = Number.isFinite(activeDiscountValue) && activeDiscountValue > 0 && activeDiscountType;

  // 1. Single Product Add To Cart
  const handleAddToCart = async () => {
    if (!activeProduct || !activeProduct.id) return;
    try {
      trackAnalyticsCta("add_to_cart", { product_id: activeProduct.id, price: activeProduct.price });
      setIsAddingToCart(true);

      const session = await getSafeSession();
      if (!session) {
        alert("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้านะครับ");
        router.push("/login");
        return;
      }

      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("product_id", activeProduct.id)
        .maybeSingle();

      if (existingItem) {
        if (existingItem.quantity >= totalStock) {
          alert(`ขออภัยครับ สินค้านี้มีสต็อกคงเหลือ ${totalStock} ชิ้น (คุณเพิ่มลงตะกร้าเต็มจำนวนแล้ว)`);
          setIsAddingToCart(false);
          return;
        }

        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: session.user.id,
            product_id: activeProduct.id,
            quantity: 1,
          });
          
        if (insertError) throw insertError;
      }

      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มสินค้าลงตะกร้า โปรดลองอีกครั้งครับ");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // 2. Full Set Add To Cart (Batch Add All Linked Products)
  const handleAddFullSetToCart = async () => {
    if (!linkedProducts.length) return;
    try {
      trackAnalyticsCta("add_full_set_to_cart", { 
        look_id: collectionImage.id, 
        items_count: linkedProducts.length,
        total_price: totalSetDiscountedPrice 
      });
      setIsAddingToCart(true);

      const session = await getSafeSession();
      if (!session) {
        alert("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้านะครับ");
        router.push("/login");
        return;
      }

      // Add each item in the look set to the user's cart
      for (const product of linkedProducts) {
        if (!product.id) continue;

        const { data: existingItem } = await supabase
          .from("cart_items")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (existingItem) {
          await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + 1 })
            .eq("id", existingItem.id);
        } else {
          await supabase
            .from("cart_items")
            .insert({
              user_id: session.user.id,
              product_id: product.id,
              quantity: 1,
            });
        }
      }

      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch (error: any) {
      console.error("Error adding full set to cart:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มสินค้าทั้งเซตลงตะกร้า โปรดลองอีกครั้งครับ");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const specs = activeProduct.specs || {};
  
  let activeStock = activeProduct.stock?.filter((s: any) => s.qty > 0).map((s: any) => {
    if (userLocation && s.branches?.latitude && s.branches?.longitude) {
      const dist = calculateDistance(
        userLocation[0],
        userLocation[1],
        Number(s.branches.latitude),
        Number(s.branches.longitude)
      );
      return { ...s, distance: dist };
    }
    return { ...s, distance: null };
  }) || [];

  if (userLocation && activeStock.length > 0) {
    activeStock.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
  }

  return (
    <div className="relative z-[9999] min-h-screen bg-[#EBE8E1] text-[#3A3835] font-sans antialiased selection:bg-[#3A3835] selection:text-[#EBE8E1] flex flex-col justify-between">
      
      {/* 1. TOP NAVIGATION BAR */}
      <nav className="w-full px-6 lg:px-12 py-6 flex justify-between items-center sticky top-0 bg-[#EBE8E1] z-[10000]">
        <button
          onClick={() => router.back()}
          className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#3A3835] flex items-center gap-2 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
          <span>BACK</span>
        </button>
        
        <div className="font-serif text-sm sm:text-base tracking-[0.25em] uppercase text-center truncate px-4">
          JOURNAL LOOK #{collectionImage.sortOrder}
        </div>
        
        <div className="text-[9px] sm:text-[10px] text-[#8C8A86] font-medium tracking-[0.15em] text-right truncate max-w-[120px] sm:max-w-none">
          COLLECTION: {category.titleEn}
        </div>
      </nav>

      {/* 2. MAIN 2-COLUMN SHOWCASE SECTION */}
      <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 flex-1 items-stretch py-2 lg:py-4">
        
        {/* LEFT COLUMN: 1:1 Square Image (Dynamic between Look Photo & Active Product Image) */}
        <div className="lg:col-span-5 p-4 lg:p-6 flex flex-col">
          <div className="w-full aspect-square bg-[#F4F1EB] relative overflow-hidden group rounded-[2px] border border-[#3A3835]/5 shadow-xs flex items-center justify-center">
            {isFullSetSelected ? (
              <img 
                src={collectionImage.imageUrl} 
                alt={collectionImage.altText || `${category.titleEn} Look ${collectionImage.sortOrder}`} 
                title={`${category.titleEn} Look ${collectionImage.sortOrder}`} 
                key={`look-${collectionImage.id}`}
                className="w-full h-full absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <img 
                src={activeProduct.image_url || collectionImage.imageUrl} 
                alt={activeProduct.name || `${category.titleEn} Look ${collectionImage.sortOrder}`} 
                title={activeProduct.name} 
                key={`product-${activeProduct.id || collectionImage.id}`}
                className={`w-full h-full transition-all duration-500 group-hover:scale-105 ${
                  activeProduct.image_url 
                    ? "object-contain p-6 sm:p-8 mix-blend-multiply" 
                    : "object-cover"
                }`}
              />
            )}

            {/* Look / Product Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-medium tracking-[0.2em] uppercase border border-white/10">
              <span>{isFullSetSelected ? `Look #${collectionImage.sortOrder} · Set` : (activeProduct.sku || `Look #${collectionImage.sortOrder}`)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Product Details OR Complete Set Details */}
        <div className="lg:col-span-7 p-4 lg:p-6 xl:p-8 flex flex-col gap-6">
          
          {/* A. COMPLETE SET VIEW (เมื่อเลือก เซ็ตรวม) */}
          {isFullSetSelected ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#84492C] bg-[#84492C]/10 px-2 py-0.5 rounded-[2px]">
                  FULL LOOK SET
                </span>
                <span className="text-[9px] text-[#8C8A86] font-mono">
                  {linkedProducts.length} ITEMS INCLUDED
                </span>
              </div>

              <h1 className="font-serif text-2xl lg:text-[2.1rem] uppercase tracking-wide leading-snug text-[#3A3835]">
                {category.titleEn} (LOOK #{collectionImage.sortOrder} SET)
              </h1>

              {/* Set Price */}
              {hasSetDiscount ? (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#DC2626]">
                    SPECIAL SET PRICE
                  </span>
                  <span className="text-[10px] text-[#8C8A86] line-through tracking-[0.12em] uppercase">
                    THB {Number(totalSetOriginalPrice).toLocaleString()}
                  </span>
                  <p className="text-[14px] font-bold tracking-[0.12em] text-[#84492C]">
                    THB {Number(totalSetDiscountedPrice).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[14px] font-bold tracking-[0.12em] text-[#84492C]">
                  THB {Number(totalSetOriginalPrice).toLocaleString()}
                </p>
              )}

              {/* SET SPECS TABLE */}
              <div className="mt-8 py-5 border-y border-[#3A3835]/10 grid grid-cols-3 text-center text-xs divide-x divide-[#3A3835]/10 max-w-lg">
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1">TOTAL PIECES</span>
                  <span className="font-semibold text-[11px] text-[#3A3835]">{linkedProducts.length} รายการ</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1">COLLECTION</span>
                  <span className="font-semibold text-[11px] text-[#3A3835]">{category.titleEn}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1">SET TYPE</span>
                  <span className="font-semibold text-[11px] text-[#84492C]">ครบเซตตามภาพ</span>
                </div>
              </div>

              {/* SET ITEMS BREAKDOWN SUMMARY */}
              <div className="mt-6 max-w-lg">
                <span className="text-[8.5px] uppercase tracking-[0.2em] font-bold text-[#8C8A86] block mb-2.5">
                  รายการสินค้าในเซตนี้ ({linkedProducts.length} ชิ้น):
                </span>
                <div className="bg-[#F2EFE9]/60 p-3 rounded-[2px] border border-[#3A3835]/5 space-y-2">
                  {linkedProducts.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-[#3A3835]/5 last:border-b-0">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-[#8C8A86]">{idx + 1}.</span>
                        <div className="h-7 w-7 rounded-[2px] bg-white overflow-hidden p-0.5 shrink-0 border border-[#3A3835]/10">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Package className="h-full w-full text-slate-300 p-0.5" />
                          )}
                        </div>
                        <span className="text-[10.5px] font-medium text-[#3A3835] truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] font-semibold text-[#84492C] shrink-0">
                        {item.price > 0 ? `฿${Number(item.price).toLocaleString()}` : "POA"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* B. INDIVIDUAL PRODUCT VIEW (เมื่อเลือก ชิ้นเดี่ยว) */
            <div>
              <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#84492C] mb-1">
                {activeProduct.sku || `${category.titleEn} COLLECTION`}
              </div>

              <h1 className="font-serif text-2xl lg:text-[2.1rem] uppercase tracking-wide leading-snug text-[#3A3835]">
                {activeProduct.name}
              </h1>

              {hasActiveDiscount && activeDiscountedPrice !== null ? (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#DC2626]">
                    {activeDiscountType === "PERCENT" ? `-${activeDiscountValue}%` : `-฿${activeDiscountValue}`}
                  </span>
                  <span className="text-[10px] text-[#8C8A86] line-through tracking-[0.12em] uppercase">
                    THB {Number(activeProduct.price).toLocaleString()}
                  </span>
                  <p className="text-[13px] font-medium tracking-[0.12em] text-[#84492C]">
                    THB {Number(activeDiscountedPrice).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[13px] font-medium tracking-[0.12em] text-[#84492C]">
                  {outOfStock ? "PRE-ORDER (รอสินค้า 45-60 วัน)" : activeProduct.price > 0 ? `THB ${Number(activeProduct.price).toLocaleString()}` : "POA"}
                </p>
              )}

              {/* SPECS TABLE (MATERIAL, WIDTH, DEPTH, HEIGHT) */}
              <div className="mt-8 py-6 border-y border-[#3A3835]/10 grid grid-cols-4 text-center text-xs divide-x divide-[#3A3835]/10 max-w-lg">
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">MATERIAL</span>
                  <span className="font-medium text-[10px] text-[#3A3835]">{specs.material || "-"}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">WIDTH</span>
                  <span className="font-medium text-[10px] text-[#3A3835]">{specs.width_cm || "-"} cm</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">DEPTH</span>
                  <span className="font-medium text-[10px] text-[#3A3835]">{specs.length_cm || "-"} cm</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-[#8C8A86] mb-1.5">HEIGHT</span>
                  <span className="font-medium text-[10px] text-[#3A3835]">{specs.thickness_cm || "-"} cm</span>
                </div>
              </div>

              {/* IN-STORE AVAILABILITY & MAP */}
              <div className="mt-6 max-w-lg">
                <button 
                  onClick={() => {
                    trackAnalyticsCta(showStock ? "close_stock_availability" : "open_stock_availability", { product_id: activeProduct.id });
                    setShowStock(!showStock);
                  }}
                  className="w-full flex items-center justify-between py-4 border-b border-[#3A3835]/10 group"
                >
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] font-bold text-[#3A3835] group-hover:text-[#84492C] transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                    IN-STORE AVAILABILITY & MAP
                  </div>
                  <span className="text-[#8C8A86] text-lg font-light group-hover:text-[#84492C] transition-colors">
                    {showStock ? "−" : "+"}
                  </span>
                </button>

                <div className={`overflow-hidden transition-all duration-700 ease-in-out ${showStock ? "max-h-[1200px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}>
                  
                  {activeStock.length > 0 && !userLocation && (
                    <button
                      onClick={handleGetLocation}
                      disabled={loadingLocation}
                      className="mb-4 w-full text-left text-[9px] font-bold text-[#84492C] hover:text-[#3A3835] transition-colors uppercase tracking-[0.15em] flex items-center gap-1.5 py-1"
                    >
                      <Navigation className={`w-3 h-3 ${loadingLocation ? "animate-spin" : ""}`} />
                      {loadingLocation ? "CALCULATING..." : "CALCULATE DISTANCE FROM YOUR LOCATION"}
                    </button>
                  )}

                  <div className="bg-[#F2EFE9]/50 p-2 rounded-sm border border-[#3A3835]/5 flex flex-col gap-1">
                    {activeStock.length > 0 ? (
                      activeStock.map((s: any, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            if (s.branches?.latitude && s.branches?.longitude) {
                              setSelectedBranch({
                                lat: Number(s.branches.latitude),
                                lng: Number(s.branches.longitude),
                                timestamp: Date.now(),
                              });
                            }
                          }}
                          className="flex justify-between items-center text-[10px] uppercase tracking-wider p-3 rounded-sm cursor-pointer hover:bg-white/60 transition-all duration-300 border border-transparent hover:border-[#3A3835]/10"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[#3A3835] font-medium tracking-[0.1em]">
                              {s.branches?.branch_name || "Unknown Branch"}
                            </span>
                            {s.distance !== null && (
                              <span className="text-[8.5px] text-[#84492C] font-medium flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {s.distance.toFixed(1)} km away
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#84492C]"></span>
                              <span className="font-mono text-[#3A3835] font-semibold">{s.qty} in stock</span>
                            </div>
                            
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${s.branches.latitude},${s.branches.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} 
                              title={`Get directions to ${s.branches.branch_name} branch on Google Maps`}
                              className="text-[#8C8A86] hover:text-[#84492C] p-1 rounded-sm transition-colors"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-[9px] text-[#84492C] uppercase tracking-[0.2em] py-5 flex flex-col items-center gap-1 font-semibold">
                        <span>PRE-ORDER AVAILABLE</span>
                        <span className="text-[9px] tracking-normal text-[#84492C] normal-case font-semibold">(รอสินค้า 45-60 วัน)</span>
                      </div>
                    )}
                  </div>

                  {activeStock.length > 0 && (
                    <BranchMap 
                      activeStock={activeStock} 
                      productImage={activeProduct.image_url} 
                      productName={activeProduct.name}
                      userLocation={userLocation}
                      setUserLocation={setUserLocation}
                      selectedBranch={selectedBranch}
                    />
                  )}

                </div>
              </div>
            </div>
          )}

          {/* COMPLETE THE SET / COLLECTION ITEMS CAROUSEL */}
          <div className="mt-4">
            <div className="mb-4">
              <span className="text-[#84492C] text-[8px] uppercase tracking-[0.2em] font-bold block mb-1">
                CHOOSE PIECE OR COMPLETE SET
              </span>
              <h2 className="font-serif text-lg uppercase tracking-wider text-[#3A3835]">
                ITEMS IN THIS SET ({linkedProducts.length})
              </h2>
            </div>

            {linkedProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8C8A86] border border-dashed border-[#3A3835]/15 rounded-sm">
                ยังไม่มีรายการสินค้าที่ผูกไว้กับ Look นี้
              </div>
            ) : (
              <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* 1. SPECIAL CARD: COMPLETE SET (เซ็ตรวมทั้งชุด) */}
                {linkedProducts.length > 1 && (
                  <div 
                    onClick={handleSelectFullSet}
                    className={`snap-start min-w-[130px] max-w-[130px] flex flex-col group transition-all duration-300 cursor-pointer`}
                  >
                    <div className={`w-full aspect-4/5 mb-3 relative overflow-hidden flex flex-col items-center justify-center rounded-[2px] transition-all duration-300 ${
                      isFullSetSelected 
                        ? "bg-[#F2EFE9] border-2 border-[#84492C] shadow-xs" 
                        : "bg-[#F2EFE9] border border-[#3A3835]/20 hover:border-[#84492C]"
                    }`}>
                      {/* Set Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="flex items-center gap-1 text-[7px] font-bold text-white bg-[#84492C] px-1.5 py-0.5 rounded-[2px] tracking-[0.1em] uppercase">
                          <Layers className="w-2.5 h-2.5" />
                          FULL SET
                        </span>
                      </div>

                      {isFullSetSelected && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
                          <span className="flex items-center gap-1 text-[7px] font-bold text-[#84492C] uppercase tracking-[0.15em] bg-white px-2 py-0.5 rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#3A3835]/5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            VIEWING
                          </span>
                        </div>
                      )}

                      <img 
                        src={collectionImage.imageUrl} 
                        className={`w-full h-full object-cover transition-opacity ${isFullSetSelected ? "opacity-100" : "opacity-75 group-hover:opacity-100"}`} 
                        alt="Complete Set" 
                      />
                    </div>

                    <div className="flex flex-col items-center text-center px-1">
                      <h3 className={`text-[9.5px] uppercase font-bold tracking-[0.1em] truncate w-full transition-colors ${isFullSetSelected ? "text-[#84492C]" : "text-[#5A544F] group-hover:text-[#84492C]"}`}>
                        เซ็ตรวมทั้งชุด
                      </h3>
                      <p className={`text-[9px] mt-1 font-bold ${isFullSetSelected ? "text-[#84492C]" : "text-[#3A3835]"}`}>
                        THB {Number(totalSetDiscountedPrice).toLocaleString()}
                      </p>
                      <span className="text-[7.5px] text-[#8C8A86] mt-0.5 uppercase tracking-wider font-mono">
                        ({linkedProducts.length} ชิ้นครบเซต)
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. INDIVIDUAL CARDS: สินค้าแยกชิ้น */}
                {linkedProducts.map((item) => {
                  const isActive = !isFullSetSelected && item.id === activeProduct.id;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleSelectProduct(item)}
                      className={`snap-start min-w-[120px] max-w-[120px] flex flex-col group transition-all duration-300 cursor-pointer`}
                    >
                      <div className={`w-full aspect-4/5 mb-3 relative overflow-hidden flex flex-col items-center justify-center rounded-[2px] transition-colors duration-300 ${
                        isActive ? "bg-[#F2EFE9] border border-[#84492C]" : "bg-[#F2EFE9] border border-transparent hover:border-[#3A3835]/15"
                      }`}>
                        
                        {isActive && (
                          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
                            <span className="flex items-center gap-1 text-[7px] font-bold text-[#84492C] uppercase tracking-[0.15em] bg-white px-2 py-0.5 rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#3A3835]/5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              VIEWING
                            </span>
                          </div>
                        )}

                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            className={`w-full h-full object-contain p-4 mix-blend-multiply transition-opacity ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} 
                            alt={item.name} 
                            title={item.name} 
                          />
                        ) : (
                          <span className="text-[8px] text-[#8C8A86] uppercase tracking-[0.2em]">No Img</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center text-center px-1">
                        <h3 className={`text-[9px] uppercase font-bold tracking-[0.1em] truncate w-full transition-colors ${isActive ? "text-[#84492C]" : "text-[#5A544F] group-hover:text-[#84492C]"}`}>
                          {item.name}
                        </h3>
                        {((item.stock || []).reduce((sum: number, stockItem: any) => sum + Number(stockItem?.qty || 0), 0) > 0) ? (
                          <p className={`text-[9px] mt-1 font-medium ${isActive ? "text-[#3A3835]" : "text-[#8C8A86]"}`}>
                            {item.price > 0 ? `THB ${Number(item.price).toLocaleString()}` : "POA"}
                          </p>
                        ) : (
                          <div className="mt-1 flex flex-col items-center">
                            <p className="text-[#84492C] text-[9px] tracking-wider font-semibold">
                              PRE-ORDER
                            </p>
                            <p className="text-[#84492C] text-[9px] tracking-normal font-semibold mt-0.5">
                              (รอสินค้า 45-60 วัน)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADD TO CART BUTTON (Handles Full Set or Single Item) */}
          <div className="pt-2 max-w-lg mt-auto">
            {isFullSetSelected ? (
              <button
                onClick={handleAddFullSetToCart}
                disabled={isAddingToCart || !isSetAvailable}
                className={`w-full py-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all duration-300 shadow-sm rounded-[2px] flex justify-center items-center gap-2 ${
                  addedSuccess 
                    ? "bg-[#84492C] text-white" 
                    : "bg-[#3A3835] text-white hover:bg-[#84492C] active:scale-[0.99]"
                }`}
              >
                {isAddingToCart ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ADDING FULL SET ({linkedProducts.length} ITEMS)...
                  </>
                ) : addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ADDED FULL SET ({linkedProducts.length} ITEMS) TO CART
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    ADD FULL SET TO CART (THB {Number(totalSetDiscountedPrice).toLocaleString()})
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || outOfStock || !activeProduct.id}
                className={`w-full py-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all duration-300 shadow-sm rounded-[2px] flex justify-center items-center gap-2 ${
                  outOfStock 
                    ? "bg-[#EAE7E0] border border-[#3A3835]/10 text-[#8C8A86] cursor-not-allowed"
                    : addedSuccess 
                      ? "bg-[#84492C] text-white" 
                      : "bg-[#3A3835] text-white hover:bg-[#84492C] active:scale-[0.99]"
                }`}
              >
                {isAddingToCart ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ADDING...
                  </>
                ) : outOfStock ? (
                  "PRE-ORDER (รอสินค้า 45-60 วัน)"
                ) : addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ADDED TO CART
                  </>
                ) : (
                  "ADD TO CART"
                )}
              </button>
            )}
          </div>
          
        </div>
      </div>

      {/* 3. RECOMMENDED / MORE LOOKS SECTION */}
      {otherLooks && otherLooks.length > 0 && (
        <div className="w-full border-t border-[#D5D2CA]/70 mt-12 pt-16 pb-24">
          <div className="max-w-[1600px] mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-serif uppercase tracking-widest text-[#3A3835] font-normal mb-8 text-center">
              MORE LOOKS FROM {category.titleEn}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {otherLooks.map((look) => (
                <Link
                  key={look.id}
                  href={`/collections/${category.slug}/${look.id}`}
                  className="group aspect-3/4 relative overflow-hidden bg-[#F4F1EB] rounded-[2px] border border-[#3A3835]/10 hover:border-[#84492C] transition-all"
                >
                  <img
                    src={look.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px]">
                    LOOK #{look.sortOrder}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Messenger Inquiry */}
      <MessengerInquiryButton productName={isFullSetSelected ? `${category.titleEn} Look #${collectionImage.sortOrder} Full Set` : (activeProduct.name || activeProduct.sku || category.titleEn)} />
    </div>
  );
}
