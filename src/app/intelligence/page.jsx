'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {Database,ExternalLink,ShieldAlert,RefreshCw} from 'lucide-react';

export default function IntelligenceCoverage(){
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 async function reload(){
  setLoading(true);
  try{
   const r=await fetch('/api/intelligence/catalog',{cache:'no-store'});
   const j=await r.json();
   if(!r.ok||!j.success)throw new Error(j.error||'Coverage unavailable');
   setData(j);setError('');
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{reload()},[]);
 return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
  <Header title="Intelligence coverage" subtitle="ASURA Defense Intelligence System™ — Developed by MAH Quantum"/>
  <section className="rounded-lg border bg-white p-5 space-y-3">
   <div className="flex justify-between gap-3 flex-wrap items-center">
    <h2 className="font-semibold flex gap-2 items-center"><Database size={19}/> DEVASHRI source coverage</h2>
    <button type="button" onClick={reload} disabled={loading} className="rounded border px-3 py-2 text-sm flex gap-2 items-center">
     <RefreshCw size={14}/> Refresh catalog
    </button>
   </div>
   <p className="text-sm text-slate-700">Ask DEVASHRI one question across public data domains. It routes requests to implemented sources and may research other public websites when allowed. A listed provider is not evidence of a live feed, valid licence, or 100% coverage.</p>
   <Link href="/agent" className="inline-flex items-center gap-2 text-sky-700 underline text-sm">
    Open DEVASHRI conversational research <ExternalLink size={14}/>
   </Link>
   <p className="text-xs text-slate-500">Public read-only data only. No military targeting, restricted camera access, personal surveillance, or unpublished source data.</p>
  </section>
  {error&&<p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">{error}</p>}
  {!data&&!error&&<p className="text-sm text-slate-500">Loading source coverage…</p>}
  {data&&<>
   <p className="text-sm text-slate-600">{data.sectorCount} domains catalogued · Public providers have different schedules, quotas and reuse terms.</p>
   <div className="grid gap-4 sm:grid-cols-2">
    {data.sectors.map(s=><article key={s.id} className="rounded-lg border bg-white p-5 space-y-3">
     <h3 className="text-base font-semibold">{s.label}</h3>
     <p className="text-xs font-semibold text-sky-800">
      {s.connected.length?'Read-only adapters implemented':'Web research only — no dedicated adapter'}
     </p>
     {s.connected.length>0&&<p className="text-sm">
      <strong>Implemented:</strong> {s.connected.join(' · ')}
     </p>}
     {s.webResearch.length>0&&<p className="text-sm text-slate-700">
      <strong>Available to research when permitted:</strong> {s.webResearch.join(' · ')}
     </p>}
     <p className="text-xs text-slate-500 flex gap-2 items-start">
      <ShieldAlert size={14} className="shrink-0"/>{s.limitations}
     </p>
     <Link href={'/agent?question='+encodeURIComponent('What publicly verifiable information can ASURA retrieve about '+s.label+' today?')}
      className="text-xs text-sky-700 underline inline-block">
      Ask DEVASHRI about this area
     </Link>
    </article>)}
   </div>
  </>}
 </main>;
}
