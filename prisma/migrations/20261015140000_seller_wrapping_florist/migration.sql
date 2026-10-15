-- 판매자별 포장재료비(포장 방식 id → 원)와 전문 플로리스트 자격증
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "wrappingPrices" JSONB;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "isProfessionalFlorist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "floristCertificatePaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
