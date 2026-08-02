import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
      {
        protocol: "https",
        hostname: "www.e-kflower.com",
        pathname: "/**",
      },
      {
        // Vercel Blob 업로드 이미지. 호스트명 앞부분(스토어 ID)이 환경마다 달라 와일드카드 사용
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
