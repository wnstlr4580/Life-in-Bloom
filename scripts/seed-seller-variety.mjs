// 테스트 판매처(diy-test-seller-*, 농협 K플라워마트)를 마켓마다 다르게 만든다.
//   - 전화번호, 제공 서비스(맞춤 꽃다발/개별 꽃), 주문제작 배송 범위, 제작 작업비, 포장 방식별 포장재료비
//   - 판매자별 포장재료비·플로리스트 자격증 컬럼이 없으면 먼저 추가한다 (migration 20261015140000)
// 실행: node scripts/seed-seller-variety.mjs          → 바뀔 내용 미리보기
//       node scripts/seed-seller-variety.mjs --apply  → 적용
import { config } from "dotenv"
import pg from "pg"
import { readFileSync } from "node:fs"

config({ path: ".env.local", quiet: true })
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })

// 포장 방식 기준가(lib/customFlowers.ts WRAPPING)에 매장별 편차를 준다. null = 그 매장은 해당 포장을 안 함
const WRAP_BASE = { kraft: 1500, cellophane: 2000, linen: 2500, newspaper: 1500, hanji: 3000, bouquet: 5000 }
const DELIVERY = [
  ["NATIONWIDE", []],
  ["REGIONAL", ["서울"]],
  ["REGIONAL", ["서울", "경기"]],
  ["NONE", []], // 배송 안 함 → 매장 픽업만
  ["REGIONAL", ["서울", "경기", "인천"]],
  ["NATIONWIDE", []],
  ["REGIONAL", ["서울"]],
]
const hash = (text) => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h }
const round500 = (value) => Math.round(value / 500) * 500

function planFor(seller, index) {
  const h = hash(seller.id)
  const isMart = seller.id === "demo-seller-kflowermart"
  // 6곳 중 1곳은 맞춤 꽃다발만, 1곳은 개별 꽃만 판다. 시연 매장(K플라워마트)은 둘 다.
  const offersCustomBouquet = isMart || index % 6 !== 3
  const offersDiyFlowers = isMart || index % 6 !== 0
  const [scope, regions] = isMart ? ["NATIONWIDE", []] : DELIVERY[index % DELIVERY.length]
  const bouquetMakingFee = isMart ? 4000 : 3000 + (h % 13) * 500 // 3,000 ~ 9,000원
  const wrappingPrices = {}
  for (const [id, base] of Object.entries(WRAP_BASE)) {
    const skip = !isMart && id !== "kraft" && id !== "cellophane" && (hash(seller.id + id) % 5 === 0)
    if (!skip) wrappingPrices[id] = Math.max(500, round500(base * (0.8 + (hash(seller.id + id) % 9) * 0.1))) // 기준가의 0.8~1.6배
  }
  const publicPhone = isMart ? "02-3460-1000" : `02-${2000 + (h % 7900)}-${String(1000 + (hash(seller.id + "tel") % 9000))}`
  const managerPhone = isMart ? "010-3460-1000" : `010-${String(2000 + (hash(seller.id + "m") % 7900))}-${String(1000 + (hash(seller.id + "m2") % 9000))}`
  return { offersCustomBouquet, offersDiyFlowers, customDeliveryScope: scope, customDeliveryRegions: regions, bouquetMakingFee, wrappingPrices, publicPhone, managerPhone }
}

await client.connect()
try {
  const { rows: sellers } = await client.query(`SELECT "id", "marketName", "publicPhone" FROM "Seller" WHERE "id" = 'demo-seller-kflowermart' OR "id" LIKE 'diy-test-seller-%' ORDER BY "id"`)
  const plans = sellers.map((seller, index) => ({ id: seller.id, marketName: seller.marketName, ...planFor(seller, index) }))
  console.table(plans.map((p) => ({ 마켓: p.marketName, 전화: p.publicPhone, 주문제작: p.offersCustomBouquet, 개별꽃: p.offersDiyFlowers, 배송: p.customDeliveryScope === "REGIONAL" ? p.customDeliveryRegions.join("·") : p.customDeliveryScope, 제작비: p.bouquetMakingFee, 크라프트: p.wrappingPrices.kraft, 한지: p.wrappingPrices.hanji ?? "-" })))
  if (!process.argv.includes("--apply")) { console.log("미리보기만 했어요. 적용하려면 --apply 를 붙여 실행하세요."); process.exit(0) }
  await client.query("BEGIN")
  await client.query(`ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "bouquetMakingFee" INTEGER`)
  await client.query(readFileSync("prisma/migrations/20261015140000_seller_wrapping_florist/migration.sql", "utf8"))
  for (const p of plans) {
    await client.query(
      `UPDATE "Seller" SET "publicPhone" = $2, "managerPhone" = $3, "offersCustomBouquet" = $4, "offersDiyFlowers" = $5,
        "customDeliveryScope" = $6, "customDeliveryRegions" = $7, "bouquetMakingFee" = $8, "wrappingPrices" = $9::jsonb, "updatedAt" = NOW()
       WHERE "id" = $1`,
      [p.id, p.publicPhone, p.managerPhone, p.offersCustomBouquet, p.offersDiyFlowers, p.customDeliveryScope, p.customDeliveryRegions, p.bouquetMakingFee, JSON.stringify(p.wrappingPrices)],
    )
  }
  await client.query("COMMIT")
  console.log(`적용 완료: ${plans.length}개 판매처`)
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  throw error
} finally {
  await client.end()
}
