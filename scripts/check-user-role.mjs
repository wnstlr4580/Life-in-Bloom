import dotenv from "dotenv"
import pg from "pg"
import bcrypt from "bcryptjs"

dotenv.config({ path: ".env.local", quiet: true })
const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
try {
  await client.connect()
  const result = await client.query(
    `select u."email", u."name", u."role", u."isAdmin", u."password",
            s."id" as "sellerId", s."status" as "sellerStatus", s."marketName"
       from "User" u
       left join "Seller" s on s."userId" = u."id"
      where lower(u."email") = lower($1)`,
    [process.argv[2]],
  )
  const row = result.rows[0]
  const hasPassword = Boolean(row?.password)
  const passwordMatches = row?.password && process.argv[3] ? await bcrypt.compare(process.argv[3], row.password) : null
  if (row) delete row.password
  console.log(JSON.stringify({ user: row ?? null, hasPassword, passwordMatches }))
} finally {
  await client.end()
}
