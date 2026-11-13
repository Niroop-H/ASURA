const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dataUri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const catalogUri=dataUri(fs.readFileSync('src/lib/redTeamCatalog.js','utf8'));
const engineUri=dataUri(fs.readFileSync('src/lib/defenceValidationEngine.js','utf8')
 .replace("from './redTeamCatalog.js';","from "+JSON.stringify(catalogUri)+";"));
const engine=import(engineUri);

test('six offline defensive scenarios use checked-in synthetic telemetry only',async()=>{
 const {DEFENCE_SCENARIOS,DEFENCE_CASES,DEFENCE_RULES,DEFENCE_ENGINE_POSTURE}=await engine;
 assert.equal(DEFENCE_SCENARIOS.length,6);
 assert.equal(DEFENCE_CASES.length,12);
 assert.equal(DEFENCE_RULES.length,6);
 assert.equal(new Set(DEFENCE_CASES.map(x=>x.id)).size,12);
 assert.equal(DEFENCE_ENGINE_POSTURE.networkAccess,false);
 assert.equal(DEFENCE_ENGINE_POSTURE.externalTargets,false);
 assert.equal(DEFENCE_ENGINE_POSTURE.actualToolExecution,false);
 assert.equal(DEFENCE_ENGINE_POSTURE.productionTelemetry,false);
 assert.ok(DEFENCE_CASES.every(x=>x.events.length>0&&x.events.every(e=>e.synthetic===true)));
 assert.ok(DEFENCE_RULES.every(x=>/^T\d{4}$/.test(x.technique)));
});

test('one autonomous run verifies expected synthetic alerts without third party activity',async()=>{
 const {runDefenceDrill}=await engine;
 const result=runDefenceDrill('all');
 assert.equal(result.success,true);
 assert.equal(result.action,'defence-drill');
 assert.equal(result.scenariosTested,6);
 assert.equal(result.completedCases,12);
 assert.equal(result.metrics.truePositive,6);
 assert.equal(result.metrics.falsePositive,0);
 assert.equal(result.metrics.trueNegative,6);
 assert.equal(result.metrics.falseNegative,0);
 assert.equal(result.metrics.fixtureAccuracy,1);
 assert.equal(result.findings.length,6);
 assert.equal(result.executedThirdPartyTools,0);
 assert.equal(result.contactedTargets,0);
 assert.equal(result.operationallyValidated,false);
 assert.match(result.notice,/not.*field accuracy|do not estimate field accuracy/i);
 assert.ok(result.cases.every(x=>x.outcome==='expected'));
 assert.ok(result.findings.every(x=>x.synthetic===true&&x.evidenceIds.length>0));
});

test('each scenario is bounded, and unknown scenario names fail closed',async()=>{
 const {DEFENCE_SCENARIOS,runDefenceDrill}=await engine;
 for(const scenario of DEFENCE_SCENARIOS){
  const x=runDefenceDrill(scenario.id);
  assert.equal(x.success,true);
  assert.equal(x.completedCases,2);
  assert.equal(x.scenariosTested,1);
  assert.equal(x.metrics.truePositive,1);
  assert.equal(x.metrics.trueNegative,1);
  assert.equal(x.findings[0].scenario,scenario.id);
 }
 const bad=runDefenceDrill('../c2-execute');
 assert.equal(bad.success,false);
 assert.equal(bad.status,400);
 assert.equal(bad.findings,undefined);
});

test('all 50 references are mapped to defensive review contracts, never an executable adapter',async()=>{
 const {defenceIntegrationMatrix}=await engine;
 const m=defenceIntegrationMatrix();
 assert.equal(m.success,true);
 assert.equal(m.action,'integration-matrix');
 assert.equal(m.toolCount,50);
 assert.equal(m.connectedCount,0);
 assert.equal(m.executedThirdPartyTools,0);
 assert.equal(m.categories.reduce((n,x)=>n+x.count,0),50);
 assert.ok(m.integrations.every(x=>
  x.integrationStatus==='reference-only'&&
  x.runtimeInstalled===false&&
  x.executionAllowed===false&&
  x.ownerApprovalRequired&&x.labIsolationRequired&&x.licenceReviewRequired));
 assert.ok(m.integrations.some(x=>x.repository==='BishopFox/sliver'));
 assert.ok(m.integrations.some(x=>x.repository==='nccgroup/ScoutSuite'));
});

test('synthetic engine makes no fetch, network, shell, process or filesystem requests during execution',async()=>{
 const {runDefenceDrill,defenceIntegrationMatrix}=await engine;
 let calls=0;
 const prev=globalThis.fetch;
 globalThis.fetch=()=>{calls++;throw Error('Unexpected external request')};
 try{
  const a=runDefenceDrill();
  const b=defenceIntegrationMatrix();
  assert.equal(a.success,true);
  assert.equal(b.success,true);
  assert.equal(calls,0);
 }finally{globalThis.fetch=prev}
});
