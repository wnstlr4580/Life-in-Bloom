import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 })
  const { password } = await req.json()
  if (typeof password !== "string" || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: "영문과 숫자를 포함해 8자 이상 입력해주세요" }, { status: 400 })
  }
  const hash = await bcrypt.hash(password, 12)
  const { error } = await supabaseAdmin.from("User").update({ password: hash, passwordResetRequired: false }).eq("email", session.user.email)
  if (error) return NextResponse.json({ error: "비밀번호를 변경하지 못했어요" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
