import dotenv from "dotenv"
import pg from "pg"
import bcrypt from "bcryptjs"

dotenv.config({ path: ".env.local", quiet: true })
const [email, password] = process.argv.slice(2)
if (!email || !password) throw new Error("사용법: node scripts/reset-user-password.mjs <이메일> <새 비밀번호>")
if (password.length < 6 || password.length > 72) throw new Error("비밀번호는 6~72자로 입력해주세요.")

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
try {
  await client.connect()
  const hash = await bcrypt.hash(password, 12)
  const result = await client.query(
    `update "User" set "password" = $1 where lower("email") = lower($2) returning "email", "role"`,
    [hash, email],
  )
  if (result.rowCount !== 1) throw new Error("대상 사용자를 찾을 수 없습니다.")
  if (!(await bcrypt.compare(password, hash))) throw new Error("비밀번호 해시 검증에 실패했습니다.")
  console.log(JSON.stringify({ updated: true, email: result.rows[0].email, role: result.rows[0].role }))
} finally {
  await client.end()
}
