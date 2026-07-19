CREATE TABLE IF NOT EXISTS "SellerProductExample" (
  "id" TEXT PRIMARY KEY,
  "field" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'all',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SellerProductExample_field_category_sortOrder_idx"
  ON "SellerProductExample" ("field", "category", "sortOrder");
