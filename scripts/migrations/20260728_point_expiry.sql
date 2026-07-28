-- 포인트 유효기간(지급일로부터 1년) 정책
-- Supabase SQL Editor에서 실행하세요.

-- 지급형 포인트(PURCHASE/REVIEW/REMAKE_SALE) 중 p_after_days(기본 365일)가 지난 건을 찾아
-- 아직 만료 처리(같은 사유+참조에 대한 '_EXPIRED' 트랜잭션)가 안 됐으면 반대 부호로 상쇄한다.
-- revoke_points_once와 동일하게 잔액은 0 밑으로 내려가지 않는다(이미 다 써버린 포인트는 만료 대상에서 자연히 제외됨).
CREATE OR REPLACE FUNCTION expire_old_points(p_after_days INTEGER DEFAULT 365)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT pt.id, pt."userId", pt.amount, pt.reason, pt."referenceType", pt."referenceId"
    FROM "PointTransaction" pt
    WHERE pt.reason IN ('PURCHASE', 'REVIEW', 'REMAKE_SALE')
      AND pt.amount > 0
      AND pt."createdAt" < NOW() - (p_after_days || ' days')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM "PointTransaction" pt2
        WHERE pt2."userId" = pt."userId" AND pt2."referenceType" = pt."referenceType"
          AND pt2."referenceId" = pt."referenceId"
          AND pt2.reason = pt.reason || '_EXPIRED'
      )
  LOOP
    INSERT INTO "PointTransaction" ("id", "userId", "amount", "reason", "referenceType", "referenceId")
    VALUES (md5(random()::text || clock_timestamp()::text), v_row."userId", -v_row.amount, v_row.reason || '_EXPIRED', v_row."referenceType", v_row."referenceId")
    ON CONFLICT ("userId", "reason", "referenceType", "referenceId") DO NOTHING;

    IF FOUND THEN
      UPDATE "User" SET "points" = GREATEST(0, "points" - v_row.amount) WHERE "id" = v_row."userId";
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;
