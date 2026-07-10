"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { FLOWERS, SIZES, WRAPPING } from "@/lib/customFlowers"

interface Composition {
  sizeId: string
  mainFlowerId: string | null
  additionalFlowerIds: string[]
  wrappingId: string
}

interface Post {
  id: string
  userId: string | null
  authorName: string | null
  imageUrl: string
  composition: Composition
  content: string | null
  derivedOrderCount: number
  createdAt: string
}

function compositionSummary(c: Composition): string {
  const size = SIZES.find((s) => s.id === c.sizeId)
  const wrap = WRAPPING.find((w) => w.id === c.wrappingId)
  const flowers = [c.mainFlowerId, ...(c.additionalFlowerIds ?? [])]
    .filter(Boolean)
    .map((id) => FLOWERS.find((f) => f.id === id))
    .filter(Boolean)
    .map((f) => `${f!.emoji}${f!.name}`)
  return [size ? `${size.name} 사이즈` : null, ...flowers.slice(0, 3), flowers.length > 3 ? `외 ${flowers.length - 3}종` : null, wrap?.name]
    .filter(Boolean)
    .join(" · ")
}

export function BouquetGallery() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch("/api/bouquet-posts")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const canManage = (post: Post) =>
    !!session?.user && (session.user.id === post.userId || session.user.isAdmin)

  const deletePost = async (postId: string) => {
    if (!confirm("이 후기를 삭제할까요?")) return
    const res = await fetch(`/api/bouquet-posts/${postId}`, { method: "DELETE" })
    if (res.ok) load()
  }

  if (!loading && posts.length === 0) {
    return (
      <section id="bouquet-gallery" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-3">📸 손님들이 만든 꽃다발</h2>
          <p className="text-stone-500 text-sm mb-6">
            첫 후기의 주인공이 되어보세요. 다른 분이 내 조합 그대로 구매하면 500포인트를 드려요!
          </p>
          <Link href="/custom" className="inline-block px-6 py-3 rounded-full bg-rose-400 hover:bg-rose-500 text-white text-sm font-semibold transition-colors">
            💐 꽃다발 만들러 가기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="bouquet-gallery" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-stone-800 mb-2">📸 손님들이 만든 꽃다발</h2>
          <p className="text-stone-500 text-sm">
            마음에 드는 조합이 있다면 그대로 만들 수 있어요 · 내 조합이 팔리면 500포인트 적립
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-stone-50 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-rose-200 hover:shadow-lg transition-all flex flex-col">
                <div className="aspect-square bg-stone-50 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.imageUrl} alt="손님이 만든 꽃다발" className="w-full h-full object-cover" />
                  {post.derivedOrderCount > 0 && (
                    <span className="absolute top-2 left-2 bg-rose-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      🔥 {post.derivedOrderCount}명이 따라 만들었어요
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-stone-700">{post.authorName ?? "꽃 애호가"}</p>
                    {canManage(post) && (
                      <div className="flex gap-1.5">
                        <Link
                          href={`/custom?edit=${post.id}`}
                          className="text-[10px] text-stone-400 hover:text-rose-500 flex items-center gap-0.5"
                          aria-label="후기 수정"
                        >
                          ✏️ 수정
                        </Link>
                        <button onClick={() => deletePost(post.id)} className="text-[10px] text-stone-400 hover:text-red-500">
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {post.content && <p className="text-xs text-stone-500 line-clamp-2">{post.content}</p>}

                  <p className="text-[10px] text-stone-400 line-clamp-2">{compositionSummary(post.composition)}</p>
                  <Link
                    href={`/custom?post=${post.id}`}
                    className="mt-auto text-center text-xs font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg py-2 transition-colors"
                  >
                    이 조합 그대로 만들기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
