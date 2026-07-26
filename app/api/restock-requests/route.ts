import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { FLOWERS } from "@/lib/customFlowers"

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character)

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "CUSTOMER") return NextResponse.json({ error: "일반회원 로그인 후 신청할 수 있어요" }, { status: 403 })
  const body = await req.json(); const sellerId = String(body.sellerId ?? ""); const flowerCodes: string[] = [...new Set<string>((Array.isArray(body.flowerCodes) ? body.flowerCodes : []).map((value: unknown) => String(value)))].slice(0, 10)
  if (!sellerId || flowerCodes.length === 0) return NextResponse.json({ error: "판매처와 꽃을 확인해주세요" }, { status: 400 })
  const { data: existing } = await supabaseAdmin.from("RestockRequest").select("id").eq("userId", session.user.id).eq("sellerId", sellerId).eq("status", "WAITING").contains("flowerCodes", flowerCodes).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, duplicate: true })
  const requestId = nanoid()
  const { error } = await supabaseAdmin.from("RestockRequest").insert({ id: requestId, userId: session.user.id, sellerId, flowerCodes })
  if (error) return NextResponse.json({ error: "재입고 알림 신청에 실패했어요" }, { status: 500 })
  const { data: seller } = await supabaseAdmin.from("Seller").select("marketName, User(email)").eq("id", sellerId).maybeSingle()
  const sellerUser = Array.isArray(seller?.User) ? seller.User[0] : seller?.User
  const flowerNames = flowerCodes.map((code) => FLOWERS.find((flower) => flower.id === code)?.name ?? code)
  const mailResult = sellerUser?.email ? await sendEmail({
    to: sellerUser.email,
    subject: `[인생내꽃] ${flowerNames.join(", ")} 재입고 알림 신청이 들어왔어요`,
    html: `<h2>${escapeHtml(seller?.marketName ?? "판매처")}에 재입고 요청이 접수됐어요.</h2><p>손님이 리뷰의 꽃다발을 따라 만들기 위해 아래 꽃의 재입고 알림을 신청했습니다.</p><p><b>${flowerNames.map(escapeHtml).join(", ")}</b></p><p>요청번호: ${escapeHtml(requestId)}</p><p>판매자센터에서 재고를 등록하면 고객에게 안내할 수 있습니다.</p>`,
  }).catch((mailError) => { console.error("[mail] restock request", mailError); return { sent: false } }) : { sent: false }
  return NextResponse.json({ ok: true, sellerNotified: mailResult.sent }, { status: 201 })
}
