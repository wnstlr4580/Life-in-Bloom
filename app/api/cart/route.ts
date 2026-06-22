import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: { id: true, name: true, price: true, images: true, stock: true },
      },
    },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { productId, quantity = 1 } = await req.json()

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { userId: session.user.id, productId, quantity },
    include: {
      product: { select: { id: true, name: true, price: true, images: true } },
    },
  })

  return NextResponse.json(item)
}
