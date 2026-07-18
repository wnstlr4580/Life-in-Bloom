import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
const result = await client.query(`
  SELECT "id", "name", "price", "category", "useTags", cardinality("images") AS "imageCount", "images"[1] AS "representativeImage", "externalUrl"
  FROM "Product"
  WHERE "purchaseType" = 'EXTERNAL' AND "partnerName" = '한국화훼농협'
  ORDER BY "name"
`)
await client.end()
const invalid = result.rows.filter((row) => {
  const gid = String(row.id).replace("kflower-", "")
  return !row.name || !row.price || !row.externalUrl || Number(row.imageCount) < 1 ||
    row.representativeImage !== `/partners/kflower/${gid}.jpg` &&
    !/^https:\/\/.+\.public\.blob\.vercel-storage\.com\/partners\/kflower\//.test(row.representativeImage)
})
const summary = result.rows.reduce((acc, row) => {
  const key = `${row.category}:${row.useTags.join("+") || "기본"}`
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {})
console.log(JSON.stringify({ count: result.rowCount, summary, invalid }, null, 2))
if (invalid.length) process.exitCode = 1
