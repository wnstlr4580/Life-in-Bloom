import { config } from "dotenv"
import pg from "pg"
config({ path: ".env.local" }); config()
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query("BEGIN")
  await client.query(`CREATE TABLE IF NOT EXISTS "RestockRequest" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE,"flowerCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"status" TEXT NOT NULL DEFAULT 'WAITING',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  const { rows: sellers } = await client.query(`SELECT s."id" FROM "Seller" s JOIN "User" u ON u."id"=s."userId" WHERE lower(u."email")='ra1886@naver.com' LIMIT 1`)
  if (!sellers[0]) throw new Error("판매자 계정을 찾지 못했습니다.")
  const sellerId = sellers[0].id
  const { rows: buyers } = await client.query(`SELECT "id" FROM "User" WHERE "role"='CUSTOMER' ORDER BY CASE WHEN lower("email")='biba8@hanmail.net' THEN 0 ELSE 1 END LIMIT 1`)
  const { rows: products } = await client.query(`SELECT "id","price" FROM "Product" WHERE "sellerId"=$1 ORDER BY "createdAt" DESC LIMIT 3`, [sellerId])
  if (!buyers[0] || !products[0]) throw new Error("테스트 구매자 또는 판매자 상품이 없습니다.")
  const compositions = [
    { sizeId: "basic", mainFlowerId: "white-calla", additionalFlowerIds: ["eucalyptus"], wrappingId: "ribbon-white" },
    { sizeId: "large", mainFlowerId: "yellow-rose", additionalFlowerIds: ["white-lily"], wrappingId: "kraft" },
    { sizeId: "basic", mainFlowerId: "orange-tulip", additionalFlowerIds: ["pink-tulip", "purple-tulip"], wrappingId: "clear" },
  ]
  for (let i=0;i<3;i++) {
    const product=products[i % products.length], orderId=`seller-demo-order-${i+1}`, itemId=`seller-demo-item-${i+1}`, status=i===1?"PREPARING":"PAID"
    await client.query(`INSERT INTO "Order" ("id","userId","status","totalAmount","shippingFee","deliveryType","shippingAddr","paymentId","qrCode","createdAt") VALUES ($1,$2,'PAID',$3,0,'delivery',$4::jsonb,$5,$6,NOW()-($7||' hours')::interval) ON CONFLICT ("id") DO UPDATE SET "status"='PAID'`, [orderId,buyers[0].id,product.price,JSON.stringify({name:`테스트 고객 ${i+1}`,phone:`010-0000-000${i+1}`,address:"서울특별시 테스트구 꽃길 10",detailAddress:`${i+1}01호`,deliveryDate:"2026-07-28",deliveryTime:"오후"}),`seller-demo-payment-${i+1}`,`seller-demo-qr-${i+1}`,i+1])
    await client.query(`INSERT INTO "OrderItem" ("id","orderId","productId","sellerId","quantity","price","itemType","fulfillmentStatus","commissionRate","commissionFee","settlementAmount","settlementStatus","composition","bouquetMode") VALUES ($1,$2,$3,$4,1,$5,'CUSTOM_BOUQUET',$6,10,0,$5,'WAITING',$7::jsonb,'custom') ON CONFLICT ("id") DO UPDATE SET "sellerId"=EXCLUDED."sellerId","fulfillmentStatus"=EXCLUDED."fulfillmentStatus","composition"=EXCLUDED."composition"`, [itemId,orderId,product.id,sellerId,product.price,status,JSON.stringify(compositions[i])])
  }
  await client.query("COMMIT")
  await client.query(`NOTIFY pgrst, 'reload schema'`)
  console.log("seeded 3 seller custom-bouquet test orders for ra1886@naver.com")
} catch(error) { await client.query("ROLLBACK"); throw error } finally { await client.end() }
