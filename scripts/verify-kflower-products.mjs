import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
const result = await client.query(`
  SELECT "id", "name", "price", "category", cardinality("images") AS "imageCount", "images"[1] AS "representativeImage", "externalUrl"
  FROM "Product"
  WHERE "purchaseType" = 'EXTERNAL' AND "partnerName" = '한국화훼농협'
  ORDER BY "name"
`)
await client.end()
const invalid = result.rows.filter((row) => {
  const gid = String(row.id).replace("kflower-", "")
  return !row.name || !row.price || !row.externalUrl || Number(row.imageCount) < 1 ||
    !/\/_prozn\/_data\//.test(row.representativeImage) || !String(row.representativeImage).includes(`/${gid}/`)
})
console.log(JSON.stringify({ count: result.rowCount, invalid, products: result.rows }, null, 2))
if (invalid.length) process.exitCode = 1
