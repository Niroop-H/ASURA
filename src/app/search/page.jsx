'use client';
import {useState} from 'react';
export default function SearchPage(){
 const[q,setQ]=useState('');
 const[data,setData]=useState(null);
 const[loading,setLoading]=useState(false);
 async function submit(e){e.preventDefault();setLoading(true);setData(null);try{
  const r=await fetch('/api/search?q='+encodeURIComponent(q),{cache:'no-store'});
  setData(await r.json());
 }catch(e){setData({success:false,error:e.message});}finally{setLoading(false);}}
 return <div className="p-6 md:p-8 space-y-5 max-w-5xl mx-auto w-full">
 <h1 className="text-2xl font-bold">Live web search</h1>
 <p className="text-sm text-slate-600">Queries the configured Google Programmable Search API. This is not unrestricted crawling or automatic access to private websites.</p>
 <form onSubmit={submit} className="flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} maxLength={150} required placeholder="Search public websites…" className="border p-3 rounded flex-1"/><button disabled={loading} className="bg-slate-900 text-white px-5 rounded">{loading?'Searching…':'Search'}</button></form>
 {data?.error&&<p role="alert" className="text-sm bg-amber-50 p-4 rounded">{data.error}</p>}
 {data?.success&&<p className="text-xs text-slate-500">Retrieved at {new Date(data.retrievedAt).toLocaleString()} · {data.records.length} results</p>}
 <div className="space-y-3">{(data?.records||[]).map(r=><div key={r.id} className="defense-card p-4 space-y-1"><h2 className="text-sm font-semibold">{r.title}</h2><p className="text-xs text-slate-600">{r.description}</p>{r.url&&<a className="text-sky-700 underline text-xs" target="_blank" rel="noopener noreferrer" href={r.url}>Open original result</a>}</div>)}</div>
 </div>;
}
