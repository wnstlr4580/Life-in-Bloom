import { getCloudflareContext } from "@opennextjs/cloudflare"

type UploadBucket = {
  put(
    key: string,
    value: Blob | ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
}

type UploadEnv = {
  LIFE_IN_BLOOM_UPLOADS?: UploadBucket
  R2_PUBLIC_BASE_URL?: string
}

export async function putPublicObject(
  key: string,
  file: File,
  contentType = file.type || "application/octet-stream",
) {
  const { env } = getCloudflareContext() as unknown as { env: UploadEnv }
  const bucket = env.LIFE_IN_BLOOM_UPLOADS
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL

  if (!bucket) {
    throw new Error("LIFE_IN_BLOOM_UPLOADS R2 binding is not configured")
  }
  if (!publicBaseUrl) {
    throw new Error("R2_PUBLIC_BASE_URL is not configured")
  }

  await bucket.put(key, file, { httpMetadata: { contentType } })

  return {
    url: `${publicBaseUrl.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`,
  }
}
