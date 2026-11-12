'use client';
import {useState} from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {Activity,Download,RefreshCw,ShieldAlert} from 'lucide-react';
export default function ReadinessPage(){
 const [report,setReport]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function run(){
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/intelligence/assurance',{cache:'no-store'});
   const d=await r.json();
   if(!r.ok||!d.success)throw Error(d.error||'Readiness probe failed');
   setReport(d);
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 function exportReport(){
  if(!report)return;
  // Portable evidence pack. Digest is produced by the server and can be
  // independently rechecked; no false claim of signed/tamper-proof storage.
  const data=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(data);
  const a=document.createElement('a');a.href=url;
  a.download='asura-readiness-'+new Date().toISOString().slice(0,19).replace(/[:]/g,'-')+'.json';
  a.click();URL.revokeObjectURL(url);
 }
 return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
  <Header title="Operational readiness · DEVELOPMENT ONLY"
   subtitle="ASURA Defense Intelligence System™ — Developed by MAH Quantum"/>
  <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
   <p className="font-bold flex items-center gap-2"><ShieldAlert size={18}/>
    Not validated for defence, flight operations, emergency response, or critical infrastructure decisions
   </p>
   <p className="mt-2">Checks below are isolated endpoint samples. They do not establish 24/7 uptime, certified accuracy, a security audit, reproducible persistent storage, or authorization to use licensed data.</p>
  </section>
  <section className="rounded-lg border bg-white p-5 space-y-3">
   <p className="text-sm text-slate-700">
    Run fresh official-source checks. Green connectivity means the endpoint returned parseable data,
    not that its latest item is recent. Publication and retrieval freshness have separate states.
   </p>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={run} disabled={loading}
     className="rounded bg-slate-900 text-white px-4 py-2 text-sm flex gap-2 items-center">
     <RefreshCw size={15}/>{loading?'Checking public providers…':'Run source checks'}
    </button>
    <button type="button" onClick={exportReport} disabled={!report}
     className="rounded border px-4 py-2 text-sm flex gap-2 items-center">
     <Download size={15}/> Export check results
    </button>
    <Link href="/intelligence" className="underline text-sky-700 text-sm self-center">
     All intelligence domains
    </Link>
   </div>
   {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
   {report&&<p className="text-xs text-slate-500">
    Checked {new Date(report.checkedAt).toLocaleString()} · {report.checkCount} providers probed ·
    {report.freshItemCount} source groups have a fresh published item; 0 are operationally approved.
    No continuous monitoring or permanent audit log is enabled.
   </p>}
  </section>
  {report&&<div className="grid gap-4 sm:grid-cols-2">
   {report.sources.map(s=><article className="rounded-lg border bg-white p-4 space-y-2" key={s.source}>
    <div className="flex flex-wrap justify-between items-center gap-2">
     <h3 className="font-semibold">{s.name}</h3>
     <span className={'text-xs rounded border px-2 py-1 '+
      (s.transport==='ok'&&s.content==='fresh'?'bg-emerald-50 text-emerald-800':
       s.transport==='down'?'bg-red-50 text-red-800':'bg-amber-50 text-amber-900')}>
      {s.transport==='down'?'SOURCE DOWN':
       s.content==='fresh'?'FRESH PUBLIC ITEM':s.content==='stale'?'CONTENT STALE':
       s.content==='invalid'?'INVALID TIME':'DATE UNVERIFIED'}
     </span>
    </div>
    <p className="text-xs">Transport: <strong>{s.transport}</strong> · Data freshness:
      <strong> {s.content}</strong> · Records sampled: {s.recordCount??0}</p>
    <p className="text-xs text-slate-600">{s.reason}</p>
    <p className="text-xs text-slate-600">Provider time: {s.sourceTime||'Not published'} ·
     Retrieved: {s.retrievedAt||'Not retrieved'}</p>
    <p className="text-xs text-slate-600">Expected poll: {s.cadenceMinutes} min ·
     Content threshold: {s.maxContentAgeMinutes} min</p>
    <p className="text-xs text-slate-600">{s.scope}</p>
    <p className="text-xs">Licence status: {s.licensing}</p>
    {s.sha256&&<p className="text-[10px] font-mono break-all text-slate-500">
     Snapshot SHA-256: {s.sha256}</p>}
    <p className="text-xs text-slate-500">Check is not an operational acceptance test.</p>
   </article>)}
  </div>}
 </main>;
}
