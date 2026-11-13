/**
 * ASURA Blue Team local-only defensive event analysis.
 *
 * No fetch, network, persistence, shell execution, agent deployment, IOC lookup,
 * account access or automatic remediation. Only explicitly allowlisted fields
 * are normalized; source raw data and secrets are never included in reports.
 * This module is safe to execute in a browser and can operate fully offline.
 */
import {BLUE_TEAM_TOOLS} from './blueTeamCatalog.js';

export const BLUE_TEAM_ENGINE_VERSION='0.1.0-offline';
export const BLUE_TEAM_INPUT_TYPES=Object.freeze([
 'auth-failure','waf-block','iam-change','audit-change','endpoint-alert',
 'vulnerability','intel-match','network-flow','case-alert',
]);
export const BLUE_TEAM_IMPORT_FORMATS=Object.freeze([
 {id:'normalized',label:'Normalized security events (ASURA JSON / JSONL)'},
 {id:'wazuh',label:'Wazuh exported alert JSON (subset)'},
 {id:'trivy',label:'Trivy vulnerability report JSON (subset)'},
]);
export const BLUE_TEAM_MAX_EVENTS=500;
export const BLUE_TEAM_MAX_FILE_CHARS=256000;
const knownSources=new Set(BLUE_TEAM_TOOLS.map(x=>x.repository));
const VALID_TYPES=new Set(BLUE_TEAM_INPUT_TYPES);
const safe=(value,max=100)=>typeof value==='string'
 ?value.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,max):'';
const clamp=(value,min,max,fallback=0)=>
 typeof value==='number'&&Number.isFinite(value)
 ?Math.max(min,Math.min(max,value)):fallback;
const validTime=value=>{
 if(typeof value!=='string'||value.length>45)return null;
 const date=new Date(value);
 return !Number.isNaN(date.getTime())?date.toISOString():null;
};
const safeAsset=(value)=>safe(value,70)||'unclassified-asset';
const safeActor=(value)=>safe(value,70)||'unspecified-principal';
const isPlainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const isValidId=s=>/^[a-zA-Z0-9_.:/-]{1,100}$/.test(s);

export function normalizeDefensiveEvent(raw,index=0,{source='manual',format='normalized'}={}){
 if(!isPlainObject(raw))return null;
 const upstream=isPlainObject(raw._source)?raw._source:raw;
 let normalized;
 if(format==='wazuh'){
  const level=clamp(upstream.rule?.level,0,15,0);
  normalized={
   id:upstream.id||upstream._id||('wazuh-'+index),
   type:'endpoint-alert',observedAt:upstream.timestamp||upstream['@timestamp'],
   asset:upstream.agent?.name||upstream.agent?.id,
   actor:null,severity:level>=12?'high':level>=8?'medium':'low',
   signalLevel:level,
   source:'wazuh/wazuh',
  };
 }else if(format==='normalized'){
  normalized=raw;
 }else return null;
 if(!VALID_TYPES.has(normalized.type))return null;
 const rawId=safe(normalized.id,100);
 const eventId=isValidId(rawId)?rawId:'event-'+index;
 const rawSource=source==='manual'?normalized.source||'manual':source;
 const selectedSource=rawSource==='manual'||knownSources.has(rawSource)?rawSource:'manual';
 const approved=typeof normalized.approved==='boolean'?normalized.approved:null;
 const observedAt=validTime(normalized.observedAt||normalized.timestamp||normalized.time);
 const severity=['low','medium','high','critical'].includes(normalized.severity)
  ?normalized.severity:'unknown';
 const bytes=clamp(normalized.bytes,0,Number.MAX_SAFE_INTEGER,0);
 const score=clamp(normalized.score,0,10,0);
 const confidence=clamp(normalized.confidence,0,100,0);
 return Object.freeze({
  id:eventId,source:selectedSource,type:normalized.type,observedAt,
  asset:safeAsset(normalized.asset),actor:safeActor(normalized.actor),
  approved,severity,signalLevel:clamp(normalized.signalLevel,0,15,0),
  score,confidence,bytes,
  matched:normalized.matched===true,
  resolved:normalized.resolved===true,
  outcome:normalized.outcome==='failure'?'failure':
   normalized.outcome==='success'?'success':null,
  synthetic:normalized.synthetic===true,
  // No arbitrary "description", URLs, command-line, raw logs, user tokens,
  // request bodies, malware bytes, cookies or secret-bearing fields are kept.
 });
}
function flattenTrivy(payload){
 const results=Array.isArray(payload.Results)?payload.Results:[];
 const entries=[];
 for(const result of results){
  if(!isPlainObject(result))continue;
  const vulnerabilities=Array.isArray(result.Vulnerabilities)?result.Vulnerabilities:[];
  for(const vuln of vulnerabilities){
   if(!isPlainObject(vuln))continue;
   const severities={CRITICAL:9.5,HIGH:8,MEDIUM:5,LOW:2};
   const score=Number.isFinite(vuln.CVSS?.nvd?.V3Score)?vuln.CVSS.nvd.V3Score:
    Number.isFinite(vuln.CVSS?.redhat?.V3Score)?vuln.CVSS.redhat.V3Score:
    severities[vuln.Severity]||0;
   entries.push({
    id:safe(vuln.VulnerabilityID,90)||'trivy-'+entries.length,
    source:'aquasecurity/trivy',type:'vulnerability',asset:result.Target||'unknown-target',
    severity:typeof vuln.Severity==='string'?vuln.Severity.toLowerCase():'unknown',
    score,approved:false,resolved:false,
    // Trivy's scan results do not universally encode a verified observation
    // timestamp. Never fabricate one.
    observedAt:null,
   });
   if(entries.length>=BLUE_TEAM_MAX_EVENTS)return entries;
  }
 }
 return entries;
}

/**
 * Parse locally selected, user-provided security exports.
 * This function never uploads an event or sends it to a server.
 * Any synthetic flag is reserved for built-in samples, not user files.
 */
export function parseBlueTeamExport(text,{format='normalized',source='manual'}={}){
 if(typeof text!=='string'||text.length>BLUE_TEAM_MAX_FILE_CHARS)
  throw Error('Export must be text no larger than 256,000 characters.');
 if(!BLUE_TEAM_IMPORT_FORMATS.some(x=>x.id===format))
  throw Error('Unsupported export format.');
 if(source!=='manual'&&!knownSources.has(source))throw Error('Unknown catalogue source.');
 let data;
 const input=text.trim();
 if(!input)throw Error('No input records supplied.');
 try{
  if(input[0]==='{'&&input.includes('\n')&&!input.includes('"events"')){
   try{data=JSON.parse(input)}catch{
    data=input.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
   }
  }else data=JSON.parse(input);
 }catch{
  throw Error('Invalid JSON / JSONL. Import a supported, redacted export.');
 }
 let records;
 if(format==='trivy'){
  if(!isPlainObject(data)||!Array.isArray(data.Results))
   throw Error('Trivy export must contain a Results array.');
  records=flattenTrivy(data);
 }else if(Array.isArray(data))records=data;
 else if(isPlainObject(data)&&Array.isArray(data.events))records=data.events;
 else if(format==='wazuh'&&isPlainObject(data)&&Array.isArray(data.hits?.hits))
  records=data.hits.hits;
 else if(format==='wazuh'&&isPlainObject(data)&&isPlainObject(data.rule))
  records=[data];
 else throw Error('Expected an array, {events:[...]}, or supported provider export.');
 if(records.length>BLUE_TEAM_MAX_EVENTS)
  throw Error('Maximum 500 records per local analysis; split larger exports.');
 const normalized=records.map((row,index)=>normalizeDefensiveEvent(row,index,
  {source,format:format==='trivy'?'normalized':format})).filter(Boolean);
 return {
  events:normalized,totalInput:records.length,
  accepted:normalized.length,
  skipped:records.length-normalized.length,
  format,source,
  warning:'Local analysis only. No raw payload is sent or persisted. Results are unverified unless separately investigated.',
 };
}
export const BLUE_TEAM_RULES=Object.freeze([
 {id:'BT-AUTH-005',type:'auth-failure',name:'Repeated authentication failures',
  technique:'T1110',severity:'medium',
  condition:'Five failed sign-in events for the same actor and asset within five minutes.',
  recommendation:'Review identity sign-in logs, MFA policies, legitimate maintenance and source context.'},
 {id:'BT-WAF-008',type:'waf-block',name:'High-volume WAF blocks',
  technique:'T1190',severity:'medium',
  condition:'Eight WAF-block events for the same asset within five minutes.',
  recommendation:'Validate WAF rule accuracy, legitimate client traffic and upstream rates before making changes.'},
 {id:'BT-IAM-001',type:'iam-change',name:'Unapproved privilege change',
  technique:'T1098',severity:'high',
  condition:'Privilege-change metadata has explicit approved:false.',
  recommendation:'Review administrator approvals, related sessions and identity audit events.'},
 {id:'BT-LOG-001',type:'audit-change',name:'Audit configuration disabled without approval',
  technique:'T1562',severity:'high',
  condition:'Audit-change metadata has approved:false.',
  recommendation:'Validate logging coverage and review change-management records.'},
 {id:'BT-EDR-012',type:'endpoint-alert',name:'High-severity endpoint alert',
  technique:'T1059',severity:'high',
  condition:'Endpoint alert has high/critical severity or source signal level ≥12.',
  recommendation:'Review EDR evidence and endpoint context; do not treat a detection as a confirmed compromise.'},
 {id:'BT-VULN-090',type:'vulnerability',name:'Critical vulnerability report',
  technique:'T1190',severity:'high',
  condition:'Unresolved vulnerability finding has CVSS score ≥9 or critical severity.',
  recommendation:'Confirm exposure, affected versions, exploitability and remediation priority.'},
 {id:'BT-IOC-080',type:'intel-match',name:'High-confidence reported IOC match',
  technique:'T1071',severity:'medium',
  condition:'Explicit observed match with confidence ≥80.',
  recommendation:'Validate indicator age, provenance, false-positive risk and surrounding telemetry.'},
 {id:'BT-EGRESS-100',type:'network-flow',name:'Unapproved high-volume egress',
  technique:'T1041',severity:'medium',
  condition:'Flow summary exceeds 100 MiB and has explicit approved:false.',
  recommendation:'Correlate with business data flows and baseline usage before escalating.'},
]);
function findWindows(records,minCount,windowMs){
 const byKey=new Map();
 for(const item of records){
  if(!item.observedAt)continue;
  const key=item.actor+'|'+item.asset;
  if(!byKey.has(key))byKey.set(key,[]);
  byKey.get(key).push(item);
 }
 const findings=[];
 for(const items of byKey.values()){
  const sorted=items.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
  for(let left=0,right=0;right<sorted.length;right++){
   while(Date.parse(sorted[right].observedAt)-Date.parse(sorted[left].observedAt)>windowMs)left++;
   if(right-left+1>=minCount){
    findings.push(sorted.slice(left,right+1));
    break;
   }
  }
 }
 return findings;
}
function addFinding(result,rule,matches){
 const pivot=matches[0];
 if(!pivot)return;
 result.push({
  id:rule.id+':'+pivot.id,
  ruleId:rule.id,title:rule.name,severity:rule.severity,
  technique:rule.technique,observedAt:pivot.observedAt,
  source:pivot.source,asset:pivot.asset,
  evidenceIds:matches.map(x=>x.id).slice(0,12),
  matchedEvents:matches.length,
  explanation:rule.condition,recommendation:rule.recommendation,
  status:'requires-analyst-review',
  assessment:'Unverified automated signal, not proof of compromise',
 });
}
function validCurrentTime(t){
 const ms=Date.parse(t);
 return Number.isFinite(ms)?ms:Date.now();
}
export function analyzeBlueTeamEvents(input,{now=new Date().toISOString()}={}){
 if(!Array.isArray(input)||input.length>BLUE_TEAM_MAX_EVENTS)
  throw Error('Provide at most 500 locally normalized events.');
 const events=[],seen=new Set();
 let invalid=0,duplicates=0;
 for(let i=0;i<input.length;i++){
  const raw=input[i];
  // Re-normalize to allowlisted fields even for direct API calls.
  const row=normalizeDefensiveEvent(raw,i,{source:'manual'});
  if(!row){invalid++;continue}
  const identity=row.source+'|'+row.asset+'|'+row.id;
  if(seen.has(identity)){duplicates++;continue}
  seen.add(identity);events.push(row);
 }
 const findings=[];
 const auth=events.filter(e=>e.type==='auth-failure'&&e.outcome==='failure');
 const waf=events.filter(e=>e.type==='waf-block');
 for(const batch of findWindows(auth,5,300000))addFinding(findings,BLUE_TEAM_RULES[0],batch);
 for(const batch of findWindows(waf,8,300000))addFinding(findings,BLUE_TEAM_RULES[1],batch);
 const simple=[
  [BLUE_TEAM_RULES[2],e=>e.type==='iam-change'&&e.approved===false],
  [BLUE_TEAM_RULES[3],e=>e.type==='audit-change'&&e.approved===false],
  [BLUE_TEAM_RULES[4],e=>e.type==='endpoint-alert'&&(
   e.severity==='high'||e.severity==='critical'||e.signalLevel>=12)],
  [BLUE_TEAM_RULES[5],e=>e.type==='vulnerability'&&!e.resolved&&
   (e.score>=9||e.severity==='critical')],
  [BLUE_TEAM_RULES[6],e=>e.type==='intel-match'&&e.matched&&e.confidence>=80],
  [BLUE_TEAM_RULES[7],e=>e.type==='network-flow'&&e.approved===false&&e.bytes>104857600],
 ];
 for(const [rule,match] of simple){
  for(const row of events.filter(match).slice(0,15))addFinding(findings,rule,[row]);
 }
 const priority={high:0,medium:1,low:2};
 findings.sort((a,b)=>priority[a.severity]-priority[b.severity]||
  (b.observedAt||'').localeCompare(a.observedAt||''));
 const nowMs=validCurrentTime(now);
 const timestamps=events.map(e=>e.observedAt).filter(Boolean).map(Date.parse);
 const fresh=timestamps.filter(t=>t<=nowMs+300000&&t>=nowMs-86400000).length;
 const future=timestamps.filter(t=>t>nowMs+300000).length;
 const stale=timestamps.filter(t=>t<nowMs-86400000).length;
 const sourceCounts={};
 for(const row of events)sourceCounts[row.source]=(sourceCounts[row.source]||0)+1;
 const summary={
  accepted:events.length,invalid,duplicates,
  findings:findings.length,high:findings.filter(x=>x.severity==='high').length,
  medium:findings.filter(x=>x.severity==='medium').length,
  sources:Object.keys(sourceCounts).length,sourceCounts,
  timestampsKnown:timestamps.length,unknownTimestamp:events.length-timestamps.length,
  fresh24h:fresh,stale24h:stale,futureDated:future,
 };
 return {
  success:true,engine:'ASURA Blue Team Defence Analytics',version:BLUE_TEAM_ENGINE_VERSION,
  checkedAt:new Date(nowMs).toISOString(),mode:'local-in-memory',
  inputIsVerified:false,connectedProviders:0,automatedRemediation:false,
  rules:BLUE_TEAM_RULES.map(x=>({id:x.id,name:x.name,condition:x.condition})),
  summary,findings:findings.slice(0,80),
  notice:'Rule matches indicate signals requiring analyst review, not confirmed incidents. Timestamps and source identities come from imported data and are not independently verified. This report does not establish SOC uptime or coverage.',
 };
}
export function makeSyntheticBlueTeamEvents(now=new Date().toISOString()){
 const ms=validCurrentTime(now),at=n=>new Date(ms-n*1000).toISOString();
 return [
  ...Array.from({length:6},(_,i)=>({
   id:'sim-auth-'+i,source:'wazuh/wazuh',type:'auth-failure',
   asset:'synthetic-identity-host',actor:'sim-user',outcome:'failure',
   observedAt:at(80-i*10),synthetic:true
  })),
  ...Array.from({length:8},(_,i)=>({
   id:'sim-waf-'+i,source:'owasp-modsecurity/ModSecurity',type:'waf-block',
   asset:'synthetic-web-service',actor:'sim-client',observedAt:at(70-i*5),synthetic:true
  })),
  {id:'sim-iam',source:'opensearch-project/OpenSearch',type:'iam-change',
   asset:'synthetic-cloud-tenant',approved:false,observedAt:at(30),synthetic:true},
  {id:'sim-audit',source:'wazuh/wazuh',type:'audit-change',
   asset:'synthetic-host',approved:false,observedAt:at(30),synthetic:true},
  {id:'sim-edr',source:'wazuh/wazuh',type:'endpoint-alert',
   asset:'synthetic-host',severity:'high',observedAt:at(20),synthetic:true},
  {id:'sim-vuln',source:'aquasecurity/trivy',type:'vulnerability',
   asset:'synthetic-container',score:9.8,resolved:false,observedAt:at(20),synthetic:true},
  {id:'sim-ioc',source:'MISP/MISP',type:'intel-match',
   asset:'synthetic-workstation',matched:true,confidence:90,observedAt:at(20),synthetic:true},
  {id:'sim-egress',source:'ntop/ntopng',type:'network-flow',
   asset:'synthetic-gateway',bytes:200000000,approved:false,observedAt:at(10),synthetic:true},
 ];
}
