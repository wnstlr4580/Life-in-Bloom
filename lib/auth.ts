import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import KakaoProvider from "next-auth/providers/kakao"
import NaverProvider from "next-auth/providers/naver"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"
import { SOCIAL_PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/socialEmail"

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
      // scope를 지정하지 않는다 — 콘솔 [카카오 로그인 > 동의항목]에 켜 둔 항목만 받아 온다.
      // 콘솔에 없는 항목을 scope로 요청하면 카카오가 로그인 자체를 막는다(KOE205).
      // 이메일(account_email)은 비즈 앱 전환 전이라 못 받으므로 signIn 콜백에서 회원번호로 대체 이메일을 만든다.
      // 닉네임이 안 켜져 있으면 이름이 비어 오므로 signIn 콜백에서 기본 이름을 붙인다.
    })
  )
}

// 네이버: Naver Developers 애플리케이션의 Client ID/Secret.
// 콘솔 [API 설정]에서 '이메일 주소'(필수)·'별명'·'프로필 사진'을 제공 정보로 선택하고,
// Callback URL에 {배포도메인}/api/auth/callback/naver 를 등록해야 한다.
// 검수 전(개발 중)에는 [멤버관리]에 등록한 네이버 아이디만 로그인된다.
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
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
  // 로그인 오류를 Auth.js 기본 영어 오류 페이지 대신 우리 로그인 화면(?error=코드)으로 보낸다.
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn: async ({ user, account }) => {
      if (!supabaseAdmin) return true
      // 소셜 공급자가 이메일을 주지 않으면(카카오 비즈 앱 전환 전 등) 공급자 회원번호로
      // 고유한 대체 이메일을 만든다. 우리 서비스는 이메일로 회원을 구분하므로 이게 있어야
      // DB의 User 행과 세션이 연결된다(없으면 주문 등에서 FK 위반).
      // 실제 메일 발송에는 쓸 수 없는 주소라 SOCIAL_PLACEHOLDER_EMAIL_DOMAIN으로 구분한다.
      if (!user.email && account && account.provider !== "credentials" && account.providerAccountId) {
        user.email = `${account.provider}_${account.providerAccountId}@${SOCIAL_PLACEHOLDER_EMAIL_DOMAIN}`
      }
      if (!user.email) return account?.provider === "credentials" ? true : "/login?error=NoEmailFromProvider"
      if (account?.provider !== "credentials") {
        const provider = account?.provider ?? "unknown"
        const normalizedEmail = user.email.toLowerCase().trim()
        user.email = normalizedEmail
        const { data: existing, error: lookupError } = await supabaseAdmin
          .from("User")
          .select("id, image, role, status, suspendedUntil")
          .eq("email", normalizedEmail)
          .maybeSingle()
        if (lookupError) {
          console.error(`[auth] ${provider} 로그인 — 회원 조회 실패:`, lookupError)
          return "/login?error=SocialSignupFailed"
        }
        // 판매자 계정은 이메일/비밀번호 로그인만 허용한다 (사업자 인증·정산 계정이라 소셜 연동 안 함).
        if (existing?.role === "SELLER") return "/login?error=SellerUseEmail"
        if (existing?.status === "SUSPENDED" && (!existing.suspendedUntil || new Date(existing.suspendedUntil) > new Date())) return false
        if (existing) {
          // 이미 가입한 회원 → 로그인. 소셜 공급자의 id로 기존 PK를 덮어쓰면 주문·리뷰 관계가 깨지므로
          // 세션 id를 DB의 id로 맞춘다. 사이트에서 바꾼 닉네임은 유지하고, 프로필 사진만 비어 있으면 채운다.
          if (!existing.image && user.image) {
            await supabaseAdmin.from("User").update({ image: user.image }).eq("id", existing.id)
          }
          user.id = existing.id
          console.log(`[auth] ${provider} 로그인 — 기존 회원`)
        } else {
          // 처음 온 소셜 계정 → 일반 회원으로 자동 가입. 실패하면 세션만 생기고 DB 회원이 없는
          // 어정쩡한 상태가 되므로 로그인을 막고 원인을 로그로 남긴다.
          const newId = user.id ?? crypto.randomUUID()
          // 공급자가 닉네임을 주지 않은 경우(카카오 동의항목 미설정 등) 기본 이름 — 마이페이지에서 바꿀 수 있다
          const PROVIDER_NAME: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글" }
          if (!user.name) user.name = `${PROVIDER_NAME[provider] ?? "SNS"} 회원`
          const { error: insertError } = await supabaseAdmin
            .from("User")
            .insert({ id: newId, email: normalizedEmail, name: user.name, image: user.image })
          if (insertError) {
            console.error(`[auth] ${provider} 가입 — 회원 생성 실패:`, insertError)
            return "/login?error=SocialSignupFailed"
          }
          user.id = newId
          console.log(`[auth] ${provider} 가입 — 새 회원 생성`)
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
      // signIn 콜백에서 만든 대체 이메일이 토큰에 확실히 실리도록 한다(아래 DB 조회의 키)
      if (user?.email) token.email = user.email
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
