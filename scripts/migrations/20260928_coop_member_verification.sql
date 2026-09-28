-- 조합원 인증 연계: 판매자 가입 시 조합원 여부 체크 → 관리자 조합원여부확인·교육이력확인 → 조합원꽃집 승인
-- isCoopMember(20260726_meeting_followups.sql)는 "조합원꽃집으로 승인됨"을 뜻한다.
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "isCoopMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopBirthDate" TEXT;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopMemberCheck" JSONB;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopEducationCheck" JSONB;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopReviewedAt" TIMESTAMP(3);
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coopRejectReason" TEXT;
