import { config } from "dotenv"
import pg from "pg"
config({ path: ".env.local" }); config()
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
const { rows } = await client.query(`SELECT "id","composition" FROM "Review" WHERE "id" LIKE 'demo-review-%' ORDER BY "createdAt" DESC`)
console.log(JSON.stringify(rows, null, 2))
await client.end()
