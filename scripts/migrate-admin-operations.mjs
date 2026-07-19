import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query("BEGIN")
  await client.query(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
    ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);
    ALTER TABLE "BouquetPost" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "BouquetPost" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
    ALTER TABLE "BouquetPost" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);
    CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
      "id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL REFERENCES "User"("id"),
      "action" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL,
      "reason" TEXT, "before" JSONB, "after" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
  `)
  await client.query("COMMIT")
  console.log("admin operations migration complete")
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
