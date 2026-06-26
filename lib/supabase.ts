import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 브라우저/클라이언트 컴포넌트용 (anon key)
export const supabase = createClient(url, anon)

// 서버사이드 API 라우트용 (service role — RLS 우회)
export const supabaseAdmin = createClient(url, service)
