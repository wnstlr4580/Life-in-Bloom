import {config} from 'dotenv';import pg from 'pg';import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
config({path:'.env.local',quiet:true});
const specs=[
 ['white','demo-review-white-rose','화이트 장미와 안개꽃','basic','kraft',[['rose-white',8],['babysbreath-white',4]],'흰 장미 사이에 안개꽃을 넣어 가볍게 퍼지는 형태로 구성했어요. 크라프트 포장은 접는 폭에 따라 꽃이 보이는 면적이 달라져요.'],
 ['tulip','demo-review-tulip','주황 튤립과 보라 아네모네','large','linen',[['tulip-orange',13],['anemone-purple',12]],'주황 튤립과 짙은 보라 아네모네의 대비를 살린 구성입니다. 꽃 높이를 조금씩 다르게 잡으면 자연스럽게 흐르는 형태가 돼요.'],
 ['calla','demo-review-calla','화이트 카라와 유칼립투스','basic','bouquet',[['calla-white',8],['eucalyptus',4]],'카라의 긴 줄기와 유칼립투스의 회녹색 잎을 살린 슬림한 구성입니다. 리본을 좁게 묶어 줄기의 선이 보이도록 했어요.'],
 ['yellow','demo-review-yellow-lily','노란 장미와 화이트 백합','basic','kraft',[['rose-yellow',8],['lily-white',4]],'노란 장미 사이에 흰 백합을 배치해 밝은 색감을 만들었어요. 백합 봉오리가 피면서 전체 폭이 넓어지는 점을 고려한 구성입니다.'],
 ['sunflower','presentation-review-pink','해바라기와 유칼립투스','basic','linen',[['sunflower',6],['eucalyptus',2]],'해바라기를 중심으로 유칼립투스를 가볍게 둘렀어요. 큰 꽃송이가 겹치지 않도록 각도를 나누고 린넨 포장으로 마무리한 여름빛 구성입니다.'],
 ['blue','presentation-review-white','파란 수국과 화이트 장미','basic','bouquet',[['hydrangea-blue',3],['rose-white',5]],'파란 수국을 둥글게 모으고 흰 장미로 밝은 포인트를 줬어요. 수국의 넓은 꽃면과 장미의 작은 꽃면이 대비되는 시원한 구성입니다.'],
];
const client=new pg.Client({connectionString:process.env.DIRECT_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});await client.connect();
try{
 const {rows}=await client.query(`SELECT r.*,p."sellerId",p."name" AS "productName",i."composition" AS "itemComposition",i."productId" AS "itemProductId" FROM "Review" r JOIN "Product" p ON p."id"=r."productId" LEFT JOIN "OrderItem" i ON i."id"=r."orderItemId" WHERE r."id" LIKE 'presentation-comparison-review-%' OR r."id"=ANY($1::text[])`,[specs.map(x=>x[1])]);
 if(rows.length!==30)throw new Error('예상 정비 대상 30건과 다름: '+rows.length);
 for(const [key] of specs)if(!existsSync(`public/reviews/curated/${key}.png`))throw new Error('사진 없음: '+key);
 for(const key of ['sunflower','blue'])if(!existsSync(`public/reviews/curated/${key}-ai.png`))throw new Error('AI 예상 이미지 없음: '+key);
 const manifest=specs.map(([key,id,name,sizeId,wrappingId,flowers,content])=>{const old=rows.find(r=>r.id===id);return {key,id,name,content,productId:`curated-style-product-${key}`,sellerId:old.sellerId,orderItemId:old.orderItemId,images:[`/reviews/curated/${key}.png`],previewImageUrl:['blue','sunflower'].includes(key)?`/reviews/curated/${key}-ai.png`:old.previewImageUrl,composition:{sizeId,wrappingId,flowers:flowers.map(([id,quantity])=>({id,quantity})),provenance:'AI_STAGED_EXAMPLE',styleTitle:name}}});
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
