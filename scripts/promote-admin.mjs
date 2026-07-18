import dotenv from "dotenv"
import pg from "pg"

dotenv.config({ path: ".env.local", quiet: true })

const email = process.argv[2]?.trim().toLowerCase()
if (!email) throw new Error("관리자로 승격할 이메일이 필요합니다.")

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  const result = await client.query(
    `UPDATE "User"
     SET "role" = 'ADMIN', "isAdmin" = true
     WHERE lower("email") = $1
     RETURNING "email", "name", "role", "isAdmin"`,
    [email],
  )
  if (result.rowCount !== 1) throw new Error("가입된 사용자를 찾을 수 없습니다.")
  console.log(JSON.stringify(result.rows[0]))
} finally {
  await client.end()
}
