import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import KakaoProvider from "next-auth/providers/kakao"
import GoogleProvider from "next-auth/providers/google"

const providers: Provider[] = []

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
    jwt: ({ token, user }) => {
      if (user) token.id = user.id
      return token
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.id as string },
    }),
  },
})

export const { handlers: { GET, POST }, auth, signIn, signOut } = nextAuth
