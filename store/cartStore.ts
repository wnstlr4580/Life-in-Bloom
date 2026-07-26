import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartItem {
  id: string
  productId: string
  quantity: number
  composition?: {
    sizeId: string
    mainFlowerId: string | null
    additionalFlowerIds: string[]
    wrappingId: string
  }
  fulfillment?: {
    sellerId: string
    sellerName: string
    orderMode: "diy" | "custom"
    supportsPickup: boolean
    supportsDelivery: boolean
    deliveryScope?: "NONE" | "NATIONWIDE" | "REGIONAL"
    deliveryRegions?: string[]
  }
  previewImageUrl?: string
  product: {
    id: string
    name: string
    price: number
    images: string[]
    stock: number
  }
}

interface CartStore {
  items: CartItem[]
  activeUserId: string | null
  savedCarts: Record<string, CartItem[]>
  setActiveUser: (userId: string | null) => void
  setItems: (items: CartItem[]) => void
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clear: () => void
  totalCount: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      activeUserId: null,
      savedCarts: {},

      setActiveUser: (userId) => set((state) => {
        if (state.activeUserId === userId) return state
        const savedCarts = { ...state.savedCarts }
        if (state.activeUserId) savedCarts[state.activeUserId] = state.items
        return {
          activeUserId: userId,
          savedCarts,
          items: userId ? (savedCarts[userId] ?? []) : [],
        }
      }),

      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      clear: () => set({ items: [] }),

      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    { name: "cart", version: 2 }
  )
)
