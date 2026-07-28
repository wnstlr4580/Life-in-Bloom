-- 포인트 회수(리뷰 삭제 시)와 포인트 사용(결제 시 차감) 지원
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- 리뷰 삭제 등으로 이미 지급한 포인트를 회수한다.
-- 원래 지급 트랜잭션(reason/referenceType/referenceId로 특정)이 있을 때만 반대 부호로 새 트랜잭션을 남긴다.
-- 잔액은 0 밑으로 내려가지 않는다(이미 다 써버린 경우 서비스가 손실을 감수).
CREATE OR REPLACE FUNCTION revoke_points_once(
  p_id TEXT, p_user_id TEXT, p_amount INTEGER, p_original_reason TEXT,
  p_reference_type TEXT, p_reference_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_amount INTEGER;
BEGIN
  SELECT "amount" INTO v_existing_amount FROM "PointTransaction"
    WHERE "userId" = p_user_id AND "reason" = p_original_reason
      AND "referenceType" = p_reference_type AND "referenceId" = p_reference_id;
  IF v_existing_amount IS NULL THEN RETURN false; END IF;

  INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "referenceType", "referenceId")
  VALUES (p_id, p_user_id, -v_existing_amount, p_original_reason || '_REVOKED', p_reference_type, p_reference_id)
  ON CONFLICT ("userId", "reason", "referenceType", "referenceId") DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE "User" SET "points" = GREATEST(0, "points" - v_existing_amount) WHERE "id" = p_user_id;
  RETURN true;
END $$;

-- 결제 시 포인트를 사용한다. 잔액 확인과 차감을 하나의 트랜잭션으로 묶어
-- 동시에 여러 주문을 넣어도 포인트를 중복 사용할 수 없게 한다.
CREATE OR REPLACE FUNCTION redeem_points_once(
  p_id TEXT, p_user_id TEXT, p_amount INTEGER, p_order_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  IF p_amount <= 0 THEN RETURN false; END IF;

  SELECT "points" INTO v_current_points FROM "User" WHERE "id" = p_user_id FOR UPDATE;
  IF v_current_points IS NULL OR v_current_points < p_amount THEN RETURN false; END IF;

  INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "referenceType", "referenceId")
  VALUES (p_id, p_user_id, -p_amount, 'REDEEM', 'Order', p_order_id)
  ON CONFLICT ("userId", "reason", "referenceType", "referenceId") DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE "User" SET "points" = "points" - p_amount WHERE "id" = p_user_id;
  RETURN true;
END $$;
