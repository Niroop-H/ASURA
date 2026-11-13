const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dataUri=content=>'data:text/javascript;base64,'+Buffer.from(content).toString('base64');
const helperSource=fs.readFileSync('src/lib/newsQuery.js','utf8');
const helperUri=dataUri(helperSource);
const helpers=import(helperUri);
const rawLive=fs.readFileSync('src/lib/liveFeeds.js','utf8');
const transpiledLive=rawLive
 .replace("import {getWorldwideWeather} from '@/lib/weatherService';",
  "const getWorldwideWeather=async()=>{throw Error('Weather unexpectedly requested');};")
 .replace("import {topicalNewsQuery} from '@/lib/newsQuery';",
  'const {topicalNewsQuery}=await import('+JSON.stringify(helperUri)+');');
const live=import(dataUri(transpiledLive));
const articles=[{
 title:'Nvidia Jensen Huang discusses GPUs',url:'https://news.example/nvidia',
 description:'Publisher commentary on recent Nvidia announcements',
 publishedAt:'2026-11-13T08:10:00Z',source:{name:'Test Publisher'}
}];
async function withMockFetch(fake,callback){
 const prev=globalThis.fetch,prevKey=process.env.NEWSAPI_KEY;
 globalThis.fetch=fake;process.env.NEWSAPI_KEY='example-private-key-for-tests';
 try{return await callback();}finally{
  globalThis.fetch=prev;
  if(prevKey===undefined)delete process.env.NEWSAPI_KEY;
  else process.env.NEWSAPI_KEY=prevKey;
 }
}
test('specific NVIDIA Jensen Huang request becomes a bounded topic search',async()=>{
 const {topicalNewsQuery,wantsPublisherListing}=await helpers;
 const q='Pass me the data of latest nvidia news jensen huang';
 assert.equal(topicalNewsQuery(q),'nvidia AND jensen AND huang');
 assert.equal(wantsPublisherListing(q),true);
 assert.equal(wantsPublisherListing('Analyze the latest NVIDIA news'),false);
 assert.equal(topicalNewsQuery('Give me the headlines'),null);
 assert.equal(topicalNewsQuery('What is a database?'),null);
});
test('NewsAPI request is topic-specific and credentials never appear in URL',async()=>{
 const {getLiveSource}=await live;
 let seenUrl='',seenHeaders,seenCache;
 await withMockFetch(async(url,opts)=>{
  seenUrl=String(url);seenHeaders=opts.headers;seenCache=opts.cache;
  return {ok:true,status:200,json:async()=>({status:'ok',totalResults:1,articles})};
 },async()=>{
  const result=await getLiveSource('news',{query:'Pass me the data of latest nvidia news jensen huang'});
  assert.equal(result.success,true);
  assert.equal(result.records.length,1);
  assert.equal(result.requestedTopic,'nvidia AND jensen AND huang');
  assert.equal(result.totalPublisherMatches,1);
  assert.equal(result.records[0].title,articles[0].title);
  assert.match(result.coverage,/No unrelated headlines substituted/);
 });
 const url=new URL(seenUrl);
 assert.equal(url.pathname,'/v2/everything');
 assert.equal(url.searchParams.get('q'),'nvidia AND jensen AND huang');
 assert.equal(url.searchParams.get('sortBy'),'publishedAt');
 assert.equal(url.searchParams.get('searchIn'),'title,description');
 assert.equal(seenHeaders['X-Api-Key'],'example-private-key-for-tests');
 assert.equal(seenCache,'no-store');
 assert.ok(!seenUrl.includes('example-private-key'));
});
test('general headlines remain general, no topic attribution',async()=>{
 const {getLiveSource}=await live;let url='';
 await withMockFetch(async(u)=>{url=String(u);return {ok:true,status:200,json:async()=>({status:'ok',totalResults:1,articles})}},async()=>{
  const result=await getLiveSource('news',{query:'Give me the headlines'});
  assert.equal(result.success,true);
  assert.equal(result.requestedTopic,null);
  assert.match(result.coverage,/General English-language/i);
 });
 assert.equal(new URL(url).pathname,'/v2/top-headlines');
 assert.equal(new URL(url).searchParams.has('q'),false);
});
test('provider 429 cannot return unrelated or fabricated topical headlines',async()=>{
 const {getLiveSource}=await live;
 await withMockFetch(async()=>({ok:false,status:429,json:async()=>({status:'error'})}),async()=>{
  const result=await getLiveSource('news',{query:'latest Nvidia news Jensen Huang'});
  assert.equal(result.success,false);
  assert.match(result.error,/429/);
  assert.equal(result.records,undefined);
 });
});
test('agent route serves topic-filtered publisher records without Groq web research',async()=>{
 const raw=fs.readFileSync('src/app/api/agent/route.js','utf8');
 const agentMock=[
  "const CONTEXT_SOURCES=['news'];",
  "const selectAgentSources=()=>['news'];",
  "const resolveFollowupQuestion=q=>q;",
  "const loadPublicSnapshot=async()=>{throw Error('Unexpected snapshot')};",
  "const assembleAgentContext=async()=>({",
  " checkedAt:'2026-11-13T08:30:00Z',",
  " statuses:[{source:'news',success:true,requestedTopic:'nvidia AND jensen AND huang'}],",
  " records:[{id:'news:1',source:'news',provider:'Test Publisher',",
  " title:'Nvidia Jensen Huang discusses GPUs',description:'Reported NVIDIA CEO announcement',",
  " url:'https://news.example/nvidia',observedAt:'2026-11-13T08:10:00Z',",
  " retrievedAt:'2026-11-13T08:30:00Z'}]",
  "});"
 ].join('\n');
 const route=raw
  .replace("import {NextResponse} from 'next/server';",'const NextResponse=Response;')
  .replace("import {callGroq,groqHealth} from '@/lib/aiProvider';",
    "const callGroq=async()=>{throw Error('Unnecessary Groq call')}; const groqHealth=async()=>({ready:true});")
  .replace("import {assembleAgentContext,selectAgentSources,resolveFollowupQuestion,loadPublicSnapshot,CONTEXT_SOURCES} from '@/lib/agentContext';",agentMock)
  .replace("import {INTELLIGENCE_SECTORS,compactCapabilitySummary} from '@/lib/intelligenceCatalog';",
   "const INTELLIGENCE_SECTORS=[];const compactCapabilitySummary=()=>[];")
  .replace("import {airportArrivalIntent,verifiedAirportBoardAnswer} from '@/lib/aviationVerification';",
   "const airportArrivalIntent=()=>null;const verifiedAirportBoardAnswer=()=>{throw Error('Unexpected airport board')};")
  .replace("import {wantsPublisherListing} from '@/lib/newsQuery';",
   'const {wantsPublisherListing}=await import('+JSON.stringify(helperUri)+');');
 const {POST}=await import(dataUri(route));
 const response=await POST(new Request('http://localhost/api/agent',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({message:'Pass me the data of latest nvidia news jensen huang',mode:'auto',webResearch:true})
 }));
 assert.equal(response.status,200);
 const answer=await response.json();
 assert.equal(answer.success,true);
 assert.equal(answer.model,null);
 assert.equal(answer.modelBrand,'Quantum[-0-]Brain D25@1007');
 assert.equal(answer.answerType,'retrieved-source-records-only');
 assert.match(answer.answer,/Nvidia Jensen Huang discusses GPUs/);
 assert.ok(!answer.answer.includes('Apple Support'));
 assert.equal(answer.webResearch.executedVerified,false);
});
