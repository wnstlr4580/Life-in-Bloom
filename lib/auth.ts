import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import KakaoProvider from "next-auth/providers/kakao"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"

const providers: Provider[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "이메일", type: "email" },
      password: { label: "비밀번호", type: "password" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email as string | undefined
      const password = credentials?.password as string | undefined
      if (!email || !password) return null

      const { data: user } = await supabaseAdmin
        .from("User")
        .select("id, email, name, image, password, role, status, suspendedUntil, passwordResetRequired")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle()

      if (!user?.password) return null
      const suspensionActive = user.status === "SUSPENDED"
        && (!user.suspendedUntil || new Date(user.suspendedUntil) > new Date())
      if (suspensionActive) return null
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) return null

      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role }
    },
  }),
]

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  )
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

const nextAuth = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    signIn: async ({ user, account }) => {
      if (!user.email || !supabaseAdmin) return true
      if (account?.provider !== "credentials") {
        const normalizedEmail = user.email.toLowerCase().trim()
        const { data: existing } = await supabaseAdmin
          .from("User")
          .select("id, role, status, suspendedUntil")
          .eq("email", normalizedEmail)
          .maybeSingle()
        // 판매자 계정은 이메일/비밀번호 로그인만 허용한다.
        if (existing?.role === "SELLER") return false
        if (existing?.status === "SUSPENDED" && (!existing.suspendedUntil || new Date(existing.suspendedUntil) > new Date())) return false
        if (existing) {
          // 소셜 공급자의 id로 기존 사용자 PK를 덮어쓰면 주문·리뷰 관계가 깨질 수 있다.
          await supabaseAdmin.from("User").update({ name: user.name, image: user.image }).eq("id", existing.id)
          user.id = existing.id
        } else {
          await supabaseAdmin.from("User").insert({ id: user.id ?? normalizedEmail, email: normalizedEmail, name: user.name, image: user.image })
        }
      }
      return true
    },
    jwt: async ({ token, user, trigger, session }) => {
      // 닉네임 변경 시 클라이언트의 update({ name }) 호출로 토큰 갱신
      if (trigger === "update" && session?.name) {
        token.name = session.name as string
      }
      if (user) token.id = user.id
      // 역할과 판매자 상태는 매번 DB에서 최신값을 읽는다.
      if (token.email) {
        const { data } = await supabaseAdmin
          .from("User")
          .select("id, isAdmin, role, status, suspendedUntil, passwordResetRequired, Seller(status)")
          .eq("email", token.email as string)
          .maybeSingle()
        const seller = Array.isArray(data?.Seller) ? data?.Seller[0] : data?.Seller
        token.role = data?.role ?? (data?.isAdmin ? "ADMIN" : "CUSTOMER")
        token.sellerStatus = seller?.status ?? null
        token.isAdmin = token.role === "ADMIN"
        token.accountStatus = data?.status ?? "ACTIVE"
        token.passwordResetRequired = data?.passwordResetRequired ?? false
        // 소셜 로그인의 provider id가 signIn 콜백에서 실제 DB id로 교체됐을 수 있으니,
        // 매 요청마다 DB에서 조회한 실제 값으로 다시 맞춰준다 (그렇지 않으면 주문 등에서 FK 위반 발생)
        if (data?.id) token.id = data.id
      }
      return token
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: (token.role as string) ?? "CUSTOMER",
        sellerStatus: (token.sellerStatus as string | null) ?? null,
        isAdmin: token.role === "ADMIN",
        accountStatus: (token.accountStatus as string) ?? "ACTIVE",
        passwordResetRequired: Boolean(token.passwordResetRequired),
      },
    }),
  },
})

export const { handlers: { GET, POST }, auth, signIn, signOut } = nextAuth
