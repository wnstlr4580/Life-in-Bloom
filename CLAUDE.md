# CLAUDE.md — 인생내꽃

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. 프로젝트 개요 (Project Overview)

**인생내꽃** — 꽃과 식물을 판매하는 감성 커머스 풀스택 웹 애플리케이션

### 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS + shadcn/ui |
| 상태 관리 | Zustand (클라이언트 상태, 장바구니 등) |
| 데이터베이스 | PostgreSQL (Vercel Postgres) |
| ORM | Prisma |
| 인증 | NextAuth.js v5 (카카오, 구글 소셜 로그인) |
| 파일 저장 | Vercel Blob (상품 이미지) |
| 결제 | 포트원 (PortOne) |
| 배포 | Vercel |

### 디렉토리 구조

```
인생내꽃/
├── app/
│   ├── (shop)/           # 쇼핑몰 레이아웃
│   │   ├── page.tsx      # 홈
│   │   ├── products/     # 상품 목록/상세
│   │   ├── cart/         # 장바구니
│   │   ├── checkout/     # 주문/결제
│   │   └── mypage/       # 마이페이지
│   ├── (admin)/          # 관리자 레이아웃
│   │   └── admin/
│   └── api/              # API Routes
│       ├── auth/         # NextAuth
│       ├── products/
│       ├── orders/
│       └── payment/
├── components/
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   ├── shop/             # 쇼핑몰 공통 컴포넌트
│   └── admin/            # 관리자 컴포넌트
├── lib/
│   ├── prisma.ts         # Prisma 클라이언트 싱글톤
│   ├── auth.ts           # NextAuth 설정
│   └── payment.ts        # 포트원 클라이언트
├── prisma/
│   └── schema.prisma
├── store/                # Zustand 스토어
└── types/                # 공통 TypeScript 타입
```

### 코딩 컨벤션

- 컴포넌트: PascalCase (`ProductCard.tsx`)
- 훅: camelCase with `use` prefix (`useCart.ts`)
- API 라우트: `app/api/[resource]/route.ts`
- 서버 컴포넌트 기본, 클라이언트 필요 시 `"use client"` 명시
- DB 접근은 항상 `lib/prisma.ts`의 싱글톤 인스턴스 사용
- 환경변수는 `.env.local`, 타입은 `env.d.ts`에 선언

### 주요 환경변수

```
DATABASE_URL          # PostgreSQL 연결 문자열
NEXTAUTH_SECRET       # NextAuth 시크릿
NEXTAUTH_URL          # 앱 URL
KAKAO_CLIENT_ID       # 카카오 OAuth
KAKAO_CLIENT_SECRET
GOOGLE_CLIENT_ID      # 구글 OAuth
GOOGLE_CLIENT_SECRET
PORTONE_API_KEY       # 포트원 결제
PORTONE_API_SECRET
BLOB_READ_WRITE_TOKEN # Vercel Blob
```

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
