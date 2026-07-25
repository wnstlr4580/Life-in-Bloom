CREATE TABLE IF NOT EXISTS "UserSpecialDate" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "monthDay" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UserSpecialDate_userId_monthDay_idx"
  ON "UserSpecialDate" ("userId", "monthDay");
