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
  branchDiscountByProductBranch: Map<string, any>
  branchWideDiscount: Map<string, any>
  bestBranchDiscountByProductId: Map<number, { discount: any; branchId: number; branchName: string }>
  branchById: Map<number, any>
  propGroups: any[]
  productsByGroup: Map<string, any[]>
  groupById: Map<string, any>
  allProducts: any[]
  fetchedAt: number
}

const CACHE_TTL_MS = 60 * 1000 // 1 minute in browser memory
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

const PRODUCT_SELECT_SLIM = "id, collection_group_id, sku, name, image_url, price, status, category_id, color, specs"

const GROUP_SELECT_SLIM = "id, name, cover_image_url, image_url, product_sup, created_at"

// ⚡ โครงสร้างแคชข้อมูลสินค้าแบบคงที่ (แคช 1 ชม. ไม่ผูกกับสต็อก, สาขา หรือส่วนลด)
interface StaticCatalogCache {
  propProducts: any[]
  rawGroups: any[]
  hotProductIds: number[]
  hotRankByProductId: Map<number, number>
  hotScoreByProductId: Map<number, number>
  bannerGroups: Array<{ product_sup: string | null; image_url: string }>
  allBannerImages: string[]
  fetchedAt: number
}

const STATIC_CATALOG_TTL_MS = 60 * 60 * 1000 // 1 hour memory cache
let cachedStaticCatalog: StaticCatalogCache | null = null

export function clearCatalogCache(): void {
  cachedRawCatalog = null
  cachedStaticCatalog = null
  orderedCollectionsByBranch.clear()
}

export function getCachedRawCatalog(): RawCatalogData | null {
  if (cachedRawCatalog && Date.now() - cachedRawCatalog.fetchedAt < CACHE_TTL_MS) {
    return cachedRawCatalog
  }
  return null
}

async function executeLoadRawCatalog(): Promise<RawCatalogData> {
  const supabase = createClient()

  // Safe non-critical discounts query: Real-time Live Discounts with order by ID DESC (newest campaign first)
  const fetchDiscountsSafe = Promise.resolve(
    supabase
      .from("discounts")
      .select("id, discount_type, value, start_date, end_date, discount_rules ( product_id, branch_id )")
      .eq("active", true)
      .order("id", { ascending: false })
  ).catch((err) => {
    console.warn("[catalogClient] Discounts query error (fallback to empty):", err)
    return { data: [] as any[], error: null }
  })

  // 🔴 1. สต็อกสด สาขา และโปรโมชั่นส่วนลด (Real-time Live Stock, Branches & Discounts) — ยิงสดทุกครั้งที่โหลด
  const liveFetchPromise = Promise.all([
    supabase
      .from("branches")
      .select("id, branch_code, branch_name, latitude, longitude, is_active")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("branch_name", { ascending: true }),
    supabase
      .from("stock")
      .select("product_id, branch_id, qty")
      .gt("qty", 0),
    fetchDiscountsSafe,
  ])

  // 🟢 2. ข้อมูลสินค้าคงที่ (Static Products, Groups, Hot Items) — แคช 1 ชั่วโมง
  let staticData: StaticCatalogCache

  if (cachedStaticCatalog && Date.now() - cachedStaticCatalog.fetchedAt < STATIC_CATALOG_TTL_MS) {
    staticData = cachedStaticCatalog
  } else {
    const pageSize = 1000
    const initialPages = 6

    const fetchHotSafe = Promise.resolve(
      supabase.rpc("get_prop_hot_items", { limit_count: 80 })
    ).catch((err) => {
      console.warn("[catalogClient] Hot items RPC error (fallback to empty):", err)
      return { data: [] as any[], error: null }
    })

    const [hotRes, ...pageResults] = await Promise.all([
      fetchHotSafe,
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
          .in("tag", ["Props", "prop"])
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
          .in("tag", ["Props", "prop"])
          .order("id", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        rawGroups.push(...data)
        if (data.length < pageSize) break
      }
    }

    const hotItems = (hotRes as any)?.data || []

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

    const bannerGroups = rawGroups
      .filter((g: any) => !!g.image_url && String(g.image_url).trim() !== "")
      .slice(0, 300)
      .map((g: any) => ({ product_sup: g.product_sup ?? null, image_url: String(g.image_url) }))

    const allBannerImages = Array.from(new Set(bannerGroups.map((c) => c.image_url)))

    staticData = {
      propProducts,
      rawGroups,
      hotProductIds,
      hotRankByProductId,
      hotScoreByProductId,
      bannerGroups,
      allBannerImages,
      fetchedAt: Date.now(),
    }
    cachedStaticCatalog = staticData
  }

  // 🔴 3. รอผลลัพธ์สต็อกสด, สาขา และโปรโมชั่นส่วนลดสด (Real-time Live Stock, Branches & Discounts)
  const [branchesRes, stockRes, discountsRes] = await liveFetchPromise
  const branches = branchesRes.data || []
  const liveStockRows = stockRes.data || []
  const activeDiscounts = (discountsRes as any)?.data || []

  // คำนวณส่วนลดสด โดยเรียงจากแคมเปญล่าสุด (order id desc) เพื่อให้แคมเปญใหม่มีผลก่อนเสมอ
  const now = new Date()
  const validDiscounts = (activeDiscounts || []).filter((discount: any) => {
    const isStarted = !discount.start_date || new Date(discount.start_date) <= now
    const isNotEnded = !discount.end_date || new Date(discount.end_date) >= now
    return isStarted && isNotEnded
  })

  const branchById = new Map<number, any>()
  for (const b of branches) {
    branchById.set(Number(b.id), b)
  }

  let globalDiscount: any | null = null
  const discountByProductId = new Map<number, any>()
  const branchDiscountByProductBranch = new Map<string, any>()
  const branchWideDiscount = new Map<string, any>()
  const bestBranchDiscountByProductId = new Map<number, { discount: any; branchId: number; branchName: string }>()

  for (const discount of validDiscounts) {
    for (const rule of discount.discount_rules || []) {
      const pid = rule.product_id !== null && rule.product_id !== undefined ? Number(rule.product_id) : null
      const bid = rule.branch_id !== null && rule.branch_id !== undefined ? Number(rule.branch_id) : null

      if (bid !== null && pid !== null) {
        // ส่วนลดเฉพาะสินค้า + สาขา
        const key = `${bid}:${pid}`
        if (!branchDiscountByProductBranch.has(key)) {
          branchDiscountByProductBranch.set(key, discount)
        }
        if (!bestBranchDiscountByProductId.has(pid)) {
          const bInfo = branchById.get(bid)
          bestBranchDiscountByProductId.set(pid, {
            discount,
            branchId: bid,
            branchName: bInfo?.branch_name || 'Store',
          })
        }
      } else if (bid !== null && pid === null) {
        // ส่วนลดทั้งสาขานั้น
        if (!branchWideDiscount.has(String(bid))) {
          branchWideDiscount.set(String(bid), discount)
        }
      } else if (bid === null && pid !== null) {
        // ส่วนลดเฉพาะสินค้านี้ ทุกสาขา
        if (Number.isSafeInteger(pid) && !discountByProductId.has(pid)) {
          discountByProductId.set(pid, discount)
        }
      } else if (bid === null && pid === null) {
        // ส่วนลดทุกสินค้า ทุกสาขา (Global)
        if (!globalDiscount) {
          globalDiscount = discount
        }
      }
    }
  }

  const activeBranchIdSet = new Set(branches.map((b: any) => Number(b.id)))

  // แมปสต็อกสดตาม product_id (เฉพาะสาขาที่เปิดให้บริการ)
  const stockByProductId = new Map<number, Array<{ branch_id: number; qty: number }>>()
  for (const s of liveStockRows) {
    if (!activeBranchIdSet.has(Number(s.branch_id))) continue
    const pid = Number(s.product_id)
    const list = stockByProductId.get(pid) || []
    list.push({ branch_id: s.branch_id, qty: s.qty })
    stockByProductId.set(pid, list)
  }

  const groupById = new Map<string, any>()
  for (const group of staticData.rawGroups) {
    groupById.set(String(group.id), group)
  }

  const allProducts: any[] = []
  const productsByGroup = new Map<string, any[]>()
  for (const rawProduct of staticData.propProducts) {
    if (rawProduct.status && rawProduct.status !== "active") continue
    if (!rawProduct.image_url || String(rawProduct.image_url).trim() === "") continue
    const specs = (rawProduct.specs && typeof rawProduct.specs === "object") ? rawProduct.specs : {}
    const product = {
      ...rawProduct,
      stock: stockByProductId.get(rawProduct.id) || [],
      color: rawProduct.color ?? specs.color ?? specs.colour ?? specs.tone ?? null,
      colors: specs.colors ?? null,
      material: specs.material ?? specs.materials ?? null,
      materials: specs.materials ?? null,
      width_cm: specs.width_cm ?? null,
      length_cm: specs.length_cm ?? null,
      thickness_cm: specs.thickness_cm ?? null,
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

  const propGroups = staticData.rawGroups
    .filter((group: any) => productsByGroup.has(String(group.id)))
    .sort((a: any, b: any) => {
      const createdDiff = String(b.created_at || "").localeCompare(String(a.created_at || ""))
      return createdDiff !== 0 ? createdDiff : String(b.id).localeCompare(String(a.id))
    })

  const result: RawCatalogData = {
    branches,
    bannerGroups: staticData.bannerGroups,
    allBannerImages: staticData.allBannerImages,
    hotProductIds: staticData.hotProductIds,
    hotRankByProductId: staticData.hotRankByProductId,
    hotScoreByProductId: staticData.hotScoreByProductId,
    validDiscounts,
    globalDiscount,
    discountByProductId,
    branchDiscountByProductBranch,
    branchWideDiscount,
    bestBranchDiscountByProductId,
    branchById,
    propGroups,
    productsByGroup,
    groupById,
    allProducts,
    fetchedAt: Date.now(),
  }

  cachedRawCatalog = result
  orderedCollectionsByBranch.clear()
  return result
}

export async function loadRawCatalog(force = false): Promise<RawCatalogData> {
  if (force) {
    clearCatalogCache()
  } else {
    const existing = getCachedRawCatalog()
    if (existing) return existing
  }

  if (inflightCatalogPromise) return inflightCatalogPromise

  const fetchWithRetry = async (attempt = 1): Promise<RawCatalogData> => {
    try {
      return await executeLoadRawCatalog()
    } catch (err: any) {
      if (attempt < 2) {
        console.warn(`[catalogClient] loadRawCatalog attempt ${attempt} failed, retrying in 500ms...`, err)
        await new Promise((res) => setTimeout(res, 500))
        return fetchWithRetry(attempt + 1)
      }
      throw err
    }
  }

  inflightCatalogPromise = fetchWithRetry().finally(() => {
    inflightCatalogPromise = null
  })

  return inflightCatalogPromise
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
    const allStockItems = product.stock || []
    const totalCompanyStock = allStockItems.reduce(
      (sum: number, stockItem: any) => sum + Number(stockItem.qty || 0),
      0
    )
    const branchStockItems =
      normalizedBranch !== "all"
        ? allStockItems.filter(
            (stockItem: any) => String(stockItem.branch_id) === normalizedBranch
          )
        : allStockItems
    const branchStock =
      branchStockItems.reduce(
        (sum: number, stockItem: any) => sum + Number(stockItem.qty || 0),
        0
      )

    let availabilityStatus: "available" | "available_other_branch" | "preorder"
    if (normalizedBranch === "all") {
      availabilityStatus = totalCompanyStock > 0 ? "available" : "preorder"
    } else {
      if (branchStock > 0) {
        availabilityStatus = "available"
      } else if (totalCompanyStock > 0) {
        availabilityStatus = "available_other_branch"
      } else {
        availabilityStatus = "preorder"
      }
    }

    let applicableDiscount: any = null
    let isBranchSpecial = false
    let specialBranchName: string | null = null

    if (normalizedBranch !== "all") {
      applicableDiscount =
        raw.branchDiscountByProductBranch.get(`${normalizedBranch}:${product.id}`) ??
        raw.branchWideDiscount.get(normalizedBranch) ??
        raw.discountByProductId.get(Number(product.id)) ??
        raw.globalDiscount ??
        null

      if (raw.branchDiscountByProductBranch.has(`${normalizedBranch}:${product.id}`) || raw.branchWideDiscount.has(normalizedBranch)) {
        isBranchSpecial = true
        specialBranchName = raw.branchById?.get(Number(normalizedBranch))?.branch_name || null
      }
    } else {
      // 🌟 ดูแบบรวมทุกสาขา (ALL): หากมีโปรโมชั่นเฉพาะสาขา ดึงโปรโมชั่นที่ดีที่สุดมาแสดงทันที เพื่อไม่ให้เสียโอกาสการขาย!
      const productGlobal = raw.discountByProductId.get(Number(product.id)) ?? raw.globalDiscount ?? null
      if (productGlobal) {
        applicableDiscount = productGlobal
      } else {
        const branchSpecial = raw.bestBranchDiscountByProductId?.get(Number(product.id))
        if (branchSpecial) {
          applicableDiscount = branchSpecial.discount
          isBranchSpecial = true
          specialBranchName = branchSpecial.branchName
        }
      }
    }

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

    const productObj = {
      ...product,
      stock: allStockItems,
      branch_stock_items: branchStockItems,
      branch_stock_qty: branchStock,
      total_stock: totalCompanyStock,
      availability_status: availabilityStatus,
      hot_rank: hotRank,
      hot_score: hotScore,
      discount_value: hasValidDiscountValue ? normalizedDiscountValue : null,
      discount_type: applicableDiscount ? applicableDiscount.discount_type : null,
      is_branch_special: isBranchSpecial,
      special_branch_name: specialBranchName,
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
      has_available_products: availabilityStatus !== "preorder",
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
    const isHotOtherBranch = item.hot_rank !== null && item.availability_status === "available_other_branch"
    const isOtherBranch = item.availability_status === "available_other_branch"
    const isHotPreorder = item.hot_rank !== null && item.availability_status === "preorder"

    const bucket = isHotAvailable
      ? 0
      : isAvailable
        ? 100 + categoryOrder
        : isHotOtherBranch
          ? 150
          : isOtherBranch
            ? 160 + categoryOrder
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

  const hotOtherBranchProducts = sortHot(productBuckets.get(150) || [])
  const otherBranchMainProducts = [
    ...shuffleArray(productBuckets.get(161) || []),
    ...shuffleArray(productBuckets.get(162) || []),
    ...shuffleArray(productBuckets.get(163) || []),
  ]
  const otherBranchFlowerProducts = shuffleArray(productBuckets.get(164) || [])
  const otherBranchInterleaved = interleaveWithAccent(
    otherBranchMainProducts,
    otherBranchFlowerProducts,
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
    ...hotOtherBranchProducts,
    ...otherBranchInterleaved,
    ...hotPreorderProducts,
    ...preorderOtherProducts,
  ]

  orderedCollectionsByBranch.set(normalizedBranch, ordered)
  return ordered
}
