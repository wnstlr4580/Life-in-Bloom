import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()

const DISTRICTS = [
  ["종로구", "서울 종로구 종로 1", 37.5730, 126.9794],
  ["중구", "서울 중구 세종대로 110", 37.5663, 126.9779],
  ["용산구", "서울 용산구 녹사평대로 150", 37.5326, 126.9905],
  ["성동구", "서울 성동구 고산자로 270", 37.5633, 127.0371],
  ["광진구", "서울 광진구 자양로 117", 37.5384, 127.0822],
  ["동대문구", "서울 동대문구 천호대로 145", 37.5744, 127.0396],
  ["중랑구", "서울 중랑구 봉화산로 179", 37.6066, 127.0927],
  ["성북구", "서울 성북구 보문로 168", 37.5894, 127.0167],
  ["강북구", "서울 강북구 도봉로89길 13", 37.6396, 127.0257],
  ["도봉구", "서울 도봉구 마들로 656", 37.6688, 127.0471],
  ["노원구", "서울 노원구 노해로 437", 37.6542, 127.0568],
  ["은평구", "서울 은평구 은평로 195", 37.6027, 126.9291],
  ["서대문구", "서울 서대문구 연희로 248", 37.5791, 126.9368],
  ["마포구", "서울 마포구 월드컵로 212", 37.5662, 126.9016],
  ["양천구", "서울 양천구 목동동로 105", 37.5170, 126.8665],
  ["강서구", "서울 강서구 화곡로 302", 37.5509, 126.8496],
  ["구로구", "서울 구로구 가마산로 245", 37.4955, 126.8876],
  ["금천구", "서울 금천구 시흥대로73길 70", 37.4569, 126.8955],
  ["영등포구", "서울 영등포구 당산로 123", 37.5263, 126.8963],
  ["동작구", "서울 동작구 장승배기로 161", 37.5124, 126.9393],
  ["관악구", "서울 관악구 관악로 145", 37.4782, 126.9516],
  ["서초구", "서울 서초구 남부순환로 2584", 37.4837, 127.0324],
  ["강남구", "서울 강남구 학동로 426", 37.5173, 127.0473],
  ["송파구", "서울 송파구 올림픽로 326", 37.5145, 127.1059],
  ["강동구", "서울 강동구 성내로 25", 37.5301, 127.1238],
]

const NEARBY = [
  ["독립문 1km 꽃시장", "서울 서대문구 독립문로 14길 3", 37.5705, 126.9390],
  ["충정로 3km 플라워마켓", "서울 서대문구 신촌로 235", 37.5710, 126.9545],
  ["시청 5km 꽃도매", "서울 중구 세종대로 80", 37.5710, 126.9780],
]

const FLOWERS = [
  ["rose-red", "빨간 장미", "열렬한 사랑", "레드", "/flowers/red_rose.jpg", 3200],
  ["rose-pink", "핑크 장미", "행복한 사랑", "핑크", "/flowers/pink_rose.jpg", 3000],
  ["rose-white", "흰 장미", "순수한 사랑", "화이트", "/flowers/white_rose.jpg", 3100],
  ["tulip-pink", "핑크 튤립", "사랑의 시작", "핑크", "/flowers/pink_tulip.jpg", 2600],
  ["tulip-white", "흰 튤립", "새로운 시작", "화이트", "/flowers/white_tulip.jpg", 2500],
  ["tulip-purple", "보라 튤립", "영원한 사랑", "퍼플", "/flowers/purple_tulip.jpg", 2700],
  ["lily-white", "흰 백합", "순결", "화이트", "/flowers/white_lily.jpg", 3800],
  ["hydrangea-blue", "파란 수국", "진심", "블루", "/flowers/blue_hydrangea.jpg", 4300],
  ["carnation-red", "빨간 카네이션", "존경과 감사", "레드", "/flowers/red_carnation.jpg", 2100],
  ["carnation-pink", "핑크 카네이션", "감사", "핑크", "/flowers/pink_carnation.jpg", 2000],
  ["gerbera-yellow", "노란 거베라", "밝은 마음", "옐로", "/flowers/yellow_gerbera.jpg", 2400],
  ["gerbera-orange", "주황 거베라", "열정", "오렌지", "/flowers/orange_gerbera.jpg", 2500],
  ["babysbreath-white", "흰 안개꽃", "맑은 마음", "화이트", "/flowers/white_baby%27s_breath.jpg", 1600],
  ["sunflower", "해바라기", "동경", "옐로", "/flowers/yellow_sunflower.jpg", 2700],
  ["freesia", "프리지아", "새로운 출발", "옐로", "/flowers/yellow_freesia.jpg", 2200],
  ["eucalyptus", "유칼립투스", "추억", "그린", "/flowers/green_eucalyptus.jpg", 1900],
]

const allStores = [
  ...DISTRICTS.map(([district, address, latitude, longitude], index) => ({
    key: `district-${index + 1}`,
    name: `${district} ${["봄꽃상점", "꽃담마켓", "오늘의화원", "서울플라워랩", "푸른꽃집"][index % 5]}`,
    address, latitude, longitude, stockStart: index,
  })),
  ...NEARBY.map(([name, address, latitude, longitude], index) => ({
    key: `nearby-${index + 1}`, name, address, latitude, longitude, stockStart: 25 + index,
  })),
]

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

try {
  await client.query("BEGIN")
  for (const [index, store] of allStores.entries()) {
    const userId = `diy-test-user-${store.key}`
    const sellerId = `diy-test-seller-${store.key}`
    const email = `diy-${store.key}@life-in-bloom.test`
    const businessNumber = `999-${String(index + 1).padStart(2, "0")}-${String(10000 + index)}`

    await client.query(
      `INSERT INTO "User" ("id", "email", "name", "role", "createdAt")
       VALUES ($1, $2, $3, 'SELLER', NOW())
       ON CONFLICT ("id") DO UPDATE SET "email" = EXCLUDED."email", "name" = EXCLUDED."name", "role" = 'SELLER'`,
      [userId, email, store.name],
    )

    await client.query(
      `INSERT INTO "Seller"
       ("id", "userId", "status", "legalBusinessName", "businessNumber", "representativeName", "businessType",
        "businessCategory", "marketName", "sellerType", "managerName", "managerPhone", "publicPhone",
        "introduction", "businessLicensePath", "postalCode", "roadAddress", "detailAddress", "latitude", "longitude",
        "businessHours", "settlementBank", "settlementAccount", "settlementHolder", "sellsFinishedProducts",
        "offersCustomBouquet", "offersDiyFlowers", "isOpen", "termsVersion", "termsAgreedAt", "submittedAt", "approvedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 'APPROVED', $3, $4, $5, '소매업', '화훼', $3, 'FLOWER_SHOP', $5, $6, $6,
        $7, '/test/business-license.pdf', '00000', $8, '1층', $9, $10,
        $11::jsonb, '테스트은행', $12, $5, true, true, true, true, '2026-01', NOW(), NOW(), NOW(), NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET
        "marketName" = EXCLUDED."marketName", "roadAddress" = EXCLUDED."roadAddress", "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude", "offersDiyFlowers" = true, "offersCustomBouquet" = true,
        "sellsFinishedProducts" = true, "isOpen" = true, "status" = 'APPROVED', "updatedAt" = NOW()`,
      [
        sellerId, userId, store.name, businessNumber, `테스트대표${index + 1}`, `02-9${String(index).padStart(3, "0")}-1000`,
        `${store.name}의 테스트용 꽃과 소재 재고입니다.`, store.address, store.latitude, store.longitude,
        JSON.stringify({ mon: "09:00-19:00", sat: "10:00-17:00" }), `110-${String(100000 + index)}`,
      ],
    )

    const stockCount = 8 + (index % 7)
    for (let offset = 0; offset < stockCount; offset++) {
      const flower = FLOWERS[(store.stockStart + offset * 3) % FLOWERS.length]
      const [code, name, meaning, color, image, basePrice] = flower
      const price = basePrice + (index % 5) * 120 + offset * 25
      const quantity = 8 + ((index * 7 + offset * 11) % 53)
      const stockId = `${sellerId}-${code}`
      await client.query(
        `INSERT INTO "SellerStock"
         ("id", "sellerId", "flowerCode", "flowerName", "flowerMeaning", "color", "grade", "unit", "quantity",
          "unitPrice", "imageUrl", "availableForCustom", "availableForDiy", "isVisible", "isActive", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'STEM', $8, $9, $10, true, true, true, true, NOW())
         ON CONFLICT ("id") DO UPDATE SET "quantity" = EXCLUDED."quantity", "unitPrice" = EXCLUDED."unitPrice",
          "availableForDiy" = true, "isVisible" = true, "isActive" = true, "updatedAt" = NOW()`,
        [stockId, sellerId, code, name, meaning, color, offset % 3 === 0 ? "특" : "상", quantity, price, image],
      )
    }

    for (let productIndex = 0; productIndex < 2; productIndex++) {
      const main = FLOWERS[(index + productIndex * 5) % FLOWERS.length]
      const productId = `${sellerId}-product-${productIndex + 1}`
      const price = 32000 + index * 700 + productIndex * 13000
      const useTags = productIndex === 0 ? ["생일", "기념일"] : ["축하", "감사"]
      await client.query(
        `INSERT INTO "Product"
         ("id", "name", "description", "composition", "sizeGuide", "price", "stock", "category", "images",
          "flowerMeaning", "ohaengTags", "seasonTags", "colorTags", "useTags", "saleStatus", "isActive", "createdAt",
          "sellerId", "purchaseType")
         VALUES ($1, $2, $3, $4, '중형 꽃다발', $5, $6, 'bouquet', $7, $8, $9, $10, $11, $12, 'ON_SALE', true, NOW(), $13, 'INTERNAL')
         ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description",
          "price" = EXCLUDED."price", "stock" = EXCLUDED."stock", "images" = EXCLUDED."images",
          "useTags" = EXCLUDED."useTags", "isActive" = true`,
        [
          productId, `${store.name} ${main[1]} ${productIndex === 0 ? "데일리 꽃다발" : "축하 꽃다발"}`,
          `${main[1]}를 중심으로 매장마다 다르게 구성한 테스트 완제품입니다.`, `${main[1]}, 계절 소재, 그린 소재`,
          price, 5 + ((index + productIndex) % 16), [main[4]], main[2], ["화"], ["all"], [main[3]], useTags, sellerId,
        ],
      )
    }
  }
  await client.query("COMMIT")
  const result = await client.query(
    `SELECT
      (SELECT COUNT(*)::int FROM "Seller" WHERE "id" LIKE 'diy-test-seller-%') AS sellers,
      (SELECT COUNT(*)::int FROM "SellerStock" WHERE "sellerId" LIKE 'diy-test-seller-%') AS stocks,
      (SELECT COUNT(*)::int FROM "Product" WHERE "sellerId" LIKE 'diy-test-seller-%') AS products`,
  )
  console.log(JSON.stringify(result.rows[0], null, 2))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
