import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()

  const normalizedEmail = (email as string | undefined)?.toLowerCase().trim()
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return NextResponse.json({ error: "올바른 이메일을 입력해주세요" }, { status: 400 })
  }
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 해요" }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from("User")
    .select("id, password")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existing?.password) {
    return NextResponse.json({ error: "이미 가입된 이메일이에요" }, { status: 409 })
  }

  const hash = await bcrypt.hash(String(password), 10)

  const { error } = await supabaseAdmin
    .from("User")
    .upsert(
      { id: existing?.id ?? nanoid(), email: normalizedEmail, name: name?.trim() || null, password: hash },
      { onConflict: "email" }
    )

  if (error) return NextResponse.json({ error: "회원가입에 실패했어요", detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
