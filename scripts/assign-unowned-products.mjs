import dotenv from "dotenv"
import pg from "pg"
dotenv.config({ path: ".env.local", quiet: true })
const email = process.argv[2]?.trim().toLowerCase()
if (!email) throw new Error("판매자 이메일이 필요합니다.")
const client = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  await client.query("begin")
  const seller = await client.query(`select s.id from "Seller" s join "User" u on u.id=s."userId" where lower(u.email)=$1`, [email])
  if (seller.rowCount !== 1) throw new Error("대상 판매처를 찾을 수 없습니다.")
  const result = await client.query(`update "Product" set "sellerId"=$1 where "sellerId" is null returning id`, [seller.rows[0].id])
  await client.query("commit")
  console.log(JSON.stringify({ assigned: result.rowCount, sellerId: seller.rows[0].id }))
} catch (error) {
  await client.query("rollback")
  throw error
} finally { await client.end() }
