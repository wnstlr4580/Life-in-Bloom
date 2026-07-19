ALTER TABLE "SellerStock"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "availableForCustom" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "availableForDiy" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "displayStartAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "displayEndAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "SellerStock_sellerId_isVisible_display_idx"
  ON "SellerStock" ("sellerId", "isVisible", "displayStartAt", "displayEndAt");
