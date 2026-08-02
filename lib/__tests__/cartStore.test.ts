import { describe, expect, it } from "vitest"
import { migrateCartState } from "@/store/cartStore"

// version 0 시절 localStorage에 저장되던 형태 (activeUserId / savedCarts 없음)
const v0Item = {
  id: "item-1",
  productId: "prod-1",
  quantity: 2,
  product: {
    id: "prod-1",
    name: "장미 다발",
    price: 30000,
    images: ["https://example.com/rose.jpg"],
    stock: 5,
  },
}

describe("migrateCartState", () => {
  it("v0 저장 데이터의 장바구니 항목을 그대로 보존한다", () => {
    const migrated = migrateCartState({ items: [v0Item] })

    expect(migrated.items).toEqual([v0Item])
  })

  it("v0에 없던 신규 필드를 기본값으로 채운다", () => {
    const migrated = migrateCartState({ items: [v0Item] })

    expect(migrated.activeUserId).toBeNull()
    expect(migrated.savedCarts).toEqual({})
  })

  it("저장 데이터가 비었거나 없어도 안전한 초기 상태를 돌려준다", () => {
    expect(migrateCartState(undefined)).toEqual({
      items: [],
      activeUserId: null,
      savedCarts: {},
    })
    expect(migrateCartState({})).toEqual({
      items: [],
      activeUserId: null,
      savedCarts: {},
    })
  })

  it("이미 v2 형태인 데이터는 값을 덮어쓰지 않는다", () => {
    const v2 = {
      items: [v0Item],
      activeUserId: "user-1",
      savedCarts: { "user-1": [v0Item] },
    }

    expect(migrateCartState(v2)).toEqual(v2)
  })
})
