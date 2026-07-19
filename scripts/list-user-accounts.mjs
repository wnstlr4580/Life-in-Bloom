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
    select u."email", u."name", u."role", u."isAdmin",
           (u."password" is not null) as "hasPassword",
           s."marketName", s."status" as "sellerStatus"
      from "User" u
      left join "Seller" s on s."userId" = u."id"
     order by u."role", u."createdAt"
  `)
  console.log(JSON.stringify(result.rows, null, 2))
} finally {
  await client.end()
}
