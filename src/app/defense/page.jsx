'use client';
import {useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {
 ShieldCheck,ShieldAlert,KeyRound,Play,RefreshCcw,Layers,CheckCircle2,
 AlertTriangle,Clock3,Activity,Download,ChevronDown,ChevronUp,
 LockKeyhole,FileText,Workflow,Database,ExternalLink,Eye,EyeOff
} from 'lucide-react';
import {BLUE_TEAM_TOOLS,BLUE_TEAM_CATEGORIES} from '@/lib/blueTeamCatalog';

const QUICK=[
 {id:'hunt',label:'Threat Hunt IP / Domain',text:'Investigate public indicator 185.220.101.4 using read-only MISP, Wazuh, and available threat intelligence. Explain which sources are actually connected. Do not block anything.'},
 {id:'container',label:'Container & Web CVE Audit',text:'Review Trivy and WAF diagnostic readiness, and explain what approved local or remote vulnerability reports are required. Do not actively scan external targets.'},
 {id:'contain',label:'Autonomous Incident Containment',text:'Investigate public indicator 185.220.101.4 from authorized read-only sources. If justified, propose an IP-block response for human approval. Do not execute containment without authorization.'},
 {id:'coverage',label:'50-Tool Coverage Audit',text:'Inspect readiness of the Blue Team tool registry. Report unavailable integrations and defensive next steps without inventing live data.'},
];
const compact=value=>typeof value==='string'?value.slice(0,240):'';
const date=value=>{
 if(!value)return 'Not reported';
 const d=new Date(value);
 return Number.isNaN(d.getTime())?value:d.toLocaleString();
};
const color=type=>type==='error'?'border-red-200 bg-red-50 text-red-900':
 type==='approval'?'border-amber-200 bg-amber-50 text-amber-900':
 type==='complete'?'border-emerald-200 bg-emerald-50 text-emerald-900':
 'border-slate-200 bg-white text-slate-900';

export default function DefenseOperationsConsole(){
 const [operatorToken,setOperatorToken]=useState('');
 const [reveal,setReveal]=useState(false);
 const [directive,setDirective]=useState(QUICK[0].text);
 const [busy,setBusy]=useState(false);
 const [checking,setChecking]=useState(false);
 const [events,setEvents]=useState([]);
 const [error,setError]=useState('');
 const [approval,setApproval]=useState(null);
 const [approvalResult,setApprovalResult]=useState(null);
 const [tools,setTools]=useState(null);
 const [category,setCategory]=useState('all');
 const [expanded,setExpanded]=useState(false);
 const streamRef=useRef(null);
 const verified=tools?.tools?.length===50;
 const matrix=useMemo(()=>{
  const registry=verified?tools.tools:BLUE_TEAM_TOOLS.map(x=>({
   repository:x.repository,name:x.name,category:x.category,
   tier:'—',risk_level:'UNKNOWN',status:'NOT_CONNECTED',
   operationallyValidated:false,
  }));
  return registry.filter(x=>category==='all'||x.category===category);
 },[tools,category,verified]);
 const stats=useMemo(()=>({
  connected:tools?.readiness?.connectedVerified??0,
  metadata:tools?.tools?.length||50,
  observations:events.filter(x=>x.type==='tool').length,
  errors:events.filter(x=>x.type==='error').length,
 }),[events,tools]);
 const append=event=>setEvents(old=>[...old,event].slice(-100));
 const checkTools=async()=>{
  setChecking(true);setError('');
  try{
   if(operatorToken.length<32)throw Error('Enter your authorized operator access token first.');
   const r=await fetch('/api/defense',{
    headers:{'X-ASURA-Operator-Token':operatorToken},cache:'no-store',
   });
   const body=await r.json();
   if(!r.ok||!body.success)throw Error(body.error||'Tool status unavailable');
   setTools(body);
  }catch(e){setError(String(e.message||'Failed to check backend').slice(0,240));setTools(null)}
  finally{setChecking(false)}
 };
 const run=async()=>{
  if(busy)return;
  setError('');setEvents([]);setApproval(null);setApprovalResult(null);
  if(operatorToken.length<32){setError('Enter a configured operator access token (server-side ASURA_DEFENSE_ACCESS_TOKEN).');return}
  if(directive.trim().length<4){setError('Enter a defensive directive first.');return}
  setBusy(true);
  const controller=new AbortController();
  streamRef.current=controller;
  let done=false;
  try{
   const response=await fetch('/api/defense',{
    method:'POST',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json','X-ASURA-Operator-Token':operatorToken},
    body:JSON.stringify({directive:directive.trim()}),
   });
   if(!response.ok){
    const body=await response.json().catch(()=>({}));
    throw Error(body.error||'Vercel-to-Render request rejected (HTTP '+response.status+')');
   }
   if(!response.body)throw Error('Signed event stream is unavailable.');
   const reader=response.body.getReader(),decoder=new TextDecoder();
   let buffer='';
   for(;;){
    const {value,done:end}=await reader.read();
    if(end)break;
    buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');
    if(buffer.length>130000)throw Error('Stream exceeded expected event size.');
    let idx;
    while((idx=buffer.indexOf('\n\n'))!==-1){
     const block=buffer.slice(0,idx);buffer=buffer.slice(idx+2);
     const row=block.split('\n').find(s=>s.startsWith('data: '));
     if(!row)continue;
     const event=JSON.parse(row.slice(6));
     append(event);
     if(event.type==='approval'&&event.approval?.approvalToken){
      setApproval(event.approval);
     }
     if(event.type==='complete')done=true;
    }
   }
   if(!done)append({type:'error',status:'INCOMPLETE',
    summary:'Stream ended without a verified completion. No action is assumed to have succeeded.'});
  }catch(e){
   if(e.name!=='AbortError')setError(String(e.message||'Execution failed').slice(0,260));
   else append({type:'error',status:'STOPPED',summary:'Browser disconnected; previously started backend work may have continued.'});
  }finally{setBusy(false);streamRef.current=null}
 };
 const decide=async decision=>{
  if(!approval||busy)return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/defense/approve',{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json','X-ASURA-Operator-Token':operatorToken},
    body:JSON.stringify({decision,approvalToken:approval.approvalToken}),
   });
   const result=await r.json();
   if(!r.ok)throw Error(result.error||result.status||'Approval not accepted');
   setApprovalResult(result);
   append({
    type:'approval-result',timestamp:result.checkedAt,status:result.status,
    summary:result.reason||result.note||'Operator decision recorded.',
    ledger:{inProcessMerkleRoot:result.ledger?.after?.root,
     localVerified:result.ledger?.verifiedInProcess,persistent:false},
   });
   setApproval(null);
  }catch(e){setError(String(e.message||'Approval failed').slice(0,260))}
  finally{setBusy(false)}
 };
 const exportEvidence=()=>{
  const payload={
   generatedAt:new Date().toISOString(),
   directiveSha256:'Not included in browser report; see hashed server events',
   events:events.map(e=>e.type==='approval'?{
    ...e,approval:{...e.approval,approvalToken:'[REDACTED]'}
   }:e),toolMetadata:tools?.readiness||null,
   auditLimitations:'In-process Merkle root only. No persistent independent anchoring.',
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='asura-defense-operations-development-report.json';a.click();
  URL.revokeObjectURL(url);
 };
 return <main className="p-5 md:p-8 max-w-7xl w-full mx-auto space-y-5 bg-slate-50 text-slate-900">
  <Header title="Autonomous Defense Operations" subtitle="Signed Vercel → Render orchestration · Groq planning · human-approved response"/>
  <section className="rounded-xl bg-white border border-slate-300 p-5 md:p-6 space-y-4">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <p className="uppercase text-[11px] tracking-widest font-mono text-sky-800 flex gap-2 items-center">
      <ShieldCheck size={16}/> ASURA / Quantum[-0-]Brain D25@1007
     </p>
     <h2 className="font-bold text-xl mt-1">Defense Command Console</h2>
     <p className="text-xs text-slate-600 mt-2 max-w-3xl">
      The Groq backend uses a separately identified foundation model for tool-call planning.
      This console shows concise execution decisions, evidence and action status—not the model's private reasoning.
     </p>
    </div>
    <span className="border border-amber-300 text-amber-900 bg-amber-50 rounded px-3 py-2 text-[11px] font-mono">
     DEVELOPMENT · NO MILITARY ACCREDITATION
    </span>
   </div>
   <div className="grid sm:grid-cols-4 gap-3">
    <div className="rounded bg-slate-50 border p-3"><p className="text-[11px] text-slate-500">Registered tools</p><p className="text-2xl font-bold">50</p></div>
    <div className="rounded bg-slate-50 border p-3"><p className="text-[11px] text-slate-500">Verified provider connections</p><p className="text-2xl font-bold">{stats.connected}</p></div>
    <div className="rounded bg-slate-50 border p-3"><p className="text-[11px] text-slate-500">Tool observations</p><p className="text-2xl font-bold">{stats.observations}</p></div>
    <div className="rounded bg-slate-50 border p-3"><p className="text-[11px] text-slate-500">Reported errors</p><p className="text-2xl font-bold">{stats.errors}</p></div>
   </div>
  </section>
  <section className="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] gap-5 items-start">
   <div className="space-y-5 min-w-0">
    <div className="rounded-lg bg-white border border-slate-300 p-5 space-y-4">
     <h3 className="font-bold flex gap-2 items-center"><LockKeyhole size={17} className="text-sky-700"/> Operator authorization</h3>
     <p className="text-xs text-slate-600">Enter the private operator access token configured on Vercel. It remains in browser memory and is transmitted only to Vercel over HTTPS; it is never sent to Render or stored in localStorage.</p>
     <div className="flex gap-2">
      <input value={operatorToken} type={reveal?'text':'password'}
       autoComplete="off" spellCheck={false}
       onChange={e=>setOperatorToken(e.target.value.slice(0,200))}
       placeholder="Operator access token" aria-label="Authorized operator access token"
       className="flex-1 min-w-0 border border-slate-300 bg-slate-50 rounded px-3 py-2 text-sm"/>
      <button type="button" onClick={()=>setReveal(x=>!x)} aria-label={reveal?'Hide operator token':'Show operator token'}
       className="border rounded px-3 text-slate-600">{reveal?<EyeOff size={16}/>:<Eye size={16}/>}</button>
      <button type="button" onClick={checkTools} disabled={checking||busy}
       className="border border-sky-700 text-sky-800 rounded px-3 font-semibold text-xs hover:bg-sky-50 disabled:opacity-50">
       {checking?'Checking…':'Check backend'}
      </button>
     </div>
    </div>
    <div className="rounded-lg bg-white border border-slate-300 p-5 space-y-4">
     <h3 className="font-bold flex items-center gap-2"><Workflow size={18} className="text-sky-700"/> Natural-language directive</h3>
     <div className="flex flex-wrap gap-2">
      {QUICK.map(x=><button key={x.id} type="button" disabled={busy} onClick={()=>setDirective(x.text)}
       className="border border-slate-300 hover:border-sky-400 rounded bg-slate-50 px-3 py-2 text-xs text-slate-700 disabled:opacity-50">
       {x.label}
      </button>)}
     </div>
     <textarea value={directive} maxLength={900} onChange={e=>setDirective(e.target.value)}
      aria-label="Autonomous defensive directive" rows={5} spellCheck={false}
      className="w-full border border-slate-300 bg-slate-50 rounded px-3 py-3 text-sm resize-y"
      placeholder="Investigate a public IOC using authorized sources. Propose, but do not automatically apply, response actions."/>
     <div className="flex flex-wrap items-center gap-2 justify-between">
      <p className="text-[11px] text-slate-500">Maximum 900 characters · bounded model loop · no arbitrary shell or remote scanning</p>
      <div className="flex gap-2">
       {busy&&<button type="button" onClick={()=>streamRef.current?.abort()}
        className="border border-rose-200 text-rose-800 px-3 py-2 rounded text-xs font-semibold">Disconnect stream</button>}
       <button type="button" onClick={run} disabled={busy}
        className="rounded bg-sky-700 hover:bg-sky-800 text-white px-4 py-2.5 text-xs font-bold flex gap-2 items-center disabled:opacity-50">
        {busy?<RefreshCcw size={15} className="animate-spin"/>:<Play size={15}/>}
        {busy?'Executing…':'Execute authorized plan'}
       </button>
      </div>
     </div>
     {error&&<p role="alert" className="rounded border border-red-300 bg-red-50 text-red-900 text-xs px-3 py-2">{error}</p>}
    </div>
    {approval&&<section className="rounded-lg border-2 border-amber-500 bg-amber-50 p-5 space-y-3">
     <h3 className="font-bold text-amber-950 flex items-center gap-2"><ShieldAlert size={20}/> Human authorization required</h3>
     <p className="text-xs text-amber-900">Execution is paused. Review the exact proposal and target. Approval does not itself authorize access to an unapproved asset or guarantee the external bridge can apply a response.</p>
     <dl className="grid sm:grid-cols-2 gap-2 text-xs">
      <div><dt className="text-amber-700">Action</dt><dd className="font-mono font-bold">{approval.proposal?.action}</dd></div>
      <div><dt className="text-amber-700">Target</dt><dd className="font-mono font-bold">{approval.proposal?.target}</dd></div>
     </dl>
     <p className="text-xs">{approval.proposal?.reason}</p>
     <p className="font-mono break-all text-[11px] text-amber-900">SHA-256 proposal seal: {approval.proposalSha256}</p>
     <p className="text-[11px] text-amber-900">Expires: {date(approval.expiresAt)} · Must still pass server-side scope policy</p>
     <div className="flex gap-2 flex-wrap">
      <button onClick={()=>decide('approve')} disabled={busy} className="bg-amber-800 text-white rounded px-4 py-2 text-xs font-semibold disabled:opacity-50">
       Approve & request execution
      </button>
      <button onClick={()=>decide('reject')} disabled={busy} className="border border-amber-700 rounded px-4 py-2 text-xs text-amber-900 font-semibold disabled:opacity-50">
       Reject
      </button>
     </div>
    </section>}
    {approvalResult&&<div role="status" className="rounded border border-slate-300 bg-white p-4 text-xs space-y-2">
     <p className="font-bold">Approval outcome: {approvalResult.status}</p>
     <p>{approvalResult.reason||approvalResult.note}</p>
     <p>Actual action reported executed: <strong>{approvalResult.executed?'YES — verify external receipt':'NO'}</strong></p>
    </div>}
    <section className="rounded-lg border border-slate-300 bg-white p-5 space-y-4">
     <div className="flex items-center justify-between gap-3">
      <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-sky-700"/> Execution pipeline</h3>
      <button type="button" onClick={exportEvidence} disabled={!events.length}
       className="border rounded px-3 py-2 text-xs flex items-center gap-2 disabled:opacity-40">
       <Download size={14}/> Export evidence
      </button>
     </div>
     {!events.length&&<p className="text-xs text-slate-500 border rounded p-5 bg-slate-50">
      No signed execution events. Enter a token and directive, then execute to view verified step summaries.
     </p>}
     <div className="space-y-2 max-h-[690px] overflow-y-auto">
      {events.map((event,i)=><article key={i} className={'rounded border p-3 space-y-2 '+color(event.type)}>
       <div className="flex flex-wrap justify-between gap-2 items-center">
        <p className="text-xs font-bold uppercase">{event.phase||event.type} {event.tool?'· '+event.tool:''}</p>
        <span className="font-mono text-[10px]">{date(event.timestamp)}</span>
       </div>
       <p className="text-xs leading-relaxed">{event.summary||event.status||'Defensive step recorded'}</p>
       {event.latencyMs!==undefined&&<p className="text-[11px]">Observed operation latency: {event.latencyMs} ms</p>}
       {event.evidence&&<details className="text-[11px]">
        <summary className="cursor-pointer font-semibold">Structured result JSON</summary>
        <pre className="overflow-auto rounded border bg-slate-50 text-slate-700 p-2 mt-2 max-h-60 text-[10px]">
         {JSON.stringify(event.evidence,null,2).slice(0,8000)}
        </pre>
       </details>}
       {event.ledger&&<div className="text-[10px] text-slate-600 font-mono space-y-1">
        <p className="flex items-center gap-1">{event.ledger.localVerified?<CheckCircle2 size={13} className="text-emerald-700"/>:<AlertTriangle size={13} className="text-amber-700"/>}
         {event.ledger.localVerified?'In-process hash chain verified':'Ledger verification incomplete'}</p>
        <p className="break-all">Merkle root: {event.ledger.inProcessMerkleRoot}</p>
        <p>Ephemeral · not externally anchored</p>
       </div>}
      </article>)}
     </div>
    </section>
   </div>
   <aside className="space-y-4">
    <section className="rounded-lg bg-white border border-slate-300 p-5 space-y-3">
     <h3 className="font-bold flex items-center gap-2"><Layers size={18} className="text-sky-700"/> 50-Tool Matrix</h3>
     <p className="text-xs text-slate-600">Synced to the existing <Link href="/sources" className="text-sky-700 underline">Source Registry</Link> and <Link href="/blue-team" className="text-sky-700 underline">Blue Team catalogue</Link>. The status below is from signed Render inspection only after an operator check.</p>
     <button type="button" onClick={()=>setExpanded(!expanded)} className="flex items-center justify-between w-full border rounded px-3 py-2 text-xs font-semibold">
      <span>{verified?'Backend registry responded':'Local registry fallback (not verified)'}</span>
      {expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
     </button>
     {expanded&&<>
      <select value={category} onChange={e=>setCategory(e.target.value)}
       className="w-full rounded border px-3 py-2 text-xs" aria-label="Blue Team category">
       <option value="all">All eight categories</option>
       {BLUE_TEAM_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <div className="max-h-[500px] overflow-y-auto space-y-1">
       {matrix.map(tool=><div key={tool.repository} className="rounded border border-slate-200 p-2 text-xs space-y-1 bg-slate-50">
        <p className="font-semibold text-slate-900 break-all">{tool.repository}</p>
        <div className="flex flex-wrap gap-2 text-[10px]">
         <span>Tier {tool.tier}</span><span>Risk {tool.risk_level}</span>
         <span className="font-semibold text-amber-800">{tool.status}</span>
        </div>
       </div>)}
      </div>
     </>}
    </section>
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
     <h3 className="font-bold text-sm text-amber-950 flex gap-2 items-center"><AlertTriangle size={16}/> Operational truth</h3>
     <p className="text-xs text-amber-900">Render Free may spin down; callbacks and pending approvals are not durably stored. All 50 contracts exist, but none is automatically installed by this interface. Responses marked unavailable, configured-unverified, or diagnostic-only are not live SOC evidence.</p>
     <p className="text-xs text-amber-900">No raw hidden reasoning is displayed. Actual containment requires a separately authorized bridge, exact asset scope, and human approval.</p>
    </section>
   </aside>
  </section>
 </main>;
}
