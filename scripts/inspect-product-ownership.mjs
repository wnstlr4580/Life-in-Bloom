import dotenv from "dotenv"
import pg from "pg"
dotenv.config({ path: ".env.local", quiet: true })
const client = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  const seller = await client.query(`select s.id, s."marketName", u.email from "Seller" s join "User" u on u.id=s."userId" where lower(u.email)=lower($1)`, [process.argv[2]])
  const products = await client.query(`select count(*)::int as total, count(*) filter (where "sellerId" is null)::int as unowned, count(distinct "sellerId")::int as seller_count from "Product"`)
  console.log(JSON.stringify({ seller: seller.rows, products: products.rows[0] }))
} finally { await client.end() }
