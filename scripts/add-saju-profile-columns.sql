-- 사주 프로필 저장에 필요한 컬럼이 User 테이블에 없어서 저장이 실패하고 있었음.
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthHour" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sajuName" TEXT;
