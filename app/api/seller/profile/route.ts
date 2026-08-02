import { NextResponse } from "next/server"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"

const FIELDS = [
  "id", "status", "legalBusinessName", "businessNumber", "representativeName",
  "marketName", "sellerType", "managerName", "managerPhone", "publicPhone",
  "introduction", "postalCode", "roadAddress", "detailAddress", "approvedAt",
  "submittedAt", "sellsFinishedProducts", "offersCustomBouquet", "offersDiyFlowers",
  "customDeliveryScope", "customDeliveryRegions", "productDeliveryScope", "productDeliveryRegions",
  "isOpen", "businessHours", "settlementBank", "settlementAccount", "settlementHolder",
  "businessLicensePath",
  "productSortStrategy",
].join(",")

export async function GET() {
  const actor = await requireSeller()
  if (!actor) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const sellerId = actor.seller!.id

  const [{ data: seller, error }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("Seller").select(FIELDS).eq("id", sellerId).single(),
    supabaseAdmin.from("SellerReview").select("toStatus, reason, createdAt").eq("sellerId", sellerId).order("createdAt", { ascending: false }).limit(1),
  ])
  if (error) return NextResponse.json({ error: "판매처 정보를 불러오지 못했어요" }, { status: 500 })
  const sellerRecord = seller as unknown as Record<string, unknown>
  let businessLicenseUrl: string | null = null
  if (typeof sellerRecord.businessLicensePath === "string" && sellerRecord.businessLicensePath) {
    const { data } = await supabaseAdmin.storage.from("seller-documents").createSignedUrl(sellerRecord.businessLicensePath, 300)
    businessLicenseUrl = data?.signedUrl ?? null
  }
  const { businessLicensePath: _path, ...safeSeller } = sellerRecord
  return NextResponse.json({ seller: { ...safeSeller, businessLicenseUrl }, latestReview: reviews?.[0] ?? null })
}

export async function PATCH(req: Request) {
  const actor = await requireSeller()
  if (!actor) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const sellerId = actor.seller!.id
  const body = await req.json()
  const { data: currentSeller } = await supabaseAdmin.from("Seller").select("status, sellsFinishedProducts, offersCustomBouquet, offersDiyFlowers").eq("id", sellerId).single()
  const serviceChanged = Boolean(currentSeller) && (
    Boolean(body.sellsFinishedProducts) !== currentSeller?.sellsFinishedProducts ||
    Boolean(body.offersCustomBouquet) !== currentSeller?.offersCustomBouquet ||
    Boolean(body.offersDiyFlowers) !== currentSeller?.offersDiyFlowers
  )
  if (currentSeller?.status !== "APPROVED" && serviceChanged) return NextResponse.json({ error: "심사 중에는 제공 서비스 설정을 변경할 수 없어요" }, { status: 409 })
  const managerPhone = String(body.managerPhone ?? "").replace(/\D/g, "")
  const publicPhone = String(body.publicPhone ?? "").replace(/\D/g, "")
  const postalCode = String(body.postalCode ?? "").trim()
  const marketName = String(body.marketName ?? "").trim()
  const managerName = String(body.managerName ?? "").trim()
  const roadAddress = String(body.roadAddress ?? "").trim()
  const detailAddress = String(body.detailAddress ?? "").trim()
  const introduction = String(body.introduction ?? "").trim()
  if (!marketName || marketName.length > 50) return NextResponse.json({ error: "마켓명은 1~50자로 입력해주세요" }, { status: 400 })
  if (!managerName || managerName.length > 30) return NextResponse.json({ error: "담당자명을 확인해주세요" }, { status: 400 })
  if (managerPhone.length < 10 || managerPhone.length > 11) return NextResponse.json({ error: "담당자 연락처를 확인해주세요" }, { status: 400 })
  if (publicPhone && (publicPhone.length < 9 || publicPhone.length > 11)) return NextResponse.json({ error: "고객 문의 전화번호를 확인해주세요" }, { status: 400 })
  if (!/^\d{5}$/.test(postalCode) || !roadAddress) return NextResponse.json({ error: "도로명주소 검색으로 주소를 선택해주세요" }, { status: 400 })
  if (introduction.length > 500) return NextResponse.json({ error: "판매처 소개는 500자 이하로 입력해주세요" }, { status: 400 })
  if (![body.sellsFinishedProducts, body.offersCustomBouquet, body.offersDiyFlowers].some(Boolean)) return NextResponse.json({ error: "제공 서비스를 한 개 이상 선택해주세요" }, { status: 400 })
  const scopes = ["NONE", "NATIONWIDE", "REGIONAL"]
  const customDeliveryScope = String(body.customDeliveryScope ?? "NATIONWIDE")
  const productDeliveryScope = String(body.productDeliveryScope ?? "NATIONWIDE")
  const cleanRegions = (value: unknown) => [...new Set((Array.isArray(value) ? value : []).map(String).map((region) => region.trim()).filter(Boolean))].slice(0, 20)
  const customDeliveryRegions = cleanRegions(body.customDeliveryRegions)
  const productDeliveryRegions = cleanRegions(body.productDeliveryRegions)
  if (!scopes.includes(customDeliveryScope) || !scopes.includes(productDeliveryScope)) return NextResponse.json({ error: "배송 범위를 확인해주세요" }, { status: 400 })
  if (body.offersCustomBouquet && customDeliveryScope === "REGIONAL" && customDeliveryRegions.length === 0) return NextResponse.json({ error: "주문제작 배송 가능 지역을 선택해주세요" }, { status: 400 })
  if (body.sellsFinishedProducts && productDeliveryScope === "REGIONAL" && productDeliveryRegions.length === 0) return NextResponse.json({ error: "완제품 배송 가능 지역을 선택해주세요" }, { status: 400 })
  const update = {
    marketName, managerName, managerPhone, publicPhone, postalCode, roadAddress, detailAddress, introduction,
    sellsFinishedProducts: Boolean(body.sellsFinishedProducts),
    offersCustomBouquet: Boolean(body.offersCustomBouquet),
    offersDiyFlowers: Boolean(body.offersDiyFlowers),
    customDeliveryScope, customDeliveryRegions: customDeliveryScope === "REGIONAL" ? customDeliveryRegions : [],
    productDeliveryScope, productDeliveryRegions: productDeliveryScope === "REGIONAL" ? productDeliveryRegions : [],
    isOpen: body.isOpen !== false,
    businessHours: body.businessHours ?? null,
    productSortStrategy: ["MANUAL", "LOW_STOCK", "HIGH_STOCK", "BEST_SELLING", "LATEST"].includes(String(body.productSortStrategy)) ? String(body.productSortStrategy) : "MANUAL",
    updatedAt: new Date().toISOString(),
  }
  const { data, error } = await supabaseAdmin.from("Seller").update(update).eq("id", sellerId).select(FIELDS).single()
  if (error) return NextResponse.json({ error: "설정을 저장하지 못했어요" }, { status: 500 })
  const sellerRecord = data as unknown as Record<string, unknown>
  let businessLicenseUrl: string | null = null
  if (typeof sellerRecord.businessLicensePath === "string" && sellerRecord.businessLicensePath) {
    const { data: signed } = await supabaseAdmin.storage.from("seller-documents").createSignedUrl(sellerRecord.businessLicensePath, 300)
    businessLicenseUrl = signed?.signedUrl ?? null
  }
  const { businessLicensePath: _path, ...safeSeller } = sellerRecord
  return NextResponse.json({ seller: { ...safeSeller, businessLicenseUrl } })
}
