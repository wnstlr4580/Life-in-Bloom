import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      role: "CUSTOMER" | "SELLER" | "ADMIN"
      sellerStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | null
      accountStatus: string
      passwordResetRequired: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isAdmin?: boolean
    role?: "CUSTOMER" | "SELLER" | "ADMIN"
    sellerStatus?: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | null
    accountStatus?: string
    passwordResetRequired?: boolean
  }
}
