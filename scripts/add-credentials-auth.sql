-- 이메일/비밀번호 회원가입 + DB 기반 관리자 판별 + 비회원 주문 지원
-- Supabase SQL Editor에서 실행하세요.

-- 1) 비밀번호 해시, 관리자 여부 컬럼 추가
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT false;

-- 2) 비회원 주문 허용 — Order.userId를 nullable로 변경
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;

-- 3) 관리자 지정 — 아래 이메일을 회원가입에 쓴 이메일로 바꿔서 실행하세요.
-- UPDATE "User" SET "isAdmin" = true WHERE email = '여기에_가입한_이메일@example.com';
