const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dataUri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const catalogUri=dataUri(fs.readFileSync('src/lib/blueTeamCatalog.js','utf8'));
const engineUri=dataUri(fs.readFileSync('src/lib/blueTeamEngine.js','utf8')
 .replace("from './blueTeamCatalog.js';","from "+JSON.stringify(catalogUri)+";"));
const catalog=import(catalogUri),engine=import(engineUri);
test('50 unique Blue Team repository references spanning all eight categories',async()=>{
 const {BLUE_TEAM_TOOLS,BLUE_TEAM_CATEGORIES,blueTeamCatalogSummary,searchBlueTeamTools}=await catalog;
 assert.equal(BLUE_TEAM_TOOLS.length,50);
 assert.equal(BLUE_TEAM_CATEGORIES.length,8);
 assert.equal(new Set(BLUE_TEAM_TOOLS.map(x=>x.repository.toLowerCase())).size,50);
 assert.deepEqual(BLUE_TEAM_TOOLS.map(x=>x.number),Array.from({length:50},(_,i)=>i+1));
 assert.deepEqual(BLUE_TEAM_CATEGORIES.map(x=>BLUE_TEAM_TOOLS.filter(y=>y.category===x.id).length),
  [7,7,6,6,7,4,5,8]);
 assert.equal(BLUE_TEAM_TOOLS[0].repository,'owasp-modsecurity/ModSecurity');
 assert.equal(BLUE_TEAM_TOOLS[49].repository,'crowdsecurity/crowdsec');
 assert.ok(BLUE_TEAM_TOOLS.every(x=>x.url==='https://github.com/'+x.repository&&
  x.installed===false&&x.connection==='not-connected'));
 assert.equal(blueTeamCatalogSummary().connected,0);
 assert.equal(blueTeamCatalogSummary().verified,0);
 assert.equal(searchBlueTeamTools('wazuh').length,1);
 assert.equal(searchBlueTeamTools('crowdsec','waf').length,0);
});
test('synthetic event demo exercises eight correlation rules, never claims live sources',async()=>{
 const {makeSyntheticBlueTeamEvents,analyzeBlueTeamEvents,BLUE_TEAM_RULES}=await engine;
 const rows=makeSyntheticBlueTeamEvents();
 assert.equal(rows.length,20);
 assert.ok(rows.every(x=>x.synthetic));
 const result=analyzeBlueTeamEvents(rows);
 assert.equal(BLUE_TEAM_RULES.length,8);
 assert.equal(result.success,true);
 assert.equal(result.summary.accepted,20);
 assert.equal(result.summary.findings,8);
 assert.equal(result.summary.high,4);
 assert.equal(result.summary.medium,4);
 assert.equal(result.inputIsVerified,false);
 assert.equal(result.connectedProviders,0);
 assert.equal(result.automatedRemediation,false);
 assert.ok(result.findings.every(x=>x.status==='requires-analyst-review'));
 const ids=new Set(result.findings.map(x=>x.ruleId));
 assert.equal(ids.size,8);
 assert.ok(result.findings.every(x=>x.evidenceIds.length>=1));
});
test('malformed or huge exports fail closed with bounded resource limits',async()=>{
 const {parseBlueTeamExport,BLUE_TEAM_MAX_FILE_CHARS}=await engine;
 assert.throws(()=>parseBlueTeamExport('{bad json'),/Invalid JSON/);
 assert.throws(()=>parseBlueTeamExport('x'.repeat(BLUE_TEAM_MAX_FILE_CHARS+1)),/no larger than/);
 assert.throws(()=>parseBlueTeamExport('[]',{format:'binary'}),/Unsupported export/);
 assert.throws(()=>parseBlueTeamExport('[]',{source:'attacker/unknown'}),/Unknown catalogue source/);
 const oversized=JSON.stringify(Array.from({length:501},(_,i)=>({id:'x'+i,type:'auth-failure'})));
 assert.throws(()=>parseBlueTeamExport(oversized),/Maximum 500/);
});
test('normalized export, JSONL and safe field allowlist work without raw secret leakage',async()=>{
 const {parseBlueTeamExport,analyzeBlueTeamEvents}=await engine;
 const at=new Date().toISOString();
 const data=Array.from({length:6},(_,i)=>({
  id:'a'+i,type:'auth-failure',source:'wazuh/wazuh',asset:'test-owned-lab',
  actor:'test-principal',outcome:'failure',observedAt:at,
  password:'SUPER_SECRET_SHOULD_NOT_BE_PRESERVED',headers:{Cookie:'private cookie'}
 }));
 const parsed=parseBlueTeamExport(data.map(x=>JSON.stringify(x)).join('\n'));
 assert.equal(parsed.accepted,6);
 assert.equal(parsed.skipped,0);
 assert.equal(parsed.events[0].password,undefined);
 assert.equal(parsed.events[0].headers,undefined);
 assert.ok(!JSON.stringify(parsed.events).includes('SUPER_SECRET'));
 const result=analyzeBlueTeamEvents(parsed.events);
 assert.ok(result.findings.some(x=>x.ruleId==='BT-AUTH-005'));
 assert.ok(!JSON.stringify(result).includes('SUPER_SECRET'));
});
test('Wazuh exported alert subset maps severity and timestamp; no raw commands forwarded',async()=>{
 const {parseBlueTeamExport,analyzeBlueTeamEvents}=await engine;
 const now=new Date().toISOString();
 const payload={hits:{hits:[{_source:{
  id:'wazuh-1',timestamp:now,rule:{level:14,description:'Suspicious process command'},
  agent:{name:'synthetic-endpoint'},data:{command:'DO_NOT_INCLUDE_COMMAND_LINE'}
 }}]}};
 const parsed=parseBlueTeamExport(JSON.stringify(payload),{format:'wazuh'});
 assert.equal(parsed.accepted,1);
 assert.equal(parsed.events[0].source,'wazuh/wazuh');
 assert.equal(parsed.events[0].severity,'high');
 assert.equal(parsed.events[0].asset,'synthetic-endpoint');
 assert.equal(parsed.events[0].signalLevel,14);
 assert.ok(!JSON.stringify(parsed.events).includes('DO_NOT_INCLUDE_COMMAND_LINE'));
 const report=analyzeBlueTeamEvents(parsed.events);
 assert.equal(report.findings[0].ruleId,'BT-EDR-012');
});
test('Trivy CVSS normalized per asset; unknown collection time stays unknown',async()=>{
 const {parseBlueTeamExport,analyzeBlueTeamEvents}=await engine;
 const data={Results:[{
  Target:'container-one',Vulnerabilities:[
   {VulnerabilityID:'CVE-2026-1234',Severity:'CRITICAL',CVSS:{nvd:{V3Score:9.8}}},
   {VulnerabilityID:'CVE-2026-1235',Severity:'LOW'}
  ]},{
  Target:'container-two',Vulnerabilities:[
   {VulnerabilityID:'CVE-2026-1234',Severity:'CRITICAL',CVSS:{nvd:{V3Score:9.8}}}
  ]
 }]};
 const parsed=parseBlueTeamExport(JSON.stringify(data),{format:'trivy'});
 assert.equal(parsed.accepted,3);
 assert.ok(parsed.events.every(x=>x.source==='aquasecurity/trivy'&&x.observedAt===null));
 const report=analyzeBlueTeamEvents(parsed.events);
 assert.equal(report.summary.accepted,3);
 assert.equal(report.summary.unknownTimestamp,3);
 assert.equal(report.summary.findings,2);
 assert.ok(report.findings.every(x=>x.ruleId==='BT-VULN-090'));
});
test('benign approvals, low scores and insufficient thresholds do not create alerts',async()=>{
 const {analyzeBlueTeamEvents}=await engine;
 const events=[
  {id:'p1',type:'iam-change',approved:true},
  {id:'p2',type:'audit-change',approved:true},
  {id:'p3',type:'network-flow',approved:true,bytes:500000000},
  {id:'p4',type:'vulnerability',score:5.5,resolved:false},
  {id:'p5',type:'intel-match',matched:true,confidence:60},
  {id:'p6',type:'endpoint-alert',severity:'low'},
  ...Array.from({length:4},(_,i)=>({id:'auth'+i,type:'auth-failure',
   outcome:'failure',actor:'x',asset:'y',observedAt:new Date().toISOString()})),
 ];
 const r=analyzeBlueTeamEvents(events);
 assert.equal(r.summary.findings,0);
});
test('duplicates and future-dated events remain distinguishable from fresh records',async()=>{
 const {analyzeBlueTeamEvents}=await engine;
 const future=new Date(Date.now()+3600000).toISOString();
 const r=analyzeBlueTeamEvents([
  {id:'dup',source:'wazuh/wazuh',asset:'host-a',type:'endpoint-alert',severity:'high',observedAt:future},
  {id:'dup',source:'wazuh/wazuh',asset:'host-a',type:'endpoint-alert',severity:'high',observedAt:future},
  {id:'dup',source:'wazuh/wazuh',asset:'host-b',type:'endpoint-alert',severity:'high',observedAt:future},
 ]);
 assert.equal(r.summary.accepted,2);
 assert.equal(r.summary.duplicates,1);
 assert.equal(r.summary.futureDated,2);
 assert.equal(r.summary.fresh24h,0);
 assert.equal(r.summary.findings,2);
});
test('engine requires no external API, downloads, target access or credentials',async()=>{
 const {analyzeBlueTeamEvents,parseBlueTeamExport,makeSyntheticBlueTeamEvents}=await engine;
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=()=>{requests++;throw Error('Unauthorized network request')};
 try{
  const result=analyzeBlueTeamEvents(makeSyntheticBlueTeamEvents());
  const parsed=parseBlueTeamExport(JSON.stringify([{id:'x',type:'case-alert'}]));
  assert.equal(result.success,true);
  assert.equal(parsed.accepted,1);
  assert.equal(requests,0);
 }finally{globalThis.fetch=original}
});
