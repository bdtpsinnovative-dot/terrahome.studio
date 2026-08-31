import { createClient } from "@/src/supabase/client";

export type CartItemForPromo = {
  product_id: number;
  quantity: number;
  price: number;
};

export type AppliedPromoResult = {
  promoId: string;
  title: string;
  promoScope: "set" | "global";
  triggerType: "auto" | "coupon";
  couponCode?: string | null;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  discountAmount: number;
  collectionGroupId?: string | null;
  collectionName?: string;
  completedSets?: number;
  description: string;
};

export type PromoCalculationResponse = {
  appliedDiscounts: AppliedPromoResult[];
  autoDiscounts: AppliedPromoResult[];
  autoDiscountTotal: number;
  couponDiscount: AppliedPromoResult | null;
  couponDiscountTotal: number;
  couponError: string | null;
  bestDealWinner: "auto" | "coupon" | "none";
  bestDealNotice: string | null;
  totalDiscount: number;
  rawSubtotal: number;
  finalSubtotal: number;
};

export async function evaluateTerraPromotions(
  cartItems: CartItemForPromo[],
  appliedCouponCode: string | null
): Promise<PromoCalculationResponse> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // 1. Calculate raw subtotal (only items with price > 0)
  const rawSubtotal = cartItems.reduce((sum, item) => {
    const p = Number(item.price || 0);
    return sum + (p > 0 ? p * item.quantity : 0);
  }, 0);

  // 2. Fetch all active promotions
  const { data: promotions, error: promoError } = await supabase
    .from("terra_collection_promotions")
    .select(`
      id,
      title,
      description,
      promo_scope,
      collection_group_id,
      trigger_type,
      coupon_code,
      discount_type,
      discount_value,
      min_sets,
      min_spend,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
      used_count,
      is_active
    `)
    .eq("is_active", true);

  if (promoError || !promotions || promotions.length === 0) {
    return {
      appliedDiscounts: [],
      autoDiscounts: [],
      autoDiscountTotal: 0,
      couponDiscount: null,
      couponDiscountTotal: 0,
      couponError: appliedCouponCode ? "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว" : null,
      bestDealWinner: "none",
      bestDealNotice: null,
      totalDiscount: 0,
      rawSubtotal,
      finalSubtotal: rawSubtotal,
    };
  }

  // 3. Filter valid promotions by date & usage limit
  const validPromotions = promotions.filter((p: any) => {
    if (p.start_date && p.start_date > now) return false;
    if (p.end_date && p.end_date < now) return false;
    if (p.usage_limit && p.used_count >= p.usage_limit) return false;
    return true;
  });

  // Separate into Auto Set Promos and Coupon Promos
  const setPromos = validPromotions.filter(
    (p: any) => (p.promo_scope === "set" || !p.promo_scope) && p.trigger_type === "auto" && p.collection_group_id
  );
  const couponPromos = validPromotions.filter(
    (p: any) => p.trigger_type === "coupon" && p.coupon_code
  );

  // ── A. Calculate Auto Set Discounts ──────────────────────────────────────────
  const neededGroupIds = Array.from(
    new Set(
      setPromos
        .map((p: any) => Number(p.collection_group_id))
        .filter((n: number) => !isNaN(n) && n > 0)
    )
  );

  const groupMap = new Map<string, { name: string; productIds: number[] }>();

  if (neededGroupIds.length > 0) {
    const { data: journalImages } = await supabase
      .from("journal_images")
      .select(`
        id,
        journal_categories (
          title_th,
          title_en
        ),
        journal_image_products (
          product_id
        )
      `)
      .in("id", neededGroupIds);

    (journalImages || []).forEach((img: any) => {
      const parentCat = img.journal_categories?.title_th || img.journal_categories?.title_en || "Collection";
      const pIds = (img.journal_image_products || [])
        .map((jip: any) => Number(jip.product_id))
        .filter((id: number) => !isNaN(id) && id > 0);

      groupMap.set(String(img.id), {
        name: `${parentCat} — เซ็ต #${img.id}`,
        productIds: pIds,
      });
    });
  }

  // Cart item lookup map: product_id -> { quantity, price }
  const cartMap = new Map<number, { quantity: number; price: number }>();
  cartItems.forEach((item) => {
    const existing = cartMap.get(item.product_id) || { quantity: 0, price: item.price };
    cartMap.set(item.product_id, {
      quantity: existing.quantity + item.quantity,
      price: item.price,
    });
  });

  const autoDiscounts: AppliedPromoResult[] = [];
  let autoDiscountTotal = 0;

  for (const promo of setPromos) {
    const groupInfo = groupMap.get(String(promo.collection_group_id));
    if (!groupInfo || groupInfo.productIds.length === 0) continue;

    const requiredProductIds = groupInfo.productIds;
    let completedSets = Infinity;
    let singleSetBasePrice = 0;

    for (const pid of requiredProductIds) {
      const inCart = cartMap.get(pid);
      if (!inCart || inCart.quantity < 1) {
        completedSets = 0;
        break;
      }
      completedSets = Math.min(completedSets, inCart.quantity);
      singleSetBasePrice += Number(inCart.price || 0);
    }

    if (completedSets === Infinity) completedSets = 0;
    const minSetsRequired = promo.min_sets || 1;

    if (completedSets >= minSetsRequired) {
      const eligibleTotalBasePrice = singleSetBasePrice * completedSets;
      let discountAmount = 0;

      if (promo.discount_type === "percentage") {
        discountAmount = (eligibleTotalBasePrice * Number(promo.discount_value)) / 100;
        if (promo.max_discount_amount && discountAmount > Number(promo.max_discount_amount)) {
          discountAmount = Number(promo.max_discount_amount);
        }
      } else {
        discountAmount = Number(promo.discount_value) * completedSets;
        if (discountAmount > eligibleTotalBasePrice) {
          discountAmount = eligibleTotalBasePrice;
        }
      }

      discountAmount = Math.round(discountAmount);

      if (discountAmount > 0) {
        const item: AppliedPromoResult = {
          promoId: promo.id,
          title: promo.title,
          promoScope: "set",
          triggerType: "auto",
          couponCode: null,
          discountType: promo.discount_type,
          discountValue: promo.discount_value,
          discountAmount,
          collectionGroupId: String(promo.collection_group_id),
          collectionName: groupInfo.name,
          completedSets,
          description: promo.discount_type === "percentage" 
            ? `ส่วนลดเซ็ต ${promo.discount_value}% (${completedSets} เซ็ต)`
            : `ส่วนลดเซ็ต ฿${Number(promo.discount_value).toLocaleString()} (${completedSets} เซ็ต)`,
        };
        autoDiscounts.push(item);
        autoDiscountTotal += discountAmount;
      }
    }
  }

  // ── B. Calculate Global Coupon Code (if provided) ───────────────────────────
  let couponDiscount: AppliedPromoResult | null = null;
  let couponDiscountTotal = 0;
  let couponError: string | null = null;
  const cleanCode = appliedCouponCode?.trim().toUpperCase() || null;

  if (cleanCode) {
    const matchedCoupon = couponPromos.find(
      (p: any) => p.coupon_code?.trim().toUpperCase() === cleanCode
    );

    if (!matchedCoupon) {
      couponError = `ไม่พบรหัสคูปอง "${cleanCode}" หรือคูปองหมดอายุแล้ว`;
    } else {
      const minSpend = Number(matchedCoupon.min_spend || 0);
      if (rawSubtotal < minSpend) {
        couponError = `ยอดซื้อขั้นต่ำสำหรับคูปองนี้คือ ฿${minSpend.toLocaleString()} (ยอดปัจจุบัน ฿${rawSubtotal.toLocaleString()})`;
      } else {
        let discountAmount = 0;
        if (matchedCoupon.discount_type === "percentage") {
          discountAmount = (rawSubtotal * Number(matchedCoupon.discount_value)) / 100;
          if (matchedCoupon.max_discount_amount && discountAmount > Number(matchedCoupon.max_discount_amount)) {
            discountAmount = Number(matchedCoupon.max_discount_amount);
          }
        } else {
          discountAmount = Number(matchedCoupon.discount_value);
          if (discountAmount > rawSubtotal) {
            discountAmount = rawSubtotal;
          }
        }

        discountAmount = Math.round(discountAmount);

        if (discountAmount > 0) {
          couponDiscount = {
            promoId: matchedCoupon.id,
            title: matchedCoupon.title,
            promoScope: "global",
            triggerType: "coupon",
            couponCode: matchedCoupon.coupon_code,
            discountType: matchedCoupon.discount_type,
            discountValue: matchedCoupon.discount_value,
            discountAmount,
            collectionName: "ทั้งร้านค้า (Global)",
            description: matchedCoupon.discount_type === "percentage"
              ? `คูปองลด ${matchedCoupon.discount_value}%`
              : `คูปองลด ฿${Number(matchedCoupon.discount_value).toLocaleString()}`,
          };
          couponDiscountTotal = discountAmount;
        } else {
          couponError = "ไม่สามารถคำนวณส่วนลดจากคูปองนี้ได้";
        }
      }
    }
  }

  // ── C. Best Deal Policy (Non-Stackable: เลือกโปรที่ดีที่สุดเพียงอย่างเดียว) ───────────
  let appliedDiscounts: AppliedPromoResult[] = [];
  let totalDiscount = 0;
  let bestDealWinner: "auto" | "coupon" | "none" = "none";
  let bestDealNotice: string | null = null;

  if (couponDiscountTotal > autoDiscountTotal) {
    appliedDiscounts = couponDiscount ? [couponDiscount] : [];
    totalDiscount = couponDiscountTotal;
    bestDealWinner = "coupon";
    if (autoDiscountTotal > 0 && cleanCode) {
      bestDealNotice = `โค้ด "${cleanCode}" มอบส่วนลดคุ้มกว่าโปรเซ็ต (ประหยัดเพิ่ม ฿${(couponDiscountTotal - autoDiscountTotal).toLocaleString()})`;
    }
  } else if (autoDiscountTotal > 0) {
    appliedDiscounts = autoDiscounts;
    totalDiscount = autoDiscountTotal;
    bestDealWinner = "auto";
    if (couponDiscount && cleanCode) {
      bestDealNotice = `โปรโมชันเซ็ตอัตโนมัติคุ้มกว่าคูปอง "${cleanCode}" (ระบบเลือกโปรที่คุ้มที่สุดให้คุณ)`;
    }
  } else if (couponDiscountTotal > 0) {
    appliedDiscounts = couponDiscount ? [couponDiscount] : [];
    totalDiscount = couponDiscountTotal;
    bestDealWinner = "coupon";
  }

  totalDiscount = Math.min(rawSubtotal, totalDiscount);
  const finalSubtotal = Math.max(0, rawSubtotal - totalDiscount);

  return {
    appliedDiscounts,
    autoDiscounts,
    autoDiscountTotal,
    couponDiscount,
    couponDiscountTotal,
    couponError,
    bestDealWinner,
    bestDealNotice,
    totalDiscount,
    rawSubtotal,
    finalSubtotal,
  };
}
