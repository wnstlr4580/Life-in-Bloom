import { config } from "dotenv"
import iconv from "iconv-lite"
import pg from "pg"
import fs from "node:fs/promises"
import path from "node:path"
import { list, put } from "@vercel/blob"

config({ path: ".env.local" })
config()

const ORIGIN = "https://www.e-kflower.com"
const CATEGORIES = [
  { code: "|103|", source: "NH생생화환[축하]", category: "wreath", useTags: ["축하"] },
  { code: "|3|", source: "일반축하화환", category: "wreath", useTags: ["축하"] },
  { code: "|104|", source: "NH생생화환[근조]", category: "wreath", useTags: ["추모"] },
  { code: "|4|", source: "일반근조화환", category: "wreath", useTags: ["추모"] },
  { code: "|11|", source: "K플라워박스", category: "bouquet", useTags: [] },
  { code: "|2|", source: "꽃다발", category: "bouquet", useTags: [] },
  { code: "|1|", source: "꽃바구니", category: "basket", useTags: [] },
  { code: "|5|", source: "동양란", category: "orchid", useTags: [] },
  { code: "|6|", source: "서양란", category: "orchid", useTags: [] },
]

async function html(url) {
  const response = await fetch(url, { headers: { "user-agent": "Life-in-Bloom authorized competition catalog sync/1.0" } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return iconv.decode(Buffer.from(await response.arrayBuffer()), "euc-kr")
}
function absolute(url) {
  if (!url) return ""
  return new URL(url.replaceAll("&amp;", "&"), ORIGIN).href
}
function text(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replaceAll("&nbsp;", " ").replace(/\s+/g, " ").trim()
}
function productName(value) {
  return text(String(value ?? "").replace(/<(축하|근조)>/g, "$1 "))
}

let blobImageUrls
async function getBlobImageUrls() {
  if (blobImageUrls) return blobImageUrls
  blobImageUrls = new Map()
  let cursor
  do {
    const page = await list({ prefix: "partners/kflower/", cursor, limit: 1000 })
    for (const blob of page.blobs) {
      const gid = blob.pathname.match(/\/(\d+)(?:-[^/]*)?\.jpg$/)?.[1]
      if (gid && !blobImageUrls.has(gid)) blobImageUrls.set(gid, blob.url)
    }
    cursor = page.cursor
  } while (cursor)
  return blobImageUrls
}

async function saveThumbnail(gid, sourceUrl, categoryCode) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const existing = (await getBlobImageUrls()).get(gid)
    if (existing) return existing
  }
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Life-in-Bloom authorized catalog sync)",
      referer: `${ORIGIN}/kflower/_prozn/_system/shop/list.php?ca=${encodeURIComponent(categoryCode)}`,
    },
  })
  if (!response.ok) throw new Error(`썸네일 다운로드 실패: ${response.status} ${sourceUrl}`)
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.startsWith("image/")) throw new Error(`이미지 응답이 아닙니다: ${sourceUrl}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`partners/kflower/${gid}.jpg`, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType.split(";")[0],
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    })
    ;(await getBlobImageUrls()).set(gid, blob.url)
    return blob.url
  }
  const directory = path.join("public", "partners", "kflower")
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, `${gid}.jpg`), bytes)
  return `/partners/kflower/${gid}.jpg`
}

async function discoverListUrl(categoryCode) {
  const shellUrl = `${ORIGIN}/kflower/_prozn/_system/shop/list.php?ca=${encodeURIComponent(categoryCode)}`
  const source = await html(shellUrl)
  const iframe = [...source.matchAll(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absolute(match[1]))
    .find((url) => /list_\.php/i.test(url) && /[?&]glevel=1(?:&|$)/.test(url))
  return iframe || shellUrl
}

function parseCards(source, mapping) {
  const cards = []
  const links = [...source.matchAll(/name=["']?gid\[\]["']?\s+value=["']([^"']+)/gi)]
  for (const match of links) {
    const gid = match[1]
    if (!gid || cards.some((item) => item.gid === gid)) continue
    const index = match.index ?? 0
    const chunk = source.slice(index, index + 2600)
    const image = `${ORIGIN}/_prozn/_data/ykmall/picture/${gid}/${gid}A_200.jpg`
    const name = productName(chunk.match(/<span[^>]*font-size\s*:\s*13px[^>]*>([\s\S]*?)<\/span>/i)?.[1])
    const price = Number((chunk.match(/([1-9][0-9]{1,2}(?:,[0-9]{3})+)\s*원/)?.[1] || "0").replaceAll(",", ""))
    cards.push({ gid, ...mapping, name, price, externalUrl: `${ORIGIN}/kflower/_prozn/_system/shop/view.php?gid=${encodeURIComponent(gid)}`, listImage: image })
  }
  return cards
}

function detailData(source, item) {
  const title = text(
    source.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ||
    source.match(/<h[1-4][^>]*class=["'][^"']*(?:name|title|goods)[^"']*["'][^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1] ||
    source.match(/(?:상품명|제품명)[\s\S]{0,300}?<[^>]+>([\s\S]{1,150}?)<\//i)?.[1]
  ) || item.name
  const ogImage = source.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
  const imageCandidates = [ogImage, ...[...source.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1])]
    .filter(Boolean).map(absolute).filter((url) => /\/_prozn\/_data\/.+\.(?:jpg|jpeg|png|gif)(?:\?|$)/i.test(url))
  const priceMatches = [...source.matchAll(/(?:판매가|판매가격|price)[\s\S]{0,220}?([0-9][0-9,]{2,})\s*원/gi)]
  const loosePrices = [...source.matchAll(/([1-9][0-9]{1,2}(?:,[0-9]{3})+)\s*원/g)]
  const price = Number((priceMatches[0]?.[1] || loosePrices[0]?.[1] || String(item.price || 0)).replaceAll(",", ""))
  const description = text(source.match(/(?:상품설명|제품설명)[\s\S]{0,300}?<\/[^>]+>([\s\S]{1,1000}?)(?:배송정보|교환|환불|<iframe)/i)?.[1]).slice(0, 800)
  const allImages = [...new Set([item.listImage, ...imageCandidates].filter((url) => /\/_prozn\/_data\//i.test(String(url))))]
  const ownImages = allImages.filter((url) => String(url).includes(`/${item.gid}/`))
  return { ...item, name: title, price, images: (ownImages.length ? ownImages : allImages).slice(0, 3), description }
}

async function main() {
  const discovered = []
  for (const mapping of CATEGORIES) {
    const listUrl = await discoverListUrl(mapping.code)
    let categoryCount = 0
    for (let page = 1; page <= 30; page++) {
      const pageUrl = `${listUrl}${listUrl.includes("?") ? "&" : "?"}page=${page}`
      const cards = parseCards(await html(pageUrl), mapping)
      const fresh = cards.filter((card) => !discovered.some((item) => item.gid === card.gid))
      if (!cards.length || (page > 1 && !fresh.length)) break
      discovered.push(...fresh)
      categoryCount += fresh.length
    }
    console.log(`${mapping.source} ${mapping.code} -> ${categoryCount}개`)
  }
  const unique = [...new Map(discovered.map((item) => [item.gid, item])).values()]
  const products = []
  for (const discoveredItem of unique) {
    const item = !discoveredItem.name
      ? detailData(await html(discoveredItem.externalUrl), discoveredItem)
      : discoveredItem
    if (!item.name || item.price <= 0 || !item.listImage) {
      console.warn(`제외: ${item.source} / ${item.gid} / name="${item.name}" / price=${item.price}`)
      continue
    }
    const localImage = await saveThumbnail(item.gid, item.listImage, item.code)
    products.push({
      ...item,
      images: [localImage],
      description: `한국화훼농협 케이플라워 ${item.source} 상품입니다.`,
    })
  }
  if (!products.length) throw new Error("정상적으로 파싱된 상품이 없습니다.")
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query("BEGIN")
    await client.query(`DELETE FROM "Product" WHERE "purchaseType" = 'EXTERNAL' AND "partnerName" = '한국화훼농협'`)
    for (const product of products) {
      await client.query(`
        INSERT INTO "Product" (
          "id","name","description","price","stock","category","images","ohaengTags","seasonTags","colorTags","useTags",
          "deliveryDays","saleStatus","isActive","purchaseType","externalUrl","partnerName","partnerBadge"
        ) VALUES ($1,$2,$3,$4,9999,$5,$6,'{}','{}','{}',$7,'{}','ON_SALE',true,'EXTERNAL',$8,'한국화훼농협','공식 제휴 · 케이플라워')
        ON CONFLICT ("id") DO UPDATE SET
          "name"=EXCLUDED."name","description"=EXCLUDED."description","price"=EXCLUDED."price",
          "category"=EXCLUDED."category","images"=EXCLUDED."images","useTags"=EXCLUDED."useTags","externalUrl"=EXCLUDED."externalUrl",
          "purchaseType"='EXTERNAL',"partnerName"='한국화훼농협',"partnerBadge"='공식 제휴 · 케이플라워',
          "saleStatus"='ON_SALE',"isActive"=true
      `, [`kflower-${product.gid}`, product.name, product.description || "한국화훼농협 케이플라워 공식 판매 상품입니다.", product.price, product.category, product.images, product.useTags, product.externalUrl])
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally { await client.end() }
  console.log(`완료: 발견 ${unique.length}개 / 등록·갱신 ${products.length}개`)
}

await main()
