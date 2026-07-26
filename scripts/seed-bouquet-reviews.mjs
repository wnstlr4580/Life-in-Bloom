import { config } from "dotenv"
import pg from "pg"

config({ path: ".env.local" }); config()
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const demos = [
  { id: "demo-review-white-rose", composition: { sizeId: "basic", wrappingId: "kraft", flowers: [{ id: "rose-white", quantity: 8 }, { id: "babysbreath-white", quantity: 4 }] }, images: ["/reviews/demo-white-rose.png", "/reviews/demo-white-rose-2.png"], mode: "custom", rating: 5, tags: ["꽃이 풍성해요", "포장이 꼼꼼해요", "선물하기 좋아요"], content: "AI로 만든 화이트 장미 조합 그대로 부탁드렸는데 실제 꽃이 더 풍성했어요. 창가에서도 다시 찍어봤는데 포장과 색감 모두 마음에 듭니다." },
  { id: "demo-review-tulip", composition: { sizeId: "large", wrappingId: "linen", flowers: [{ id: "tulip-orange", quantity: 13 }, { id: "anemone-purple", quantity: 12 }] }, images: ["/reviews/demo-tulip.png", "/reviews/demo-tulip-2.png"], mode: "diy", rating: 5, tags: ["색감이 예뻐요", "직접 만들기 쉬워요", "신선해요"], content: "AI 이미지의 주황·핑크·보라 튤립 조합을 보고 직접 만들었어요. 테이블에 펼쳐 놓고 봐도 색 조합이 정말 예쁩니다." },
  { id: "demo-review-calla", composition: { sizeId: "basic", wrappingId: "bouquet", flowers: [{ id: "calla-white", quantity: 8 }, { id: "eucalyptus", quantity: 4 }] }, images: ["/reviews/demo-calla.png", "/reviews/demo-calla-2.png"], mode: "custom", rating: 4, tags: ["사진과 같아요", "포장이 꼼꼼해요", "재구매하고 싶어요"], content: "화이트 카라와 유칼립투스가 AI 예상 이미지의 차분한 분위기와 거의 같아요. 각도별로 찍어도 깔끔하고 고급스럽습니다." },
  { id: "demo-review-yellow-lily", composition: { sizeId: "basic", wrappingId: "kraft", flowers: [{ id: "rose-yellow", quantity: 8 }, { id: "lily-white", quantity: 4 }] }, images: ["/reviews/demo-yellow-lily.png", "/reviews/demo-yellow-lily-2.png"], mode: "custom", rating: 5, tags: ["꽃이 풍성해요", "색감이 예뻐요", "선물하기 좋아요"], content: "AI로 고른 노란 장미와 흰 백합 조합 그대로 제작됐어요. 픽업 직후 차 안에서도 찍었는데 실제로 보면 더 화사합니다." },
]

await client.connect()
try {
  await client.query("BEGIN")
  await client.query(`CREATE TABLE IF NOT EXISTS "ReviewComment" ("id" TEXT PRIMARY KEY,"reviewId" TEXT NOT NULL REFERENCES "Review"("id") ON DELETE CASCADE,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"content" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  await client.query(`ALTER TABLE "ReviewComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "ReviewComment"("id") ON DELETE CASCADE`)
  await client.query(`ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "derivedOrderCount" INTEGER NOT NULL DEFAULT 0`)
  const userId = "demo-bouquet-reviewer"
  await client.query(`INSERT INTO "User" ("id","email","name","role","createdAt") VALUES ($1,'demo-reviews@life-in-bloom.example','꽃을사랑한손님','CUSTOMER',NOW()) ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name"`, [userId])
  const { rows: posts } = await client.query(`SELECT "id","imageUrl","composition" FROM "BouquetPost" WHERE "isHidden"=false AND "sourceType"='AI_COMPOSITE' ORDER BY "createdAt" DESC LIMIT 4`)
  const { rows: products } = await client.query(`SELECT p."id",p."sellerId",p."price",p."name" FROM "Product" p WHERE p."isActive"=true AND p."sellerId" IS NOT NULL ORDER BY p."createdAt" DESC LIMIT 4`)
  if (posts.length < 4 || products.length < 4) throw new Error("메인 AI 꽃다발 4개와 판매처 상품 4개가 필요합니다.")
  for (let index = 0; index < demos.length; index++) {
    const demo = demos[index], product = products[index], post = posts[index]
    const orderId = `demo-bouquet-order-${index + 1}`, itemId = `demo-bouquet-item-${index + 1}`
    await client.query(`INSERT INTO "Order" ("id","userId","status","totalAmount","shippingFee","deliveryType","shippingAddr","paymentId","qrCode","createdAt") VALUES ($1,$2,'DELIVERED',$3,0,'standard','{}'::jsonb,$4,$5,NOW()-($6||' days')::interval) ON CONFLICT ("id") DO UPDATE SET "status"='DELIVERED'`, [orderId,userId,product.price,`demo-payment-${index + 1}`,`demo-qr-${index + 1}`,index + 2])
    await client.query(`INSERT INTO "OrderItem" ("id","orderId","productId","sellerId","quantity","price","fulfillmentStatus","commissionRate","commissionFee","settlementAmount","settlementStatus","confirmedAt","previewImageUrl","composition","bouquetMode") VALUES ($1,$2,$3,$4,1,$5,'PURCHASE_CONFIRMED',10,0,$5,'WAITING',NOW(),$6,$7,$8) ON CONFLICT ("id") DO UPDATE SET "sellerId"=EXCLUDED."sellerId","previewImageUrl"=EXCLUDED."previewImageUrl","composition"=EXCLUDED."composition","bouquetMode"=EXCLUDED."bouquetMode","confirmedAt"=EXCLUDED."confirmedAt"`, [itemId,orderId,product.id,product.sellerId,product.price,post.imageUrl,demo.composition,demo.mode])
    await client.query(`INSERT INTO "Review" ("id","userId","productId","orderItemId","rating","content","images","previewImageUrl","tags","orderMode","composition","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()-($12||' days')::interval) ON CONFLICT ("id") DO UPDATE SET "productId"=EXCLUDED."productId","content"=EXCLUDED."content","images"=EXCLUDED."images","previewImageUrl"=EXCLUDED."previewImageUrl","tags"=EXCLUDED."tags","orderMode"=EXCLUDED."orderMode","composition"=EXCLUDED."composition"`, [demo.id,userId,product.id,itemId,demo.rating,demo.content,demo.images,post.imageUrl,demo.tags,demo.mode,demo.composition,index])
  }
  const { rows: bibaUsers } = await client.query(`SELECT "id" FROM "User" WHERE lower("email")='biba8@hanmail.net' LIMIT 1`)
  if (!bibaUsers[0]) throw new Error("biba8@hanmail.net 계정을 찾지 못했습니다.")
  for (let index = 0; index < 3; index++) {
    const product = products[index], post = posts[index]
    const orderId = `biba-review-test-order-${index + 1}`, itemId = `biba-review-test-item-${index + 1}`
    await client.query(`INSERT INTO "Order" ("id","userId","status","totalAmount","shippingFee","deliveryType","shippingAddr","paymentId","qrCode","createdAt") VALUES ($1,$2,'DELIVERED',$3,0,'standard','{}'::jsonb,$4,$5,NOW()-INTERVAL '1 day') ON CONFLICT ("id") DO UPDATE SET "userId"=EXCLUDED."userId","status"='DELIVERED'`, [orderId,bibaUsers[0].id,product.price,`biba-review-payment-${index + 1}`,`biba-review-qr-${index + 1}`])
    await client.query(`INSERT INTO "OrderItem" ("id","orderId","productId","sellerId","quantity","price","fulfillmentStatus","commissionRate","commissionFee","settlementAmount","settlementStatus","confirmedAt","previewImageUrl","composition","bouquetMode") VALUES ($1,$2,$3,$4,1,$5,'PURCHASE_CONFIRMED',10,0,$5,'WAITING',NOW(),$6,$7,$8) ON CONFLICT ("id") DO UPDATE SET "confirmedAt"=NOW(),"previewImageUrl"=EXCLUDED."previewImageUrl","composition"=EXCLUDED."composition","bouquetMode"=EXCLUDED."bouquetMode"`, [itemId,orderId,product.id,product.sellerId,product.price,post.imageUrl,post.composition,index === 1 ? "diy" : "custom"])
  }
  await client.query(`INSERT INTO "ReviewComment" ("id","reviewId","userId","content","createdAt") VALUES ('demo-comment-1','demo-review-white-rose',$1,'화이트 장미 조합 정말 예쁘네요! 포장지는 어떤 걸 고르셨나요?',NOW()-INTERVAL '12 hours'),('demo-comment-2','demo-review-tulip',$1,'직접 만들기 난이도가 궁금해요. 초보자도 가능한가요?',NOW()-INTERVAL '6 hours') ON CONFLICT ("id") DO NOTHING`, [userId])
  await client.query("COMMIT")
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log(`seeded 4 paired reviews (2 photos each) and 3 eligible orders for biba8@hanmail.net`)
} catch (error) { await client.query("ROLLBACK"); throw error } finally { await client.end() }
