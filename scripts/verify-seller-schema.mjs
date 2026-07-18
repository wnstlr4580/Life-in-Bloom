import dotenv from "dotenv"
import pg from "pg"

dotenv.config({ path: ".env.local", quiet: true })

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  const result = await client.query(`
    SELECT
      to_regclass('public."Seller"') IS NOT NULL AS seller_table,
      to_regclass('public."SellerReview"') IS NOT NULL AS review_table,
      to_regclass('public."SellerStock"') IS NOT NULL AS stock_table,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'role'
      ) AS role_column,
      EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'register_seller'
      ) AS signup_function,
      (
        SELECT count(*)::int FROM storage.buckets
        WHERE id = 'seller-documents' AND public = false
      ) AS private_bucket,
      (
        SELECT count(*)::int FROM "User"
        WHERE "isAdmin" = true AND "role" = 'ADMIN'
      ) AS migrated_admins
  `)
  console.log(JSON.stringify(result.rows[0]))

  const admins = await client.query(`
    SELECT "email", "name"
    FROM "User"
    WHERE "role" = 'ADMIN'
    ORDER BY "createdAt" ASC
  `)
  console.log(JSON.stringify({ admins: admins.rows }))

  const checkEmail = process.argv[2]?.trim().toLowerCase()
  if (checkEmail) {
    const user = await client.query(
      `SELECT "id", "email", "name", "role", ("password" IS NOT NULL) AS "hasPassword"
       FROM "User" WHERE lower("email") = $1`,
      [checkEmail],
    )
    console.log(JSON.stringify({ checkedUser: user.rows[0] ?? null }))
  }

  const checkSellerId = process.argv[3]?.trim()
  if (checkSellerId) {
    const seller = await client.query(
      `SELECT "id", "marketName", "status", "approvedAt", "updatedAt"
       FROM "Seller" WHERE "id" = $1`,
      [checkSellerId],
    )
    console.log(JSON.stringify({ checkedSeller: seller.rows[0] ?? null }))
  }
} finally {
  await client.end()
}
