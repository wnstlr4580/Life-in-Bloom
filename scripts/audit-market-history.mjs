import {mkdirSync,writeFileSync} from 'node:fs';
const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());const start=new Date(Date.parse(end)-90*86400000).toISOString().slice(0,10);
const output=[];
for(const [id,code] of [['kflower-gwacheon','1288202296'],['kflower-eumseong','3848200087'],['kflower-goyang','7368200686']]){
 const dates=new Set();let complete=false;
 for(let page=1;page<=15;page++){
 const r=await fetch('https://flower.at.or.kr/hab09/hab09.do',{method:'POST',body:new URLSearchParams({currentPageNo:String(page),searchStrDate:start,searchEndDate:end,mobCmpCd:code}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status);const html=await r.text();const found=[...html.matchAll(/excelExport\('([0-9-]{10})',\s*'([0-9]{10})'\)/g)].filter(x=>x[2]===code).map(x=>x[1]);const before=dates.size;found.forEach(x=>dates.add(x));if(!found.length||dates.size===before){complete=true;break;}
 }
 output.push({id,start,end,complete,fileCount:dates.size,dates:[...dates].sort()});
}
mkdirSync('artifacts/market-audit',{recursive:true});writeFileSync('artifacts/market-audit/history-90-days.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
