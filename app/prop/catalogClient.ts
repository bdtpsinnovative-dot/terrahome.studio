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

function getCollectionSubOrder(collection: any): number {
  const products = collection.products || []
  const hasHotAvailable = products.some(
    (product: any) => product.hot_rank !== null && product.availability_status === "available"
  )
  const hasAvailable = products.some((product: any) => product.availability_status === "available")
  const hasHotPreorder = products.some(
    (product: any) => product.hot_rank !== null && product.availability_status === "preorder"
  )

  if (hasHotAvailable) return 0
  if (hasAvailable) return 1
  if (hasHotPreorder) return 2
  return 3
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

    const productsByGroup = new Map<string, any[]>()
    for (const rawProduct of propProducts) {
      if (rawProduct.status && rawProduct.status !== "active") continue
      const product = {
        ...rawProduct,
        color: rawProduct.color ?? rawProduct.specs_color ?? rawProduct.specs_colour ?? rawProduct.specs_tone ?? null,
        colors: rawProduct.specs_colors ?? null,
      }
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

  const mappedCollections = raw.propGroups.map((collection: any) => {
    const rawGroupProducts = raw.productsByGroup.get(String(collection.id)) || []
    const mappedProducts = rawGroupProducts.map((product: any) => {
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

      return {
        ...product,
        stock: stockItems,
        total_stock: totalStock,
        availability_status: totalStock > 0 ? "available" : "preorder",
        hot_rank: raw.hotRankByProductId.get(Number(product.id)) || null,
        hot_score: raw.hotScoreByProductId.get(Number(product.id)) || null,
        discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
        discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
      }
    })

    const hotAvailableProducts = mappedProducts.filter(
      (product: any) => product.hot_rank !== null && product.availability_status === "available"
    )
    const availableProducts = mappedProducts.filter(
      (product: any) => product.hot_rank === null && product.availability_status === "available"
    )
    const hotPreorderProducts = mappedProducts.filter(
      (product: any) => product.hot_rank !== null && product.availability_status === "preorder"
    )
    const preorderProducts = mappedProducts.filter(
      (product: any) => product.hot_rank === null && product.availability_status === "preorder"
    )

    return {
      ...collection,
      products: [
        ...sortHot(hotAvailableProducts),
        ...shuffleArray(availableProducts),
        ...sortHot(hotPreorderProducts),
        ...shuffleArray(preorderProducts),
      ],
      has_available_products: hotAvailableProducts.length + availableProducts.length > 0,
      is_preorder_only:
        hotAvailableProducts.length + availableProducts.length === 0 &&
        hotPreorderProducts.length + preorderProducts.length > 0,
      hot_rank: mappedProducts.reduce((best: number | null, product: any) => {
        if (!product.hot_rank) return best
        return best === null ? product.hot_rank : Math.min(best, product.hot_rank)
      }, null),
      hot_score: mappedProducts.reduce(
        (best: number, product: any) => best + (product.hot_score || 0),
        0
      ),
    }
  })

  const collectionBuckets = new Map<number, any[]>()
  mappedCollections.forEach((collection: any) => {
    const categoryOrder = getCategoryOrder(collection.product_sup)
    const subOrder = getCollectionSubOrder(collection)
    const hasHotAvailable = subOrder === 0
    const hasAvailableProducts = collection.has_available_products === true
    const hasHotPreorder = collection.products?.some(
      (product: any) => product.hot_rank !== null && product.availability_status === "preorder"
    )

    const bucket = hasHotAvailable
      ? 0
      : hasAvailableProducts
        ? 100 + categoryOrder
        : hasHotPreorder
          ? 200
          : 300 + categoryOrder
    const items = collectionBuckets.get(bucket) || []
    items.push(collection)
    collectionBuckets.set(bucket, items)
  })

  const hotAvailableCollections = (collectionBuckets.get(0) || []).sort(
    (a: any, b: any) => (a.hot_rank || Infinity) - (b.hot_rank || Infinity)
  )

  const availableMainCollections = [
    ...shuffleArray(collectionBuckets.get(101) || []),
    ...shuffleArray(collectionBuckets.get(102) || []),
    ...shuffleArray(collectionBuckets.get(103) || []),
  ]

  const availableFlowerCollections = shuffleArray(collectionBuckets.get(104) || [])
  const availableInterleaved = interleaveWithAccent(
    availableMainCollections,
    availableFlowerCollections,
    6
  )

  const hotPreorderCollections = (collectionBuckets.get(200) || []).sort(
    (a: any, b: any) => (a.hot_rank || Infinity) - (b.hot_rank || Infinity)
  )

  const preorderOtherCollections = [
    ...shuffleArray(collectionBuckets.get(301) || []),
    ...shuffleArray(collectionBuckets.get(302) || []),
    ...shuffleArray(collectionBuckets.get(303) || []),
    ...shuffleArray(collectionBuckets.get(304) || []),
  ]

  const ordered = [
    ...hotAvailableCollections,
    ...availableInterleaved,
    ...hotPreorderCollections,
    ...preorderOtherCollections,
  ]

  orderedCollectionsByBranch.set(normalizedBranch, ordered)
  return ordered
}
