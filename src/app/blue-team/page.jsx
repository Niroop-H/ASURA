'use client';
import {useMemo,useRef,useState} from 'react';
import Header from '@/components/Header';
import {
 ShieldCheck,ShieldAlert,Activity,AlertTriangle,Database,Search,
 FileJson,FileText,Play,Download,RefreshCw,ExternalLink,
 LockKeyhole,Eye,Layers,CheckCircle2,Info,
} from 'lucide-react';
import {
 BLUE_TEAM_CATEGORIES,BLUE_TEAM_TOOLS,blueTeamCatalogSummary,searchBlueTeamTools,
} from '@/lib/blueTeamCatalog';
import {
 BLUE_TEAM_IMPORT_FORMATS,BLUE_TEAM_INPUT_TYPES,BLUE_TEAM_MAX_FILE_CHARS,
 BLUE_TEAM_RULES,analyzeBlueTeamEvents,makeSyntheticBlueTeamEvents,
 parseBlueTeamExport,
} from '@/lib/blueTeamEngine';

const time=value=>{
 if(!value)return 'Not supplied';
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'Not verified':d.toLocaleString();
};
const statusClasses={
 high:'border-rose-200 bg-rose-50 text-rose-900',
 medium:'border-amber-200 bg-amber-50 text-amber-900',
 low:'border-sky-200 bg-sky-50 text-sky-900',
};
function Metric({label,value,detail}){
 return <div className="rounded-xl border border-slate-200 bg-white p-4">
  <p className="text-xs text-slate-500">{label}</p>
  <p className="text-2xl font-bold tabular-nums text-slate-900 mt-1">{value}</p>
  {detail&&<p className="text-[11px] text-slate-500 mt-1">{detail}</p>}
 </div>;
}
export default function BlueTeamPage(){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('all');
 const [format,setFormat]=useState('normalized');
 const [source,setSource]=useState('manual');
 const [input,setInput]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState(null);
 const [context,setContext]=useState('');
 const fileInput=useRef(null);
 const visible=useMemo(()=>searchBlueTeamTools(search,category),[search,category]);
 const catalogue=useMemo(()=>blueTeamCatalogSummary(),[]);
 const clear=()=>{setResult(null);setError('');setContext('')};
 const runDemo=()=>{
  try{
   setBusy(true);clear();
   const events=makeSyntheticBlueTeamEvents();
   const report=analyzeBlueTeamEvents(events);
   setResult(report);setContext('Synthetic training fixtures · no real assets or connected products');
  }catch(e){setError(String(e.message||'Synthetic drill failed'))}
  finally{setBusy(false)}
 };
 const analyze=()=>{
  setBusy(true);clear();
  try{
   const parsed=parseBlueTeamExport(input,{format,source});
   if(!parsed.accepted)throw Error('No supported security events were found. Check the export format.');
   const analysis=analyzeBlueTeamEvents(parsed.events);
   setResult(analysis);
   setContext('Local, unverified export · '+parsed.accepted+
    ' normalized · '+parsed.skipped+' skipped · '+parsed.format);
  }catch(e){setError(String(e.message||'Cannot analyze selected export').slice(0,260))}
  finally{setBusy(false)}
 };
 const importFile=async e=>{
  clear();
  const file=e.target.files?.[0];
  if(!file)return;
  if(file.size>BLUE_TEAM_MAX_FILE_CHARS*4){
   setError('File too large. Import no more than 256,000 characters (500 events).');
   e.target.value='';return;
  }
  try{
   const text=await file.text();
   if(text.length>BLUE_TEAM_MAX_FILE_CHARS)throw Error('File exceeds local 256,000-character limit.');
   setInput(text);
   setContext('Selected local file: '+file.name.slice(0,80));
  }catch(err){setError(String(err.message||'Could not read file'))}
  e.target.value='';
 };
 const exportReport=()=>{
  if(!result)return;
  const payload={...result,exportedAt:new Date().toISOString(),
   note:'Local unverified findings. No authenticated SOC ingestion or provider integration.'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='asura-blue-team-local-assessment.json';
  a.click();URL.revokeObjectURL(url);
 };
 return <main className="mx-auto max-w-7xl w-full p-5 md:p-8 space-y-6">
  <Header title="Blue Team" subtitle="Defensive SOC analytics · private local event analysis · security integration registry"/>
  <section className="rounded-2xl bg-slate-950 text-white p-5 md:p-7 space-y-5">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="space-y-2 max-w-3xl">
     <p className="uppercase tracking-widest text-[11px] font-mono text-cyan-300 flex items-center gap-2">
      <ShieldCheck size={16}/> ASURA · Defensive Security Operations
     </p>
     <h2 className="font-semibold text-xl md:text-2xl">Blue Team Defence Analytics</h2>
     <p className="text-sm leading-relaxed text-slate-300">
      Normalize exported defensive events, correlate rule-based signals, examine
      source/timestamp quality, and generate an evidence-linked assessment locally.
      The 50 projects below are integration candidates; none is currently connected.
     </p>
    </div>
    <span className="text-amber-200 border border-amber-500/40 bg-amber-500/10 font-mono text-[11px] rounded px-3 py-2">
     DEVELOPMENT · OFFLINE ANALYTICS
    </span>
   </div>
   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {[
     ['Catalogued projects',BLUE_TEAM_TOOLS.length],
     ['Provider connections',catalogue.connected],
     ['Detection rules',BLUE_TEAM_RULES.length],
     ['Local import formats',BLUE_TEAM_IMPORT_FORMATS.length],
    ].map(([name,n])=><div key={name} className="bg-white/5 rounded-lg border border-white/10 p-3">
     <p className="text-xs text-slate-400">{name}</p>
     <p className="text-2xl font-bold tabular-nums mt-1">{n}</p>
    </div>)}
   </div>
  </section>
  <section className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(330px,1fr)] gap-5">
   <div className="defense-card p-5 md:p-6 space-y-5">
    <div className="flex items-center gap-2">
     <Activity size={19} className="text-sky-700"/>
     <div>
      <h2 className="font-bold text-slate-900">Defensive analysis workspace</h2>
      <p className="text-xs text-slate-500">Rule engine runs in your browser; no events uploaded to ASURA</p>
     </div>
    </div>
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 space-y-1">
     <p className="font-semibold flex items-center gap-2"><LockKeyhole size={15}/> Local data boundary</p>
     <p>Imported records are read and analyzed in local browser memory. Do not include
      passwords, cookies, private keys, malware binaries or classified material.
      This build does not store cases, forward events, dispatch agents, or block traffic.</p>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
     <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-700">Export format</span>
      <select className="w-full rounded border border-slate-300 text-sm p-2.5" value={format}
       onChange={e=>{setFormat(e.target.value);clear()}}>
       {BLUE_TEAM_IMPORT_FORMATS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
     </label>
     <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-700">Declared source</span>
      <select className="w-full rounded border border-slate-300 text-sm p-2.5" value={source}
       onChange={e=>{setSource(e.target.value);clear()}}>
       <option value="manual">Manual / mixed input (unverified)</option>
       {BLUE_TEAM_TOOLS.map(x=><option value={x.repository} key={x.repository}>{x.repository}</option>)}
      </select>
     </label>
    </div>
    <label className="block space-y-1">
     <span className="text-xs font-semibold text-slate-700">JSON or JSONL event export (500 records maximum)</span>
     <textarea value={input} onChange={e=>{setInput(e.target.value.slice(0,BLUE_TEAM_MAX_FILE_CHARS));clear()}}
      rows={7} spellCheck={false} placeholder={'[{"id":"evt-01","type":"auth-failure","source":"manual","observedAt":"2026-11-13T10:00:00Z","asset":"training-host","actor":"test-user","outcome":"failure"}]'}
      className="w-full p-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs font-mono resize-y"/>
    </label>
    <input ref={fileInput} type="file" accept=".json,.jsonl,text/plain,application/json"
     onChange={importFile} className="hidden" aria-label="Select local security export"/>
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={runDemo} disabled={busy}
      className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-semibold flex gap-2 items-center disabled:opacity-50">
      <Play size={14}/> Run synthetic SOC drill
     </button>
     <button type="button" onClick={()=>fileInput.current?.click()} disabled={busy}
      className="rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 font-semibold flex gap-2 items-center">
      <FileJson size={14}/> Select local export
     </button>
     <button type="button" onClick={analyze} disabled={!input.trim()||busy}
      className="rounded-lg border border-sky-600 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-3 py-2.5 text-xs font-semibold flex gap-2 items-center">
      <Search size={14}/> Analyze locally
     </button>
     <button type="button" onClick={()=>{setInput('');clear()}}
      className="px-3 py-2.5 rounded-lg text-slate-500 text-xs hover:bg-slate-100">
      Clear input
     </button>
    </div>
    <p className="text-[11px] text-slate-500">Supports normalized event arrays/JSONL, a documented Wazuh alert subset, and
     Trivy JSON vulnerabilities. Other formats require an explicit reviewed normalizer; the catalogue does
     not imply native ingestion support for all 50 tools.</p>
    {error&&<p role="alert" className="text-xs rounded border border-rose-200 bg-rose-50 p-3 text-rose-900">{error}</p>}
    {result&&<section className="space-y-4 border-t pt-4" aria-label="Defensive findings">
     <div className="flex flex-wrap gap-3 items-center justify-between">
      <div>
       <h3 className="text-sm font-bold text-slate-900">Automated correlation results</h3>
       <p className="text-xs text-slate-500">{context} · {time(result.checkedAt)}</p>
      </div>
      <button type="button" onClick={exportReport} className="border rounded px-3 py-2 text-xs font-semibold text-slate-700 bg-white flex items-center gap-2">
       <Download size={14}/> Export JSON report
      </button>
     </div>
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Metric label="Events analyzed" value={result.summary.accepted}/>
      <Metric label="Signals" value={result.summary.findings}/>
      <Metric label="High priority" value={result.summary.high}/>
      <Metric label="Sources claimed" value={result.summary.sources}/>
     </div>
     <p className="text-[11px] text-slate-500">
      {result.summary.duplicates} duplicates · {result.summary.invalid} invalid ·
      {result.summary.fresh24h} timestamps within 24h ·
      {result.summary.unknownTimestamp} undated · {result.summary.stale24h} older than 24h ·
      {result.summary.futureDated} future-dated.
      Source identities and timestamps are unverified.
     </p>
     <div className="max-h-[610px] overflow-auto space-y-2">
      {result.findings.length===0&&<p className="text-xs text-slate-600 rounded-lg bg-slate-50 border p-4">
       No enabled rule matched these records. This does not prove the assets are secure.
      </p>}
      {result.findings.map(f=><article key={f.id} className="border rounded-lg bg-white p-3 space-y-2">
       <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{f.title}</h4>
        <span className={'rounded border px-2 py-1 text-[10px] font-bold uppercase '+(statusClasses[f.severity]||statusClasses.low)}>{f.severity}</span>
       </div>
       <p className="text-[11px] text-slate-600">Rule {f.ruleId} · ATT&CK {f.technique} · {f.asset} · {time(f.observedAt)}</p>
       <p className="text-xs text-slate-700">{f.explanation}</p>
       <p className="text-xs text-sky-900"><strong>Review:</strong> {f.recommendation}</p>
       <p className="text-[11px] text-slate-500 break-words">Evidence event IDs: {f.evidenceIds.join(', ')}</p>
      </article>)}
     </div>
     <p className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
      <AlertTriangle size={14} className="inline mr-1"/>{result.notice}
     </p>
    </section>}
   </div>
   <div className="space-y-4">
    <div className="defense-card p-5 space-y-3">
     <h2 className="font-semibold text-slate-900 flex items-center gap-2"><ShieldAlert size={18} className="text-sky-700"/> Detection rulebook</h2>
     <p className="text-xs text-slate-600">Eight deterministic rules. All alerts require analyst confirmation.</p>
     <div className="space-y-2 max-h-[610px] overflow-y-auto pr-1">
      {BLUE_TEAM_RULES.map(rule=><div key={rule.id} className="rounded border bg-slate-50 p-3 space-y-1">
       <div className="flex justify-between items-center gap-2">
        <p className="font-semibold text-xs text-slate-900">{rule.name}</p>
        <span className={'text-[10px] rounded border px-2 py-0.5 '+(statusClasses[rule.severity]||statusClasses.low)}>{rule.severity}</span>
       </div>
       <p className="font-mono text-[10px] text-slate-500">{rule.id} · {rule.technique}</p>
       <p className="text-[11px] text-slate-700">{rule.condition}</p>
      </div>)}
     </div>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
     <p className="font-semibold text-sm text-amber-950 flex items-center gap-2"><Info size={16}/> Integration requirements</p>
     <p className="text-xs text-amber-900">A third-party web dashboard is not the same as an installed sensor.
      Provider-managed deployments, API credentials, licence reviews, access controls, secure collection,
      and live-source validation are required before claiming a connected SOC.</p>
    </div>
   </div>
  </section>
  <section className="defense-card p-5 md:p-6 space-y-4">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <h2 className="text-base font-bold text-slate-900 flex gap-2 items-center">
      <Database size={19} className="text-sky-700"/> Blue Team integration registry
     </h2>
     <p className="text-xs text-slate-500 mt-1">50 user-supplied upstream repositories · zero validated connections</p>
    </div>
    <span className="text-xs font-mono text-amber-800 bg-amber-50 rounded border border-amber-200 px-2 py-1">ALL REFERENCE ONLY</span>
   </div>
   <div className="grid md:grid-cols-[minmax(0,1fr)_260px] gap-3">
    <div className="relative">
     <Search size={16} className="absolute top-3 left-3 text-slate-400"/>
     <input value={search} maxLength={90} onChange={e=>setSearch(e.target.value)}
      placeholder="Search tool, GitHub repository or purpose"
      className="rounded border border-slate-300 py-2.5 pl-9 pr-3 text-sm w-full"/>
    </div>
    <select value={category} onChange={e=>setCategory(e.target.value)}
     aria-label="Filter Blue Team category" className="rounded border border-slate-300 px-3 py-2.5 text-sm">
     <option value="all">All eight categories</option>
     {BLUE_TEAM_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
   </div>
   <div className="flex flex-wrap gap-2">
    {BLUE_TEAM_CATEGORIES.map(c=><button key={c.id} type="button"
     onClick={()=>{setCategory(c.id);setSearch('')}} className={'border rounded px-2 py-1 text-[11px] '+(category===c.id?'border-sky-400 bg-sky-50 text-sky-900':'text-slate-600 border-slate-200 hover:border-sky-200')}>
     {c.label} ({catalogue.categories.find(x=>x.id===c.id)?.count||0})
    </button>)}
   </div>
   <div className="flex justify-between text-xs text-slate-500"><span>{visible.length} of 50 results</span><span>GitHub references, not deployed integrations</span></div>
   <div className="grid md:grid-cols-2 gap-3">
    {visible.length===0&&<p className="text-xs text-slate-600">No matching repositories.</p>}
    {visible.map(tool=><article key={tool.repository}
     className="rounded-lg border border-slate-200 p-4 bg-white space-y-2">
     <div className="flex flex-wrap justify-between items-center gap-2">
      <span className="font-mono text-[10px] text-slate-500">#{String(tool.number).padStart(2,'0')} · {tool.kind}</span>
      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600 font-mono">NOT CONNECTED</span>
     </div>
     <h3 className="text-sm font-bold text-slate-900 break-all">{tool.repository}</h3>
     <p className="text-xs text-slate-600">{tool.purpose}</p>
     <div className="flex flex-wrap items-center gap-3">
      <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 hover:underline inline-flex gap-1 items-center">
       Upstream GitHub <ExternalLink size={12}/>
      </a>
      <span className="text-[11px] text-slate-500">{tool.offlineExportCandidate?'Potential export candidate':'No native adapter'}</span>
     </div>
    </article>)}
   </div>
  </section>
  <footer className="text-xs text-slate-500 pb-4">
   Browser-only analytics; no provider runtime health has been verified. Do not use this development build
   for military operations, emergency response, or automated enforcement decisions.
  </footer>
 </main>;
}
