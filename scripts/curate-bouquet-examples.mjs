import {config} from 'dotenv';import pg from 'pg';import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
config({path:'.env.local',quiet:true});
const specs=[
 ['white','demo-review-white-rose','화이트 장미와 안개꽃','basic','kraft',[['rose-white',8],['babysbreath-white',4]],'양재 꽃시장에서 흰 장미 한 단이랑 안개꽃을 조금 사서 직접 묶어봤어요. 장미가 10송이 한 단이라 8송이만 쓰고 남은 건 화병에 꽂았어요. 처음이라 높이를 딱 맞추지 못했는데 오히려 손으로 만든 티가 나서 더 마음에 들어요. 크라프트지는 매장에서 같이 샀고, 끈은 집에 있던 마끈으로 묶었어요.'],
 ['tulip','demo-review-tulip','주황 튤립과 보라 아네모네','large','linen',[['tulip-orange',13],['anemone-purple',12]],'엄마 생신이라 주문제작으로 받았어요. 하루 지나니까 튤립이 피면서 옆으로 쭉 벌어지는데, 보라 아네모네랑 색 대비가 예뻐서 엄마가 사진을 계속 찍으셨어요. 린넨 포장이라 종이보다 덜 구겨지고 고급스러웠고, 사장님이 물올림 방법을 메모로 넣어주셔서 좋았습니다.'],
 ['calla','demo-review-calla','화이트 카라와 유칼립투스','basic','bouquet',[['calla-white',8],['eucalyptus',4]],'친구 결혼식 2부 때 들 꽃으로 픽업 주문했어요. 카라 줄기를 길게 살려주셔서 둥근 꽃다발보다 훨씬 세련돼 보였어요. 유칼립투스 향이 은은하게 나고, 손잡이를 리본으로 감아주셔서 하루 종일 들고 다니기 편했어요. 픽업 시간에 맞춰 딱 준비돼 있었습니다.'],
 ['yellow','demo-review-yellow-lily','노란 장미와 화이트 백합','basic','kraft',[['rose-yellow',8],['lily-white',4]],'동네 꽃집에서 노란 장미랑 백합을 낱개로 사서 집에서 만들었어요. 백합이 봉오리 상태라 처음엔 빈 곳이 많아 보였는데 이틀 지나니 다 피면서 부피도 커지고 거실에 향이 가득해요. 선물할 거면 하루 이틀 전에 미리 사두는 걸 추천해요.'],
 ['sunflower','presentation-review-pink','해바라기와 유칼립투스','basic','linen',[['sunflower',6],['eucalyptus',2]],'공판장 근처 도매상가에서 해바라기를 샀는데 5송이가 한 단이라 두 단 사서 6송이만 쓰고 나머지는 화병에 꽂았어요. 꽃 크기가 제각각이라 키를 다르게 잡았더니 들꽃 느낌이 나요. 꽃머리가 무거워서 묶는 위치를 조금 위로 잡아야 안 쏠려요. 유칼립투스 두 줄기만 넣어도 향이 꽤 납니다.'],
 ['blue','presentation-review-white','파란 수국과 화이트 장미','basic','bouquet',[['hydrangea-blue',3],['rose-white',5]],'화면에서 본 것보다 수국이 연한 하늘색에 보랏빛이 살짝 도는 색이었는데, 저는 이 색이 더 좋았어요. 장미가 한쪽에 모여 있긴 해도 수국 볼륨이 커서 풍성해 보여요. 배송 상자에 꽃다발이 단단히 고정돼 와서 꺾인 데 없었고, 받자마자 줄기 끝 잘라서 물에 담가뒀어요.'],
];
const client=new pg.Client({connectionString:process.env.DIRECT_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});await client.connect();
try{
 const {rows}=await client.query(`SELECT r.*,p."sellerId",p."name" AS "productName",i."composition" AS "itemComposition",i."productId" AS "itemProductId" FROM "Review" r JOIN "Product" p ON p."id"=r."productId" LEFT JOIN "OrderItem" i ON i."id"=r."orderItemId" WHERE r."id" LIKE 'presentation-comparison-review-%' OR r."id"=ANY($1::text[])`,[specs.map(x=>x[1])]);
 if(rows.length!==30)throw new Error('예상 정비 대상 30건과 다름: '+rows.length);
 for(const [key] of specs)if(!existsSync(`public/reviews/curated/${key}-v2.png`))throw new Error('사진 없음: '+key);
 for(const key of ['sunflower','blue'])if(!existsSync(`public/reviews/curated/${key}-ai.png`))throw new Error('AI 예상 이미지 없음: '+key);
 const manifest=specs.map(([key,id,name,sizeId,wrappingId,flowers,content])=>{const old=rows.find(r=>r.id===id);return {key,id,name,content,productId:`curated-style-product-${key}`,sellerId:old.sellerId,orderItemId:old.orderItemId,images:[`/reviews/curated/${key}-v2.png`],previewImageUrl:['blue','sunflower'].includes(key)?`/reviews/curated/${key}-ai.png`:old.previewImageUrl,composition:{sizeId,wrappingId,flowers:flowers.map(([id,quantity])=>({id,quantity})),provenance:'AI_STAGED_EXAMPLE',styleTitle:name}}});
 console.log(JSON.stringify({keep:manifest.map(x=>({id:x.id,name:x.name,images:x.images})),hide:rows.filter(x=>x.id.startsWith('presentation-comparison-review-')).length},null,2));
 if(!process.argv.includes('--apply'))process.exitCode=0;
 else{
 mkdirSync('artifacts/review-cleanup',{recursive:true});const backup=`artifacts/review-cleanup/backup-${Date.now()}.json`;writeFileSync(backup,JSON.stringify(rows,null,2));
 await client.query('BEGIN');
 for(const item of manifest){
 await client.query(`INSERT INTO "Product" ("id","sellerId","name","description","price","stock","category","images","saleStatus","isActive","createdAt") VALUES ($1,$2,$3,'꽃 구성 아이디어 · AI 연출 이미지',0,0,'custom',$4,'HIDDEN',false,NOW()) ON CONFLICT("id") DO UPDATE SET "name"=EXCLUDED."name","images"=EXCLUDED."images"`,[item.productId,item.sellerId,item.name,item.images]);
 await client.query(`UPDATE "Review" SET "productId"=$2,"content"=$3,"images"=$4,"previewImageUrl"=$5,"composition"=$6::jsonb,"tags"=ARRAY[]::text[],"derivedOrderCount"=0,"isHidden"=false WHERE "id"=$1`,[item.id,item.productId,item.content,item.images,item.previewImageUrl,JSON.stringify(item.composition)]);
 await client.query(`UPDATE "OrderItem" SET "productId"=$2,"composition"=$3::jsonb,"previewImageUrl"=$4 WHERE "id"=$1`,[item.orderItemId,item.productId,JSON.stringify(item.composition),item.previewImageUrl]);
 }
 await client.query(`UPDATE "Review" SET "isHidden"=true,"moderationReason"='중복 스타일 정리: 구성별 대표 1건 유지',"moderatedAt"=NOW() WHERE "id" LIKE 'presentation-comparison-review-%'`);
 await client.query('COMMIT');writeFileSync('artifacts/review-cleanup/curated-manifest.json',JSON.stringify(manifest,null,2));console.log('APPLIED: 6 unique styles, 24 duplicate examples hidden; backup: '+backup);
 }
}catch(e){await client.query('ROLLBACK');throw e}finally{await client.end()}
