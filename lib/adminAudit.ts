import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

export async function writeAdminAudit(input: {
  actorId: string
  action: string
  targetType: string
  targetId: string
  reason?: string | null
  before?: unknown
  after?: unknown
}) {
  await supabaseAdmin.from("AdminAuditLog").insert({
    id: nanoid(), actorId: input.actorId, action: input.action,
    targetType: input.targetType, targetId: input.targetId,
    reason: input.reason || null, before: input.before ?? null, after: input.after ?? null,
  })
}
