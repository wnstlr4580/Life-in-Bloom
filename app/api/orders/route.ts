import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"
import { grantPointsOnce, POINT_POLICY } from "@/lib/points"

interface OrderItemInput {
  productId: string
  quantity: number
  price: number
  name?: string
  images?: string[]
  composition?: unknown
  previewImageUrl?: string | null
  fulfillment?: { orderMode?: "diy" | "custom" }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  if (session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "꽃 구매는 일반회원만 이용할 수 있습니다" }, { status: 403 })
  }

  const { items, totalAmount, shippingFee, deliveryType, shippingAddr, giftMessage, giftWrapping, paymentId, sourcePostId, sourceReviewId } = await req.json()

  if (!items?.length || !totalAmount || !deliveryType || !shippingAddr) {
    return NextResponse.json({ error: "필수 정보가 누락되었습니다" }, { status: 400 })
  }

  const orderId = nanoid()

  const { error: orderError } = await supabaseAdmin
    .from("Order")
    .insert({
      id: orderId,
      userId: session.user.id,
      totalAmount,
      shippingFee: shippingFee ?? 0,
      deliveryType,
      shippingAddr,
      giftMessage: giftMessage ?? null,
      giftWrapping: giftWrapping ?? false,
      qrCode: nanoid(12),
      status: paymentId ? "PAID" : "PENDING",
      paymentId: paymentId ?? null,
    })

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  // 커스텀 꽃다발은 클라이언트에서 생성한 임시 ID라 Product 테이블에 없음 — 먼저 upsert
  const customItems = (items as OrderItemInput[]).filter((i) => i.productId.startsWith("custom_") || i.productId.startsWith("diy_"))
  if (customItems.length > 0) {
    const { data: customSeller } = await supabaseAdmin
      .from("Seller").select("id").eq("status", "APPROVED").eq("isOpen", true).eq("offersCustomBouquet", true)
      .order("approvedAt", { ascending: true }).limit(1).maybeSingle()
    if (!customSeller) {
      await supabaseAdmin.from("Order").delete().eq("id", orderId)
      return NextResponse.json({ error: "현재 나만의 꽃다발 주문을 받을 수 있는 판매처가 없어요" }, { status: 409 })
    }
    await supabaseAdmin.from("Product").upsert(
      customItems.map((i) => ({
        id: i.productId,
        name: i.name ?? "커스텀 꽃다발",
        description: "커스텀 꽃다발",
        price: i.price,
        stock: 0,
        category: i.productId.startsWith("diy_") ? "diy" : "custom",
        images: (i.images ?? []).map((img) => img.startsWith("data:") ? "" : img).filter(Boolean),
        flowerMeaning: i.composition ? JSON.stringify(i.composition) : null,
        ohaengTags: [],
        seasonTags: [],
        colorTags: [],
        isActive: false,
        sellerId: customSeller.id,
      })),
      { onConflict: "id" }
    )
  }

  const productIds = (items as OrderItemInput[]).map((item) => item.productId)
  const { data: orderProducts } = await supabaseAdmin
    .from("Product")
    .select("id, sellerId, category")
    .in("id", productIds)
  const productMap = new Map((orderProducts ?? []).map((product) => [product.id, product]))
  const COMMISSION_RATE = 10

  const { error: itemsError } = await supabaseAdmin
    .from("OrderItem")
    .insert(
      (items as OrderItemInput[]).map((item) => {
        const product = productMap.get(item.productId)
        const gross = item.price * item.quantity
        const commissionFee = Math.round(gross * COMMISSION_RATE / 100)
        return {
          id: nanoid(), orderId, productId: item.productId, sellerId: product?.sellerId ?? null,
          quantity: item.quantity, price: item.price,
          itemType: product?.category === "custom" ? "CUSTOM_BOUQUET" : ["single-flower", "diy"].includes(product?.category ?? "") ? "DIY_FLOWER" : "FINISHED",
          fulfillmentStatus: paymentId ? "PAID" : "PENDING",
          commissionRate: COMMISSION_RATE, commissionFee, settlementAmount: gross - commissionFee,
          settlementStatus: "WAITING",
          previewImageUrl: item.previewImageUrl?.startsWith("data:") ? null : item.previewImageUrl ?? null,
          composition: item.composition ?? null,
          bouquetMode: item.fulfillment?.orderMode ?? (product?.category === "custom" ? "custom" : null),
        }
      })
    )

  if (itemsError) {
    await supabaseAdmin.from("Order").delete().eq("id", orderId)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  // 후기 갤러리의 조합을 그대로 구매한 경우 — 구매 횟수 증가 + 글쓴이 포인트 적립
  if (sourcePostId && typeof sourcePostId === "string") {
    const { data: post } = await supabaseAdmin
      .from("BouquetPost")
      .select("id, userId, derivedOrderCount")
      .eq("id", sourcePostId)
      .maybeSingle()
    if (post) {
      await supabaseAdmin
        .from("BouquetPost")
        .update({ derivedOrderCount: (post.derivedOrderCount ?? 0) + 1 })
        .eq("id", post.id)
      if (post.userId && post.userId !== session?.user?.id) {
        await grantPointsOnce({ userId: post.userId, amount: POINT_POLICY.REMAKE_SALE, reason: "REMAKE_SALE", referenceType: "Order", referenceId: orderId })
      }
    }
  }

  if (sourceReviewId && typeof sourceReviewId === "string") {
    const { data: review } = await supabaseAdmin.from("Review").select("id, userId, derivedOrderCount").eq("id", sourceReviewId).maybeSingle()
    if (review) {
      await supabaseAdmin.from("Review").update({ derivedOrderCount: (review.derivedOrderCount ?? 0) + 1 }).eq("id", review.id)
      if (review.userId && review.userId !== session.user.id) {
        await grantPointsOnce({ userId: review.userId, amount: POINT_POLICY.REMAKE_SALE, reason: "REMAKE_SALE", referenceType: "Order", referenceId: orderId })
      }
    }
  }

  if (paymentId) {
    await grantPointsOnce({ userId: session.user.id, amount: POINT_POLICY.PURCHASE, reason: "PURCHASE", referenceType: "Order", referenceId: orderId })
  }

  return NextResponse.json({ orderId }, { status: 201 })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, status, totalAmount, createdAt,
      items:OrderItem(
        id, quantity, price,
        fulfillmentStatus, confirmedAt, previewImageUrl, composition, bouquetMode,
        review:Review(id),
        product:Product(id, name, images, price, flowerMeaning)
      )
    `)
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}
