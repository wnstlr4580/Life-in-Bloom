// Product.ohaengTags를 현재 규칙(lib/product-ohaeng)으로 재계산한다.
//
// 태깅 규칙이 바뀌면 이미 저장된 태그는 새 규칙과 어긋난다. 재계산하지 않으면 앞으로 등록되는
// 상품과 기존 상품이 서로 다른 규칙으로 같은 오행 필터(/products?ohaeng=)에 섞인다.
// prisma/seed.ts의 수기 ohaengTags도 새 규칙과 다르므로, 시드를 새로 돌린 뒤에도 한 번 실행할 것.
//
//   npx tsx scripts/retag-product-ohaeng.mts          # 미리보기(변경 사항만 출력하고 롤백)
//   npx tsx scripts/retag-product-ohaeng.mts --apply   # 한 트랜잭션으로 반영
import dotenv from "dotenv"
import pg from "pg"
import { classifyProductOhaeng } from "../lib/product-ohaeng"

dotenv.config({ path: ".env.local", quiet: true })

const apply = process.argv.includes("--apply")
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL 또는 DIRECT_URL이 필요합니다.")

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query("BEGIN")
  const { rows } = await client.query(
    `SELECT "id","name","category","description","colorTags","seasonTags","ohaengTags" FROM "Product" ORDER BY "name"`,
  )
  const changed = rows
    .map((p) => ({ ...p, next: classifyProductOhaeng(p) }))
    .filter((p) => p.next.join(",") !== (p.ohaengTags ?? []).join(","))

  for (const p of changed) {
    console.log(`${p.name} : [${p.ohaengTags ?? []}] → [${p.next}]`)
    if (apply) await client.query(`UPDATE "Product" SET "ohaengTags"=$1 WHERE "id"=$2`, [p.next, p.id])
  }
  console.log(JSON.stringify({ total: rows.length, changed: changed.length, applied: apply }))
  await client.query(apply ? "COMMIT" : "ROLLBACK")
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
