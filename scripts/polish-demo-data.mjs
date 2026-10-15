// 시연 데이터 다듬기 (여러 번 실행해도 같은 결과)
//   1) "[발표 시연용] 가상 상품", "테스트용", "시연_하늘" 같은 표시를 자연스러운 문구로 바꾼다
//   2) 테스트 꽃집 10곳에 꽃다발 후기를 1건씩 넣는다 (주문제작 6 / 직접 만들기 4)
// 실행: node scripts/polish-demo-data.mjs          → 미리보기
//       node scripts/polish-demo-data.mjs --apply  → 적용
import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local", quiet: true })

const USER_RENAMES = [["시연_하늘", "김하늘"], ["시연_도윤", "박도윤"], ["시연_서아", "윤서아"], ["시연_지우", "이지우"], ["시연_민서", "정민서"], ["시연_준호", "최준호"], ["시연고객", "김민지"]]

// [후기 key, 주문 방식, 사진, 상품명, 포장, 꽃 구성, 별점, 태그, 가격, 작성자, 본문]
const REVIEWS = [
  ["white", "custom", "/reviews/curated/white.png", "화이트 장미 안개꽃 꽃다발", "kraft", [["rose-white", 10], ["babysbreath-white", 4]], 5, ["포장이 꼼꼼해요", "선물하기 좋아요"], 47500, "송지아",
    "엄마 환갑 선물로 배송 주문했어요. 장미가 전부 하얀색이라 심심할까 걱정했는데 안개꽃을 넉넉히 넣어주셔서 풍성하고 단정해요. 받으시자마자 꽃병 찾으시더라고요. 크라프트지 접힌 모양도 예뻤어요."],
  ["white-diy", "diy", "/reviews/demo-white-rose-2.png", "흰 장미 직접 만들기 재료", "kraft", [["rose-white", 6], ["babysbreath-white", 3]], 4, ["직접 만들기 쉬워요", "신선해요"], 23000, "오세린",
    "퇴근길에 매장 들러서 흰 장미 6송이랑 안개꽃 조금 사서 집에서 묶어봤어요. 사장님이 줄기 끝 자르는 법이랑 묶는 위치를 알려주셔서 처음인데도 생각보다 쉬웠어요. 장미가 단단해서 일주일 넘게 갔어요."],
  ["tulip", "custom", "/reviews/curated/tulip.png", "주황 튤립 보라 아네모네 꽃다발", "linen", [["tulip-orange", 10], ["anemone-purple", 8]], 5, ["색감이 예뻐요", "꽃이 풍성해요"], 61000, "김하늘",
    "친구 개업 축하로 픽업 주문했어요. 주황이랑 보라 조합이 사진보다 실물이 훨씬 화사해요. 린넨 포장이라 들고 다닐 때 꽃이 눌리지 않았고, 튤립이 다음 날 더 활짝 피었다고 연락 왔어요."],
  ["tulip-diy", "diy", "/reviews/demo-tulip-2.png", "튤립 아네모네 직접 만들기 재료", "kraft", [["tulip-orange", 5], ["anemone-purple", 3], ["tulip-pink", 2]], 4, ["직접 만들기 쉬워요", "색감이 예뻐요"], 26500, "박도윤",
    "튤립이랑 아네모네 낱개로 사서 식탁에 꽂으려고 작게 묶었어요. 튤립은 하루만 지나도 고개가 휘어서 처음 묶을 때 조금 짧게 자르는 게 좋더라고요. 색이 선명해서 몇 송이 안 넣어도 화사해요."],
  ["calla", "custom", "/reviews/curated/calla.png", "화이트 카라 유칼립투스 꽃다발", "bouquet", [["calla-white", 7], ["eucalyptus", 3]], 5, ["사진과 같아요", "포장이 꼼꼼해요"], 52000, "윤서아",
    "결혼식 2부 때 들 꽃으로 주문했어요. 카라 줄기를 길게 살려서 깔끔하게 묶어주셨고 손잡이 리본도 단단해서 하루 종일 들고 있어도 풀리지 않았어요. 유칼립투스 향이 은은하게 나서 좋았습니다."],
  ["calla-diy", "diy", "/reviews/demo-calla-2.png", "카라 직접 만들기 재료", "bouquet", [["calla-white", 5], ["eucalyptus", 2]], 5, ["직접 만들기 쉬워요", "신선해요"], 24500, "이지우",
    "카라는 줄기가 곧아서 손으로 묶기 제일 쉬운 꽃 같아요. 다섯 송이에 유칼립투스 두 줄기만 넣고 리본으로 감았는데 그럴듯하게 나왔어요. 매장에서 리본도 같이 팔아서 한 번에 다 샀어요."],
  ["yellow", "custom", "/reviews/curated/yellow.png", "노란 장미 백합 꽃다발", "kraft", [["rose-yellow", 8], ["lily-white", 3], ["babysbreath-white", 2]], 5, ["꽃이 풍성해요", "선물하기 좋아요"], 58000, "정민서",
    "이직하는 동료 송별 선물로 회사로 배송받았어요. 노란 장미가 밝아서 분위기가 좋았고, 백합이 봉오리 상태로 와서 집에 가져가서 피우는 재미가 있다고 하더라고요. 배송 상자도 꼼꼼하게 고정돼 왔어요."],
  ["yellow-diy", "diy", "/reviews/demo-yellow-lily-2.png", "노란 장미 백합 직접 만들기 재료", "kraft", [["rose-yellow", 5], ["lily-white", 2]], 4, ["색감이 예뻐요", "직접 만들기 쉬워요"], 25000, "최준호",
    "백합은 꽃가루가 옷에 묻는다고 해서 사장님이 수술을 미리 떼 주셨어요. 장미 다섯 송이랑 같이 묶었더니 차에 두고 사진 찍기 딱 좋은 크기예요. 백합 향이 강해서 차 안이 꽃향기로 가득했어요."],
  ["sunflower", "custom", "/reviews/curated/sunflower.png", "해바라기 유칼립투스 꽃다발", "linen", [["sunflower", 7], ["eucalyptus", 3]], 5, ["색감이 예뻐요", "재구매하고 싶어요"], 49000, "한예린",
    "남편 승진 축하로 주문했는데 해바라기가 크고 싱싱해서 깜짝 놀랐어요. 꽃머리가 무거운데도 고개 안 숙이게 잘 잡아주셨어요. 다음 기념일에도 여기서 주문하려고요."],
  ["pink", "custom", "/reviews/presentation-ai-pink.jpg", "핑크 장미 감사 꽃다발", "kraft", [["rose-pink", 7], ["rose-white", 3], ["babysbreath-white", 3]], 5, ["사진과 같아요", "선물하기 좋아요"], 44000, "김민지",
    "스승의 날 선물로 매장 픽업했어요. 진한 핑크랑 연한 핑크 장미를 섞어서 그라데이션처럼 묶어주셨는데 너무 예뻐요. 픽업 시간에 맞춰 물올림까지 해두셔서 바로 드렸어요."],
]

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
await client.connect()
try {
  const { rows: sellers } = await client.query(`SELECT "id", "marketName", "offersCustomBouquet", "offersDiyFlowers", "isCoopMember", "isProfessionalFlorist" FROM "Seller" WHERE "id" LIKE 'diy-test-seller-%' AND "status" = 'APPROVED' ORDER BY "id"`)
  const used = new Set()
  // 조합원·플로리스트 꽃집이 후기를 먼저 갖도록 정렬하고, 같은 꽃집에 두 번 배정하지 않는다
  const ranked = [...sellers].sort((a, b) => Number(b.isCoopMember || b.isProfessionalFlorist) - Number(a.isCoopMember || a.isProfessionalFlorist))
  const plan = REVIEWS.map(([key, mode, ...rest]) => {
    const seller = ranked.find((s) => !used.has(s.id) && (mode === "custom" ? s.offersCustomBouquet : s.offersDiyFlowers))
    if (!seller) throw new Error(`${key}: 배정할 꽃집이 없어요`)
    used.add(seller.id)
    return { key, mode, seller, rest }
  })
  console.table(plan.map((p) => ({ 후기: p.key, 방식: p.mode, 꽃집: p.seller.marketName, 작성자: p.rest[7] })))
  const { rows: labels } = await client.query(`SELECT
    (SELECT COUNT(*)::int FROM "Product" WHERE "description" LIKE '%시연%' OR "description" LIKE '%가상 상품%' OR "description" LIKE '%테스트 완제품%') AS products,
    (SELECT COUNT(*)::int FROM "Seller" WHERE "introduction" LIKE '%테스트용%') AS sellers,
    (SELECT COUNT(*)::int FROM "User" WHERE "name" LIKE '시연%') AS users`)
  console.log("정리 대상:", labels[0])
  if (!process.argv.includes("--apply")) { console.log("미리보기만 했어요. 적용하려면 --apply 를 붙여 실행하세요."); process.exit(0) }

  await client.query("BEGIN")
  // 1) 시연·테스트 표시 정리
  await client.query(`UPDATE "Product" SET "description" = "name" || ' — 그날 들어온 싱싱한 꽃으로 정성껏 묶어 드려요.' WHERE "description" LIKE '%발표 시연용%' OR "description" LIKE '%가상 상품%'`)
  await client.query(`UPDATE "Product" SET "description" = replace("description", '매장마다 다르게 구성한 테스트 완제품입니다.', '계절 소재와 함께 풍성하게 묶은 꽃다발이에요.') WHERE "description" LIKE '%테스트 완제품%'`)
  await client.query(`UPDATE "Seller" SET "introduction" = '제철 꽃과 소재를 송이 단위로 판매하고, 고르신 꽃으로 꽃다발도 만들어 드려요.' WHERE "introduction" LIKE '%테스트용%'`)
  await client.query(`UPDATE "Review" SET "content" = '선물용으로 주문했는데 색감이 사진보다 더 예뻤어요. 포장도 꼼꼼하고 꽃이 싱싱해서 오래 갔어요.' WHERE "content" LIKE '%발표 시연용%' OR "content" LIKE '%가상 후기%'`)
  await client.query(`UPDATE "Order" SET "giftMessage" = regexp_replace("giftMessage", '^\\[시연\\]\\s*', '') WHERE "giftMessage" LIKE '[시연]%'`)
  await client.query(`UPDATE "Order" SET "shippingAddr" = "shippingAddr" || '{"name":"김민지","detailAddress":"101동 1203호","phone":"010-2481-7730","ordererPhone":"010-2481-7730"}'::jsonb WHERE "shippingAddr"->>'detailAddress' = '발표용 가상 배송지'`)
  await client.query(`UPDATE "OrderItem" SET "courier" = 'CJ대한통운', "trackingNumber" = '689012345678' WHERE "courier" = '시연택배'`)
  for (const [from, to] of USER_RENAMES) await client.query(`UPDATE "User" SET "name" = $2 WHERE "name" = $1`, [from, to])

  // 2) 꽃집별 후기
  for (const [index, { key, mode, seller, rest }] of plan.entries()) {
    const [image, name, wrapping, flowers, rating, tags, price, author, content] = rest
    const userId = `seed-review-user-${index + 1}`, productId = `seed-review-product-${key}`, orderId = `seed-review-order-${key}`, itemId = `seed-review-item-${key}`, reviewId = `seed-review-${key}`
    const composition = { sizeId: flowers.reduce((sum, [, q]) => sum + q, 0) > 15 ? "large" : "basic", wrappingId: wrapping, flowers: flowers.map(([id, quantity]) => ({ id, quantity })) }
    const daysAgo = 3 + index * 4
    const commission = Math.round(price * 0.1), vat = Math.round(commission * 0.1)
    await client.query(`INSERT INTO "User" ("id", "email", "name", "role", "status", "createdAt") VALUES ($1, $2, $3, 'CUSTOMER', 'ACTIVE', NOW() - interval '60 days')
      ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"`, [userId, `review${index + 1}@life-in-bloom.test`, author])
    await client.query(`INSERT INTO "Product" ("id", "sellerId", "name", "description", "price", "stock", "category", "images", "saleStatus", "isActive", "createdAt")
      VALUES ($1, $2, $3, $4, $5, 0, 'custom', $6, 'HIDDEN', false, NOW()) ON CONFLICT ("id") DO UPDATE SET "sellerId" = EXCLUDED."sellerId", "name" = EXCLUDED."name", "images" = EXCLUDED."images", "price" = EXCLUDED."price"`,
      [productId, seller.id, name, mode === "custom" ? "나만의 꽃다발 주문제작" : "나만의 꽃다발 직접 만들기 재료", price, [image]])
    await client.query(`INSERT INTO "Order" ("id", "userId", "status", "totalAmount", "shippingFee", "deliveryType", "shippingAddr", "paymentMethod", "createdAt")
      VALUES ($1, $2, 'DELIVERED', $3, 0, $4, $5::jsonb, 'CARD', NOW() - ($6 || ' days')::interval) ON CONFLICT ("id") DO NOTHING`,
      [orderId, userId, price, mode === "diy" || index % 3 === 2 ? "pickup" : "standard", JSON.stringify({ name: author, phone: "010-0000-0000", address: "서울", detailAddress: "" }), daysAgo + 2])
    await client.query(`INSERT INTO "OrderItem" ("id", "orderId", "productId", "sellerId", "quantity", "price", "itemType", "fulfillmentStatus", "commissionRate", "commissionFee", "commissionVat", "settlementAmount", "settlementStatus", "confirmedAt", "deliveredAt", "composition", "bouquetMode", "previewImageUrl")
      VALUES ($1, $2, $3, $4, 1, $5, 'CUSTOM_BOUQUET', 'PURCHASE_CONFIRMED', 10, $6, $7, $8, 'READY', NOW() - ($9 || ' days')::interval, NOW() - ($9 || ' days')::interval, $10::jsonb, $11, NULL)
      ON CONFLICT ("id") DO UPDATE SET "productId" = EXCLUDED."productId", "sellerId" = EXCLUDED."sellerId", "composition" = EXCLUDED."composition", "bouquetMode" = EXCLUDED."bouquetMode"`,
      [itemId, orderId, productId, seller.id, price, commission, vat, price - commission - vat, daysAgo, JSON.stringify(composition), mode])
    await client.query(`INSERT INTO "Review" ("id", "userId", "productId", "orderItemId", "rating", "content", "images", "tags", "orderMode", "composition", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW() - ($11 || ' days')::interval)
      ON CONFLICT ("id") DO UPDATE SET "productId" = EXCLUDED."productId", "rating" = EXCLUDED."rating", "content" = EXCLUDED."content", "images" = EXCLUDED."images", "tags" = EXCLUDED."tags", "orderMode" = EXCLUDED."orderMode", "composition" = EXCLUDED."composition", "isHidden" = false`,
      [reviewId, userId, productId, itemId, rating, content, [image], tags, mode, JSON.stringify(composition), daysAgo])
  }
  await client.query("COMMIT")
  console.log(`적용 완료: 표시 정리 + 꽃집 후기 ${plan.length}건`)
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  throw error
} finally {
  await client.end()
}
