import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" })
config()

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const sellerResult = await client.query(
    `SELECT "id" FROM "Seller" WHERE "marketName" = $1 AND "status" = 'APPROVED' ORDER BY "createdAt" DESC LIMIT 1`,
    ["꽃길 플라워"],
  )
  const seller = sellerResult.rows[0]
  if (!seller) throw new Error("승인된 꽃길 플라워 판매처를 찾지 못했습니다.")

  const gallery = [
    "/sample-products/romantic-pink-garden/gallery-front-v1.png",
    "/sample-products/romantic-pink-garden/gallery-side-v1.png",
    "/sample-products/romantic-pink-garden/gallery-closeup-v1.png",
  ]
  const details = ["/sample-products/romantic-pink-garden/product-detail-v1.png"]
  const notices = ["/sample-products/romantic-pink-garden/order-notice-v1.png"]

  await client.query(
    `INSERT INTO "Product" (
      "id", "sellerId", "name", "description", "composition", "sizeGuide", "substitutionNotice",
      "originInfo", "deliveryArea", "sameDayCutoff", "orderNotice", "careInstructions",
      "price", "stock", "category", "images", "detailImages", "noticeImages", "flowerMeaning",
      "ohaengTags", "seasonTags", "colorTags", "useTags", "deliveryDays",
      "deliveryStartTime", "deliveryEndTime", "displayStartAt", "displayEndAt",
      "saleStatus", "isActive", "purchaseType", "createdAt"
    ) VALUES (
      'sample_flower_road_premium_pink_bouquet', $1, '로맨틱 핑크 가든 꽃다발',
      '핑크 장미와 리시안셔스의 부드러운 색감을 살린 프리미엄 꽃다발입니다. 기념일, 생일, 프로포즈처럼 마음을 전하고 싶은 순간에 어울리며, 꽃길 플라워 플로리스트가 주문 후 가장 신선한 소재로 제작합니다.',
      '특등급 핑크 장미 10송이, 핑크 리시안셔스, 계절 소국, 안개꽃, 유칼립투스, 프리미엄 포장지와 리본',
      '가로 약 38cm × 높이 약 48cm. 수작업 상품으로 측정 위치에 따라 ±5cm 차이가 날 수 있습니다.',
      '생화는 계절과 산지 수급에 따라 일부 품종이 변경될 수 있습니다. 변경 시 전체적인 핑크·화이트 색감과 상품 가치가 유지되도록 동급 이상의 소재로 대체합니다.',
      '장미·리시안셔스 국내산 중심, 안개꽃·유칼립투스 국내산 및 수입산 혼합',
      '서울 전 지역 및 경기 고양·과천·광명·성남 일부 지역. 그 외 지역은 주문 전 판매처 확인이 필요합니다.',
      '평일 오전 11시 이전 결제 완료 시 당일 배송 가능. 주말·공휴일 및 특정 기념일은 사전 예약 권장',
      '생화 특성상 화면과 꽃의 개화 정도·색감이 조금 다를 수 있습니다. 배송 전 수령인과 연락이 필요하며, 제작 시작 후 단순 변심 취소는 제한될 수 있습니다. 파손·오배송은 수령 후 2시간 이내 사진과 함께 접수해주세요.',
      '수령 후 포장 하단을 풀고 줄기 끝을 1~2cm 사선으로 잘라 깨끗한 화병에 꽂아주세요. 물은 매일 갈고 직사광선·난방기·과일 옆을 피해 서늘한 곳에 두면 더 오래 감상할 수 있습니다.',
      69000, 12, 'bouquet', $2::text[], $3::text[], $4::text[], NULL,
      ARRAY['화','수'], ARRAY['spring','all'], ARRAY['핑크','화이트'], ARRAY['생일','기념일','프로포즈','감사'],
      ARRAY['월','화','수','목','금','토'], '09:00', '18:00', NOW(), NULL,
      'ON_SALE', true, 'INTERNAL', NOW()
    )
    ON CONFLICT ("id") DO UPDATE SET
      "sellerId" = EXCLUDED."sellerId", "name" = EXCLUDED."name", "description" = EXCLUDED."description",
      "composition" = EXCLUDED."composition", "sizeGuide" = EXCLUDED."sizeGuide",
      "substitutionNotice" = EXCLUDED."substitutionNotice", "originInfo" = EXCLUDED."originInfo",
      "deliveryArea" = EXCLUDED."deliveryArea", "sameDayCutoff" = EXCLUDED."sameDayCutoff",
      "orderNotice" = EXCLUDED."orderNotice", "careInstructions" = EXCLUDED."careInstructions",
      "price" = EXCLUDED."price", "stock" = EXCLUDED."stock", "images" = EXCLUDED."images",
      "detailImages" = EXCLUDED."detailImages", "noticeImages" = EXCLUDED."noticeImages", "seasonTags" = EXCLUDED."seasonTags",
      "colorTags" = EXCLUDED."colorTags", "useTags" = EXCLUDED."useTags",
      "deliveryDays" = EXCLUDED."deliveryDays", "deliveryStartTime" = EXCLUDED."deliveryStartTime",
      "deliveryEndTime" = EXCLUDED."deliveryEndTime", "displayStartAt" = NOW(),
      "saleStatus" = 'ON_SALE', "isActive" = true`,
    [seller.id, gallery, details, notices],
  )
  console.log(JSON.stringify({ sellerId: seller.id, productId: "sample_flower_road_premium_pink_bouquet", gallery: gallery.length, details: details.length, notices: notices.length }, null, 2))
} finally {
  await client.end()
}
