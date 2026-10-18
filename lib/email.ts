import { isPlaceholderEmail } from "@/lib/socialEmail"

type Mail = { to: string | string[]; subject: string; html: string }

export async function sendEmail({ to, subject, html }: Mail) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  // 소셜 대체 이메일(실제로 받을 수 없는 주소)은 발송 대상에서 뺀다
  const recipients = (Array.isArray(to) ? to : [to]).filter((r) => r && !isPlaceholderEmail(r))
  if (!apiKey || !from || recipients.length === 0) {
    console.warn("[mail] skipped: RESEND_API_KEY, MAIL_FROM or recipient is missing")
    return { sent: false }
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html }),
  })
  if (!response.ok) console.error("[mail] failed", response.status, await response.text())
  return { sent: response.ok }
}

export function adminEmails() {
  return (process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim()).filter(Boolean)
}
