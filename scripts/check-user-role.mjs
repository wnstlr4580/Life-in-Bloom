import dotenv from "dotenv"
import pg from "pg"

dotenv.config({ path: ".env.local", quiet: true })
const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
try {
  await client.connect()
  const result = await client.query(
    `select "email", "name", "role", "isAdmin" from "User" where lower("email") = lower($1)`,
    [process.argv[2]],
  )
  console.log(JSON.stringify(result.rows))
} finally {
  await client.end()
}
