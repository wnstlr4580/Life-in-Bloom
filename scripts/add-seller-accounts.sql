-- 역할별 계정 + 판매처 가입/심사 기반 스키마
-- Supabase SQL Editor에서 한 번 실행하세요.

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SellerType" AS ENUM ('FLOWER_SHOP', 'FARM', 'WHOLESALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
UPDATE "User" SET "role" = 'ADMIN' WHERE "isAdmin" = true;

CREATE TABLE IF NOT EXISTS "Seller" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
  "legalBusinessName" TEXT NOT NULL,
  "businessNumber" TEXT NOT NULL UNIQUE,
  "representativeName" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "businessCategory" TEXT NOT NULL,
  "mailOrderNumber" TEXT,
  "marketName" TEXT NOT NULL,
  "sellerType" "SellerType" NOT NULL,
  "managerName" TEXT NOT NULL,
  "managerPhone" TEXT NOT NULL,
  "publicPhone" TEXT,
  "introduction" TEXT,
  "logoUrl" TEXT,
  "businessLicensePath" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "roadAddress" TEXT NOT NULL,
  "detailAddress" TEXT NOT NULL DEFAULT '',
  "latitude" DECIMAL(10, 7),
  "longitude" DECIMAL(10, 7),
  "businessHours" JSONB,
  "settlementBank" TEXT NOT NULL,
  "settlementAccount" TEXT NOT NULL,
  "settlementHolder" TEXT NOT NULL,
  "sellsFinishedProducts" BOOLEAN NOT NULL DEFAULT true,
  "offersCustomBouquet" BOOLEAN NOT NULL DEFAULT false,
  "offersDiyFlowers" BOOLEAN NOT NULL DEFAULT false,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "termsVersion" TEXT NOT NULL,
  "termsAgreedAt" TIMESTAMPTZ NOT NULL,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Seller_status_isOpen_idx" ON "Seller"("status", "isOpen");

CREATE TABLE IF NOT EXISTS "SellerReview" (
  "id" TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,
  "reviewerId" TEXT REFERENCES "User"("id"),
  "fromStatus" "SellerStatus",
  "toStatus" "SellerStatus" NOT NULL,
  "reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SellerReview_sellerId_createdAt_idx"
  ON "SellerReview"("sellerId", "createdAt");

CREATE TABLE IF NOT EXISTS "SellerStock" (
  "id" TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,
  "flowerCode" TEXT NOT NULL,
  "flowerName" TEXT NOT NULL,
  "color" TEXT,
  "grade" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'STEM',
  "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
  "unitPrice" INTEGER NOT NULL DEFAULT 0 CHECK ("unitPrice" >= 0),
  "barcode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerStock_variant_key"
  ON "SellerStock"("sellerId", "flowerCode", COALESCE("color", ''), COALESCE("grade", ''));
CREATE INDEX IF NOT EXISTS "SellerStock_flowerCode_isActive_idx"
  ON "SellerStock"("flowerCode", "isActive");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellerId" TEXT REFERENCES "Seller"("id");
CREATE INDEX IF NOT EXISTS "Product_sellerId_isActive_idx" ON "Product"("sellerId", "isActive");

INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE OR REPLACE FUNCTION public.register_seller(
  p_user JSONB,
  p_seller JSONB,
  p_review JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id TEXT := p_user->>'id';
  new_seller_id TEXT := p_seller->>'id';
BEGIN
  INSERT INTO "User" ("id", "email", "name", "password", "role", "createdAt")
  VALUES (
    new_user_id,
    lower(trim(p_user->>'email')),
    p_user->>'name',
    p_user->>'password',
    'SELLER',
    now()
  );

  INSERT INTO "Seller" (
    "id", "userId", "status", "legalBusinessName", "businessNumber",
    "representativeName", "businessType", "businessCategory", "mailOrderNumber",
    "marketName", "sellerType", "managerName", "managerPhone", "publicPhone",
    "introduction", "businessLicensePath", "postalCode", "roadAddress",
    "detailAddress", "latitude", "longitude", "settlementBank",
    "settlementAccount", "settlementHolder", "sellsFinishedProducts",
    "offersCustomBouquet", "offersDiyFlowers", "termsVersion", "termsAgreedAt"
  ) VALUES (
    new_seller_id, new_user_id, 'PENDING',
    p_seller->>'legalBusinessName', p_seller->>'businessNumber',
    p_seller->>'representativeName', p_seller->>'businessType',
    p_seller->>'businessCategory', NULLIF(p_seller->>'mailOrderNumber', ''),
    p_seller->>'marketName', (p_seller->>'sellerType')::"SellerType",
    p_seller->>'managerName', p_seller->>'managerPhone',
    NULLIF(p_seller->>'publicPhone', ''), NULLIF(p_seller->>'introduction', ''),
    p_seller->>'businessLicensePath', p_seller->>'postalCode',
    p_seller->>'roadAddress', COALESCE(p_seller->>'detailAddress', ''),
    NULLIF(p_seller->>'latitude', '')::DECIMAL,
    NULLIF(p_seller->>'longitude', '')::DECIMAL,
    p_seller->>'settlementBank', p_seller->>'settlementAccount',
    p_seller->>'settlementHolder',
    COALESCE((p_seller->>'sellsFinishedProducts')::BOOLEAN, true),
    COALESCE((p_seller->>'offersCustomBouquet')::BOOLEAN, false),
    COALESCE((p_seller->>'offersDiyFlowers')::BOOLEAN, false),
    p_seller->>'termsVersion', now()
  );

  INSERT INTO "SellerReview" ("id", "sellerId", "toStatus", "snapshot")
  VALUES (p_review->>'id', new_seller_id, 'PENDING', p_seller);

  RETURN jsonb_build_object('userId', new_user_id, 'sellerId', new_seller_id);
END;
$$;

REVOKE ALL ON FUNCTION public.register_seller(JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_seller(JSONB, JSONB, JSONB) TO service_role;

-- 최초 관리자 지정 예시:
-- UPDATE "User" SET "role" = 'ADMIN', "isAdmin" = true WHERE "email" = 'owner@example.com';
