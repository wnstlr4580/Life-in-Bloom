import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()

const STOCKS = [
  ["rose-red", "빨간 장미", "열렬한 사랑", "레드", "특", 60, 3000],
  ["rose-pink", "핑크 장미", "행복한 사랑", "핑크", "특", 55, 3000],
  ["rose-white", "흰 장미", "순수한 사랑", "화이트", "특", 40, 3000],
  ["rose-yellow", "노란 장미", "우정과 기쁨", "옐로", "상", 35, 2800],
  ["tulip-pink", "핑크 튤립", "사랑의 시작", "핑크", "상", 45, 2500],
  ["tulip-white", "흰 튤립", "새로운 시작", "화이트", "상", 30, 2500],
  ["tulip-purple", "보라 튤립", "영원한 사랑", "퍼플", "상", 28, 2700],
  ["lily-white", "흰 백합", "순결과 변함없는 사랑", "화이트", "특", 24, 3500],
  ["lily-pink", "핑크 백합", "사랑과 번영", "핑크", "특", 22, 3500],
  ["hydrangea-blue", "파란 수국", "진심과 이해", "블루", "특", 20, 4000],
  ["hydrangea-pink", "핑크 수국", "진실한 사랑", "핑크", "특", 18, 4000],
  ["carnation-red", "빨간 카네이션", "존경과 감사", "레드", "상", 42, 2000],
  ["carnation-pink", "핑크 카네이션", "감사와 아름다운 사랑", "핑크", "상", 38, 2000],
  ["gerbera-yellow", "노란 거베라", "신비와 수수께끼", "옐로", "상", 36, 2300],
  ["gerbera-orange", "주황 거베라", "신비와 열정", "오렌지", "상", 32, 2300],
  ["babysbreath-white", "흰 안개꽃", "맑은 마음과 영원한 사랑", "화이트", "상", 70, 1500],
  ["babysbreath-pink", "핑크 안개꽃", "기쁨의 순간", "핑크", "상", 48, 1600],
  ["sunflower", "해바라기", "동경과 기다림", "옐로", "특", 25, 2500],
  ["freesia", "프리지아", "천진난만과 새로운 시작", "옐로", "상", 34, 2000],
  ["eucalyptus", "유칼립투스", "추억과 재생", "그린", "상", 80, 1800],
]

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query("BEGIN")
  const sellerResult = await client.query(
    `SELECT "id", "status" FROM "Seller" WHERE "marketName" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    ["꽃길 플라워"],
  )
  const seller = sellerResult.rows[0]
  if (!seller) throw new Error("꽃길 플라워 판매처를 찾지 못했습니다.")
  if (seller.status !== "APPROVED") throw new Error(`꽃길 플라워가 승인 상태가 아닙니다: ${seller.status}`)

  await client.query(
    `UPDATE "Seller" SET "offersDiyFlowers" = true, "offersCustomBouquet" = true, "updatedAt" = NOW() WHERE "id" = $1`,
    [seller.id],
  )

  for (const [code, name, meaning, color, grade, quantity, unitPrice] of STOCKS) {
    await client.query(
      `INSERT INTO "SellerStock"
        ("id", "sellerId", "flowerCode", "flowerName", "flowerMeaning", "color", "grade", "unit", "quantity", "unitPrice", "isActive", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'STEM', $8, $9, true, NOW())
       ON CONFLICT ("id")
       DO UPDATE SET
         "sellerId" = EXCLUDED."sellerId",
         "flowerCode" = EXCLUDED."flowerCode",
         "flowerName" = EXCLUDED."flowerName",
         "flowerMeaning" = EXCLUDED."flowerMeaning",
         "color" = EXCLUDED."color",
         "grade" = EXCLUDED."grade",
         "quantity" = EXCLUDED."quantity",
         "unitPrice" = EXCLUDED."unitPrice",
         "isActive" = true,
         "updatedAt" = NOW()`,
      [`flower-road-${code}`, seller.id, code, name, meaning, color, grade, quantity, unitPrice],
    )
  }

  await client.query("COMMIT")
  const result = await client.query(
    `SELECT COUNT(*)::int AS count, SUM("quantity")::int AS quantity
     FROM "SellerStock" WHERE "sellerId" = $1 AND "isActive" = true`,
    [seller.id],
  )
  console.log(JSON.stringify({
    sellerId: seller.id,
    marketName: "꽃길 플라워",
    activeStockTypes: result.rows[0].count,
    totalStems: result.rows[0].quantity,
  }, null, 2))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
