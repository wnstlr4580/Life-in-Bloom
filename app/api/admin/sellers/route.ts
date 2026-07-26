import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireAdmin } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { writeAdminAudit } from "@/lib/adminAudit"
import { sendEmail } from "@/lib/email"

export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const params = new URL(req.url).searchParams
  const q = params.get("q")?.trim().toLowerCase()
  const status = params.get("status")
  const region = params.get("region")
  const sellerType = params.get("sellerType")
  const service = params.get("service")
  const { data, error } = await supabaseAdmin
    .from("Seller")
    .select("id, status, marketName, legalBusinessName, businessNumber, representativeName, managerName, managerPhone, publicPhone, roadAddress, sellerType, submittedAt, approvedAt, sellsFinishedProducts, offersCustomBouquet, offersDiyFlowers, customDeliveryScope, customDeliveryRegions, productDeliveryScope, productDeliveryRegions, User(email)")
    .order("submittedAt", { ascending: false })
  if (error) return NextResponse.json({ error: "판매처 목록을 불러오지 못했어요" }, { status: 500 })
  const sellers = (data ?? []).filter((seller) => {
    const user = Array.isArray(seller.User) ? seller.User[0] : seller.User
    const haystack = [seller.marketName, seller.legalBusinessName, seller.businessNumber, seller.representativeName, seller.managerName, seller.managerPhone, seller.publicPhone, seller.roadAddress, user?.email].join(" ").toLowerCase()
    if (q && !haystack.includes(q)) return false
    if (status && status !== "ALL" && seller.status !== status) return false
    if (region && region !== "ALL" && !seller.roadAddress.includes(region)) return false
    if (sellerType && sellerType !== "ALL" && seller.sellerType !== sellerType) return false
    if (service === "FINISHED" && !seller.sellsFinishedProducts) return false
    if (service === "CUSTOM" && !seller.offersCustomBouquet) return false
    if (service === "DIY" && !seller.offersDiyFlowers) return false
    return true
  })
  return NextResponse.json({ sellers })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "관리자 권한이 필요해요" }, { status: 403 })
  const body = await req.json()
  const { sellerId, status, reason } = body
  if (body.action === "UPDATE_DELIVERY") {
    const scopes = ["NONE", "NATIONWIDE", "REGIONAL"]
    const customDeliveryScope = String(body.customDeliveryScope ?? "")
    const productDeliveryScope = String(body.productDeliveryScope ?? "")
    const cleanRegions = (value: unknown) => [...new Set((Array.isArray(value) ? value : []).map(String).map((region) => region.trim()).filter(Boolean))].slice(0, 20)
    const customDeliveryRegions = cleanRegions(body.customDeliveryRegions)
    const productDeliveryRegions = cleanRegions(body.productDeliveryRegions)
    if (!sellerId || !scopes.includes(customDeliveryScope) || !scopes.includes(productDeliveryScope)) return NextResponse.json({ error: "배송 범위를 확인해주세요" }, { status: 400 })
    if (customDeliveryScope === "REGIONAL" && customDeliveryRegions.length === 0) return NextResponse.json({ error: "주문제작 배송 가능 지역을 선택해주세요" }, { status: 400 })
    if (productDeliveryScope === "REGIONAL" && productDeliveryRegions.length === 0) return NextResponse.json({ error: "완제품 배송 가능 지역을 선택해주세요" }, { status: 400 })
    const { data: before } = await supabaseAdmin.from("Seller").select("customDeliveryScope, customDeliveryRegions, productDeliveryScope, productDeliveryRegions").eq("id", sellerId).maybeSingle()
    if (!before) return NextResponse.json({ error: "판매처를 찾을 수 없어요" }, { status: 404 })
    const after = { customDeliveryScope, customDeliveryRegions: customDeliveryScope === "REGIONAL" ? customDeliveryRegions : [], productDeliveryScope, productDeliveryRegions: productDeliveryScope === "REGIONAL" ? productDeliveryRegions : [], updatedAt: new Date().toISOString() }
    const { error } = await supabaseAdmin.from("Seller").update(after).eq("id", sellerId)
    if (error) return NextResponse.json({ error: "배송 범위를 저장하지 못했어요" }, { status: 500 })
    await writeAdminAudit({ actorId: admin.id, action: "SELLER_DELIVERY_SCOPE_UPDATE", targetType: "SELLER", targetId: sellerId, before, after })
    return NextResponse.json({ ok: true, delivery: after })
  }
  if (!sellerId || !["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
    return NextResponse.json({ error: "처리 상태를 확인해주세요" }, { status: 400 })
  }
  if ((status === "REJECTED" || status === "SUSPENDED") && !String(reason ?? "").trim()) {
    return NextResponse.json({ error: "반려 또는 정지 사유를 입력해주세요" }, { status: 400 })
  }

  const { data: seller } = await supabaseAdmin.from("Seller").select("*").eq("id", sellerId).maybeSingle()
  if (!seller) return NextResponse.json({ error: "판매처를 찾을 수 없어요" }, { status: 404 })
  if (seller.status === status) return NextResponse.json({ ok: true, unchanged: true })
  const now = new Date().toISOString()
  let requestedChanges: Record<string, string> = {}
  if (status === "APPROVED") {
    const { data: latest } = await supabaseAdmin.from("SellerReview").select("snapshot").eq("sellerId", sellerId).eq("toStatus", "UNDER_REVIEW").order("createdAt", { ascending: false }).limit(1).maybeSingle()
    const snapshot = latest?.snapshot as { requestType?: string; requestedChanges?: Record<string, string> } | null
    if (snapshot?.requestType === "SELLER_CHANGE_REQUEST") requestedChanges = snapshot.requestedChanges ?? {}
  }
  const { error } = await supabaseAdmin
    .from("Seller")
    .update({ ...requestedChanges, status, approvedAt: status === "APPROVED" ? now : seller.approvedAt, updatedAt: now })
    .eq("id", sellerId)
  if (error) return NextResponse.json({ error: "상태 변경에 실패했어요" }, { status: 500 })

  await supabaseAdmin.from("SellerReview").insert({
    id: nanoid(), sellerId, reviewerId: admin.id, fromStatus: seller.status,
    toStatus: status, reason: String(reason ?? "").trim() || null, snapshot: seller,
  })
  await writeAdminAudit({ actorId: admin.id, action: `SELLER_${status}`, targetType: "SELLER", targetId: sellerId, reason, before: seller, after: { status, ...requestedChanges } })
  const { data: sellerUser } = await supabaseAdmin.from("User").select("email").eq("id", seller.userId).maybeSingle()
  if (sellerUser?.email && ["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
    const label = status === "APPROVED" ? "승인" : status === "REJECTED" ? "반려" : "사용 중지"
    await sendEmail({ to: sellerUser.email, subject: `[인생내꽃] 판매처 ${label} 안내`, html: `<h2>${seller.marketName} 판매처가 ${label} 처리되었습니다.</h2>${reason ? `<p><b>처리 사유</b> ${String(reason)}</p>` : ""}<p>자세한 내용은 판매자센터에서 확인해주세요.</p>` }).catch((error) => console.error("[mail] seller status", error))
  }
  return NextResponse.json({ ok: true, status })
}
