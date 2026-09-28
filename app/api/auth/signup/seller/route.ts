import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { adminEmails, sendEmail } from "@/lib/email"
import { isValidBirthDate } from "@/lib/coopVerification"

const SELLER_TYPES = new Set(["FLOWER_SHOP", "FARM", "WHOLESALE", "OTHER"])
const TERMS_VERSION = "seller-2026-07-18"

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim()
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const email = text(form, "email").toLowerCase()
  const password = text(form, "password")
  const businessNumber = text(form, "businessNumber").replace(/\D/g, "")
  const managerPhone = text(form, "managerPhone").replace(/\D/g, "")
  const sellerType = text(form, "sellerType")
  const postalCode = text(form, "postalCode")
  const settlementAccount = text(form, "settlementAccount").replace(/\D/g, "")
  const publicPhone = text(form, "publicPhone").replace(/\D/g, "")
  const license = form.get("businessLicense")

  const required = [
    "managerName", "legalBusinessName", "representativeName", "businessType",
    "businessCategory", "marketName", "postalCode", "roadAddress",
    "settlementBank", "settlementAccount", "settlementHolder",
  ]
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "올바른 이메일을 입력해주세요" }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: "비밀번호는 8자 이상이어야 해요" }, { status: 400 })
  if (required.some((key) => !text(form, key))) {
    return NextResponse.json({ error: "필수 정보를 모두 입력해주세요" }, { status: 400 })
  }
  if (businessNumber.length !== 10) {
    return NextResponse.json({ error: "사업자등록번호 10자리를 확인해주세요" }, { status: 400 })
  }
  if (managerPhone.length < 10 || managerPhone.length > 11) {
    return NextResponse.json({ error: "담당자 연락처를 확인해주세요" }, { status: 400 })
  }
  if (!/^\d{5}$/.test(postalCode)) return NextResponse.json({ error: "도로명주소 검색으로 주소를 다시 선택해주세요" }, { status: 400 })
  if (publicPhone && (publicPhone.length < 9 || publicPhone.length > 11)) return NextResponse.json({ error: "고객 문의 전화번호를 확인해주세요" }, { status: 400 })
  if (settlementAccount.length < 8 || settlementAccount.length > 20) return NextResponse.json({ error: "정산 계좌번호를 확인해주세요" }, { status: 400 })
  if (!["true"].includes(text(form, "sellsFinishedProducts")) && !["true"].includes(text(form, "offersCustomBouquet")) && !["true"].includes(text(form, "offersDiyFlowers"))) {
    return NextResponse.json({ error: "판매할 꽃 서비스 유형을 한 개 이상 선택해주세요" }, { status: 400 })
  }
  if (!SELLER_TYPES.has(sellerType)) {
    return NextResponse.json({ error: "판매처 유형을 선택해주세요" }, { status: 400 })
  }
  if (!(license instanceof File) || license.size === 0) {
    return NextResponse.json({ error: "사업자등록증 파일을 첨부해주세요" }, { status: 400 })
  }
  if (license.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "사업자등록증은 10MB 이하만 가능해요" }, { status: 400 })
  }
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(license.type)) {
    return NextResponse.json({ error: "사업자등록증은 PDF, JPG, PNG, WEBP 파일만 가능해요" }, { status: 400 })
  }
  if (text(form, "termsAgreed") !== "true") {
    return NextResponse.json({ error: "판매자 약관 동의가 필요해요" }, { status: 400 })
  }
  const coopRequested = text(form, "coopRequested") === "true"
  const coopBirthDate = text(form, "coopBirthDate").replace(/\D/g, "")
  if (coopRequested && !isValidBirthDate(coopBirthDate)) return NextResponse.json({ error: "조합원 확인용 생년월일 8자리를 확인해주세요" }, { status: 400 })
  if (coopRequested && text(form, "coopConsent") !== "true") return NextResponse.json({ error: "조합원 확인을 위한 정보 조회 동의가 필요해요" }, { status: 400 })

  const [{ data: existingUser }, { data: existingSeller }] = await Promise.all([
    supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle(),
    supabaseAdmin.from("Seller").select("id").eq("businessNumber", businessNumber).maybeSingle(),
  ])
  if (existingUser) return NextResponse.json({ error: "이미 사용 중인 이메일이에요" }, { status: 409 })
  if (existingSeller) return NextResponse.json({ error: "이미 등록된 사업자등록번호예요" }, { status: 409 })

  const userId = nanoid()
  const sellerId = nanoid()
  const extension = license.name.split(".").pop()?.toLowerCase() || "bin"
  const documentPath = `${sellerId}/business-license.${extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from("seller-documents")
    .upload(documentPath, license, { contentType: license.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: "사업자등록증 업로드에 실패했어요. 잠시 후 다시 시도해주세요" }, { status: 500 })
  }

  const seller = {
    id: sellerId,
    legalBusinessName: text(form, "legalBusinessName"),
    businessNumber,
    representativeName: text(form, "representativeName"),
    businessType: text(form, "businessType"),
    businessCategory: text(form, "businessCategory"),
    mailOrderNumber: text(form, "mailOrderNumber"),
    marketName: text(form, "marketName"),
    sellerType,
    managerName: text(form, "managerName"),
    managerPhone,
    publicPhone,
    introduction: text(form, "introduction"),
    businessLicensePath: documentPath,
    postalCode,
    roadAddress: text(form, "roadAddress"),
    detailAddress: text(form, "detailAddress"),
    latitude: text(form, "latitude"),
    longitude: text(form, "longitude"),
    settlementBank: text(form, "settlementBank"),
    settlementAccount,
    settlementHolder: text(form, "settlementHolder"),
    sellsFinishedProducts: text(form, "sellsFinishedProducts") === "true",
    offersCustomBouquet: text(form, "offersCustomBouquet") === "true",
    offersDiyFlowers: text(form, "offersDiyFlowers") === "true",
    termsVersion: TERMS_VERSION,
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { error } = await supabaseAdmin.rpc("register_seller", {
    p_user: { id: userId, email, name: seller.managerName, password: passwordHash },
    p_seller: seller,
    p_review: { id: nanoid() },
  })

  if (error) {
    await supabaseAdmin.storage.from("seller-documents").remove([documentPath])
    return NextResponse.json({ error: "판매자 가입에 실패했어요. 입력 정보를 확인해주세요" }, { status: 500 })
  }

  // register_seller RPC는 기존 가입 필드만 다루므로 조합원 신청 정보는 가입 직후 따로 저장한다.
  if (coopRequested) {
    const { error: coopError } = await supabaseAdmin.from("Seller").update({ coopRequested: true, coopBirthDate }).eq("id", sellerId)
    if (coopError) console.error("[seller-signup] coop request save failed", coopError)
  }

  await sendEmail({
    to: adminEmails(),
    subject: `[인생내꽃] 새 판매처 승인 요청: ${seller.marketName}`,
    html: `<h2>새 판매처 가입 심사가 접수되었습니다.</h2><p><b>판매처</b> ${seller.marketName}</p><p><b>대표자</b> ${seller.representativeName}</p><p><b>지역</b> ${seller.roadAddress}</p>${coopRequested ? "<p><b>조합원꽃집 신청</b> 조합원여부확인·교육이력확인이 필요합니다.</p>" : ""}<p>관리자센터에서 신청서와 사업자등록증을 확인해주세요.</p><p style="margin-top:24px"><a href="${req.nextUrl.origin}/admin/sellers?open=${sellerId}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1c1917;color:#fff;text-decoration:none;font-weight:700">인생내꽃에서 심사하기</a></p>`,
  }).catch((error) => console.error("[mail] seller review request", error))

  return NextResponse.json({ ok: true }, { status: 201 })
}
