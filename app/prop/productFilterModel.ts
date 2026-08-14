export type ProductFilterMenuItem = {
  label: string
  displayLabel?: string
  fullValue?: string
  items?: Array<{ fullValue: string; displayLabel: string }>
  isSpecial?: boolean
}

export type ProductColorOption = {
  value: string
  label: string
  count: number
  swatch: string | null
}

export const PRODUCT_FILTER_ITEMS: ProductFilterMenuItem[] = [
  { label: "ALL", fullValue: "All" },
  { label: "ART OBJECT", displayLabel: "ORNAMENT", fullValue: "Art Object" },
  { label: "BOOK END", displayLabel: "BOOKENDS", fullValue: "Book End" },
  { label: "CANDLE HOLDER", displayLabel: "CANDLE HOLDERS", fullValue: "Candle Holder" },
  {
    label: "DECORATIVE",
    displayLabel: "DECORATIVE OBJECTS",
    items: [
      { fullValue: "Decorative Bath", displayLabel: "BATH" },
      { fullValue: "Decorative Box", displayLabel: "BOX" },
      { fullValue: "Decorative Toy", displayLabel: "TOY" },
    ],
  },
  {
    label: "DOLL",
    displayLabel: "DOLLS & TOYS",
    items: [
      { fullValue: "Doll Animal", displayLabel: "ANIMAL" },
      { fullValue: "Doll Human", displayLabel: "HUMAN" },
      { fullValue: "Doll Object", displayLabel: "OBJECT" },
      { fullValue: "Doll Plant", displayLabel: "PLANT" },
    ],
  },
  { label: "KITCHENWARE", displayLabel: "TABLEWARE", fullValue: "Kitchenware" },
  { label: "TRAY", displayLabel: "TRAYS", fullValue: "Tray" },
  {
    label: "VASE",
    displayLabel: "VESSELS",
    items: [
      { fullValue: "Vase Ceramic 3D Printing", displayLabel: "CERAMIC 3D PRINTING" },
      { fullValue: "Vase Ceramic Handmade", displayLabel: "CERAMIC HANDMADE" },
      { fullValue: "Vase Glass Handmade", displayLabel: "GLASS HANDMADE" },
      { fullValue: "Vase Normal", displayLabel: "NORMAL" },
    ],
  },
  {
    label: "WALL ART",
    displayLabel: "ART & WALL DECOR",
    items: [
      { fullValue: "Wall Art 3D Material", displayLabel: "3D MATERIAL" },
      { fullValue: "Wall Art 3D Physical Painting", displayLabel: "3D PHYSICAL PAINTING" },
      { fullValue: "Wall Art Digital Print  ", displayLabel: "DIGITAL PRINT" },
      { fullValue: "Wall Art Hand Craft 100%", displayLabel: "HAND CRAFT 100%" },
      { fullValue: "Wall Art Hand Craft 50%", displayLabel: "HAND CRAFT 50%" },
      { fullValue: "Wall Art Hand Craft 80%", displayLabel: "HAND CRAFT 80%" },
    ],
  },
  { label: "PRE-ORDER", fullValue: "PRE_ORDER", isSpecial: true },
  { label: "SALE OFFERS %", fullValue: "SPECIAL_DISCOUNT", isSpecial: true },
]

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
  return value.split(/[,/|]+/).map((item) => item.trim()).filter(Boolean)
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
  if (activeFilter === "All") return collections

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
  if (filterUpper === "DECORATIVE") {
    return collections.filter((group) => {
      const sup = String(group.product_sup || "").trim().toLowerCase()
      return (sup.startsWith("decorative") || sup.startsWith("decotative")) && !sup.includes("candle holder")
    })
  }
  if (["DOLL", "VASE", "WALL ART"].includes(filterUpper)) {
    return collections.filter((group) => String(group.product_sup || "").trim().toUpperCase().startsWith(filterUpper))
  }
  const target = activeFilter.trim().toLowerCase()
  return collections.filter((group) => String(group.product_sup || "").trim().toLowerCase() === target)
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
