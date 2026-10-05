import { createClient } from "@/src/supabase/client"

export interface RawCatalogData {
  branches: any[]
  bannerGroups: Array<{ product_sup: string | null; image_url: string }>
  allBannerImages: string[]
  hotProductIds: number[]
  hotRankByProductId: Map<number, number>
  hotScoreByProductId: Map<number, number>
  validDiscounts: any[]
  globalDiscount: any | null
  discountByProductId: Map<number, any>
  propGroups: any[]
  productsByGroup: Map<string, any[]>
  groupById: Map<string, any>
  allProducts: any[]
  fetchedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes in browser memory
let cachedRawCatalog: RawCatalogData | null = null
let inflightCatalogPromise: Promise<RawCatalogData> | null = null
const orderedCollectionsByBranch = new Map<string, any[]>()

function getCategoryOrder(productSup: string | null | undefined): number {
  const value = (productSup || "").trim().toLowerCase()
  // 1: Hero Vases and Vessels (Ceramic Vases, Glass Vases, Vessels)
  if ((value.includes("vase") || value.includes("vessel")) && !value.includes("flower")) return 1
  // 2: Sculptures, Figures, Art, Handmade
  if (
    value.includes("sculpture") ||
    value.includes("figure") ||
    value.startsWith("doll") ||
    value.startsWith("decorative") ||
    value.includes("art") ||
    value.includes("handmade")
  ) {
    return 2
  }
  // 3: Functional Decor & Tableware (Candle holders, Trays, Boxes, Booked, Bowls, Dishes, Bath)
  if (!value.includes("flower")) return 3
  // 4: Flower props and accessories (Vase and Flower)
  return 4
}


function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function interleaveWithAccent(mainItems: any[], accentItems: any[], ratio = 6) {
  const result: any[] = []
  let accentIdx = 0
  for (let i = 0; i < mainItems.length; i++) {
    result.push(mainItems[i])
    if ((i + 1) % ratio === 0 && accentIdx < accentItems.length) {
      result.push(accentItems[accentIdx++])
    }
  }
  while (accentIdx < accentItems.length) {
    result.push(accentItems[accentIdx++])
  }
  return result
}

const PRODUCT_SELECT_SLIM = [
  "id",
  "collection_group_id",
  "sku",
  "name",
  "image_url",
  "price",
  "status",
  "category_id",
  "color",
  "specs_color:specs->color",
  "specs_colour:specs->colour",
  "specs_colors:specs->colors",
  "specs_tone:specs->tone",
  "material:specs->material",
  "materials:specs->materials",
  "width_cm:specs->width_cm",
  "length_cm:specs->length_cm",
  "thickness_cm:specs->thickness_cm",
  "stock ( branch_id, qty )",
].join(", ")

const GROUP_SELECT_SLIM = "id, name, cover_image_url, image_url, product_sup, created_at"

export function getCachedRawCatalog(): RawCatalogData | null {
  if (cachedRawCatalog && Date.now() - cachedRawCatalog.fetchedAt < CACHE_TTL_MS) {
    return cachedRawCatalog
  }
  return null
}

export async function loadRawCatalog(): Promise<RawCatalogData> {
  const existing = getCachedRawCatalog()
  if (existing) return existing
  if (inflightCatalogPromise) return inflightCatalogPromise

  inflightCatalogPromise = (async () => {
    const supabase = createClient()
    const pageSize = 1000
    const initialPages = 6 // Covers up to 6,000 products & 6,000 groups in a single parallel wave

    const [branchesRes, discountsRes, hotRes, ...pageResults] = await Promise.all([
      supabase
        .from("branches")
        .select("id, branch_code, branch_name, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("branch_name", { ascending: true }),
      supabase
        .from("discounts")
        .select("id, discount_type, value, start_date, end_date, discount_rules ( product_id )")
        .eq("active", true),
      supabase.rpc("get_prop_hot_items", { limit_count: 80 }),
      ...Array.from({ length: initialPages }, (_, i) =>
        supabase
          .from("products")
          .select(PRODUCT_SELECT_SLIM)
          .eq("category_id", "prop")
          .order("id", { ascending: true })
          .range(i * pageSize, (i + 1) * pageSize - 1)
      ),
      ...Array.from({ length: initialPages }, (_, i) =>
        supabase
          .from("collection_groups")
          .select(GROUP_SELECT_SLIM)
          .ilike("tag", "%prop%")
          .order("id", { ascending: true })
          .range(i * pageSize, (i + 1) * pageSize - 1)
      ),
    ])

    const productWave = pageResults.slice(0, initialPages)
    const groupWave = pageResults.slice(initialPages, initialPages * 2)

    const firstError =
      productWave.find((r: any) => r.error)?.error ||
      groupWave.find((r: any) => r.error)?.error ||
      null
    if (firstError) {
      throw firstError
    }

    const propProducts: any[] = productWave.flatMap((r: any) => r.data || [])
    const rawGroups: any[] = groupWave.flatMap((r: any) => r.data || [])

    // Fetch additional pages if catalog ever grows beyond 6,000 rows
    if ((productWave[initialPages - 1]?.data || []).length === pageSize) {
      for (let page = initialPages; page < 15; page++) {
        const { data, error } = await supabase
          .from("products")
          .select(PRODUCT_SELECT_SLIM)
          .eq("category_id", "prop")
          .order("id", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        propProducts.push(...data)
        if (data.length < pageSize) break
      }
    }

    if ((groupWave[initialPages - 1]?.data || []).length === pageSize) {
      for (let page = initialPages; page < 15; page++) {
        const { data, error } = await supabase
          .from("collection_groups")
          .select(GROUP_SELECT_SLIM)
          .ilike("tag", "%prop%")
          .order("id", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        rawGroups.push(...data)
        if (data.length < pageSize) break
      }
    }

    const branches = branchesRes.data || []
    const activeDiscounts = discountsRes.data || []
    const hotItems = hotRes.data || []

    const hotRankByProductId = new Map<number, number>()
    const hotScoreByProductId = new Map<number, number>()
    const hotProductIds: number[] = []
    ;(hotItems || []).forEach((item: any, index: number) => {
      const productId = Number(item.product_id)
      if (!Number.isSafeInteger(productId)) return
      hotProductIds.push(productId)
      hotRankByProductId.set(productId, index + 1)
      hotScoreByProductId.set(productId, Number(item.score) || 0)
    })

    const now = new Date()
    const validDiscounts = (activeDiscounts || []).filter((discount: any) => {
      const isStarted = !discount.start_date || new Date(discount.start_date) <= now
      const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now
      return isStarted && isNotEnded
    })

    let globalDiscount: any | null = null
    const discountByProductId = new Map<number, any>()
    for (const discount of validDiscounts) {
      for (const rule of discount.discount_rules || []) {
        if (rule.product_id === null) {
          if (!globalDiscount) globalDiscount = discount
        } else {
          const pid = Number(rule.product_id)
          if (Number.isSafeInteger(pid) && !discountByProductId.has(pid)) {
            discountByProductId.set(pid, discount)
          }
        }
      }
    }

    const groupById = new Map<string, any>()
    for (const group of rawGroups) {
      groupById.set(String(group.id), group)
    }

    const allProducts: any[] = []
    const productsByGroup = new Map<string, any[]>()
    for (const rawProduct of propProducts) {
      if (rawProduct.status && rawProduct.status !== "active") continue
      if (!rawProduct.image_url || String(rawProduct.image_url).trim() === "") continue
      const product = {
        ...rawProduct,
        color: rawProduct.color ?? rawProduct.specs_color ?? rawProduct.specs_colour ?? rawProduct.specs_tone ?? null,
        colors: rawProduct.specs_colors ?? null,
      }
      allProducts.push(product)
      const groupKey = String(product.collection_group_id)
      const list = productsByGroup.get(groupKey)
      if (list) {
        list.push(product)
      } else {
        productsByGroup.set(groupKey, [product])
      }
    }

    const propGroups = rawGroups
      .filter((group: any) => productsByGroup.has(String(group.id)))
      .sort((a: any, b: any) => {
        const createdDiff = String(b.created_at || "").localeCompare(String(a.created_at || ""))
        return createdDiff !== 0 ? createdDiff : String(b.id).localeCompare(String(a.id))
      })

    const bannerGroups = rawGroups
      .filter((g: any) => !!g.image_url && String(g.image_url).trim() !== "")
      .slice(0, 300)
      .map((g: any) => ({ product_sup: g.product_sup ?? null, image_url: String(g.image_url) }))

    const allBannerImages = Array.from(new Set(bannerGroups.map((c) => c.image_url)))

    const result: RawCatalogData = {
      branches,
      bannerGroups,
      allBannerImages,
      hotProductIds,
      hotRankByProductId,
      hotScoreByProductId,
      validDiscounts,
      globalDiscount,
      discountByProductId,
      propGroups,
      productsByGroup,
      groupById,
      allProducts,
      fetchedAt: Date.now(),
    }

    cachedRawCatalog = result
    orderedCollectionsByBranch.clear()
    return result
  })()

  try {
    return await inflightCatalogPromise
  } finally {
    inflightCatalogPromise = null
  }
}

export function getOrderedCollectionsForBranch(raw: RawCatalogData, branchId?: string | null): any[] {
  const normalizedBranch = branchId && branchId !== "all" ? String(branchId) : "all"
  const cached = orderedCollectionsByBranch.get(normalizedBranch)
  if (cached) return cached

  const sortHot = (items: any[]) =>
    items.sort((a: any, b: any) => {
      const rankDiff = (a.hot_rank || Infinity) - (b.hot_rank || Infinity)
      return rankDiff !== 0 ? rankDiff : Number(a.id) - Number(b.id)
    })

  const mappedProductItems = (raw.allProducts || []).map((product: any) => {
    const stockItems =
      normalizedBranch !== "all"
        ? (product.stock || []).filter(
            (stockItem: any) => String(stockItem.branch_id) === normalizedBranch
          )
        : product.stock || []
    const totalStock =
      stockItems.reduce((sum: number, stockItem: any) => sum + Number(stockItem.qty || 0), 0) || 0

    const applicableDiscount =
      raw.discountByProductId.get(Number(product.id)) ?? raw.globalDiscount ?? null

    const normalizedDiscountValue =
      applicableDiscount && applicableDiscount.value !== null && applicableDiscount.value !== undefined
        ? Number(applicableDiscount.value)
        : null
    const hasValidDiscountValue =
      normalizedDiscountValue !== null &&
      Number.isFinite(normalizedDiscountValue) &&
      normalizedDiscountValue > 0

    const hotRank = raw.hotRankByProductId.get(Number(product.id)) || null
    const hotScore = raw.hotScoreByProductId.get(Number(product.id)) || null
    const availabilityStatus: "available" | "preorder" = totalStock > 0 ? "available" : "preorder"

    const productObj = {
      ...product,
      stock: stockItems,
      total_stock: totalStock,
      availability_status: availabilityStatus,
      hot_rank: hotRank,
      hot_score: hotScore,
      discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
      discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
    }

    const group = product.collection_group_id ? raw.groupById?.get(String(product.collection_group_id)) : null
    const productSup = group?.product_sup ?? product.product_sup ?? null

    return {
      id: String(product.id),
      collection_group_id: product.collection_group_id ? String(product.collection_group_id) : String(product.id),
      name: product.name || group?.name || "PRODUCT",
      product_sup: productSup,
      cover_image_url: null,
      image_url: product.image_url,
      created_at: product.created_at || group?.created_at,
      products: [productObj],
      has_available_products: availabilityStatus === "available",
      is_preorder_only: availabilityStatus === "preorder",
      hot_rank: hotRank,
      hot_score: hotScore,
      availability_status: availabilityStatus,
    }
  })

  const productBuckets = new Map<number, any[]>()
  mappedProductItems.forEach((item: any) => {
    const categoryOrder = getCategoryOrder(item.product_sup)
    const isHotAvailable = item.hot_rank !== null && item.availability_status === "available"
    const isAvailable = item.availability_status === "available"
    const isHotPreorder = item.hot_rank !== null && item.availability_status === "preorder"

    const bucket = isHotAvailable
      ? 0
      : isAvailable
        ? 100 + categoryOrder
        : isHotPreorder
          ? 200
          : 300 + categoryOrder
    const items = productBuckets.get(bucket) || []
    items.push(item)
    productBuckets.set(bucket, items)
  })

  const hotAvailableProducts = sortHot(productBuckets.get(0) || [])

  const availableMainProducts = [
    ...shuffleArray(productBuckets.get(101) || []),
    ...shuffleArray(productBuckets.get(102) || []),
    ...shuffleArray(productBuckets.get(103) || []),
  ]

  const availableFlowerProducts = shuffleArray(productBuckets.get(104) || [])
  const availableInterleaved = interleaveWithAccent(
    availableMainProducts,
    availableFlowerProducts,
    6
  )

  const hotPreorderProducts = sortHot(productBuckets.get(200) || [])

  const preorderOtherProducts = [
    ...shuffleArray(productBuckets.get(301) || []),
    ...shuffleArray(productBuckets.get(302) || []),
    ...shuffleArray(productBuckets.get(303) || []),
    ...shuffleArray(productBuckets.get(304) || []),
  ]

  const ordered = [
    ...hotAvailableProducts,
    ...availableInterleaved,
    ...hotPreorderProducts,
    ...preorderOtherProducts,
  ]

  orderedCollectionsByBranch.set(normalizedBranch, ordered)
  return ordered
}
