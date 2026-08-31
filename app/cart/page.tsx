'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  AlertCircle,
  MessageCircle,
  Ticket,
  Check,
  X,
  Loader2,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { createClient, getSafeSession } from '@/src/supabase/client';
import { evaluateTerraPromotions, PromoCalculationResponse } from '@/lib/terra-promotions';

const LINE_PROFILE_URL = 'https://line.me/R/ti/p/@019iisag';

// ⚡ Type ข้อมูล Cart Item พร้อมรองรับ Stock และ Collection Group
type CartItem = {
  id: string;
  quantity: number;
  product_id: number;
  products: {
    id: number;
    name: string;
    sku: string;
    price: number;
    image_url: string;
    collection_group_id: string;
    discount_value?: number | null;
    discount_type?: 'PERCENT' | 'FIXED' | null;
    collection_groups?: {
      name: string;
      product_sup: string;
      tag?: string;
    };
    stock?: {
      qty: number;
    }[];
  };
};

type JournalSetInfo = {
  id: string;
  title: string;
  imageUrl: string | null;
  productIds: number[];
};

type BundleGroup = {
  setId: string;
  title: string;
  imageUrl: string | null;
  setQuantity: number;
  items: CartItem[];
  singleSetBasePrice: number;
  totalSetBasePrice: number;
  hasOutOfStock: boolean;
};

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [allSets, setAllSets] = useState<JournalSetInfo[]>([]);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingSetId, setUpdatingSetId] = useState<string | null>(null);

  // ── Promo Code & Discounts State ──────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [promoCalc, setPromoCalc] = useState<PromoCalculationResponse | null>(null);

  const getDiscountedPrice = (item: CartItem) => {
    const originalPrice = Number(item.products.price || 0);
    const discountValue = Number(item.products.discount_value || 0);
    const discountType = item.products.discount_type;

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return null;
    if (!Number.isFinite(discountValue) || discountValue <= 0 || !discountType) return originalPrice;

    if (discountType === 'PERCENT') return originalPrice * (1 - discountValue / 100);
    if (discountType === 'FIXED') return Math.max(0, originalPrice - discountValue);
    return originalPrice;
  };

  // Re-calculate promotions whenever cart items or applied coupon change
  const recalculateDiscounts = useCallback(
    async (items: CartItem[], couponCode: string | null) => {
      if (items.length === 0) {
        setPromoCalc(null);
        return;
      }

      const cartPayload = items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: Number(i.products.price || 0),
      }));

      const res = await evaluateTerraPromotions(cartPayload, couponCode);
      setPromoCalc(res);

      if (couponCode && res.couponError) {
        setCouponError(res.couponError);
      } else {
        setCouponError(null);
      }
    },
    []
  );

  useEffect(() => {
    const loadCart = async () => {
      const session = await getSafeSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserAuth(session.user);

      // Restore saved coupon if any
      const savedCoupon = localStorage.getItem('terra_cart_coupon');
      if (savedCoupon) {
        setAppliedCoupon(savedCoupon);
        setCouponInput(savedCoupon);
      }

      const { data: activeDiscounts } = await supabase
        .from('discounts')
        .select('id, discount_type, value, start_date, end_date, discount_rules ( product_id )')
        .eq('active', true);

      // ⚡ Fetch Journal Images & Sets to detect bundles
      const { data: journalImagesData } = await supabase
        .from('journal_images')
        .select(`
          id,
          image_url,
          journal_categories (
            title_th,
            title_en
          ),
          journal_image_products (
            product_id
          )
        `);

      const parsedSets: JournalSetInfo[] = (journalImagesData || [])
        .map((img: any) => {
          const catName = img.journal_categories?.title_en || img.journal_categories?.title_th || 'Collection Set';
          const pIds = (img.journal_image_products || [])
            .map((jip: any) => Number(jip.product_id))
            .filter((id: number) => !isNaN(id) && id > 0);

          return {
            id: String(img.id),
            title: `${catName} — Set #${img.id}`,
            imageUrl: img.image_url,
            productIds: pIds,
          };
        })
        .filter((s) => s.productIds.length > 1); // Set must have at least 2 products

      setAllSets(parsedSets);

      // ⚡ ดึงข้อมูล Cart + Products + Collection Groups + Stock ครบทุกตาราง
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product_id,
          products!inner (
            id, name, sku, price, image_url, collection_group_id,
            collection_groups!inner (
              name,
              product_sup,
              tag
            ),
            stock (
              qty
            )
          )
        `)
        .eq('user_id', session.user.id)
        .ilike('products.collection_groups.tag', '%prop%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cart:', error);
      } else {
        const now = new Date();
        const normalizedCartItems = (data || []).map((item: any) => {
          let applicableDiscount = null;
          if (activeDiscounts && activeDiscounts.length > 0) {
            applicableDiscount = activeDiscounts.find((discount: any) => {
              const isStarted = !discount.start_date || new Date(discount.start_date) <= now;
              const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now;
              if (!isStarted || !isNotEnded) return false;
              return discount.discount_rules.some(
                (rule: any) => rule.product_id === item.product_id || rule.product_id === null
              );
            });
          }

          const normalizedDiscountValue =
            applicableDiscount && applicableDiscount.value !== null && applicableDiscount.value !== undefined
              ? Number(applicableDiscount.value)
              : null;
          const hasValidDiscountValue =
            normalizedDiscountValue !== null &&
            Number.isFinite(normalizedDiscountValue) &&
            normalizedDiscountValue > 0;

          return {
            ...item,
            products: {
              ...item.products,
              discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
              discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
            },
          };
        });

        // @ts-ignore
        setCartItems(normalizedCartItems);

        // Run promotion calculation
        await recalculateDiscounts(normalizedCartItems, savedCoupon);
      }

      setLoading(false);
    };

    loadCart();
  }, [router, supabase, recalculateDiscounts]);

  // ฟังก์ชันคำนวณสต็อกรวมทุกสาขา
  const getTotalStock = (item: CartItem) => {
    if (!item.products.stock) return 0;
    return item.products.stock.reduce((sum, s) => sum + Number(s.qty || 0), 0);
  };

  // ── Hierarchical Grouping Logic: Sets vs Standalone ──────────────────────
  const { bundleGroups, standaloneItems } = useMemo(() => {
    if (!cartItems.length || !allSets.length) {
      return { bundleGroups: [], standaloneItems: cartItems };
    }

    const cartMap = new Map<number, CartItem>();
    cartItems.forEach((item) => cartMap.set(item.product_id, item));

    const identifiedBundles: BundleGroup[] = [];
    const usedProductIds = new Set<number>();

    for (const set of allSets) {
      const requiredIds = set.productIds;
      let minCompletedSets = Infinity;
      let allFound = true;
      let singleSetPrice = 0;
      let hasOutOfStock = false;
      const setItems: CartItem[] = [];

      for (const pid of requiredIds) {
        const item = cartMap.get(pid);
        if (!item || item.quantity < 1) {
          allFound = false;
          break;
        }
        setItems.push(item);
        minCompletedSets = Math.min(minCompletedSets, item.quantity);
        const p = Number(item.products.price || 0);
        if (p > 0) singleSetPrice += p;
        const totalStock = item.products.stock?.reduce((sum, s) => sum + Number(s.qty || 0), 0) || 0;
        if (totalStock <= 0) hasOutOfStock = true;
      }

      if (allFound && minCompletedSets > 0 && minCompletedSets !== Infinity) {
        identifiedBundles.push({
          setId: set.id,
          title: set.title,
          imageUrl: set.imageUrl,
          setQuantity: minCompletedSets,
          items: setItems,
          singleSetBasePrice: singleSetPrice,
          totalSetBasePrice: singleSetPrice * minCompletedSets,
          hasOutOfStock,
        });

        requiredIds.forEach((pid) => usedProductIds.add(pid));
      }
    }

    // Any items that are NOT in a complete bundle
    const standalones = cartItems.filter((item) => !usedProductIds.has(item.product_id));

    return { bundleGroups: identifiedBundles, standaloneItems: standalones };
  }, [cartItems, allSets]);

  // ── Handlers: Single Item Quantity ─────────────────────────────────────────
  const handleUpdateQuantity = async (item: CartItem, delta: number) => {
    const currentQty = item.quantity;
    const newQty = currentQty + delta;
    const totalStock = getTotalStock(item);

    if (newQty < 1) return;
    if (totalStock > 0 && newQty > totalStock) {
      alert(`ไม่สามารถเพิ่มจำนวนได้ สินค้านี้มีสต็อกคงเหลือ ${totalStock} ชิ้นครับ`);
      return;
    }

    setUpdatingId(item.id);

    const updatedItems = cartItems.map((cartItem) =>
      cartItem.id === item.id ? { ...cartItem, quantity: newQty } : cartItem
    );
    setCartItems(updatedItems);
    await recalculateDiscounts(updatedItems, appliedCoupon);

    const { error } = await supabase.from('cart_items').update({ quantity: newQty }).eq('id', item.id);

    if (error) {
      console.error('Error updating quantity:', error);
      const { data } = await supabase
        .from('cart_items')
        .select('*, products!inner(*, collection_groups!inner(*), stock(*))')
        .eq('id', item.id)
        .single();
      if (data) {
        setCartItems((prev) => prev.map((cartItem) => (cartItem.id === item.id ? (data as any) : cartItem)));
      }
    }

    setUpdatingId(null);
  };

  const handleRemoveItem = async (cartId: string) => {
    setUpdatingId(cartId);

    const updatedItems = cartItems.filter((item) => item.id !== cartId);
    setCartItems(updatedItems);
    await recalculateDiscounts(updatedItems, appliedCoupon);

    const { error } = await supabase.from('cart_items').delete().eq('id', cartId);

    if (error) {
      console.error('Error removing item:', error);
    }

    setUpdatingId(null);
  };

  // ── Handlers: Bundle Set Operations (Sync All Items in Set) ────────────────
  const handleUpdateSetQuantity = async (bundle: BundleGroup, delta: number) => {
    const currentSetQty = bundle.setQuantity;
    const newSetQty = currentSetQty + delta;
    if (newSetQty < 1) return;

    // Check stock for all items in bundle
    for (const item of bundle.items) {
      const totalStock = getTotalStock(item);
      if (totalStock > 0 && newSetQty > totalStock) {
        alert(`ไม่สามารถเพิ่มจำนวนเซ็ตได้ สินค้า "${item.products.name}" มีสต็อกคงเหลือ ${totalStock} ชิ้นครับ`);
        return;
      }
    }

    setUpdatingSetId(bundle.setId);

    // Update state optimistically
    const bundleItemIds = new Set(bundle.items.map((i) => i.id));
    const updatedItems = cartItems.map((item) =>
      bundleItemIds.has(item.id) ? { ...item, quantity: newSetQty } : item
    );
    setCartItems(updatedItems);
    await recalculateDiscounts(updatedItems, appliedCoupon);

    // Batch update Supabase
    for (const item of bundle.items) {
      await supabase.from('cart_items').update({ quantity: newSetQty }).eq('id', item.id);
    }

    setUpdatingSetId(null);
  };

  const handleRemoveSet = async (bundle: BundleGroup) => {
    setUpdatingSetId(bundle.setId);

    const bundleItemIds = new Set(bundle.items.map((i) => i.id));
    const updatedItems = cartItems.filter((item) => !bundleItemIds.has(item.id));
    setCartItems(updatedItems);
    await recalculateDiscounts(updatedItems, appliedCoupon);

    // Delete all items of this set from database
    const cartIdsToDelete = bundle.items.map((i) => i.id);
    await supabase.from('cart_items').delete().in('id', cartIdsToDelete);

    setUpdatingSetId(null);
  };

  // ── Apply Coupon Code ─────────────────────────────────────────────────────
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('กรุณากรอกรหัสคูปอง');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    const cartPayload = cartItems.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      price: Number(i.products.price || 0),
    }));

    const res = await evaluateTerraPromotions(cartPayload, cleanCode);
    setPromoCalc(res);

    if (res.couponError) {
      setCouponError(res.couponError);
      setAppliedCoupon(null);
      localStorage.removeItem('terra_cart_coupon');
    } else if (res.couponDiscount) {
      setAppliedCoupon(cleanCode);
      setCouponError(null);
      localStorage.setItem('terra_cart_coupon', cleanCode);
    }

    setIsApplyingCoupon(false);
  };

  // ── Remove Applied Coupon ─────────────────────────────────────────────────
  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    localStorage.removeItem('terra_cart_coupon');
    await recalculateDiscounts(cartItems, null);
  };

  // Base Subtotal (only products with price > 0)
  const baseSubtotal = cartItems.reduce((acc, item) => {
    const rawPrice = Number(item.products.price || 0);
    if (rawPrice <= 0) return acc;
    const discountedUnitPrice = getDiscountedPrice(item);
    const effectiveUnitPrice = discountedUnitPrice !== null ? discountedUnitPrice : rawPrice;
    return acc + effectiveUnitPrice * item.quantity;
  }, 0);

  // Total discounts from Promo Engine (Best Deal: Non-Stackable)
  const totalPromotionDiscount = promoCalc?.totalDiscount || 0;
  const finalTotal = Math.max(0, baseSubtotal - totalPromotionDiscount);

  const priceOnRequestCount = cartItems.filter((item) => Number(item.products.price || 0) <= 0).length;

  const handleContactPurchase = () => {
    window.open(LINE_PROFILE_URL, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAE7E0] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3A3835]/10 border-t-[#84492C] rounded-full animate-spin mb-4"></div>
        <p className="text-[#8C8A86] text-[10px] uppercase tracking-[0.2em] animate-pulse">Loading Cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans flex flex-col selection:bg-[#C8A97E]/20 pb-12 pt-16 md:pt-24">
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6">
        <button
          onClick={() => router.back()}
          className="mb-6 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#84492C] flex items-center gap-2 transition-colors group cursor-pointer w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>CONTINUE SHOPPING</span>
        </button>

        <div className="mb-8 border-b border-[#3A3835]/10 pb-4 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl uppercase tracking-widest text-[#3A3835]">YOUR CART</h1>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8C8A86] mt-2">
              {bundleGroups.length > 0 && `${bundleGroups.length} ${bundleGroups.length === 1 ? 'Set' : 'Sets'} + `}
              {standaloneItems.length} {standaloneItems.length === 1 ? 'Item' : 'Items'} in your bag
            </p>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white p-16 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] flex flex-col items-center justify-center text-center border border-[#3A3835]/5 h-[40vh]">
            <div className="w-20 h-20 bg-[#F9F8F6] rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-8 h-8 text-[#8C8A86]" />
            </div>
            <h2 className="font-serif text-xl uppercase tracking-wider text-[#3A3835] mb-3">Your cart is empty</h2>
            <p className="text-[12px] text-[#8C8A86] mb-8">Looks like you haven&apos;t added anything to your cart yet.</p>
            <Link
              href="/prop"
              prefetch={false}
              title="Browse our props collections"
              className="bg-[#3A3835] text-white px-10 py-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm rounded-[2px]"
            >
              DISCOVER COLLECTIONS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* ── Left Column: Cart Items (Sets + Standalones) ─────────────── */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* 1. BUNDLE GROUP CARDS (Hierarchical Collection Sets)          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {bundleGroups.map((bundle) => {
                const isBundleUpdating = updatingSetId === bundle.setId;
                const bundleAutoDiscount = promoCalc?.autoDiscounts?.find(
                  (ad) => String(ad.collectionGroupId) === String(bundle.setId)
                );
                const isAutoWinner = promoCalc?.bestDealWinner === "auto";
                const isBundleDiscountApplied = isAutoWinner && bundleAutoDiscount && bundleAutoDiscount.discountAmount > 0;
                const bundleFinalPrice = isBundleDiscountApplied 
                  ? Math.max(0, bundle.totalSetBasePrice - bundleAutoDiscount.discountAmount)
                  : bundle.totalSetBasePrice;

                return (
                  <div
                    key={bundle.setId}
                    className={`bg-white rounded-[2px] border border-[#84492C]/20 shadow-[0_4px_24px_rgba(132,73,44,0.06)] overflow-hidden transition-opacity duration-200 ${isBundleUpdating ? 'opacity-50 pointer-events-none' : 'opacity-100'
                      }`}
                  >
                    {/* Set Top Header Bar */}
                    <div className="bg-[#FAF7F2] border-b border-[#84492C]/15 p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 bg-[#F4F1EB] rounded-[2px] overflow-hidden shrink-0 border border-[#3A3835]/10 flex items-center justify-center">
                          {bundle.imageUrl ? (
                            <img
                              src={bundle.imageUrl}
                              alt=""
                              className="w-full h-full object-cover mix-blend-multiply"
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-[#8C8A86]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] font-bold text-[#84492C] bg-[#84492C]/10 px-2 py-0.5 rounded-[2px]">
                              <Sparkles className="w-3 h-3 text-[#84492C]" />
                              COLLECTION SET · {bundle.items.length} PIECES
                            </span>
                            {bundle.hasOutOfStock && (
                              <span className="text-[8px] uppercase tracking-widest font-bold text-[#84492C] bg-white border border-[#84492C]/30 px-1.5 py-0.5 rounded-[2px]">
                                Contains Pre-order
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-base sm:text-lg uppercase tracking-wider text-[#3A3835] font-bold mt-0.5 truncate">
                            {bundle.title}
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSet(bundle)}
                        className="text-[#8C8A86] hover:text-red-600 transition-colors p-2 rounded-[2px] hover:bg-white/60 shrink-0"
                        title="Remove full set"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Set Child Products List (Nested Items) */}
                    <div className="divide-y divide-[#3A3835]/5 bg-white">
                      {bundle.items.map((item, idx) => {
                        const rawPrice = Number(item.products.price || 0);
                        const isPriceOnRequest = rawPrice <= 0;
                        const totalStock = getTotalStock(item);
                        const isOutOfStock = totalStock <= 0;

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-[#FAF9F7]/50 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span className="text-[10px] font-mono text-[#8C8A86] w-4 shrink-0">
                                {idx + 1}.
                              </span>

                              <Link
                                href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                                prefetch={false}
                                title={`View details of ${item.products.name}`}
                                className="w-12 h-12 bg-[#F4F1EB] rounded-[2px] overflow-hidden shrink-0 group relative border border-[#3A3835]/5"
                              >
                                {item.products.image_url ? (
                                  <img
                                    src={item.products.image_url}
                                    alt={item.products.name}
                                    className="w-full h-full object-contain p-1 mix-blend-multiply group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[7px] text-[#8C8A86]">
                                    No Img
                                  </div>
                                )}
                              </Link>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                                  prefetch={false}
                                  className="font-serif text-xs sm:text-sm uppercase tracking-wide text-[#3A3835] hover:text-[#84492C] transition-colors truncate block"
                                >
                                  {item.products.name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-[#8C8A86] font-mono uppercase">
                                    SKU: {item.products.sku}
                                  </span>
                                  <span className="text-[#8C8A86] text-[10px]">·</span>
                                  {isOutOfStock ? (
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-[#84492C] flex items-center gap-0.5">
                                      <AlertCircle className="w-2.5 h-2.5" /> PRE-ORDER
                                    </span>
                                  ) : (
                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[#8C8A86]">
                                      {totalStock} IN STOCK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Item Price and Remove from Set */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                {isPriceOnRequest ? (
                                  <span className="text-[10px] uppercase font-bold text-[#84492C]">
                                    Price upon request
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs font-bold text-[#3A3835]">
                                    THB {rawPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-[#8C8A86] hover:text-red-600 transition-colors p-1.5 rounded-[2px] hover:bg-[#FAF7F2]"
                                title="ลบชิ้นนี้ออกจากเซ็ต (สินค้าที่เหลือจะแยกเป็นสินค้าเดี่ยว)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Set Footer Bar with Set Stepper & Set Total */}
                    <div className="bg-[#FAF7F2] border-t border-[#84492C]/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8C8A86]">
                          SET QUANTITY:
                        </span>
                        <div className="flex items-center border border-[#84492C]/30 rounded-[2px] bg-white">
                          <button
                            type="button"
                            onClick={() => handleUpdateSetQuantity(bundle, -1)}
                            disabled={bundle.setQuantity <= 1 || isBundleUpdating}
                            className="p-2 text-[#8C8A86] hover:text-[#84492C] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Decrease set quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-12 text-center text-xs font-bold text-[#3A3835] font-mono">
                            {bundle.setQuantity} {bundle.setQuantity === 1 ? 'SET' : 'SETS'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSetQuantity(bundle, 1)}
                            disabled={isBundleUpdating}
                            className="p-2 text-[#8C8A86] hover:text-[#84492C] transition-colors"
                            title="Increase set quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[9px] uppercase tracking-wider text-[#8C8A86] block">
                          SET TOTAL ({bundle.items.length} ชิ้นครบเซ็ต):
                        </span>
                        {isBundleDiscountApplied ? (
                          <div className="mt-0.5 flex flex-col sm:items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[#8C8A86] line-through font-mono">
                                THB {bundle.totalSetBasePrice.toLocaleString()}
                              </span>
                              <span className="font-serif text-base font-bold text-emerald-700 font-mono">
                                THB {bundleFinalPrice.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[9px] text-emerald-700 font-medium">
                              (ประหยัด -THB {bundleAutoDiscount.discountAmount.toLocaleString()})
                            </span>
                            {bundle.setQuantity > 1 && (
                              <span className="text-[9px] text-[#8C8A86] font-mono mt-0.5">
                                (THB {Math.round(bundleFinalPrice / bundle.setQuantity).toLocaleString()} / set)
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="font-serif text-base font-bold text-[#84492C] font-mono mt-0.5">
                              THB {bundle.totalSetBasePrice.toLocaleString()}
                            </p>
                            {bundle.setQuantity > 1 && (
                              <span className="text-[9px] text-[#8C8A86] font-mono">
                                (THB {bundle.singleSetBasePrice.toLocaleString()} / set)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. STANDALONE INDIVIDUAL ITEMS                                */}
              {/* ───────────────────────────────────────────────────────────── */}
              {standaloneItems.length > 0 && (
                <div className="space-y-4">
                  {bundleGroups.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C8A86] border-b border-[#3A3835]/10 pb-2">
                        INDIVIDUAL ITEMS (สินค้าเดี่ยว)
                      </p>
                    </div>
                  )}

                  {standaloneItems.map((item) => {
                    const totalStock = getTotalStock(item);
                    const outOfStock = totalStock <= 0;
                    const isMaxStockReached = totalStock > 0 && item.quantity >= totalStock;
                    const rawPrice = Number(item.products.price || 0);
                    const isPriceOnRequest = rawPrice <= 0;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[2px] border border-[#3A3835]/5 flex flex-col sm:flex-row gap-6 transition-opacity ${updatingId === item.id ? 'opacity-50 pointer-events-none' : 'opacity-100'
                          }`}
                      >
                        <Link
                          href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                          prefetch={false}
                          title={`View details of ${item.products.name}`}
                          className="w-full sm:w-[120px] aspect-square bg-[#F4F1EB] rounded-[2px] overflow-hidden flex-shrink-0 group relative"
                        >
                          {item.products.image_url ? (
                            <img
                              src={item.products.image_url}
                              alt={item.products.name}
                              title={item.products.name}
                              className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-[#8C8A86] uppercase tracking-widest">
                              No Image
                            </div>
                          )}

                          {outOfStock && (
                            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                              <span className="bg-[#84492C] text-white text-[8px] uppercase tracking-widest px-2 py-1 font-bold rounded-sm shadow-xs">
                                PRE-ORDER
                              </span>
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-[8px] uppercase tracking-[0.2em] text-[#84492C] font-bold mb-1.5">
                                {item.products.collection_groups?.product_sup
                                  ? item.products.collection_groups.product_sup.split('(')[0].trim() || 'COLLECTION'
                                  : 'COLLECTION'}
                              </p>
                              <Link
                                href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                                prefetch={false}
                                title={`View details of ${item.products.name}`}
                                className="font-serif text-lg uppercase tracking-wider text-[#3A3835] hover:text-[#84492C] transition-colors line-clamp-2"
                              >
                                {item.products.name}
                              </Link>
                              <p className="text-[10px] text-[#8C8A86] uppercase tracking-[0.1em] mt-1.5 font-mono">
                                SKU: {item.products.sku}
                              </p>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-[#8C8A86] hover:text-red-500 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 border-t border-[#3A3835]/5 pt-4 gap-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center border border-[#3A3835]/15 rounded-[2px] bg-[#F9F8F6] w-fit">
                                <button
                                  onClick={() => handleUpdateQuantity(item, -1)}
                                  disabled={item.quantity <= 1}
                                  className="p-2 text-[#8C8A86] hover:text-[#3A3835] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center text-[11px] font-bold text-[#3A3835] font-mono">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item, 1)}
                                  disabled={isMaxStockReached}
                                  className={`p-2 transition-colors ${isMaxStockReached
                                    ? 'text-[#8C8A86]/30 cursor-not-allowed'
                                    : 'text-[#8C8A86] hover:text-[#3A3835]'
                                    }`}
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {outOfStock ? (
                                  <span className="text-[9px] uppercase tracking-wider text-[#84492C] font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-[#84492C]" /> PRE-ORDER (รอสินค้า 45-60 วัน)
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[9px] uppercase tracking-wider font-bold ${isMaxStockReached ? 'text-[#84492C]' : 'text-[#8C8A86]'
                                      }`}
                                  >
                                    {totalStock} IN STOCK
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              {(() => {
                                if (isPriceOnRequest) {
                                  return (
                                    <div className="flex flex-col sm:items-end">
                                      <p className="text-[11px] font-bold text-[#84492C] tracking-widest uppercase">
                                        Price upon request
                                      </p>
                                      <p className="text-[9px] text-[#8C8A86] tracking-wider mt-0.5">
                                        (Pre-Order / สอบถามราคา)
                                      </p>
                                    </div>
                                  );
                                }

                                const discountedUnitPrice = getDiscountedPrice(item);
                                const hasDiscount =
                                  discountedUnitPrice !== null && discountedUnitPrice < rawPrice;
                                const finalItemTotal =
                                  (discountedUnitPrice !== null ? discountedUnitPrice : rawPrice) * item.quantity;

                                return (
                                  <>
                                    {hasDiscount && (
                                      <p className="text-[9px] text-[#8C8A86] line-through tracking-[0.12em] uppercase mb-1 font-mono">
                                        THB {(rawPrice * item.quantity).toLocaleString()}
                                      </p>
                                    )}
                                    <p className="text-[11px] font-bold text-[#3A3835] tracking-wide font-mono">
                                      THB {finalItemTotal.toLocaleString()}
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-[9px] text-[#8C8A86] tracking-wider mt-0.5 font-mono">
                                        THB {Number(discountedUnitPrice ?? rawPrice).toLocaleString()} each
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Right Column: ORDER SUMMARY + PROMO CODE INPUT ───────────── */}
            <div className="lg:col-span-4 sticky top-20">
              <div className="bg-white p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] border border-[#3A3835]/5 space-y-6">
                <h2 className="font-serif text-lg uppercase tracking-widest text-[#3A3835] border-b border-[#3A3835]/10 pb-4">
                  ORDER SUMMARY
                </h2>

                {/* Subtotal & Breakdown */}
                <div className="space-y-3.5 text-[12px] tracking-wide">
                  <div className="flex justify-between text-[#8C8A86]">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-[#3A3835]">
                      THB {baseSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Best Deal Notice if applicable */}
                  {promoCalc?.bestDealNotice && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-3 py-2 rounded-[2px] text-[11px] flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="leading-tight">{promoCalc.bestDealNotice}</span>
                    </div>
                  )}

                  {/* Auto-apply Set discounts breakdown (if active winner) */}
                  {promoCalc?.bestDealWinner === "auto" && promoCalc.autoDiscounts && promoCalc.autoDiscounts.length > 0 && (
                    <div className="space-y-1.5 py-1">
                      {promoCalc.autoDiscounts.map((ad, idx) => (
                        <div key={idx} className="flex justify-between items-center text-emerald-700 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[180px]">{ad.title}</span>
                          </span>
                          <span className="font-mono font-bold">- THB {ad.discountAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coupon Discount breakdown (if active winner) */}
                  {promoCalc?.bestDealWinner === "coupon" && promoCalc.couponDiscount && (
                    <div className="flex justify-between items-center text-amber-800 text-[11px] bg-amber-50/80 px-2.5 py-1.5 rounded-[2px] border border-amber-200/80">
                      <span className="flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-bold">{promoCalc.couponDiscount.couponCode}</span>
                        <span className="text-[10px] text-amber-700 font-normal">
                          ({promoCalc.couponDiscount.description})
                        </span>
                      </span>
                      <span className="font-mono font-bold">- THB {promoCalc.couponDiscount.discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {priceOnRequestCount > 0 && (
                    <div className="flex justify-between text-[11px] text-[#84492C]">
                      <span>Pre-order / Custom Quote</span>
                      <span>{priceOnRequestCount} รายการ (ขอราคา)</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#8C8A86]">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                {/* ── PROMO CODE INPUT BOX ───────────────────────────────── */}
                <div className="pt-4 border-t border-[#3A3835]/10 space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-[#8C8A86]">
                    PROMO CODE / คูปองส่วนลด
                  </label>

                  {appliedCoupon && promoCalc?.couponDiscount ? (
                    <div className="flex items-center justify-between bg-amber-50/70 border border-dashed border-amber-300 rounded-[2px] p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-amber-700 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] uppercase font-bold text-amber-900 font-mono tracking-wider">
                              {appliedCoupon}
                            </p>
                            {promoCalc.bestDealWinner === "coupon" ? (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                                โปรเซ็ตคุ้มกว่า
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-amber-700 truncate">
                            {promoCalc.couponDiscount.description} (ลด ฿{promoCalc.couponDiscount.discountAmount.toLocaleString()})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-amber-800 hover:text-red-600 p-1 transition"
                        title="Remove coupon"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8A86]" />
                        <input
                          type="text"
                          placeholder="กรอกรหัสโค้ดส่วนลด..."
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            if (couponError) setCouponError(null);
                          }}
                          className="w-full bg-[#F9F8F6] border border-[#3A3835]/15 rounded-[2px] pl-8 pr-2.5 py-2 text-[11px] font-mono uppercase font-bold text-[#3A3835] placeholder:text-[#8C8A86]/70 placeholder:normal-case placeholder:font-sans outline-none focus:border-[#3A3835] focus:bg-white transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="bg-[#3A3835] text-white px-4 py-2 text-[10px] uppercase font-bold tracking-[0.15em] hover:bg-[#84492C] transition-colors rounded-[2px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 min-w-[70px]"
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>APPLY</span>
                        )}
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <div className="flex items-start gap-1.5 text-red-600 text-[10px] pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="leading-snug">{couponError}</span>
                    </div>
                  )}
                </div>

                {/* Total & Checkout Action */}
                <div className="border-t border-[#3A3835]/10 pt-4">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3A3835] block">
                        TOTAL
                      </span>
                      {totalPromotionDiscount > 0 && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          (Saved THB {totalPromotionDiscount.toLocaleString()})
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-bold text-[#84492C] font-mono">
                        THB {finalTotal.toLocaleString()}
                      </span>
                      {priceOnRequestCount > 0 && (
                        <p className="text-[9px] text-[#8C8A86] mt-0.5">
                          + {priceOnRequestCount} Preorder {priceOnRequestCount === 1 ? 'item' : 'items'}
                        </p>
                      )}

                    </div>
                  </div>

                  <button
                    onClick={handleContactPurchase}
                    className="w-full bg-[#3A3835] text-white py-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm rounded-[2px] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>CONTACT TO PURCHASE</span>
                  </button>

                  <p className="text-[9px] text-[#8C8A86] text-center mt-4 tracking-wider leading-relaxed">
                    Taxes and shipping calculated during purchase process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
