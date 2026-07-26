ALTER TABLE "Seller"
  ADD COLUMN IF NOT EXISTS "customDeliveryScope" TEXT NOT NULL DEFAULT 'NATIONWIDE',
  ADD COLUMN IF NOT EXISTS "customDeliveryRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "productDeliveryScope" TEXT NOT NULL DEFAULT 'NATIONWIDE',
  ADD COLUMN IF NOT EXISTS "productDeliveryRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Seller"
  DROP CONSTRAINT IF EXISTS "Seller_customDeliveryScope_check",
  ADD CONSTRAINT "Seller_customDeliveryScope_check" CHECK ("customDeliveryScope" IN ('NONE', 'NATIONWIDE', 'REGIONAL')),
  DROP CONSTRAINT IF EXISTS "Seller_productDeliveryScope_check",
  ADD CONSTRAINT "Seller_productDeliveryScope_check" CHECK ("productDeliveryScope" IN ('NONE', 'NATIONWIDE', 'REGIONAL'));
