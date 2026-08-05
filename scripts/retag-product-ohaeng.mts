// Product.ohaengTags를 현재 규칙(lib/product-ohaeng)으로 재계산한다.
//
// 태깅 규칙이 바뀌면 이미 저장된 태그는 새 규칙과 어긋난다. 재계산하지 않으면 앞으로 등록되는
// 상품과 기존 상품이 서로 다른 규칙으로 같은 오행 필터(/products?ohaeng=)에 섞인다.
// prisma/seed.ts의 수기 ohaengTags도 새 규칙과 다르므로, 시드를 새로 돌린 뒤에도 한 번 실행할 것.
//
//   npx tsx scripts/retag-product-ohaeng.mts          # 미리보기(바꿀 내용만 출력, 쓰지 않음)
//   npx tsx scripts/retag-product-ohaeng.mts --apply   # 실제 반영
//
// 앱과 같은 Supabase REST(service role)로 접근한다. 다른 스크립트들이 쓰는 pg 직접 접속
// (DIRECT_URL)은 현재 이 프로젝트에서 호스트가 해석되지 않는다 — 앱 경로와 같은 통로를 쓴다.
// REST는 트랜잭션이 없으므로 --apply는 행 단위로 갱신한다. 중간에 끊기면 다시 실행하면 된다
// (같은 입력에 같은 결과를 내므로 멱등하다).
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { classifyProductOhaeng } from "../lib/product-ohaeng"

dotenv.config({ path: ".env.local", quiet: true })

const apply = process.argv.includes("--apply")
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.")

const supabase = createClient(url, key)
const PAGE = 1000

interface Row {
  id: string
  name: string
  category: string | null
  description: string | null
  colorTags: string[] | null
  seasonTags: string[] | null
  ohaengTags: string[] | null
}

const products: Row[] = []
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from("Product")
    .select("id, name, category, description, colorTags, seasonTags, ohaengTags")
    .order("name")
    .range(from, from + PAGE - 1)
  if (error) throw new Error(`상품을 읽지 못했습니다: ${error.message}`)
  if (!data?.length) break
  products.push(...(data as Row[]))
  if (data.length < PAGE) break
}

const changed = products
  .map((p) => ({
    row: p,
    next: classifyProductOhaeng({
      name: p.name, category: p.category, description: p.description,
      colorTags: p.colorTags ?? [], seasonTags: p.seasonTags ?? [],
    }),
  }))
  .filter(({ row, next }) => next.join(",") !== (row.ohaengTags ?? []).join(","))

let failed = 0
for (const { row, next } of changed) {
  console.log(`${row.name} : [${row.ohaengTags ?? []}] → [${next}]`)
  if (!apply) continue
  const { error } = await supabase.from("Product").update({ ohaengTags: next }).eq("id", row.id)
  if (error) {
    failed += 1
    console.error(`  ✗ ${row.id}: ${error.message}`)
  }
}

console.log(JSON.stringify({ total: products.length, changed: changed.length, applied: apply, failed }))
if (failed) process.exitCode = 1
