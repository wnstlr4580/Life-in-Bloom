import { redirect } from "next/navigation"

// 나만의 꽃다발 만들기는 /diy 한 화면으로 통합했다.
// 예전 링크(?flowers=, ?post=, ?review=)가 깨지지 않도록 쿼리를 그대로 넘긴다.
export default async function CustomPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams()
  Object.entries(await searchParams).forEach(([key, value]) => {
    ;(Array.isArray(value) ? value : value === undefined ? [] : [value]).forEach((item) => params.append(key, item))
  })
  const query = params.toString()
  redirect(query ? `/diy?${query}` : "/diy")
}
