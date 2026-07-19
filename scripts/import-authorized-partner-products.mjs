import "dotenv/config"
import fs from "node:fs/promises"
import pg from "pg"
import { nanoid } from "nanoid"

const input = process.argv[2]
if (!input) throw new Error("사용법: node scripts/import-authorized-partner-products.mjs <승인된-products.json>")
const products = JSON.parse(await fs.readFile(input, "utf8"))
if (!Array.isArray(products) || products.length === 0) throw new Error("상품 배열이 비어 있습니다.")
const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL 또는 DIRECT_URL이 필요합니다.")
const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query("BEGIN")
  for (const [index, item] of products.entries()) {
    const name = String(item.name ?? "").trim()
    const externalUrl = String(item.externalUrl ?? "").trim()
    const price = Number(item.price)
    if (!name || !/^https:\/\/www\.e-kflower\.com\//.test(externalUrl) || !Number.isInteger(price) || price < 0) {
      throw new Error(`${index + 1}번째 상품의 상품명, 가격 또는 케이플라워 URL이 올바르지 않습니다.`)
    }
    await client.query(`
      INSERT INTO "Product" (
        "id","name","description","price","stock","category","images","ohaengTags","seasonTags","colorTags","useTags",
        "deliveryDays","saleStatus","isActive","purchaseType","externalUrl","partnerName","partnerBadge"
      ) VALUES ($1,$2,$3,$4,9999,$5,$6,'{}','{}',$7,$8,'{}','ON_SALE',true,'EXTERNAL',$9,'한국화훼농협','공식 제휴 · 케이플라워')
      ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","price"=EXCLUDED."price","images"=EXCLUDED."images","externalUrl"=EXCLUDED."externalUrl"
    `, [item.id || `kflower-${nanoid(12)}`, name, String(item.description ?? "한국화훼농협 케이플라워 상품입니다."), price, item.category || "bouquet",
      Array.isArray(item.images) ? item.images.filter((url) => /^https:\/\//.test(url)) : [], item.colorTags || [], item.useTags || [], externalUrl])
  }
  await client.query("COMMIT")
  console.log(`${products.length}건의 승인된 제휴상품을 등록했습니다.`)
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
