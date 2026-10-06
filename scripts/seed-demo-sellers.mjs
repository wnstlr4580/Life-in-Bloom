// 최종발표 시연용 판매처 데이터 (여러 번 실행해도 같은 결과)
//   1) 농협 K플라워마트 양재점 — 포토부스 키오스크가 놓인 매장. 개별 꽃 재고 14종에 매장 바코드 등록
//   2) 고양 장미농원 — 조합원 인증을 마친 농가(조합원농가 표시 확인용). 완제품 3종
//   3) 조합원 심사 대기 2곳 — 관리자센터에서 ①조합원확인 → ②교육이력 → 승인/반려 시연용
// 조합원 인물 정보는 lib/coopTestData.ts 의 파일럿 테스트 데이터와 같다 (실제 농협 데이터 아님).
// 실행: node scripts/seed-demo-sellers.mjs
import { config } from "dotenv"
import pg from "pg"
import bcrypt from "bcryptjs"

config({ path: ".env.local" })
config()

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.")
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })

const PASSWORD = "Demo1234!"
const now = new Date().toISOString()

// 매장 바코드: GS1 매장 내 전용 접두어 200 + 일련번호 + 체크숫자 (실제 상품 바코드와 겹치지 않음)
// components/kiosk/BarcodeScan.tsx 의 시연용 바코드와 같은 값이어야 한다.
const MART_STOCKS = [
  ["rose-red", "빨간 장미", "열렬한 사랑", "레드", "/flowers/red_rose.jpg", 3000, "2001000000012"],
  ["rose-pink", "핑크 장미", "행복한 사랑", "핑크", "/flowers/pink_rose.jpg", 3000, "2001000000029"],
  ["rose-white", "흰 장미", "순수한 사랑", "화이트", "/flowers/white_rose.jpg", 3000, "2001000000036"],
  ["rose-yellow", "노란 장미", "우정과 기쁨", "옐로", "/flowers/yellow_rose.jpg", 2800, "2001000000043"],
  ["tulip-pink", "핑크 튤립", "사랑의 시작", "핑크", "/flowers/pink_tulip.jpg", 2500, "2001000000050"],
  ["tulip-white", "흰 튤립", "새로운 시작", "화이트", "/flowers/white_tulip.jpg", 2500, "2001000000067"],
  ["lily-white", "흰 백합", "순결과 변함없는 사랑", "화이트", "/flowers/white_lily.jpg", 3500, "2001000000074"],
  ["hydrangea-blue", "파란 수국", "진심과 이해", "블루", "/flowers/blue_hydrangea.jpg", 4000, "2001000000081"],
  ["carnation-pink", "핑크 카네이션", "감사와 아름다운 사랑", "핑크", "/flowers/pink_carnation.jpg", 2000, "2001000000098"],
  ["gerbera-orange", "주황 거베라", "신비와 열정", "오렌지", "/flowers/orange_gerbera.jpg", 2300, "2001000000104"],
  ["sunflower", "해바라기", "동경과 기다림", "옐로", "/flowers/yellow_sunflower.jpg", 2500, "2001000000111"],
  ["freesia", "프리지아", "천진난만과 새로운 시작", "옐로", "/flowers/yellow_freesia.jpg", 2000, "2001000000128"],
  ["babysbreath-white", "흰 안개꽃", "맑은 마음", "화이트", "/flowers/white_baby%27s_breath.jpg", 1500, "2001000000135"],
  ["eucalyptus", "유칼립투스", "추억과 재생", "그린", "/flowers/green_eucalyptus.jpg", 1800, "2001000000142"],
]

const COOP_EDUCATION = [
  { course: "화훼 재배기술 심화과정", provider: "화훼농협", completedAt: "2025-11-14", hours: 16 },
  { course: "조합원 역량강화 교육", provider: "농협중앙회", completedAt: "2026-03-20", hours: 8 },
  { course: "농산물 온라인 판매 실무", provider: "농협중앙회", completedAt: "2026-06-05", hours: 12 },
]

const SELLERS = [
  {
    key: "kflowermart", email: "kflowermart@life-in-bloom.test", marketName: "농협 K플라워마트 양재점", sellerType: "FLOWER_SHOP",
    status: "APPROVED", representativeName: "최예린", managerName: "최예린", managerPhone: "02-3460-1000", businessNumber: "998-01-10001",
    introduction: "화훼공판장 안 농협 꽃마트예요. 매장 포토부스에서 구매한 꽃 바코드를 찍으면 그 꽃으로 인생네컷을 남길 수 있어요.",
    roadAddress: "서울 서초구 강남대로 27", detailAddress: "aT화훼공판장 1층", latitude: 37.4680, longitude: 127.0390,
    offersCustomBouquet: true, offersDiyFlowers: true, coop: null,
  },
  {
    key: "coopfarm", email: "coopfarm@life-in-bloom.test", marketName: "고양 장미농원", sellerType: "FARM",
    status: "APPROVED", representativeName: "김화훼", managerName: "김화훼", managerPhone: "010-1234-0001", businessNumber: "998-02-10002",
    introduction: "고양에서 30년째 장미를 키우는 화훼농협 조합원 농가예요. 아침에 자른 장미를 산지에서 바로 보내드려요.",
    roadAddress: "경기 고양시 덕양구 화훼로 15", detailAddress: "농원 사무실", latitude: 37.6584, longitude: 126.8320,
    offersCustomBouquet: false, offersDiyFlowers: false,
    coop: { birthDate: "19680312", approved: true, creditCustomerNo: "1000000001" },
  },
  {
    key: "coop-pending-farm", email: "coop-pending1@life-in-bloom.test", marketName: "이천 꽃농원", sellerType: "FARM",
    status: "PENDING", representativeName: "이농부", managerName: "이농부", managerPhone: "010-1234-0002", businessNumber: "998-03-10003",
    introduction: "이천에서 국화와 카네이션을 재배합니다.", roadAddress: "경기 이천시 부발읍 경충대로 2091", detailAddress: "2동",
    latitude: 37.2800, longitude: 127.5000, offersCustomBouquet: false, offersDiyFlowers: false,
    coop: { birthDate: "19751120", approved: false },
  },
  {
    key: "coop-pending-shop", email: "coop-pending2@life-in-bloom.test", marketName: "일산 오늘꽃집", sellerType: "FLOWER_SHOP",
    status: "PENDING", representativeName: "박일반", managerName: "박일반", managerPhone: "010-1234-0003", businessNumber: "998-04-10004",
    introduction: "일산 호수공원 앞 동네 꽃집이에요.", roadAddress: "경기 고양시 일산동구 호수로 595", detailAddress: "1층",
    latitude: 37.6560, longitude: 126.7700, offersCustomBouquet: true, offersDiyFlowers: false,
    coop: { birthDate: "19900505", approved: false },
  },
]

const FARM_PRODUCTS = [
  ["산지직송 빨간 장미 꽃다발", "아침에 수확한 고양 장미 15송이를 농원에서 바로 묶어 보내드려요.", "빨간 장미 15송이, 그린 소재", 45000, "/flowers/red_rose.jpg", "열렬한 사랑", ["red"], ["생일", "기념일", "감사"], ["화"]],
  ["농원 핑크 장미 꽃다발", "부드러운 핑크 장미를 풍성하게 담은 농원 대표 꽃다발이에요.", "핑크 장미 12송이, 안개꽃", 39000, "/sample-products/romantic-pink-garden/gallery-front-v1.png", "행복한 사랑", ["pink"], ["생일", "축하"], ["화"]],
  ["화이트 장미 감사 꽃다발", "깨끗한 흰 장미로 감사의 마음을 전하는 꽃다발이에요.", "흰 장미 10송이, 유칼립투스", 42000, "/reviews/demo-white-rose.png", "순수한 사랑", ["white"], ["감사", "축하"], ["금"]],
]

await client.connect()
try {
  await client.query("BEGIN")
  // 포토부스 바코드 조회용 — 같은 판매처 안에서 바코드 중복 금지
  await client.query(`ALTER TABLE "SellerStock" ADD COLUMN IF NOT EXISTS "barcode" TEXT`)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerStock_sellerId_barcode_key" ON "SellerStock" ("sellerId", "barcode") WHERE "barcode" IS NOT NULL`)
  await client.query(`CREATE INDEX IF NOT EXISTS "SellerStock_barcode_idx" ON "SellerStock" ("barcode")`)

  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  // 구매·후기 테스트용 일반회원
  await client.query(
    `INSERT INTO "User" ("id", "email", "name", "role", "password", "status", "createdAt")
     VALUES ('demo-user-customer', 'customer@life-in-bloom.test', '시연고객', 'CUSTOMER', $1, 'ACTIVE', NOW())
     ON CONFLICT ("id") DO UPDATE SET "password" = EXCLUDED."password", "role" = 'CUSTOMER', "status" = 'ACTIVE'`,
    [passwordHash],
  )
  for (const seller of SELLERS) {
    const userId = `demo-user-${seller.key}`
    const sellerId = `demo-seller-${seller.key}`
    await client.query(
      `INSERT INTO "User" ("id", "email", "name", "role", "password", "status", "createdAt")
       VALUES ($1, $2, $3, 'SELLER', $4, 'ACTIVE', NOW())
       ON CONFLICT ("id") DO UPDATE SET "email" = EXCLUDED."email", "name" = EXCLUDED."name", "role" = 'SELLER', "password" = EXCLUDED."password", "status" = 'ACTIVE'`,
      [userId, seller.email, seller.marketName, passwordHash],
    )
    const coop = seller.coop
    const memberCheck = coop?.approved ? JSON.stringify({ result: "MEMBER", creditCustomerNo: coop.creditCustomerNo, checkedAt: now }) : null
    const educationCheck = coop?.approved ? JSON.stringify({ records: COOP_EDUCATION, checkedAt: now }) : null
    await client.query(
      `INSERT INTO "Seller"
        ("id", "userId", "status", "legalBusinessName", "businessNumber", "representativeName", "businessType", "businessCategory",
         "marketName", "sellerType", "managerName", "managerPhone", "publicPhone", "introduction", "businessLicensePath",
         "postalCode", "roadAddress", "detailAddress", "latitude", "longitude", "businessHours",
         "settlementBank", "settlementAccount", "settlementHolder", "sellsFinishedProducts", "offersCustomBouquet", "offersDiyFlowers",
         "isOpen", "termsVersion", "termsAgreedAt", "submittedAt", "approvedAt", "createdAt", "updatedAt",
         "coopRequested", "coopBirthDate", "coopMemberCheck", "coopEducationCheck", "isCoopMember", "coopReviewedAt", "coopRejectReason")
       VALUES ($1, $2, $3, $4, $5, $6, '소매업', '화훼', $4, $7, $8, $9, $9, $10, '/demo/business-license.pdf',
         '00000', $11, $12, $13, $14, $15::jsonb, 'NH농협은행', $16, $6, true, $17, $18,
         true, '2026-01', NOW(), NOW(), $19, NOW(), NOW(),
         $20, $21, $22::jsonb, $23::jsonb, $24, $25, NULL)
       ON CONFLICT ("id") DO UPDATE SET
         "status" = EXCLUDED."status", "marketName" = EXCLUDED."marketName", "legalBusinessName" = EXCLUDED."legalBusinessName",
         "sellerType" = EXCLUDED."sellerType", "managerName" = EXCLUDED."managerName", "managerPhone" = EXCLUDED."managerPhone",
         "introduction" = EXCLUDED."introduction", "roadAddress" = EXCLUDED."roadAddress", "detailAddress" = EXCLUDED."detailAddress",
         "latitude" = EXCLUDED."latitude", "longitude" = EXCLUDED."longitude", "approvedAt" = EXCLUDED."approvedAt",
         "offersCustomBouquet" = EXCLUDED."offersCustomBouquet", "offersDiyFlowers" = EXCLUDED."offersDiyFlowers", "isOpen" = true,
         "coopRequested" = EXCLUDED."coopRequested", "coopBirthDate" = EXCLUDED."coopBirthDate",
         "coopMemberCheck" = EXCLUDED."coopMemberCheck", "coopEducationCheck" = EXCLUDED."coopEducationCheck",
         "isCoopMember" = EXCLUDED."isCoopMember", "coopReviewedAt" = EXCLUDED."coopReviewedAt", "coopRejectReason" = NULL,
         "updatedAt" = NOW()`,
      [
        sellerId, userId, seller.status, seller.marketName, seller.businessNumber, seller.representativeName,
        seller.sellerType, seller.managerName, seller.managerPhone, seller.introduction,
        seller.roadAddress, seller.detailAddress, seller.latitude, seller.longitude,
        JSON.stringify({ mon: "09:00-19:00", sat: "10:00-17:00" }), `301-${seller.businessNumber.replace(/-/g, "")}`,
        seller.offersCustomBouquet, seller.offersDiyFlowers, seller.status === "APPROVED" ? now : null,
        Boolean(coop), coop?.birthDate ?? null, memberCheck, educationCheck, Boolean(coop?.approved), coop?.approved ? now : null,
      ],
    )
  }

  for (const [code, name, meaning, color, image, unitPrice, barcode] of MART_STOCKS) {
    await client.query(
      `INSERT INTO "SellerStock"
        ("id", "sellerId", "flowerCode", "flowerName", "flowerMeaning", "color", "grade", "unit", "quantity", "unitPrice",
         "barcode", "imageUrl", "availableForCustom", "availableForDiy", "isVisible", "isActive", "updatedAt")
       VALUES ($1, 'demo-seller-kflowermart', $2, $3, $4, $5, '특', 'STEM', 80, $6, $7, $8, true, true, true, true, NOW())
       ON CONFLICT ("id") DO UPDATE SET "quantity" = 80, "unitPrice" = EXCLUDED."unitPrice", "barcode" = EXCLUDED."barcode",
         "imageUrl" = EXCLUDED."imageUrl", "isVisible" = true, "isActive" = true, "updatedAt" = NOW()`,
      [`demo-kflowermart-${code}`, code, name, meaning, color, unitPrice, barcode, image],
    )
  }

  for (const [index, [name, description, composition, price, image, flowerMeaning, colorTags, useTags, ohaengTags]] of FARM_PRODUCTS.entries()) {
    await client.query(
      `INSERT INTO "Product"
        ("id", "name", "description", "composition", "sizeGuide", "price", "stock", "category", "images", "flowerMeaning",
         "ohaengTags", "seasonTags", "colorTags", "useTags", "saleStatus", "isActive", "createdAt", "sellerId", "purchaseType")
       VALUES ($1, $2, $3, $4, '중형 꽃다발', $5, 20, 'bouquet', $6, $7, $8, ARRAY['all'], $9, $10, 'ON_SALE', true, NOW(), 'demo-seller-coopfarm', 'INTERNAL')
       ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "price" = EXCLUDED."price",
         "images" = EXCLUDED."images", "stock" = 20, "saleStatus" = 'ON_SALE', "isActive" = true`,
      [`demo-coopfarm-product-${index + 1}`, name, description, composition, price, [image], flowerMeaning, ohaengTags, colorTags, useTags],
    )
  }

  await client.query("COMMIT")
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log(`완료 — 판매처 ${SELLERS.length}곳, K플라워마트 바코드 재고 ${MART_STOCKS.length}종, 조합원농가 상품 ${FARM_PRODUCTS.length}종`)
  console.log(`로그인(비밀번호 ${PASSWORD}): customer@life-in-bloom.test, ${SELLERS.map((seller) => seller.email).join(", ")}`)
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
