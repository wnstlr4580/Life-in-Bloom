import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase"
import BouquetShareView from "./BouquetShareView"

interface Props {
  params: Promise<{ id: string }>
}

async function fetchPost(id: string) {
  const { data } = await supabaseAdmin
    .from("BouquetPost")
    .select("id, authorName, imageUrl, composition, content")
    .eq("id", id)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchPost(id)
  return {
    title: "인생내꽃 — 꽃다발 공유",
    openGraph: {
      title: "인생내꽃 — 꽃다발 공유",
      description: "AI로 만든 나만의 꽃다발이에요. 나도 만들어볼까요?",
      images: post?.imageUrl ? [{ url: post.imageUrl }] : [],
    },
  }
}

export default async function BouquetSharePage({ params }: Props) {
  const { id } = await params
  const post = await fetchPost(id)

  if (!post) {
    return (
      <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-6 py-10 text-center space-y-2">
        <p className="text-4xl">🥀</p>
        <p className="text-stone-500 text-sm">존재하지 않는 꽃다발이에요.</p>
      </div>
    )
  }

  return <BouquetShareView post={post} />
}
