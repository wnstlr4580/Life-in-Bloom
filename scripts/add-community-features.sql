-- 꽃다발 후기 갤러리 + 포인트 적립
-- Supabase SQL Editor에서 실행하세요.

-- 1) 사용자 포인트
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- 2) 커스텀 꽃다발 후기 게시글
CREATE TABLE IF NOT EXISTS "BouquetPost" (
  id                  TEXT PRIMARY KEY,
  "userId"            TEXT,
  "authorName"        TEXT,
  "imageUrl"          TEXT NOT NULL,
  composition         JSONB NOT NULL, -- { sizeId, mainFlowerId, additionalFlowerIds, wrappingId }
  content             TEXT,
  "derivedOrderCount" INTEGER NOT NULL DEFAULT 0, -- 이 조합 그대로 구매된 횟수
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
