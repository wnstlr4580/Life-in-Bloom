ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "derivedOrderCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ReviewComment" (
  "id" TEXT PRIMARY KEY,
  "reviewId" TEXT NOT NULL REFERENCES "Review"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ReviewComment_reviewId_createdAt_idx"
  ON "ReviewComment"("reviewId", "createdAt");

ALTER TABLE "ReviewComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "ReviewComment"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "ReviewComment_parentId_idx" ON "ReviewComment"("parentId");
