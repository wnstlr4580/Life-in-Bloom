ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isPromoted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "exposurePriority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "exposureWeight" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "isCoopMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BouquetPost" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'AI_COMPOSITE';

CREATE TABLE IF NOT EXISTS "PointTransaction" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_user_reason_reference_key"
    UNIQUE ("userId", "reason", "referenceType", "referenceId")
);
CREATE INDEX IF NOT EXISTS "PointTransaction_userId_createdAt_idx"
  ON "PointTransaction"("userId", "createdAt");

CREATE OR REPLACE FUNCTION grant_points_once(
  p_id TEXT, p_user_id TEXT, p_amount INTEGER, p_reason TEXT,
  p_reference_type TEXT, p_reference_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "referenceType", "referenceId")
  VALUES (p_id, p_user_id, p_amount, p_reason, p_reference_type, p_reference_id)
  ON CONFLICT ("userId", "reason", "referenceType", "referenceId") DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE "User" SET "points" = "points" + p_amount WHERE "id" = p_user_id;
  RETURN true;
END $$;
