ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "purchaseType" TEXT NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "partnerName" TEXT,
  ADD COLUMN IF NOT EXISTS "partnerBadge" TEXT;

CREATE INDEX IF NOT EXISTS "Product_purchaseType_idx" ON "Product" ("purchaseType");
