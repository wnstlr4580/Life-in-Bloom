// 꽃다발 스타일 예시 후기 6건의 본문을 실제로 주문제작받거나 직접 만든 사람의 말투로 바꾼다.
// 사진·구성·AI 연출 표시(composition.provenance)는 그대로 둔다.
// 실행: node scripts/rewrite-review-copy.mjs          → 미리보기
//       node scripts/rewrite-review-copy.mjs --apply  → 적용
import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local", quiet: true })

export const REVIEW_COPY = [
  ["demo-review-white-rose", "diy", "양재 꽃시장에서 흰 장미 한 단이랑 안개꽃을 조금 사서 직접 묶어봤어요. 장미가 10송이 한 단이라 8송이만 쓰고 남은 건 화병에 꽂았어요. 처음이라 높이를 딱 맞추지 못했는데 오히려 손으로 만든 티가 나서 더 마음에 들어요. 크라프트지는 매장에서 같이 샀고, 끈은 집에 있던 마끈으로 묶었어요."],
  ["demo-review-tulip", "custom", "엄마 생신이라 주문제작으로 받았어요. 하루 지나니까 튤립이 피면서 옆으로 쭉 벌어지는데, 보라 아네모네랑 색 대비가 예뻐서 엄마가 사진을 계속 찍으셨어요. 린넨 포장이라 종이보다 덜 구겨지고 고급스러웠고, 사장님이 물올림 방법을 메모로 넣어주셔서 좋았습니다."],
  ["demo-review-calla", "custom", "친구 결혼식 2부 때 들 꽃으로 픽업 주문했어요. 카라 줄기를 길게 살려주셔서 둥근 꽃다발보다 훨씬 세련돼 보였어요. 유칼립투스 향이 은은하게 나고, 손잡이를 리본으로 감아주셔서 하루 종일 들고 다니기 편했어요. 픽업 시간에 맞춰 딱 준비돼 있었습니다."],
  ["demo-review-yellow-lily", "diy", "동네 꽃집에서 노란 장미랑 백합을 낱개로 사서 집에서 만들었어요. 백합이 봉오리 상태라 처음엔 빈 곳이 많아 보였는데 이틀 지나니 다 피면서 부피도 커지고 거실에 향이 가득해요. 선물할 거면 하루 이틀 전에 미리 사두는 걸 추천해요."],
  ["presentation-review-pink", "diy", "공판장 근처 도매상가에서 해바라기를 샀는데 5송이가 한 단이라 두 단 사서 6송이만 쓰고 나머지는 화병에 꽂았어요. 꽃 크기가 제각각이라 키를 다르게 잡았더니 들꽃 느낌이 나요. 꽃머리가 무거워서 묶는 위치를 조금 위로 잡아야 안 쏠려요. 유칼립투스 두 줄기만 넣어도 향이 꽤 납니다."],
  ["presentation-review-white", "custom", "화면에서 본 것보다 수국이 연한 하늘색에 보랏빛이 살짝 도는 색이었는데, 저는 이 색이 더 좋았어요. 장미가 한쪽에 모여 있긴 해도 수국 볼륨이 커서 풍성해 보여요. 배송 상자에 꽃다발이 단단히 고정돼 와서 꺾인 데 없었고, 받자마자 줄기 끝 잘라서 물에 담가뒀어요."],
]

if (process.argv[1]?.endsWith("rewrite-review-copy.mjs")) {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT "id", "orderMode", "orderItemId", left("content", 40) AS "before" FROM "Review" WHERE "id" = ANY($1::text[])`, [REVIEW_COPY.map(([id]) => id)])
    console.table(rows)
    if (rows.length !== REVIEW_COPY.length) console.warn(`대상 ${REVIEW_COPY.length}건 중 ${rows.length}건만 찾았어요. 찾은 것만 바꿉니다.`)
    if (!process.argv.includes("--apply")) { console.log("미리보기만 했어요. 적용하려면 --apply 를 붙여 실행하세요."); process.exit(0) }
    await client.query("BEGIN")
    for (const [id, mode, content] of REVIEW_COPY) {
      const { rows: updated } = await client.query(`UPDATE "Review" SET "content" = $2, "orderMode" = $3 WHERE "id" = $1 RETURNING "orderItemId"`, [id, content, mode])
      if (updated[0]?.orderItemId) await client.query(`UPDATE "OrderItem" SET "bouquetMode" = $2 WHERE "id" = $1`, [updated[0].orderItemId, mode])
    }
    await client.query("COMMIT")
    console.log("후기 문구를 바꿨어요.")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}
