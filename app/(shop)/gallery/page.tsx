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

const PAGE_SIZE = 20

export default function GalleryPage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadPage = async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bouquet-posts?limit=${PAGE_SIZE}&page=${p}`)
      const data = await res.json()
      const fetched: Post[] = data.posts ?? []
      setPosts((prev) => p === 1 ? fetched : [...prev, ...fetched])
      setHasMore(fetched.length === PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPage(1) }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    loadPage(next)
  }

  const canManage = (post: Post) =>
    !!session?.user && (session.user.id === post.userId || session.user.isAdmin)

  const deletePost = async (postId: string) => {
    if (!confirm("이 후기를 삭제할까요?")) return
    const res = await fetch(`/api/bouquet-posts/${postId}`, { method: "DELETE" })
    if (res.ok) loadPage(1)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">🖼️ 꽃다발 갤러리</h1>
        <p className="text-stone-500 text-sm mb-4">
          손님들이 만든 꽃다발 모음 · 마음에 드는 조합 그대로 만들 수 있어요
        </p>
        <Link
          href="/diy"
          className="inline-block px-6 py-2.5 rounded-full bg-rose-400 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
        >
          💐 나만의 꽃다발 만들기
        </Link>
      </div>

      {loading && posts.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-stone-50 rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-stone-400 text-sm">
          아직 공유된 꽃다발이 없어요. 첫 번째로 공유해보세요!
        </div>
      ) : (
        <>
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
                        <Link href={`/custom?edit=${post.id}`} className="text-[10px] text-stone-400 hover:text-rose-500">
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

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-3 rounded-full border border-stone-200 text-stone-600 hover:border-rose-300 hover:text-rose-500 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
