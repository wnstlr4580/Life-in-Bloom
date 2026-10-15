import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireSeller } from "@/lib/authorization"
import { supabaseAdmin } from "@/lib/supabase"
import { FLORIST_CERT_TYPES, MAX_FLORIST_CERTS, withDocumentUrls } from "@/lib/sellerDocuments"

async function currentPaths(sellerId: string) {
  const { data } = await supabaseAdmin.from("Seller").select("floristCertificatePaths").eq("id", sellerId).single()
  return (data?.floristCertificatePaths ?? []) as string[]
}

async function respond(sellerId: string, paths: string[]) {
  const { data, error } = await supabaseAdmin.from("Seller")
    .update({ floristCertificatePaths: paths, isProfessionalFlorist: paths.length > 0 ? true : undefined, updatedAt: new Date().toISOString() })
    .eq("id", sellerId).select("isProfessionalFlorist, floristCertificatePaths").single()
  if (error) return NextResponse.json({ error: "자격증 정보를 저장하지 못했어요" }, { status: 500 })
  const { floristCertificates } = await withDocumentUrls(data as unknown as Record<string, unknown>)
  return NextResponse.json({ isProfessionalFlorist: data.isProfessionalFlorist, floristCertificates })
}

// 플로리스트·화훼 관련 자격증 추가 (PDF·이미지, 최대 10MB, 최대 5개)
export async function POST(req: Request) {
  const actor = await requireSeller()
  if (!actor) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const sellerId = actor.seller!.id
  const file = (await req.formData()).get("certificate")
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "자격증 파일을 선택해주세요" }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "자격증 파일은 10MB 이하만 가능해요" }, { status: 400 })
  if (!FLORIST_CERT_TYPES.includes(file.type)) return NextResponse.json({ error: "PDF, JPG, PNG, WEBP 파일만 올릴 수 있어요" }, { status: 400 })
  const paths = await currentPaths(sellerId)
  if (paths.length >= MAX_FLORIST_CERTS) return NextResponse.json({ error: `자격증은 최대 ${MAX_FLORIST_CERTS}개까지 등록할 수 있어요` }, { status: 400 })
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin"
  const path = `${sellerId}/florist-certificate-${nanoid(8)}.${extension}`
  const { error } = await supabaseAdmin.storage.from("seller-documents").upload(path, file, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: "자격증 업로드에 실패했어요" }, { status: 500 })
  return respond(sellerId, [...paths, path])
}

export async function DELETE(req: Request) {
  const actor = await requireSeller()
  if (!actor) return NextResponse.json({ error: "판매자 로그인이 필요해요" }, { status: 403 })
  const sellerId = actor.seller!.id
  const index = Number(new URL(req.url).searchParams.get("index"))
  const paths = await currentPaths(sellerId)
  if (!Number.isInteger(index) || !paths[index]) return NextResponse.json({ error: "삭제할 자격증을 찾지 못했어요" }, { status: 404 })
  await supabaseAdmin.storage.from("seller-documents").remove([paths[index]])
  return respond(sellerId, paths.filter((_, i) => i !== index))
}
