ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "sellerId" TEXT,
  ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'FINISHED',
  ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PAID',
  ADD COLUMN IF NOT EXISTS "courier" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "commissionRate" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "commissionFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "settlementAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "settlementStatus" TEXT NOT NULL DEFAULT 'WAITING',
  ADD COLUMN IF NOT EXISTS "settlementDueAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMPTZ;

UPDATE "OrderItem" oi
SET "sellerId" = p."sellerId",
    "itemType" = CASE
      WHEN p."category" = 'custom' THEN 'CUSTOM_BOUQUET'
      WHEN p."category" IN ('single-flower', 'diy') THEN 'DIY_FLOWER'
      ELSE 'FINISHED'
    END,
    "fulfillmentStatus" = CASE
      WHEN o."status" = 'PENDING' THEN 'PENDING'
      WHEN o."status" = 'PAID' THEN 'PAID'
      WHEN o."status" = 'PREPARING' THEN 'PREPARING'
      WHEN o."status" = 'SHIPPED' THEN 'SHIPPED'
      WHEN o."status" = 'DELIVERED' THEN 'DELIVERED'
      WHEN o."status" = 'CANCELLED' THEN 'CANCELLED'
      ELSE 'PAID'
    END,
    "commissionFee" = ROUND((oi."price" * oi."quantity") * 0.10),
    "settlementAmount" = (oi."price" * oi."quantity") - ROUND((oi."price" * oi."quantity") * 0.10),
    "settlementStatus" = CASE WHEN o."status" = 'DELIVERED' THEN 'READY' ELSE 'WAITING' END,
    "settlementDueAt" = CASE WHEN o."status" = 'DELIVERED' THEN o."createdAt" + INTERVAL '7 days' ELSE NULL END
FROM "Product" p, "Order" o
WHERE oi."productId" = p."id" AND oi."orderId" = o."id";

DO $$ BEGIN
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_fulfillmentStatus_idx"
  ON "OrderItem" ("sellerId", "fulfillmentStatus");
CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_settlementStatus_idx"
  ON "OrderItem" ("sellerId", "settlementStatus");
