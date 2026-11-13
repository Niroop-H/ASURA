'use client';
import {useMemo,useState} from 'react';
import Header from '@/components/Header';
import {
 Shield,ShieldCheck,Search,Layers,ExternalLink,Play,FileText,
 LockKeyhole,Info,Activity,GitBranch,RefreshCw,AlertTriangle,
} from 'lucide-react';
import {
 RED_TEAM_CATEGORIES,RED_TEAM_TOOLS,RED_TEAM_DISCLAIMER,
 searchRedTeamTools,
} from '@/lib/redTeamCatalog';
import {RED_TEAM_ACTIONS} from '@/lib/redTeamReadOnly';
import {DEFENCE_SCENARIOS} from '@/lib/defenceValidationEngine';

const copy={
 inventory:'Show the exact number of referenced tools in each category. Nothing is installed.',
 search:'Search only the supplied references by their name or stated purpose.',
 'assessment-plan':'Prepare a permission-first checklist. Does not scan or contact an asset.',
 'verify-reference':'Check one allowlisted public GitHub repository for metadata only.',
 'defence-drill':'Run six synthetic detection scenarios and evaluate safe alert rules; no real targets.',
 'integration-matrix':'Review the 50-tool defensive integration planning matrix; all remain unconnected.',
};
const shortDate=s=>{
 if(!s)return 'Unavailable';
 const date=new Date(s);
 return Number.isNaN(date.getTime())?'Unavailable':date.toLocaleString();
};
export default function RedTeamPage(){
 const [category,setCategory]=useState('all');
 const [term,setTerm]=useState('');
 const [action,setAction]=useState('defence-drill');
 const [scenario,setScenario]=useState('all');
 const [repo,setRepo]=useState(RED_TEAM_TOOLS[0].repository);
 const [scope,setScope]=useState('');
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState(null);
 const [error,setError]=useState('');
 const visible=useMemo(()=>searchRedTeamTools(term,category,50),[term,category]);
 const execute=async(selected=action,selectedRepo=repo)=>{
  if(busy)return;
  setBusy(true);setError('');setResult(null);
  try{
   const response=await fetch('/api/red-team',{
    method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:selected,query:term,category,scope,repository:selectedRepo,scenario})
   });
   const body=await response.json();
   if(!response.ok||!body.success)throw Error(body.error||'Read-only request was rejected.');
   setAction(selected);
   setResult(body);
  }catch(err){setError(String(err.message||'Read-only check failed').slice(0,260))}
  finally{setBusy(false)}
 };
 return (
  <main className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
   <Header title="Red Team" subtitle="Security tooling reference catalogue and offline defensive validation engine"/>
   <section className="rounded-xl bg-slate-950 text-white p-5 md:p-7 space-y-4">
    <div className="flex flex-wrap justify-between gap-4 items-start">
     <div className="space-y-2 max-w-3xl">
      <p className="text-xs uppercase tracking-[0.2em] font-mono text-sky-300 flex items-center gap-2">
       <Shield size={15}/> ASURA / Security research
      </p>
      <h2 className="text-xl md:text-2xl font-semibold">50 tools. One searchable catalogue.</h2>
      <p className="text-sm text-slate-300 leading-relaxed">
       Reference material for authorized security assessment, synthetic defence validation and training.
       Links are not installations. No command here launches C2, exploitation, credential harvesting,
       phishing campaigns or network pivoting.
      </p>
     </div>
     <span className="rounded border border-amber-400/40 bg-amber-500/10 text-amber-200 text-[11px] font-mono px-3 py-2">
      REFERENCE-ONLY · NO ATTACK EXECUTION
     </span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
     {[
      ['Tools listed',RED_TEAM_TOOLS.length],
      ['Categories',RED_TEAM_CATEGORIES.length],
      ['Installed here','0'],
      ['Automated attack tools','0']
     ].map(([name,value])=><div key={name} className="rounded-lg bg-white/5 border border-white/10 p-3">
      <p className="text-xs text-slate-400">{name}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
     </div>)}
    </div>
   </section>
   <section className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] gap-5 items-start">
    <div className="defense-card p-5 space-y-5">
     <div className="flex gap-2 items-center">
      <Layers className="text-sky-700" size={18}/>
      <h2 className="font-bold text-slate-900 text-base">Explore repositories</h2>
     </div>
     <div className="grid sm:grid-cols-[minmax(0,1fr)_230px] gap-3">
      <label className="block">
       <span className="sr-only">Search tools</span>
       <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
        <input value={term} onChange={e=>setTerm(e.target.value)}
         placeholder="Search name or purpose" maxLength={100}
         className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm"/>
       </div>
      </label>
      <label className="block">
       <span className="sr-only">Filter by category</span>
       <select value={category} onChange={e=>setCategory(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm w-full">
        <option value="all">All 8 categories</option>
        {RED_TEAM_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
       </select>
      </label>
     </div>
     <div className="flex flex-wrap gap-2">
      {RED_TEAM_CATEGORIES.map(c=><button type="button" key={c.id} onClick={()=>{setCategory(c.id);setTerm('')}}
       className={'rounded border px-2.5 py-1 text-[11px] '+
        (category===c.id?'bg-sky-50 border-sky-300 text-sky-900':'bg-white text-slate-600 border-slate-200 hover:border-sky-300')}>
       {c.name.split(' & ')[0]} <span className="tabular-nums ml-1 text-slate-400">{
        RED_TEAM_TOOLS.filter(x=>x.category===c.id).length
       }</span>
      </button>)}
     </div>
     <div className="flex justify-between text-xs text-slate-500">
      <span>{visible.length} of {RED_TEAM_TOOLS.length} references shown</span>
      <span>External GitHub links</span>
     </div>
     <div className="space-y-2 max-h-[790px] overflow-y-auto pr-1">
      {visible.length===0&&<p className="rounded border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
       No matching catalogue entries. No other tools were silently substituted.
      </p>}
      {visible.map(item=><article key={item.repository}
       className="rounded-lg border border-slate-200 bg-white p-3.5 hover:border-sky-300 transition-colors space-y-2">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 items-center min-w-0">
         <span className="text-[11px] font-mono text-slate-400">#{String(item.number).padStart(2,'0')}</span>
         <h3 className="font-semibold text-slate-900 text-sm break-all">{item.repository}</h3>
        </div>
        <span className="rounded bg-slate-100 text-slate-600 px-2 py-1 text-[10px] font-mono">
         NOT INSTALLED
        </span>
       </div>
       <p className="text-xs text-slate-600 leading-relaxed">{item.purpose}</p>
       <div className="flex flex-wrap gap-3 items-center">
        <a href={item.url} target="_blank" rel="noopener noreferrer"
         className="inline-flex gap-1 items-center text-xs font-medium text-sky-700 hover:underline">
         GitHub repository <ExternalLink size={12}/>
        </a>
        <button type="button" disabled={busy} onClick={()=>{setRepo(item.repository);execute('verify-reference',item.repository)}}
         className="text-xs text-slate-600 hover:text-sky-800 disabled:opacity-50 flex items-center gap-1">
         <RefreshCw size={12}/> Check GitHub metadata
        </button>
       </div>
      </article>)}
     </div>
    </div>
    <div className="space-y-4">
     <section className="defense-card p-5 space-y-4">
      <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
       <Activity size={18} className="text-sky-700"/> Command workspace
      </h2>
      <p className="text-xs text-slate-600 leading-relaxed">
       Run an approved read-only operation autonomously. Arbitrary shell commands,
       target URLs, scanning, payloads, credential collection, third-party tool execution
       and phishing are not enabled.
      </p>
      <label className="block space-y-1">
       <span className="text-xs font-semibold text-slate-700">Approved command</span>
       <select value={action} onChange={e=>{setAction(e.target.value);setResult(null);setError('')}}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        {RED_TEAM_ACTIONS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
       </select>
      </label>
      <p className="text-xs text-slate-500">{copy[action]}</p>
      {action==='defence-drill'&&<label className="block space-y-1">
       <span className="text-xs font-semibold text-slate-700">Defensive control scenario</span>
       <select value={scenario} onChange={e=>{setScenario(e.target.value);setResult(null)}}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="all">Run all six synthetic scenarios</option>
        {DEFENCE_SCENARIOS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
       </select>
       <p className="text-[11px] text-amber-800">
        All observations are fictitious training records. This is not a live network test.
       </p>
      </label>}
      {action==='assessment-plan'&&<label className="block space-y-1">
       <span className="text-xs text-slate-700">Owned lab / assessment label</span>
       <input value={scope} maxLength={100} onChange={e=>setScope(e.target.value)}
        placeholder="E.g. Internal training lab" className="w-full rounded border border-slate-300 px-3 py-2 text-sm"/>
      </label>}
      {action==='verify-reference'&&<label className="block space-y-1">
       <span className="text-xs text-slate-700">Allowlisted repository</span>
       <select value={repo} onChange={e=>setRepo(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-xs">
        {RED_TEAM_TOOLS.map(x=><option key={x.repository} value={x.repository}>{x.repository}</option>)}
       </select>
      </label>}
      {action==='search'&&<p className="text-xs text-slate-600">
       Uses the current repository search and category filters.
      </p>}
      <button type="button" onClick={()=>execute()} disabled={busy}
       className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 px-4 py-2.5 text-white text-sm font-semibold flex gap-2 items-center">
       {busy?<RefreshCw size={15} className="animate-spin"/>:<Play size={15}/>}
       {busy?'Running read-only task…':'Run read-only command'}
      </button>
      {error&&<p role="alert" className="text-xs border border-red-200 bg-red-50 text-red-800 rounded p-3">{error}</p>}
      {result&&<div role="status" className="border border-slate-200 bg-slate-50 p-3 rounded-lg space-y-3">
       <div className="flex gap-2 items-center justify-between">
        <span className="text-xs font-semibold text-slate-900">{result.title||'Read-only result'}</span>
        <span className="text-[10px] text-emerald-800 border border-emerald-200 rounded px-2 py-0.5">COMPLETE</span>
       </div>
       <p className="text-[11px] text-slate-500">Checked {shortDate(result.checkedAt)} · No offensive tools executed</p>
       {result.action==='inventory'&&<div className="space-y-1">
        {result.summary.categories.map(c=><p key={c.id} className="text-xs flex justify-between border-b pb-1 gap-3">
         <span>{c.name}</span><span className="font-mono">{c.count}</span>
        </p>)}
       </div>}
       {result.action==='search'&&<div className="space-y-1 text-xs">
        <p>{result.results.length} matching catalogue references</p>
        {result.results.slice(0,12).map(x=><p key={x.repository}>{x.repository}</p>)}
        {result.results.length>12&&<p>Additional entries are visible in the main catalogue.</p>}
       </div>}
       {result.action==='assessment-plan'&&<div className="space-y-2">
        <p className="text-xs">Scope label: {result.scopeLabel} · Authorization not independently verified</p>
        {result.steps.map(x=><div key={x.id}>
         <p className="text-xs font-semibold text-slate-800">{x.title}</p>
         <p className="text-[11px] text-slate-600">{x.detail}</p>
        </div>)}
       </div>}
       {result.action==='defence-drill'&&<div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
         {[
          ['Synthetic scenarios',result.scenariosTested],
          ['Fixture cases',result.completedCases],
          ['Expected alerts found',result.metrics.truePositive],
          ['Unexpected alerts',result.metrics.falsePositive]
         ].map(([label,value])=><div key={label}
          className="border border-slate-200 bg-white rounded p-2">
          <p className="text-[10px] text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-800 tabular-nums">{value}</p>
         </div>)}
        </div>
        <p className="rounded border border-amber-200 bg-amber-50 text-amber-900 text-[11px] p-2">
         {result.notice} Synthetic self-test success cannot establish operational detection effectiveness.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
         {result.rules.map(rule=><div key={rule.id}
          className="rounded bg-white border border-slate-200 p-2 space-y-1">
          <p className="text-xs font-semibold text-slate-800">{rule.id} · {rule.label}</p>
          <p className="text-[11px] text-slate-600">ATT&CK {rule.technique} · {rule.trigger}</p>
          <p className="text-[11px] text-slate-600">{rule.recommendation}</p>
         </div>)}
        </div>
        <p className="text-[11px] text-slate-600">
         Results: TP {result.metrics.truePositive}, FP {result.metrics.falsePositive},
         TN {result.metrics.trueNegative}, FN {result.metrics.falseNegative}.
         No real evidence ingested or tools executed.
        </p>
        <button type="button" onClick={()=>{
         const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
         const url=URL.createObjectURL(blob),anchor=document.createElement('a');
         anchor.href=url;anchor.download='asura-synthetic-defence-drill.json';
         anchor.click();URL.revokeObjectURL(url);
        }} className="border bg-white text-slate-800 px-3 py-2 rounded text-xs font-semibold">
         Export synthetic validation JSON
        </button>
       </div>}
       {result.action==='integration-matrix'&&<div className="space-y-2">
        <p className="text-xs font-semibold">{result.toolCount} mapped references · {result.connectedCount} connected</p>
        <p className="text-[11px] text-amber-800">{result.note}</p>
        <div className="max-h-80 overflow-y-auto space-y-2">
         {result.integrations.map(item=><div key={item.repository}
          className="rounded border bg-white p-2 space-y-1">
          <p className="font-semibold text-xs text-slate-800 break-all">{item.repository}</p>
          <p className="text-[11px] text-slate-600">{item.defensiveUse}</p>
          <p className="font-mono text-[10px] text-amber-700">REFERENCE ONLY · NOT INSTALLED</p>
         </div>)}
        </div>
       </div>}
       {result.action==='verify-reference'&&<div className="text-xs space-y-1 text-slate-700">
        <p><strong>GitHub:</strong> {result.repository}</p>
        <p><strong>Repository returned:</strong> {result.existsOnGitHub?'Yes':'Unverified'}</p>
        <p><strong>Archived:</strong> {result.archived?'Yes':'No'}</p>
        <p><strong>Last push:</strong> {shortDate(result.pushedAt)}</p>
        <p><strong>Licence metadata:</strong> {result.license||'Not supplied'}</p>
        <p><strong>Installation:</strong> Not installed in ASURA</p>
       </div>}
      </div>}
     </section>
     <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="font-semibold text-sm text-amber-950 flex gap-2 items-center">
       <AlertTriangle size={17}/> Engagement safeguards
      </p>
      <p className="text-xs text-amber-900 leading-relaxed">
       Written asset-owner permission, a defined scope, safe test windows, incident response
       contacts and data-handling rules are prerequisites for active exercises. This page
       deliberately does not infer authorization from a text input.
      </p>
     </section>
     <section className="defense-card p-4 space-y-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-900 flex items-center gap-2">
       <LockKeyhole size={16} className="text-sky-700"/> Integration assurance
      </p>
      <p>{RED_TEAM_DISCLAIMER}</p>
      <p className="flex gap-2 items-center text-slate-500">
       <ShieldCheck size={15}/> No agent shell, no target scanning, no credential collection.
      </p>
      <p className="flex gap-2 items-center text-slate-500">
       <GitBranch size={15}/> A successful GitHub metadata check proves repository availability only.
      </p>
      <p className="flex gap-2 items-center text-slate-500">
       <Info size={15}/> Your permission is required before any separate active lab tooling can be connected.
      </p>
     </section>
    </div>
   </section>
  </main>
 );
}
