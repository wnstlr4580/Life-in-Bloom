CREATE TABLE IF NOT EXISTS "RestockRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,
  "flowerCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RestockRequest_sellerId_status_idx" ON "RestockRequest"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "RestockRequest_userId_createdAt_idx" ON "RestockRequest"("userId", "createdAt");
