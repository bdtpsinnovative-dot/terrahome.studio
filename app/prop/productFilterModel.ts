export type ProductFilterMenuItem = {
  label: string
  displayLabel?: string
  thaiLabel?: string
  fullValue?: string
  items?: Array<{ fullValue: string; displayLabel: string; thaiLabel?: string }>
  isSpecial?: boolean
}

export type ProductColorOption = {
  value: string
  label: string
  count: number
  swatch: string | null
}

export const PRODUCT_FILTER_ITEMS: ProductFilterMenuItem[] = [
  { label: "ALL", displayLabel: "ALL", thaiLabel: "สินค้าทั้งหมด", fullValue: "All" },
  {
    label: "VASE & VESSELS",
    displayLabel: "VASE & VESSELS",
    thaiLabel: "แจกันและภาชนะ",
    items: [
      { fullValue: "Ceramic Vases", displayLabel: "CERAMIC VASES", thaiLabel: "แจกันเซรามิก" },
      { fullValue: "Glass Vases", displayLabel: "GLASS VASES", thaiLabel: "แจกันแก้ว" },
      { fullValue: "Vessels", displayLabel: "VESSELS", thaiLabel: "ภาชนะ" },
      { fullValue: "Others Vase", displayLabel: "OTHERS VASE", thaiLabel: "แจกันอื่น ๆ" },
    ],
  },
  {
    label: "FIGURE",
    displayLabel: "FIGURE",
    thaiLabel: "ตุ๊กตาตกแต่ง",
    items: [
      { fullValue: "Animal Figure", displayLabel: "ANIMAL FIGURE", thaiLabel: "ตุ๊กตาสัตว์" },
      { fullValue: "Human Figure", displayLabel: "HUMAN FIGURE", thaiLabel: "ตุ๊กตามนุษย์" },
      { fullValue: "Plant Figure", displayLabel: "PLANT FIGURE", thaiLabel: "ตุ๊กตาผลไม้และพืช" },
      { fullValue: "Others Figure", displayLabel: "OTHERS FIGURE", thaiLabel: "ตุ๊กตาอื่น ๆ" },
    ],
  },
  { label: "SCULPTURE", displayLabel: "SCULPTURE", thaiLabel: "ประติมากรรมตกแต่ง", fullValue: "Sculpture" },
  { label: "BOOKED", displayLabel: "BOOKED", thaiLabel: "ตกแต่งชั้นหนังสือ", fullValue: "BOOKED" },
  { label: "CANDLE HOLDERS", displayLabel: "CANDLE HOLDERS", thaiLabel: "เชิงเทียน", fullValue: "CANDLE HOLDERS" },
  {
    label: "ACCESSORIES",
    displayLabel: "ACCESSORIES",
    thaiLabel: "ของตกแต่งอื่น ๆ",
    items: [
      { fullValue: "Box", displayLabel: "BOX", thaiLabel: "ภาชนะตกแต่ง" },
      { fullValue: "Trays", displayLabel: "TRAYS", thaiLabel: "ถาดตกแต่ง" },
      { fullValue: "Toy", displayLabel: "TOY", thaiLabel: "ของเล่นตกแต่ง" },
    ],
  },
  {
    label: "DINING & TABLEWARE",
    displayLabel: "DINING & TABLEWARE",
    thaiLabel: "เครื่องใช้บนโต๊ะอาหาร",
    items: [
      { fullValue: "Plates & Dishes", displayLabel: "PLATES & DISHES", thaiLabel: "จานตกแต่ง" },
      { fullValue: "Bowls", displayLabel: "BOWLS", thaiLabel: "ชาม" },
      { fullValue: "Glassware", displayLabel: "GLASSWARE", thaiLabel: "แก้วน้ำ, แก้วไวน์" },
      { fullValue: "Cups & Mugs", displayLabel: "CUPS & MUGS", thaiLabel: "ถ้วย, แก้วกาแฟ" },
      { fullValue: "Trays & Servingware", displayLabel: "TRAYS & SERVINGWARE", thaiLabel: "ภาชนะเสิร์ฟ" },
      { fullValue: "Other Dining & Tableware", displayLabel: "OTHER DINING & TABLEWARE", thaiLabel: "เครื่องใช้บนโต๊ะอาหารอื่น ๆ" },
    ],
  },
  {
    label: "DRESSING & BATH",
    displayLabel: "DRESSING & BATH",
    thaiLabel: "ของใช้ในห้องน้ำและห้องแต่งตัว",
    items: [
      { fullValue: "Bath Room", displayLabel: "BATH ROOM", thaiLabel: "ห้องน้ำ" },
      { fullValue: "Dressing Room", displayLabel: "DRESSING ROOM", thaiLabel: "ห้องแต่งตัว" },
    ],
  },
  {
    label: "ART & WALL DECOR",
    displayLabel: "ART & WALL DECOR",
    thaiLabel: "งานศิลปะและของตกแต่งผนัง",
    items: [
      { fullValue: "Handmade", displayLabel: "HANDMADE", thaiLabel: "ภาพวาด Handmade 100%" },
      { fullValue: "3D Handmade", displayLabel: "3D HANDMADE", thaiLabel: "ภาพตกแต่ง Handmade 3 มิติ" },
      { fullValue: "Digital print", displayLabel: "DIGITAL PRINT", thaiLabel: "ภาพดิจิตอลปริ้น" },
      { fullValue: "Mixed Media Art", displayLabel: "MIXED MEDIA ART", thaiLabel: "ภาพวาด Handmade ผสมดิจิตอลปริ้น" },
      { fullValue: "Photo Frame", displayLabel: "PHOTO FRAME", thaiLabel: "กรอบรูป" },
    ],
  },
  { label: "IN STOCK", displayLabel: "IN STOCK", thaiLabel: "สินค้าพร้อมส่ง", fullValue: "IN_STOCK", isSpecial: true },
  { label: "PRE-ORDER", displayLabel: "PRE-ORDER", thaiLabel: "พรีออเดอร์ (รอสินค้า 45-60 วัน)", fullValue: "PRE_ORDER", isSpecial: true },
  { label: "SALE OFFERS %", displayLabel: "SALE OFFERS %", thaiLabel: "ลดราคาพิเศษ", fullValue: "SPECIAL_DISCOUNT", isSpecial: true },
]

export const CATEGORY_MAP: Record<string, string[]> = {
  // 1. Vase & Vessels
  "VASE & VESSELS": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Ceramic Vases": ["ceramic handmade", "ceramic 3d"],
  "Glass Vases": ["glass handmade", "vase glass handmade"],
  "Vessels": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Others Vase": ["vase", "vase normal"],

  // 2. Figure
  "FIGURE": ["doll animal", "animal", "doll human", "human", "doll plant", "plant", "doll object", "figure", "art object"],
  "Animal Figure": ["doll animal", "animal"],
  "Human Figure": ["doll human", "human"],
  "Plant Figure": ["doll plant", "plant"],
  "Others Figure": ["doll object", "figure", "art object"],

  // 3. Sculpture
  "Sculpture": ["sculpture"],
  "SCULPTURE": ["sculpture"],

  // 4. BOOKED
  "BOOKED": ["book end", "booked"],
  "Book End": ["book end", "booked"],

  // 5. CANDLE HOLDERS
  "CANDLE HOLDERS": ["candle holder", "candle holders"],
  "Candle Holder": ["candle holder", "candle holders"],

  // 6. Accessories
  "ACCESSORIES": ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "others"],
  "Box": ["decorative box", "box"],
  "Trays": ["tray", "trays"],
  "Toy": ["decorative toy", "toy"],

  // 7. Dining & Tableware
  "DINING & TABLEWARE": ["plates & dishes", "bowls", "glassware", "cups & mugs", "trays & servingware", "kitchenware"],
  "Plates & Dishes": ["plates & dishes"],
  "Bowls": ["bowls"],
  "Glassware": ["glassware"],
  "Cups & Mugs": ["cups & mugs"],
  "Trays & Servingware": ["trays & servingware"],
  "Other Dining & Tableware": ["kitchenware"],

  // 8. Dressing & Bath
  "DRESSING & BATH": ["decorative bath", "bath"],
  "Bath Room": ["decorative bath", "bath"],
  "Dressing Room": ["decorative bath", "bath"],

  // 9. Art & walldecor
  "ART & WALL DECOR": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame"],
  "Handmade": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%"],
  "3D Handmade": ["3d handmade", "wall art 3d material", "wall art 3d physical painting"],
  "Digital print": ["wall art digital print", "digital print"],
  "Mixed Media Art": ["mixed media art"],
  "Photo Frame": ["frame"],

  // Legacy mappings for backwards compatibility
  "Art Object": ["art object"],
  "Decorative": ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "decorative bath", "bath"],
  "Doll": ["doll animal", "animal", "doll human", "human", "doll plant", "plant", "doll object", "figure"],
  "Kitchenware": ["kitchenware", "plates & dishes", "bowls", "glassware", "cups & mugs", "trays & servingware"],
  "Tray": ["tray", "trays"],
  "Vase": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Wall Art": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame"],
}

const COLOR_PRESENTATION: Record<string, { label: string; swatch: string }> = {
  beige: { label: "Beige", swatch: "oklch(82% 0.035 78)" },
  black: { label: "Black", swatch: "oklch(22% 0.012 65)" },
  blue: { label: "Blue", swatch: "oklch(56% 0.13 250)" },
  brown: { label: "Brown", swatch: "oklch(43% 0.07 58)" },
  gold: { label: "Gold", swatch: "oklch(72% 0.115 78)" },
  green: { label: "Green", swatch: "oklch(51% 0.1 145)" },
  grey: { label: "Grey", swatch: "oklch(60% 0.012 70)" },
  orange: { label: "Orange", swatch: "oklch(68% 0.16 52)" },
  pink: { label: "Pink", swatch: "oklch(75% 0.09 8)" },
  purple: { label: "Purple", swatch: "oklch(53% 0.13 305)" },
  red: { label: "Red", swatch: "oklch(55% 0.18 28)" },
  silver: { label: "Silver", swatch: "oklch(78% 0.012 245)" },
  white: { label: "White", swatch: "oklch(97% 0.008 80)" },
  yellow: { label: "Yellow", swatch: "oklch(84% 0.15 92)" },
}

const COLOR_ALIASES: Record<string, string> = { gray: "grey" }

export function normalizeAttribute(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase()
  return COLOR_ALIASES[normalized] || normalized
}

function attributeValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(attributeValues)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const namedValue = record.name ?? record.label ?? record.value
    return namedValue === undefined ? [] : attributeValues(namedValue)
  }
  if (typeof value !== "string") return []
  const normalizedValue = value.trim()
  if (!normalizedValue) return []
  if ((normalizedValue.startsWith("[") && normalizedValue.endsWith("]")) || (normalizedValue.startsWith("{") && normalizedValue.endsWith("}"))) {
    try {
      return attributeValues(JSON.parse(normalizedValue))
    } catch {
      // Fall back to the plain text parser for malformed legacy values.
    }
  }
  return normalizedValue.split(/[,/|]+/).map((item) => item.trim()).filter(Boolean)
}

export function productColorValues(product: any): string[] {
  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {}
  const rawValues = [
    product?.color,
    product?.colour,
    product?.colors,
    product?.colours,
    specs.color,
    specs.colour,
    specs.colors,
    specs.colours,
    specs.tone,
    specs.color_tone,
    specs.colour_tone,
    specs.colorTone,
  ]
  return Array.from(new Set(rawValues.flatMap(attributeValues).map(normalizeAttribute)))
}

export function selectedAttributeValues(value: string) {
  if (!value || value === "ALL_ATTRIBUTE") return []
  return Array.from(new Set(value.split(",").map(normalizeAttribute).filter(Boolean)))
}

export function filterCollectionsByCategory(collections: any[], activeFilter: string, hotProductIds: number[] = []) {
  const filterUpper = activeFilter.toUpperCase().trim()
  if (filterUpper === "ALL") return collections

  if (activeFilter === "HOT_ITEM") {
    const hotIdSet = new Set(hotProductIds)
    return collections
      .filter((group) => group.products?.some((product: any) => hotIdSet.has(Number(product.id))))
      .map((group) => ({
        ...group,
        products: group.products
          .filter((product: any) => hotIdSet.has(Number(product.id)))
          .sort((a: any, b: any) => (a.hot_rank || Infinity) - (b.hot_rank || Infinity)),
      }))
  }

  if (activeFilter === "SPECIAL_DISCOUNT") {
    return collections.filter((group) => group.products?.some((product: any) => product.discount_value !== null))
  }
  if (activeFilter === "PRE_ORDER") {
    return collections
      .filter((group) => group.products?.some((product: any) => product.availability_status === "preorder"))
      .map((group) => ({
        ...group,
        products: group.products.filter((product: any) => product.availability_status === "preorder"),
      }))
  }
  if (activeFilter === "IN_STOCK" || activeFilter === "AVAILABLE" || activeFilter === "READY_TO_SHIP") {
    return collections
      .filter((group) => group.products?.some((product: any) => product.availability_status === "available"))
      .map((group) => ({
        ...group,
        products: group.products.filter((product: any) => product.availability_status === "available"),
      }))
  }

  if (activeFilter === "DEV_UNMAPPED") {
    const isLocal = (typeof window !== "undefined" && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local")
    )) || process.env.NODE_ENV === "development"

    if (!isLocal) return collections

    const allAllowed = new Set(Object.values(CATEGORY_MAP).flat())
    return collections.filter((group) => {
      const isProp = group.products?.some((p: any) => p.category_id === 'prop')
      if (!isProp && group.products?.length > 0) return false

      const sup = String(group.product_sup || "").trim().toLowerCase()
      return !sup || !allAllowed.has(sup)
    })
  }

  const target = activeFilter.trim()
  const allowed = CATEGORY_MAP[target] || CATEGORY_MAP[filterUpper] || [target.toLowerCase()]

  return collections.filter((group) => {
    const sup = String(group.product_sup || "").trim().toLowerCase()
    return allowed.includes(sup)
  })
}

export function getColorOptions(
  collections: any[],
  category: string,
  hotProductIds: number[] = [],
): ProductColorOption[] {
  const counts = new Map<string, number>()
  for (const group of filterCollectionsByCategory(collections, category, hotProductIds)) {
    for (const product of group.products || []) {
      if (product?.category_id && product.category_id !== "prop") continue
      for (const value of productColorValues(product)) {
        counts.set(value, (counts.get(value) || 0) + 1)
      }
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      count,
      label: COLOR_PRESENTATION[value]?.label || value.replace(/\b\w/g, (character) => character.toUpperCase()),
      swatch: COLOR_PRESENTATION[value]?.swatch || null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
