import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export type AppRole = "CUSTOMER" | "SELLER" | "ADMIN"
export type SellerStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED"

export async function getCurrentActor() {
  const session = await auth()
  if (!session?.user?.email) return null

  const { data: user } = await supabaseAdmin
    .from("User")
    .select("id, email, role, isAdmin, Seller(id, status)")
    .eq("email", session.user.email)
    .maybeSingle()

  if (!user) return null
  const seller = Array.isArray(user.Seller) ? user.Seller[0] : user.Seller

  return {
    id: user.id as string,
    email: user.email as string,
    role: (user.role ?? (user.isAdmin ? "ADMIN" : "CUSTOMER")) as AppRole,
    seller: seller ? { id: seller.id as string, status: seller.status as SellerStatus } : null,
  }
}

export async function requireAdmin() {
  const actor = await getCurrentActor()
  return actor?.role === "ADMIN" ? actor : null
}

export async function requireSeller(approved = false) {
  const actor = await getCurrentActor()
  if (actor?.role !== "SELLER" || !actor.seller) return null
  if (approved && actor.seller.status !== "APPROVED") return null
  return actor
}
