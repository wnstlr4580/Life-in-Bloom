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
        .select("id, email, name, image, password")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle()

      if (!user?.password) return null
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) return null

      return { id: user.id, email: user.email, name: user.name, image: user.image }
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
    signIn: async ({ user }) => {
      if (!user.email || !supabaseAdmin) return true
      await supabaseAdmin.from("User").upsert(
        { id: user.id ?? user.email, email: user.email, name: user.name, image: user.image },
        { onConflict: "email", ignoreDuplicates: false }
      )
      return true
    },
    jwt: async ({ token, user, trigger, session }) => {
      // 닉네임 변경 시 클라이언트의 update({ name }) 호출로 토큰 갱신
      if (trigger === "update" && session?.name) {
        token.name = session.name as string
      }
      if (user) {
        token.id = user.id
        const { data } = await supabaseAdmin
          .from("User")
          .select("isAdmin")
          .eq("email", user.email ?? "")
          .maybeSingle()
        token.isAdmin = data?.isAdmin ?? false
      }
      return token
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.id as string, isAdmin: (token.isAdmin as boolean) ?? false },
    }),
  },
})

export const { handlers: { GET, POST }, auth, signIn, signOut } = nextAuth
