import { supabaseAdmin } from "@/lib/supabase"

export const FLORIST_CERT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
export const MAX_FLORIST_CERTS = 5

// 저장 경로는 숨기고 5분짜리 열람 링크만 내려준다
export async function withDocumentUrls(sellerRecord: Record<string, unknown>) {
  const sign = async (path: unknown) => {
    if (typeof path !== "string" || !path) return null
    const { data } = await supabaseAdmin.storage.from("seller-documents").createSignedUrl(path, 300)
    return data?.signedUrl ?? null
  }
  const paths = Array.isArray(sellerRecord.floristCertificatePaths) ? sellerRecord.floristCertificatePaths as string[] : []
  const [businessLicenseUrl, ...certificateUrls] = await Promise.all([sign(sellerRecord.businessLicensePath), ...paths.map(sign)])
  const safeSeller = { ...sellerRecord }
  delete safeSeller.businessLicensePath
  delete safeSeller.floristCertificatePaths
  return {
    ...safeSeller, businessLicenseUrl,
    floristCertificates: paths.map((path, index) => ({ index, name: path.split("/").pop() ?? "자격증", url: certificateUrls[index] })),
  }
}

