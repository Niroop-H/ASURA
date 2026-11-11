import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET(request) {
 const q = new URL(request.url).searchParams.get('q')?.trim() || '';
 if (!q || q.length > 150) return NextResponse.json({success:false,error:'Search query must be 1–150 characters'},{status:400});
 if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID)
  return NextResponse.json({success:false,error:'Google Programmable Search credentials are not configured',records:[]},{status:503});
 try {
  const url=new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key',process.env.GOOGLE_SEARCH_API_KEY);
  url.searchParams.set('cx',process.env.GOOGLE_SEARCH_ENGINE_ID);
  url.searchParams.set('q',q);
  url.searchParams.set('num','8');
  const upstream=await fetch(url,{signal:AbortSignal.timeout(10000),next:{revalidate:180}});
  if(!upstream.ok)throw new Error('Search provider HTTP '+upstream.status);
  const data=await upstream.json();
  if(!Array.isArray(data.items)&&data.searchInformation?.totalResults !== '0') throw new Error('Invalid Google Search response');
  const records=(data.items||[]).map((item,i)=>({
   id:String(i),title:item.title||'Untitled',
   description:item.snippet||'',
   url:item.link?.startsWith('https://')?item.link:null,
   source:'Google Programmable Search'
  }));
  return NextResponse.json({success:true,provider:'Google Programmable Search',retrievedAt:new Date().toISOString(),records});
 }catch(e){return NextResponse.json({success:false,error:e.message,records:[]},{status:502});}
}
