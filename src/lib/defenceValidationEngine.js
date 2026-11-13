/**
 * Defence Validation Engine (DVE)
 * SAFE MODE: deterministic detection checks against synthetic, in-memory
 * training telemetry only. No real endpoints, shell, credentials, networks,
 * payloads, repositories or third-party tools are contacted/executed here.
 *
 * Passing synthetic self-tests is NOT evidence of real-world detection quality.
 */
import {RED_TEAM_TOOLS,RED_TEAM_CATEGORIES} from './redTeamCatalog.js';

export const DEFENCE_ENGINE_VERSION='0.1.0-lab';
export const DEFENCE_ENGINE_POSTURE=Object.freeze({
 mode:'synthetic-offline-only',
 networkAccess:false,
 actualToolExecution:false,
 externalTargets:false,
 credentialHandling:false,
 productionTelemetry:false,
 testedAgainstLiveAssets:false,
 thirdPartyRepositoriesInstalled:0,
 source:'ASURA built-in synthetic detection fixtures',
 claim:'Training demonstration, not an independently validated defence system',
});

export const DEFENCE_RULES=Object.freeze([
 Object.freeze({id:'AUTH-BURST',scenario:'auth-burst',category:'identity',
  technique:'T1110',label:'Repeated authentication failures',
  trigger:'At least five failed sign-ins for the same synthetic principal within 60 seconds.',
  severity:'medium',recommendation:'Review MFA, lockout thresholds and identity provider sign-in alerts.'}),
 Object.freeze({id:'CLOUD-CHANGE',scenario:'cloud-change',category:'cloud',
  technique:'T1098',label:'Unexpected cloud access policy change',
  trigger:'A privileged cloud policy change has no recorded approval.',
  severity:'high',recommendation:'Review IAM change approvals, least privilege and cloud audit trails.'}),
 Object.freeze({id:'ENDPOINT-SCRIPT',scenario:'endpoint-script',category:'endpoint',
  technique:'T1059',label:'Unapproved unsigned script execution metadata',
  trigger:'Endpoint process metadata marks a script as unsigned and unapproved.',
  severity:'medium',recommendation:'Review application control, signed scripts and endpoint monitoring.'}),
 Object.freeze({id:'SECRET-EXPOSURE',scenario:'secret-exposure',category:'devsecops',
  technique:'T1552',label:'Unresolved secret-exposure finding',
  trigger:'Synthetic repository scan metadata reports an unresolved credential-pattern finding.',
  severity:'high',recommendation:'Use authorized secret scanners, revoke exposed test credentials and rotate affected secrets.'}),
 Object.freeze({id:'AUDIT-DISABLED',scenario:'audit-disabled',category:'integrity',
  technique:'T1562',label:'Unapproved audit logging disabled',
  trigger:'An audit-configuration change disables logging without approval.',
  severity:'high',recommendation:'Restore logging, require change approval and monitor audit-policy drift.'}),
 Object.freeze({id:'EGRESS-ANOMALY',scenario:'egress-anomaly',category:'network',
  technique:'T1041',label:'Unapproved high-volume egress metadata',
  trigger:'Synthetic outbound data volume exceeds 100 MiB without approval.',
  severity:'medium',recommendation:'Review authorized data flows, egress restrictions and network baselines.'}),
]);
const SIMULATED_START='2026-01-01T00:00:00.000Z';
const event=(id,kind,fields={},minutes=0)=>Object.freeze({
 id,kind,synthetic:true,at:new Date(Date.parse(SIMULATED_START)+minutes*60000).toISOString(),
 ...fields,
});
const auth=(n)=>Array.from({length:n},(_,i)=>event('auth-'+i,'auth',{
 principal:'lab-user-01',outcome:'failure',source:'fixture',
},i/10));
export const DEFENCE_CASES=Object.freeze([
 {id:'auth-burst-positive',scenario:'auth-burst',expected:true,
  events:auth(6)},
 {id:'auth-burst-benign',scenario:'auth-burst',expected:false,
  events:auth(2)},
 {id:'cloud-change-positive',scenario:'cloud-change',expected:true,
  events:[event('cloud-change-1','cloud-iam',{change:'privileged-policy-change',approved:false})]},
 {id:'cloud-change-benign',scenario:'cloud-change',expected:false,
  events:[event('cloud-change-2','cloud-iam',{change:'privileged-policy-change',approved:true})]},
 {id:'endpoint-script-positive',scenario:'endpoint-script',expected:true,
  events:[event('endpoint-1','endpoint-process',{type:'script',signed:false,approved:false})]},
 {id:'endpoint-script-benign',scenario:'endpoint-script',expected:false,
  events:[event('endpoint-2','endpoint-process',{type:'script',signed:true,approved:true})]},
 {id:'secret-exposure-positive',scenario:'secret-exposure',expected:true,
  events:[event('secret-1','repo-finding',{pattern:'synthetic-secret-detector-marker',resolved:false})]},
 {id:'secret-exposure-benign',scenario:'secret-exposure',expected:false,
  events:[event('secret-2','repo-finding',{pattern:'synthetic-secret-detector-marker',resolved:true})]},
 {id:'audit-disabled-positive',scenario:'audit-disabled',expected:true,
  events:[event('audit-1','audit-policy',{enabled:false,approved:false})]},
 {id:'audit-disabled-benign',scenario:'audit-disabled',expected:false,
  events:[event('audit-2','audit-policy',{enabled:false,approved:true})]},
 {id:'egress-anomaly-positive',scenario:'egress-anomaly',expected:true,
  events:[event('network-1','egress-summary',{bytes:157286400,approved:false})]},
 {id:'egress-anomaly-benign',scenario:'egress-anomaly',expected:false,
  events:[event('network-2','egress-summary',{bytes:157286400,approved:true})]},
].map(item=>Object.freeze({...item,events:Object.freeze(item.events)})));
const byId=new Map(DEFENCE_RULES.map(rule=>[rule.scenario,rule]));
export const DEFENCE_SCENARIOS=Object.freeze(DEFENCE_RULES.map(rule=>Object.freeze({
 id:rule.scenario,label:rule.label,technique:rule.technique,category:rule.category,
 testCases:DEFENCE_CASES.filter(item=>item.scenario===rule.scenario).length,
})));

function matchingIds(rule,events){
 if(rule.id==='AUTH-BURST'){
  const failed=events.filter(x=>x.kind==='auth'&&x.outcome==='failure'&&
   typeof x.principal==='string'&&Number.isFinite(Date.parse(x.at)));
  for(const first of failed){
   const within=failed.filter(x=>x.principal===first.principal&&
    Math.abs(Date.parse(x.at)-Date.parse(first.at))<=60000);
   if(within.length>=5)return within.map(x=>x.id);
  }
  return [];
 }
 if(rule.id==='CLOUD-CHANGE')return events.filter(x=>x.kind==='cloud-iam'&&
  x.change==='privileged-policy-change'&&x.approved===false).map(x=>x.id);
 if(rule.id==='ENDPOINT-SCRIPT')return events.filter(x=>x.kind==='endpoint-process'&&
  x.type==='script'&&x.signed===false&&x.approved===false).map(x=>x.id);
 if(rule.id==='SECRET-EXPOSURE')return events.filter(x=>x.kind==='repo-finding'&&
  x.pattern==='synthetic-secret-detector-marker'&&x.resolved===false).map(x=>x.id);
 if(rule.id==='AUDIT-DISABLED')return events.filter(x=>x.kind==='audit-policy'&&
  x.enabled===false&&x.approved===false).map(x=>x.id);
 if(rule.id==='EGRESS-ANOMALY')return events.filter(x=>x.kind==='egress-summary'&&
  Number.isFinite(x.bytes)&&x.bytes>104857600&&x.approved===false).map(x=>x.id);
 return [];
}
/**
 * No user-provided telemetry or arbitrary expressions: every event comes
 * solely from the checked-in, clearly labelled synthetic fixture set.
 */
export function runDefenceDrill(scenario='all'){
 if(scenario!=='all'&&!byId.has(scenario))
  return {success:false,status:400,error:'Unknown synthetic scenario; no fallback executed.'};
 const cases=DEFENCE_CASES.filter(item=>scenario==='all'||item.scenario===scenario);
 let tp=0,fp=0,tn=0,fn=0;
 const findings=[];
 const evaluated=cases.map(item=>{
  const rule=byId.get(item.scenario);
  const ids=matchingIds(rule,item.events);
  const detected=ids.length>0;
  if(detected&&item.expected)tp++;
  else if(detected&&!item.expected)fp++;
  else if(!detected&&item.expected)fn++;
  else tn++;
  if(detected)findings.push({
   ruleId:rule.id,scenario:rule.scenario,technique:rule.technique,
   caseId:item.id,severity:rule.severity,
   label:rule.label,trigger:rule.trigger,
   evidenceIds:ids,synthetic:true,
   recommendation:rule.recommendation,
  });
  return {caseId:item.id,scenario:item.scenario,ruleId:rule.id,
   expectedAlert:item.expected,detected,
   outcome:detected===item.expected?'expected':'unexpected',
   eventCount:item.events.length,matchedEventIds:ids};
 });
 return {
  success:true,action:'defence-drill',checkedAt:new Date().toISOString(),
  engineVersion:DEFENCE_ENGINE_VERSION,scenario,
  title:'Autonomous synthetic defensive control validation',
  mode:DEFENCE_ENGINE_POSTURE.mode,
  fixtureSource:'checked-in synthetic telemetry (not real incident evidence)',
  scenariosTested:new Set(cases.map(x=>x.scenario)).size,
  completedCases:cases.length,
  metrics:{truePositive:tp,falsePositive:fp,trueNegative:tn,falseNegative:fn,
   fixtureAccuracy:cases.length?(tp+tn)/cases.length:null,
   fixtureRecall:tp+fn?tp/(tp+fn):null,
   fixturePrecision:tp+fp?tp/(tp+fp):null},
  findings,cases:evaluated,
  rules:DEFENCE_RULES.filter(r=>scenario==='all'||r.scenario===scenario),
  executedThirdPartyTools:0,contactedTargets:0,
  operationallyValidated:false,
  notice:'These results only exercise built-in synthetic fixtures. Metrics do not estimate field accuracy or military readiness.',
  safety:DEFENCE_ENGINE_POSTURE
 };
}
const defUse={
 emulation:'Map published adversary-emulation techniques to observable defensive control requirements; no agent execution.',
 recon:'Review owner-supplied asset inventories and published exposure reports only.',
 scanning:'Review offline findings exported from authorized testing; this web app does not scan assets.',
 directory:'Review sanitized identity and privilege-relationship reports without accessing a domain.',
 credentials:'Use synthetic indicators and offline policy evidence; never collect or crack operational credentials.',
 phishing:'Plan opt-in awareness and reporting controls; do not deliver phishing messages.',
 pivoting:'Review segmentation and cloud-audit reports; do not establish remote tunnels or pivot.',
 references:'Curate research references for review and risk assessment; never dispatch agent code.',
};
export function defenceIntegrationMatrix(){
 const integrations=RED_TEAM_TOOLS.map(item=>({
  repository:item.repository,category:item.category,url:item.url,
  defensiveUse:defUse[item.category],
  integrationStatus:'reference-only',
  runtimeInstalled:false,executionAllowed:false,
  ownerApprovalRequired:true,labIsolationRequired:true,licenceReviewRequired:true,
  nextStep:'Evaluate trust, update status, license and defensive scope before designing a separately approved adapter.',
 }));
 return {
  success:true,action:'integration-matrix',
  title:'50-repository defensive integration review matrix',
  checkedAt:new Date().toISOString(),
  toolCount:integrations.length,connectedCount:0,executedThirdPartyTools:0,
  categories:RED_TEAM_CATEGORIES.map(x=>({id:x.id,name:x.name,count:integrations.filter(y=>y.category===x.id).length})),
  integrations,safety:DEFENCE_ENGINE_POSTURE,
  note:'Mapping fifty public repositories to prospective defensive uses does not connect, run, audit or approve their code.'
 };
}
