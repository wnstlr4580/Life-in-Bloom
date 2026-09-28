import { supabaseAdmin } from "@/lib/supabase"

export type InventoryMode = "NONE" | "HIGH_STOCK" | "LOW_STOCK"
export type SellerSortStrategy = "MANUAL" | "LOW_STOCK" | "HIGH_STOCK" | "BEST_SELLING" | "LATEST"
export type UserProductSort = "recommended" | "latest" | "popular" | "price_asc" | "price_desc"

export type ExposurePolicy = {
  nonghyupPriorityEnabled: boolean
  preferredSellerIds: string[]
  inventoryMode: InventoryMode
  adminPromotionsEnabled: boolean
  sellerPoliciesEnabled: boolean
}

export const DEFAULT_EXPOSURE_POLICY: ExposurePolicy = {
  nonghyupPriorityEnabled: true,
  preferredSellerIds: [],
  inventoryMode: "NONE",
  adminPromotionsEnabled: true,
  sellerPoliciesEnabled: true,
}

export async function getExposurePolicy(): Promise<ExposurePolicy> {
  const { data, error } = await supabaseAdmin.from("ExposurePolicy").select("nonghyupPriorityEnabled, preferredSellerIds, inventoryMode, adminPromotionsEnabled, sellerPoliciesEnabled").eq("id", "default").maybeSingle()
  if (error || !data) return DEFAULT_EXPOSURE_POLICY
  return {
    nonghyupPriorityEnabled: data.nonghyupPriorityEnabled !== false,
    preferredSellerIds: Array.isArray(data.preferredSellerIds) ? data.preferredSellerIds.map(String) : [],
    inventoryMode: ["HIGH_STOCK", "LOW_STOCK"].includes(data.inventoryMode) ? data.inventoryMode as InventoryMode : "NONE",
    adminPromotionsEnabled: data.adminPromotionsEnabled !== false,
    sellerPoliciesEnabled: data.sellerPoliciesEnabled !== false,
  }
}

type Relation<T> = T | T[] | null
export type RankedProduct = {
  id: string
  name: string
  partnerName?: string | null
  stock: number
  price?: number
  saleStatus?: string
  createdAt: string
  isPromoted?: boolean
  exposurePriority?: number
  sellerPromoted?: boolean
  sellerPriority?: number
  seller?: Relation<{ id?: string; marketName?: string; productSortStrategy?: string; isCoopMember?: boolean }>
  orderItems?: { quantity?: number }[] | null
  wishlist?: { id?: string }[] | null
  reviews?: { rating?: number }[] | null
}

const one = <T>(value: Relation<T>) => Array.isArray(value) ? value[0] : value
const sales = (product: RankedProduct) => (product.orderItems ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
const popularity = (product: RankedProduct) => sales(product) * 5 + (product.wishlist?.length ?? 0) * 2 + (product.reviews?.length ?? 0) * 2
// 조합원꽃집(조합원 인증을 거친 로컬 판매자)도 농협 판매처와 같은 우선 노출 대상이다.
const nonghyup = (product: RankedProduct) => Boolean(one(product.seller)?.isCoopMember) || /농협/.test(`${product.name} ${product.partnerName ?? ""} ${one(product.seller)?.marketName ?? ""}`)
const descending = (a: number, b: number) => b - a

export function rankProducts<T extends RankedProduct>(products: T[], options: {
  policy: ExposurePolicy
  userSort?: UserProductSort
  page: "catalog" | "saju"
  sajuScores?: Map<string, number>
}) {
  const { policy, userSort = "recommended", page, sajuScores = new Map<string, number>() } = options
  const preferredIndex = new Map(policy.preferredSellerIds.map((id, index) => [id, index]))
  return [...products].sort((a, b) => {
    const available = descending(Number(a.stock > 0 && a.saleStatus !== "SOLD_OUT"), Number(b.stock > 0 && b.saleStatus !== "SOLD_OUT"))
    if (available) return available

    // 사용자가 직접 고른 정렬은 모든 비공개 운영 정책보다 우선한다.
    if (userSort === "latest") {
      const result = +new Date(b.createdAt) - +new Date(a.createdAt)
      if (result) return result
    }
    if (userSort === "popular") {
      const result = descending(popularity(a), popularity(b))
      if (result) return result
    }
    if (userSort === "price_asc" || userSort === "price_desc") {
      const result = userSort === "price_asc" ? Number(a.price ?? 0) - Number(b.price ?? 0) : Number(b.price ?? 0) - Number(a.price ?? 0)
      if (result) return result
    }

    // 사주 추천의 기본 정렬에서는 오행 적합도가 운영 정책보다 항상 먼저다.
    if (page === "saju" && userSort === "recommended") {
      const result = descending(sajuScores.get(a.id) ?? 0, sajuScores.get(b.id) ?? 0)
      if (result) return result
    }

    const sellerA = one(a.seller)
    const sellerB = one(b.seller)
    const preferredA = preferredIndex.get(sellerA?.id ?? "") ?? Number.MAX_SAFE_INTEGER
    const preferredB = preferredIndex.get(sellerB?.id ?? "") ?? Number.MAX_SAFE_INTEGER
    if (preferredA !== preferredB) return preferredA - preferredB

    if (policy.nonghyupPriorityEnabled) {
      const result = descending(Number(nonghyup(a)), Number(nonghyup(b)))
      if (result) return result
    }
    if (policy.adminPromotionsEnabled) {
      const promoted = descending(Number(Boolean(a.isPromoted)), Number(Boolean(b.isPromoted)))
      if (promoted) return promoted
      const priority = descending(Number(a.exposurePriority ?? 0), Number(b.exposurePriority ?? 0))
      if (priority) return priority
    }
    if (policy.inventoryMode !== "NONE") {
      const result = policy.inventoryMode === "HIGH_STOCK" ? descending(a.stock, b.stock) : a.stock - b.stock
      if (result) return result
    }

    // 판매자 정책은 같은 판매자의 상품끼리만 순서를 바꾼다.
    if (policy.sellerPoliciesEnabled && sellerA?.id && sellerA.id === sellerB?.id) {
      const promoted = descending(Number(Boolean(a.sellerPromoted)), Number(Boolean(b.sellerPromoted)))
      if (promoted) return promoted
      const strategy = (sellerA.productSortStrategy ?? "MANUAL") as SellerSortStrategy
      const result = strategy === "LOW_STOCK" ? a.stock - b.stock
        : strategy === "HIGH_STOCK" ? descending(a.stock, b.stock)
        : strategy === "BEST_SELLING" ? descending(sales(a), sales(b))
        : strategy === "LATEST" ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : descending(Number(a.sellerPriority ?? 0), Number(b.sellerPriority ?? 0))
      if (result) return result
    }
    return +new Date(b.createdAt) - +new Date(a.createdAt) || a.id.localeCompare(b.id)
  })
}
