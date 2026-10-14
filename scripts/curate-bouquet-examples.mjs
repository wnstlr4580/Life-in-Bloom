import {config} from 'dotenv';import pg from 'pg';import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
config({path:'.env.local',quiet:true});
const specs=[
 ['white','demo-review-white-rose','화이트 장미와 안개꽃','basic','kraft',[['rose-white',8],['babysbreath-white',4]],'AI 예상안은 둥글고 촘촘하지만, 비교 사진은 장미 높이를 고르게 맞추지 않은 작은 묶음이에요. 한쪽으로 접힌 크라프트지와 드문드문 보이는 안개꽃 때문에 같은 구성도 더 소박해 보여요.'],
 ['tulip','demo-review-tulip','주황 튤립과 보라 아네모네','large','linen',[['tulip-orange',13],['anemone-purple',12]],'예상안보다 튤립이 옆으로 벌어지고 보라 아네모네가 꽃 사이에 가려진 모습이에요. 튤립의 굽는 방향과 묶는 위치에 따라 폭이 달라져요. 둥근 형태를 원하면 줄기 높이와 묶는 지점을 먼저 맞춰보세요.'],
 ['calla','demo-review-calla','화이트 카라와 유칼립투스','basic','bouquet',[['calla-white',8],['eucalyptus',4]],'예상 이미지처럼 풍성한 원형보다 줄기의 긴 선이 드러나는 구성입니다. 꽃 높이와 얼굴 방향이 제각각이라 여백이 많아요. 리본을 묶기 전에 정면과 옆면을 모두 확인하면 균형을 잡기 쉬워요.'],
 ['yellow','demo-review-yellow-lily','노란 장미와 화이트 백합','basic','kraft',[['rose-yellow',8],['lily-white',4]],'백합이 모두 활짝 핀 예상안과 달리, 비교 사진에는 봉오리도 섞여 있어요. 같은 송이 수라도 개화 정도에 따라 빈 공간과 부피가 달라집니다. 선물 날짜에 맞춰 백합의 개화 상태를 확인해보세요.'],
 ['sunflower','presentation-review-pink','해바라기와 유칼립투스','basic','linen',[['sunflower',6],['eucalyptus',2]],'해바라기의 꽃 크기와 고개 방향이 달라 예상안보다 들쭉날쭉한 모습이에요. 한쪽으로 기운 꽃을 억지로 정면에 맞추기보다 자연스럽게 펼치고, 무거운 꽃머리를 받치도록 조금 높게 묶는 구성을 참고해보세요.'],
 ['blue','presentation-review-white','파란 수국과 화이트 장미','basic','bouquet',[['hydrangea-blue',3],['rose-white',5]],'예상안의 선명한 파랑보다 연한 청보라빛으로 연출했어요. 수국 꽃머리 크기가 다르고 장미도 한쪽에 모여 있어 덜 대칭적입니다. 원하는 색감은 화면만 보지 말고 구매할 꽃의 사진으로 확인하는 편이 좋아요.'],
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
