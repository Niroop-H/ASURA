'use client';
import {useState} from 'react';
export default function QueryInterface() {
 const [query,setQuery]=useState('');
 const [sources,setSources]=useState(['earthquakes','events','news']);
 const [working,setWorking]=useState(false);
 const [result,setResult]=useState(null);
 async function submit(event){
  event.preventDefault(); setWorking(true); setResult(null);
  try {
   const response=await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,sources})});
   setResult(await response.json());
  }catch(error){setResult({success:false,error:error.message});}
  finally{setWorking(false);}
 }
 const names={earthquakes:'USGS',events:'NASA EONET',flights:'OpenSky',weather:'OpenWeather',news:'NewsAPI'};
 return <div className="defense-card p-5 space-y-5">
  <h2 className="text-base font-semibold">Ask ASURA about retrieved data</h2>
  <p className="text-xs text-slate-600">Answers use recent retrieved records from selected providers. Not all records are included; absent evidence is not evidence of absence.</p>
  <div className="flex flex-wrap gap-3">{Object.entries(names).map(([id,name])=><label key={id} className="text-xs flex gap-1 items-center"><input type="checkbox" checked={sources.includes(id)} onChange={e=>setSources(s=>e.target.checked?[...s,id]:s.filter(x=>x!==id))}/>{name}</label>)}</div>
  <form onSubmit={submit} className="space-y-3">
   <textarea value={query} onChange={e=>setQuery(e.target.value)} maxLength={1200} className="w-full min-h-28 border rounded p-3 text-sm" placeholder="What do today's available observations show?" required/>
   <button disabled={working||!sources.length} className="bg-slate-900 text-white text-sm px-5 py-2 rounded disabled:opacity-50">{working?'Retrieving evidence…':'Ask with live evidence'}</button>
  </form>
  {result&&<div className="space-y-4" aria-live="polite">
   {result.error&&<p role="alert" className="bg-amber-50 text-amber-950 p-3 text-sm">{result.error}</p>}
   {result.answer&&<div className="bg-slate-50 border p-4 rounded text-sm whitespace-pre-wrap">{result.answer}</div>}
   {result.failed?.length>0&&<p className="text-xs text-amber-800">Unavailable sources: {result.failed.map(x=>x.source+' ('+x.error+')').join('; ')}</p>}
   {result.records?.length>0&&<details className="text-sm"><summary className="cursor-pointer font-medium">View retrieved evidence ({result.records.length} records)</summary><div className="mt-3 space-y-2 max-h-80 overflow-y-auto">{result.records.map(r=><div key={r.id} className="border rounded p-3"><p className="font-medium">{r.title}</p><p className="text-xs">{r.description}</p><p className="text-xs text-slate-500 mt-1">{r.id} · {r.source} · observed {r.observedAt||'unspecified'} · retrieved {r.retrievedAt}</p>{r.url&&<a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 underline">Original source</a>}</div>)}</div></details>}
  </div>}
 </div>;
}
