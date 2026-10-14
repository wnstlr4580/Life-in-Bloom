import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fetchLatestAtDailyAuctions } from '../lib/atDailyAuction';
dotenv.config({path:'.env.local',override:true,quiet:true});
async function main(){
 const results=await fetchLatestAtDailyAuctions();
 const rows=results.flatMap(r=>r.rows);
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
 if(process.argv.includes('--save')) for(let i=0;i<rows.length;i+=300){const {error}=await db.from('PublicMarketAuctionPrice').upsert(rows.slice(i,i+300),{onConflict:'marketId,tradeDate,itemName'});if(error)throw new Error(error.message);}
 console.log(JSON.stringify({saved:process.argv.includes('--save')?rows.length:0,markets:results.map(r=>({id:r.market.id,status:r.status,error:'error' in r?r.error:undefined,rows:r.rows.length,roses:r.rows.filter(x=>x.itemName==='장미').map(x=>({date:x.tradeDate,qty:x.quantity,price:x.averagePrice}))}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
