const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dataUri=content=>'data:text/javascript;base64,'+Buffer.from(content).toString('base64');
const catalogUri=dataUri(fs.readFileSync('src/lib/redTeamCatalog.js','utf8'));
const engineSource=fs.readFileSync('src/lib/defenceValidationEngine.js','utf8')
 .replace("from './redTeamCatalog.js';","from "+JSON.stringify(catalogUri)+";");
const engineUri=dataUri(engineSource);
const readOnlySource=fs.readFileSync('src/lib/redTeamReadOnly.js','utf8')
 .replace("from './redTeamCatalog.js';","from "+JSON.stringify(catalogUri)+";")
 .replace("from './defenceValidationEngine.js';","from "+JSON.stringify(engineUri)+";");
const readOnlyUri=dataUri(readOnlySource);
const catalog=import(catalogUri);
const actions=import(readOnlyUri);
function createRequest(action,extras={}){
 return new Request('http://localhost/api/red-team',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({action,...extras})
 });
}
test('exactly 50 distinct user supplied repositories in eight categories',async()=>{
 const {RED_TEAM_CATEGORIES,RED_TEAM_TOOLS,RED_TEAM_TOOL_COUNT,RED_TEAM_CATEGORY_COUNT}=await catalog;
 assert.equal(RED_TEAM_TOOL_COUNT,50);
 assert.equal(RED_TEAM_CATEGORY_COUNT,8);
 assert.equal(new Set(RED_TEAM_TOOLS.map(x=>x.repository.toLowerCase())).size,50);
 assert.deepEqual(RED_TEAM_TOOLS.map(x=>x.number),Array.from({length:50},(_,i)=>i+1));
 assert.equal(RED_TEAM_TOOLS[0].repository,'BishopFox/sliver');
 assert.equal(RED_TEAM_TOOLS[49].repository,'infosecn1nja/Red-Teaming-Toolkit');
 assert.ok(RED_TEAM_TOOLS.every(x=>RED_TEAM_CATEGORIES.some(c=>c.id===x.category)));
 assert.ok(RED_TEAM_TOOLS.every(x=>x.url==='https://github.com/'+x.repository));
 assert.ok(RED_TEAM_TOOLS.every(x=>x.installed===false&&x.executable===false&&x.status==='reference-only'));
});
test('catalogue search does not infer installed tooling or execute anything',async()=>{
 const {searchRedTeamTools,redTeamCatalogSummary}=await catalog;
 const out=searchRedTeamTools('gitleaks','recon');
 assert.equal(out.length,1);
 assert.equal(out[0].repository,'gitleaks/gitleaks');
 assert.deepEqual(searchRedTeamTools('gitleaks','phishing'),[]);
 const summary=redTeamCatalogSummary();
 assert.equal(summary.installedCount,0);
 assert.equal(summary.executableCount,0);
 assert.deepEqual(summary.categories.map(x=>x.count),[8,9,7,9,5,5,5,2]);
 assert.equal(summary.categories.reduce((n,c)=>n+c.count,0),50);
});
test('allowlisted commands are read-only and unsupported executable commands fail closed',async()=>{
 const {RED_TEAM_ACTIONS,runRedTeamReadOnlyAction,SAFETY_CONTRACT}=await actions;
 assert.deepEqual(RED_TEAM_ACTIONS.map(x=>x.id),
  ['inventory','search','assessment-plan','verify-reference','defence-drill','integration-matrix']);
 const inv=runRedTeamReadOnlyAction({action:'inventory'});
 assert.equal(inv.success,true);
 assert.equal(inv.summary.toolCount,50);
 assert.equal(inv.safety.arbitraryCommands,false);
 assert.equal(inv.safety.payloadExecution,false);
 assert.equal(inv.safety.credentialCollection,false);
 const rejected=runRedTeamReadOnlyAction({action:'execute-c2',query:'run all'});
 assert.equal(rejected.success,false);
 assert.equal(rejected.status,400);
 assert.equal(SAFETY_CONTRACT.networkScanning,false);
 const plan=runRedTeamReadOnlyAction({action:'assessment-plan',scope:'Internal training laboratory'});
 assert.equal(plan.success,true);
 assert.equal(plan.authorizationVerified,false);
 assert.equal(plan.executedTools,0);
 assert.equal(plan.scopeLabel,'Internal training laboratory');
 assert.ok(plan.steps.some(x=>/written authorization/i.test(x.title)));
});
test('GitHub metadata verifier only requests exactly one allowlisted repository',async()=>{
 const {verifyRedTeamReference}=await actions;
 const seen=[];
 const fetcher=async(url,opts)=>{
  seen.push({url,opts});
  return {ok:true,status:200,json:async()=>({
   full_name:'gitleaks/gitleaks',html_url:'https://github.com/gitleaks/gitleaks',
   archived:false,disabled:false,fork:false,private:false,
   default_branch:'master',updated_at:'2026-11-13T00:00:00Z',
   pushed_at:'2026-11-12T00:00:00Z',license:{spdx_id:'MIT'}
  })};
 };
 const valid=await verifyRedTeamReference('gitleaks/gitleaks',{fetcher});
 assert.equal(valid.success,true);
 assert.equal(valid.installed,false);
 assert.equal(valid.executable,false);
 assert.equal(valid.license,'MIT');
 assert.equal(seen.length,1);
 assert.equal(seen[0].url,'https://api.github.com/repos/gitleaks/gitleaks');
 assert.equal(seen[0].opts.method,'GET');
 assert.equal(seen[0].opts.redirect,'manual');
 assert.ok(!JSON.stringify(seen[0].opts.headers).includes('Authorization'));
 const denied=await verifyRedTeamReference('attacker.example/test',{fetcher});
 assert.equal(denied.success,false);
 assert.equal(denied.status,400);
 assert.equal(seen.length,1,'invalid repository cannot trigger an external request');
});
test('redirect, rate limit and mismatched metadata cannot claim a verified repository',async()=>{
 const {verifyRedTeamReference}=await actions;
 const moved=await verifyRedTeamReference('mitre/caldera',{
  fetcher:async()=>({ok:false,status:301})
 });
 assert.equal(moved.success,false);
 const limited=await verifyRedTeamReference('mitre/caldera',{
  fetcher:async()=>({ok:false,status:429})
 });
 assert.equal(limited.success,false);
 assert.equal(limited.status,503);
 const forged=await verifyRedTeamReference('mitre/caldera',{
  fetcher:async()=>({ok:true,status:200,json:async()=>({
   full_name:'attacker/other',
   html_url:'https://github.com/attacker/other'
  })})
 });
 assert.equal(forged.success,false);
});
test('HTTP endpoint exposes only safe commands, never arbitrary execution',async()=>{
 const raw=fs.readFileSync('src/app/api/red-team/route.js','utf8');
 const transformed=raw
  .replace("import {NextResponse} from 'next/server';",'const NextResponse=Response;')
  .replace("import {redTeamCatalogSummary} from '@/lib/redTeamCatalog';",
   'const {redTeamCatalogSummary}=await import('+JSON.stringify(catalogUri)+');')
  .replace("import {DEFENCE_SCENARIOS,DEFENCE_ENGINE_VERSION,DEFENCE_ENGINE_POSTURE} from '@/lib/defenceValidationEngine';",
   'const {DEFENCE_SCENARIOS,DEFENCE_ENGINE_VERSION,DEFENCE_ENGINE_POSTURE}=await import('+JSON.stringify(engineUri)+');')
  .replace("import {RED_TEAM_ACTIONS,SAFETY_CONTRACT,\n runRedTeamReadOnlyAction,verifyRedTeamReference} from '@/lib/redTeamReadOnly';",
   'const {RED_TEAM_ACTIONS,SAFETY_CONTRACT,runRedTeamReadOnlyAction,verifyRedTeamReference}=await import('+JSON.stringify(readOnlyUri)+');');
 const {GET,POST}=await import(dataUri(transformed));
 const stats=await (await GET()).json();
 assert.equal(stats.success,true);
 assert.equal(stats.toolCount,50);
 assert.equal(stats.safety.arbitraryCommands,false);
 const blocked=await POST(createRequest('run-all',{query:'execute everything'}));
 assert.equal(blocked.status,400);
 assert.equal((await blocked.json()).success,false);
 const good=await POST(createRequest('assessment-plan',{scope:'Authorized lab'}));
 assert.equal(good.status,200);
 const plan=await good.json();
 assert.equal(plan.executedTools,0);
 assert.equal(plan.authorizationVerified,false);
});
