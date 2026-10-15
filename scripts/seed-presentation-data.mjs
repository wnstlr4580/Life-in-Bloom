// 발표 전용 데이터. 기존 계정·재고·실주문은 수정하지 않는다.
// node scripts/seed-presentation-data.mjs       : 계획과 전제 확인
// node scripts/seed-presentation-data.mjs apply : 전용 ID만 삽입 (재실행 시 중복 없음)
import { config } from 'dotenv'
import pg from 'pg'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
config({ path: '.env.local', quiet: true })
config({ quiet: true })
const scenarios = [
  { key: 'pink', name: '봄빛 감사 꽃다발', price: 39000, image: '/sample-products/romantic-pink-garden/gallery-front-v1.png', flowers: [{ id: 'rose-pink', quantity: 8 }, { id: 'carnation-pink', quantity: 2 }, { id: 'babysbreath-white', quantity: 2 }], wrapping: 'kraft', tags: ['생일', '감사'], color: 'pink' },
  { key: 'white', name: '화이트 장미 축하 꽃다발', price: 42000, image: '/reviews/demo-white-rose.png', flowers: [{ id: 'rose-white', quantity: 8 }, { id: 'babysbreath-white', quantity: 4 }], wrapping: 'kraft', tags: ['축하', '결혼'], color: 'white' },
  { key: 'sunshine', name: '햇살 해바라기 응원 꽃다발', price: 35000, image: '/flowers/yellow_sunflower.jpg', flowers: [{ id: 'sunflower', quantity: 6 }, { id: 'eucalyptus', quantity: 2 }], wrapping: 'linen', tags: ['생일', '축하'], color: 'yellow' },
  { key: 'blue', name: '파란 수국 기념일 꽃다발', price: 48000, image: '/flowers/blue_hydrangea.jpg', flowers: [{ id: 'hydrangea-blue', quantity: 3 }, { id: 'rose-white', quantity: 5 }], wrapping: 'bouquet', tags: ['기념일', '감사'], color: 'blue' },
]
const statuses = ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'PURCHASE_CONFIRMED', 'PURCHASE_CONFIRMED', 'CANCELLED', 'PAID']
for (const s of scenarios) if (!existsSync(`public${decodeURIComponent(s.image)}`)) throw new Error(`이미지 없음: ${s.image}`)
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
await client.connect()
try {
  const { rows: prerequisites } = await client.query(`SELECT (SELECT "id" FROM "User" WHERE "id"='demo-user-customer') AS buyer, (SELECT "id" FROM "Seller" WHERE "id"='demo-seller-kflowermart' AND "status"='APPROVED') AS seller`)
  const { buyer, seller } = prerequisites[0]
  if (!buyer || !seller) throw new Error('기존 customer / K플라워마트 시연 계정이 필요합니다. docs/demo-test-guide.md 참고')
  console.log('계획: 전용 상품 4개, 주문 8개, 구매확정 후기 2개. 실제 결제·메일·포인트 지급 없음.')
  if (process.argv[2] !== 'apply') { console.log('실행하려면 apply를 지정하세요.'); } else {
    await client.query('BEGIN')
    for (const s of scenarios) {
      const compositionText = s.flowers.map(f => `${f.id} ${f.quantity}송이`).join(', ')
      await client.query(`INSERT INTO "Product" ("id","name","description","composition","sizeGuide","price","stock","category","images","ohaengTags","seasonTags","colorTags","useTags","saleStatus","isActive","sellerId","purchaseType","createdAt") VALUES ($1,$2,$3,$4,'기본 꽃다발',$5,30,'bouquet',$6,$7,ARRAY['all'],$8,$9,'ON_SALE',true,$10,'INTERNAL',NOW()) ON CONFLICT ("id") DO NOTHING`, [`presentation-product-${s.key}`,s.name,`${s.name} — 그날 들어온 싱싱한 꽃으로 정성껏 묶어 드려요.`,compositionText,s.price,[s.image],[s.color==='white'?'금':s.color==='blue'?'수':s.color==='yellow'?'토':'화'],[s.color],s.tags,seller])
    }
    for (let i=0;i<statuses.length;i++) {
      const s=scenarios[i%4], state=statuses[i], confirmed=state==='PURCHASE_CONFIRMED', cancelled=state==='CANCELLED'
      const orderId=`presentation-order-${String(i+1).padStart(2,'0')}`, itemId=`presentation-item-${String(i+1).padStart(2,'0')}`
      const composition={sizeId:'basic',wrappingId:s.wrapping,flowers:s.flowers}
      const commission=Math.round(s.price*0.1), vat=Math.round(commission*0.1)
      const orderState=confirmed?'DELIVERED':state
      const address={name:'시연 고객',phone:'010-0000-0000',address:'서울 서초구 강남대로 27',detailAddress:'발표용 가상 배송지',deliveryDate:'2026-10-16',deliveryTime:'오후',ordererPhone:'010-0000-0000'}
      await client.query(`INSERT INTO "Order" ("id","userId","status","totalAmount","shippingFee","deliveryType","shippingAddr","giftMessage","paymentMethod","createdAt") VALUES ($1,$2,$3,$4,0,'pickup',$5::jsonb,'오늘도 당신의 하루를 응원해요','DEMO',NOW()-($6||' days')::interval) ON CONFLICT ("id") DO NOTHING`,[orderId,buyer,orderState,s.price,JSON.stringify(address),i])
      await client.query(`INSERT INTO "OrderItem" ("id","orderId","productId","sellerId","quantity","price","itemType","fulfillmentStatus","commissionRate","commissionFee","commissionVat","settlementAmount","settlementStatus","confirmedAt","deliveredAt","settlementDueAt","composition","bouquetMode","courier","trackingNumber") VALUES ($1,$2,$3,$4,1,$5,$6,$7,10,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18) ON CONFLICT ("id") DO NOTHING`,[itemId,orderId,`presentation-product-${s.key}`,seller,s.price,i%2===0?'CUSTOM_BOUQUET':'FINISHED',state,commission,vat,cancelled?0:s.price-commission-vat,cancelled?'CANCELLED':confirmed?'READY':'WAITING',confirmed?new Date():null,confirmed||state==='DELIVERED'?new Date():null,confirmed?new Date('2026-10-16T14:59:59Z'):null,JSON.stringify(composition),i%2===0?'custom':null,state==='SHIPPED'?'시연택배':null,state==='SHIPPED'?'DEMO00000003':null])
      if (confirmed) await client.query(`INSERT INTO "Review" ("id","userId","productId","orderItemId","rating","content","images","tags","orderMode","composition","createdAt") VALUES ($1,$2,$3,$4,5,$5,$6,ARRAY['색감이 예뻐요','선물하기 좋아요'],'custom',$7::jsonb,NOW()) ON CONFLICT ("id") DO NOTHING`,[`presentation-review-${s.key}`,buyer,`presentation-product-${s.key}`,itemId,'선물용으로 주문했는데 색감이 사진보다 더 예뻤어요. 포장도 꼼꼼하고 꽃이 싱싱해서 오래 갔어요.',[s.image],JSON.stringify(composition)])
    }
    await client.query('COMMIT')
    console.log('발표 전용 데이터 삽입 완료 (기존 전용 ID는 보존).')
  }
  const { rows }=await client.query(`SELECT o."id",o."status",i."fulfillmentStatus",i."settlementStatus",i."settlementAmount",p."name" FROM "Order" o JOIN "OrderItem" i ON i."orderId"=o."id" JOIN "Product" p ON p."id"=i."productId" WHERE o."id" LIKE 'presentation-order-%' ORDER BY o."id"`)
  mkdirSync('발표캡처/2026-10-12',{recursive:true})
  writeFileSync('발표캡처/2026-10-12/test-data.json',JSON.stringify({synthetic:true,createdAt:new Date().toISOString(),scenarios,orders:rows,personas:[{name:'김하늘',birthDate:'1995-05-21',birthHour:'09:30',gender:'female',calendarType:'solar'},{name:'박도윤',birthDate:'1993-11-08',birthHour:'unknown',gender:'male',calendarType:'solar'},{name:'윤서아',birthDate:'2000-02-29',birthHour:'12:00',gender:'female',calendarType:'solar'}]},null,2))
  console.log(`전용 주문 ${rows.length}건 확인. test-data.json 저장.`)
} catch(error) { await client.query('ROLLBACK'); throw error } finally { await client.end() }
