// 최종발표 전 시연 데이터 정비
//   node scripts/demo-data-cleanup.mjs audit  → 화면에 드러나는 테스트 흔적 조회 (읽기 전용)
//   node scripts/demo-data-cleanup.mjs apply  → seed 스크립트가 넣은 테스트 문구를 실제 운영처럼 교체 (단일 트랜잭션)
// 삭제는 하지 않는다. id·email·사업자번호는 seed 재실행 호환을 위해 그대로 둔다.
import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()

const mode = process.argv[2]
if (!["audit", "apply"].includes(mode)) throw new Error("사용법: node scripts/demo-data-cleanup.mjs audit|apply")

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
await client.connect()

const TEST = "(테스트|test|demo|샘플|sample|임시|asdf|qwer|ㅁㄴㅇ|ㅋㅋㅋ|ㅎㅎㅎ|0000-0000)"

const audit = async () => {
  const checks = [
    ["사용자 이름", `SELECT "id","name","email","role" FROM "User" WHERE "name" ~* $1 ORDER BY "createdAt"`],
    ["판매처", `SELECT "id","marketName","representativeName","settlementBank","settlementHolder" FROM "Seller" WHERE concat_ws(' ',"marketName","legalBusinessName","representativeName","introduction","settlementBank","settlementHolder") ~* $1 OR "marketName" ~ '[0-9]km'`],
    ["상품", `SELECT "id","name",left("description",60) AS description FROM "Product" WHERE "isActive" AND concat_ws(' ',"name","description") ~* $1`],
    ["주문 배송지", `SELECT "id","shippingAddr"->>'name' AS name,"shippingAddr"->>'address' AS address FROM "Order" WHERE "shippingAddr"::text ~* $1`],
    ["리뷰", `SELECT "id",left("content",60) AS content FROM "Review" WHERE "content" ~* $1 OR length(trim("content")) < 5`],
    ["리뷰 댓글", `SELECT "id",left("content",60) AS content FROM "ReviewComment" WHERE "content" ~* $1 OR length(trim("content")) < 3`],
    ["갤러리 게시물", `SELECT "id","authorName",left("content",60) AS content FROM "BouquetPost" WHERE NOT "isHidden" AND (concat_ws(' ',"authorName","content") ~* $1)`],
  ]
  for (const [label, sql] of checks) {
    const { rows } = await client.query(sql, [TEST])
    console.log(`\n■ ${label}: ${rows.length}건`)
    if (rows.length) console.table(rows.slice(0, 40))
  }
}

// seed-diy-seoul-test-data.mjs 판매처 28곳(구별 25 + 근거리 3)의 대표자명
const OWNERS = ["김민서", "이도윤", "박서연", "최지호", "정하은", "강준우", "조수아", "윤시우", "장지민", "임예린",
  "한유준", "오채원", "서민준", "신다은", "권현우", "황서윤", "안지환", "송하린", "전도현", "홍예은",
  "유승민", "고은채", "문태윤", "양소율", "손재원", "배나연", "백건우", "허지안"]
const RENAMED_STORES = [["독립문 1km 꽃시장", "독립문 꽃시장"], ["충정로 3km 플라워마켓", "충정로 플라워마켓"], ["시청 5km 꽃도매", "시청앞 꽃도매"]]
// seed-seller-test-orders.mjs 주문 3건의 받는 사람
const RECEIVERS = [
  { name: "김하늘", phone: "010-4821-3307", address: "서울특별시 마포구 월드컵로 212" },
  { name: "박지윤", phone: "010-7315-0962", address: "서울특별시 서대문구 연희로 248" },
  { name: "이준호", phone: "010-2690-4418", address: "서울특별시 강남구 학동로 426" },
]

const apply = async () => {
  await client.query("BEGIN")
  try {
    const log = (label, result) => console.log(`${label}: ${result.rowCount}건`)

    for (const [from, to] of RENAMED_STORES) {
      log(`판매처명 ${from} → ${to}`, await client.query(
        `UPDATE "Seller" SET "marketName" = $2, "legalBusinessName" = $2, "updatedAt" = NOW() WHERE "id" LIKE 'diy-test-seller-%' AND "marketName" = $1`, [from, to]))
      await client.query(`UPDATE "User" SET "name" = $2 WHERE "id" LIKE 'diy-test-user-%' AND "name" = $1`, [from, to])
      await client.query(`UPDATE "Product" SET "name" = replace("name", $1, $2) WHERE "sellerId" LIKE 'diy-test-seller-%' AND "name" LIKE $1 || '%'`, [from, to])
    }

    const { rows: sellers } = await client.query(`SELECT "id" FROM "Seller" WHERE "id" LIKE 'diy-test-seller-%'`)
    let owners = 0
    for (const { id } of sellers) {
      const [, kind, n] = id.match(/diy-test-seller-(district|nearby)-(\d+)$/) ?? []
      if (!kind) continue
      const owner = OWNERS[(kind === "district" ? 0 : 25) + Number(n) - 1]
      if (!owner) continue
      const result = await client.query(
        `UPDATE "Seller" SET "representativeName" = $2, "managerName" = $2, "settlementHolder" = $2, "updatedAt" = NOW()
         WHERE "id" = $1 AND "representativeName" LIKE '테스트대표%'`, [id, owner])
      owners += result.rowCount
    }
    console.log(`대표자명 교체: ${owners}건`)

    log("정산은행 테스트은행 → NH농협은행", await client.query(
      `UPDATE "Seller" SET "settlementBank" = 'NH농협은행', "updatedAt" = NOW() WHERE "settlementBank" = '테스트은행'`))
    log("판매처 소개 문구", await client.query(
      `UPDATE "Seller" SET "introduction" = "marketName" || '에서 그날 들어온 생화와 소재를 송이 단위로 판매해요.', "updatedAt" = NOW()
       WHERE "introduction" LIKE '%테스트용 꽃과 소재 재고입니다.'`))
    log("상품 설명 문구", await client.query(
      `UPDATE "Product" SET "description" = replace("description", '테스트 완제품입니다.', '꽃다발입니다.')
       WHERE "description" LIKE '%테스트 완제품입니다.'`))

    for (const [index, receiver] of RECEIVERS.entries()) {
      log(`주문 seller-demo-order-${index + 1} 받는 사람`, await client.query(
        `UPDATE "Order" SET "shippingAddr" = "shippingAddr" || $2::jsonb WHERE "id" = $1 AND "shippingAddr"->>'name' LIKE '테스트 고객%'`,
        [`seller-demo-order-${index + 1}`, JSON.stringify(receiver)]))
    }

    await client.query("COMMIT")
    console.log("\n완료 — 남은 항목은 audit으로 다시 확인하세요.")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

try {
  if (mode === "audit") await audit()
  else await apply()
} finally {
  await client.end()
}
