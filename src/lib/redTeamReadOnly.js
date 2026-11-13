import {
 RED_TEAM_TOOLS,RED_TEAM_CATEGORIES,
 redTeamCatalogSummary,searchRedTeamTools,getRedTeamTool,
} from './redTeamCatalog.js';
import {runDefenceDrill,defenceIntegrationMatrix} from './defenceValidationEngine.js';

export const RED_TEAM_ACTIONS=Object.freeze([
 {id:'inventory',label:'Summarize all 50 reference repositories',
  description:'Returns the maintained list of categories and reference counts; runs no third-party tool.'},
 {id:'search',label:'Search the reference catalogue',
  description:'Finds relevant tools by their name or published purpose; runs no tool.'},
 {id:'assessment-plan',label:'Generate authorized assessment checklist',
  description:'Produces a read-only preparation and reporting checklist; no target access.'},
 {id:'verify-reference',label:'Check a repository on GitHub',
  description:'Fetches metadata for exactly one catalogued GitHub repository. This does not install or test the tool.'},
 {id:'defence-drill',label:'Run autonomous defensive lab self-tests',
  description:'Evaluate safe detection rules against checked-in synthetic events. No external network, credentials or targets.'},
 {id:'integration-matrix',label:'Review all 50 defensive integration contracts',
  description:'Generate a 50-repository defensive use and approval matrix; no third-party code is executed.'},
]);

export const SAFETY_CONTRACT=Object.freeze({
 mode:'read-only',
 runtime:'serverless-reference-review-and-synthetic-defence-drills',
 syntheticDefenceDrills:true,
 arbitraryCommands:false,
 remoteShell:false,
 downloadedCodeExecution:false,
 credentialCollection:false,
 campaigns:false,
 liveExploitation:false,
 payloadExecution:false,
 networkScanning:false,
 externalEffect:'Public GitHub metadata GET only for one allowlisted repository on explicit request',
});

const safeString=(value,max=90)=>String(value??'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,max);
const CAT_IDS=new Set(RED_TEAM_CATEGORIES.map(x=>x.id));
export function runRedTeamReadOnlyAction({action,query='',category='all',scope='',scenario='all'}={}){
 if(action==='defence-drill')return runDefenceDrill(scenario);
 if(action==='integration-matrix')return defenceIntegrationMatrix();
 if(!['inventory','search','assessment-plan'].includes(action))
  return {success:false,status:400,error:'Command is not an approved read-only action. Third-party attack tools cannot be executed from this workspace.',actions:RED_TEAM_ACTIONS};
 const now=new Date().toISOString();
 if(action==='inventory')return {
  success:true,action,checkedAt:now,mode:'read-only',
  summary:redTeamCatalogSummary(),safety:SAFETY_CONTRACT
 };
 if(action==='search')return {
  success:true,action,checkedAt:now,mode:'read-only',
  query:safeString(query,100),
  category:CAT_IDS.has(category)?category:'all',
  results:searchRedTeamTools(query,category,50),
  safety:SAFETY_CONTRACT
 };
 const name=safeString(scope,100)||'Owner-authorized training environment';
 return {
  success:true,action,checkedAt:now,mode:'read-only',
  scopeLabel:name,authorizationVerified:false,
  title:'Proposed assessment — planning only',
  steps:[
   {id:'scope',title:'Document written authorization',detail:'Record the asset owner, permission boundaries, permitted testing window, exclusions and point of contact.'},
   {id:'inventory',title:'Prepare asset inventory',detail:'Use the asset owner’s exported inventory and approved read-only configuration reports; do not scan unauthorised networks.'},
   {id:'review',title:'Review preventive controls',detail:'Check credential handling, least privilege, exposure management, security updates, logging and backup configuration.'},
   {id:'detection',title:'Define safe detection validation',detail:'Map relevant public ATT&CK references to detection objectives; plan non-invasive validation using test-only evidence.'},
   {id:'evidence',title:'Agree evidence and privacy rules',detail:'Avoid collecting secrets, personal data or session tokens; use redacted observations and timestamps.'},
   {id:'approval',title:'Obtain testing sign-off',detail:'Require a separate authorised process before any active security testing; this workspace cannot launch it.'},
   {id:'report',title:'Produce risk and remediation report',detail:'List affected assets, source references, evidence confidence, impact and recommended defensive changes.'},
  ],
  toolsReferenced:RED_TEAM_TOOLS.length,
  executedTools:0,
  safety:SAFETY_CONTRACT
 };
}

const isAllowedRepo=x=>Boolean(getRedTeamTool(x));
/**
 * Optional public repository metadata verification. No tokens, repo cloning,
 * downloading, workflow dispatching, shell or offensive-tool execution.
 */
export async function verifyRedTeamReference(repository,{fetcher=fetch}={}){
 if(!isAllowedRepo(repository))return {
  success:false,status:400,error:'Repository must exactly match one of the 50 allowlisted reference entries.'
 };
 const found=getRedTeamTool(repository);
 // Hardcoded API host + allowlisted repo string. No user-supplied URLs.
 const url='https://api.github.com/repos/'+found.repository;
 let response;
 try{
  response=await fetcher(url,{
   method:'GET',cache:'no-store',redirect:'manual',
   signal:AbortSignal.timeout(6500),
   headers:{Accept:'application/vnd.github+json','User-Agent':'ASURA-RedTeam-Reference-Review/1.0'}
  });
 }catch(e){return {
  success:false,status:502,repository,checkedAt:new Date().toISOString(),
  error:'GitHub metadata verification could not complete (timeout or upstream error).',
  installed:false,executable:false
 }}
 if(response.status===403||response.status===429)return {
  success:false,status:503,repository,checkedAt:new Date().toISOString(),
  error:'GitHub API blocked or rate-limited this read-only metadata check. No repository status was inferred.',
  installed:false,executable:false
 };
 if(response.status===404||response.status===410)return {
  success:false,status:404,repository,checkedAt:new Date().toISOString(),
  error:'The GitHub reference was not found at the supplied path. It may have moved or become unavailable.',
  installed:false,executable:false
 };
 if(!response.ok)return {
  success:false,status:502,repository,checkedAt:new Date().toISOString(),
  error:'GitHub returned HTTP '+Number(response.status)+'; no repository status asserted.',
  installed:false,executable:false
 };
 let data;
 try{data=await response.json()}catch{return {
  success:false,status:502,repository,error:'GitHub returned malformed JSON.',
  installed:false,executable:false
 }}
 if(!data||typeof data.full_name!=='string'||
   data.full_name.toLowerCase()!==repository.toLowerCase()||
   typeof data.html_url!=='string'||!data.html_url.startsWith('https://github.com/')){
  return {success:false,status:502,repository,
   error:'Unexpected repository metadata; no verified status reported.',
   installed:false,executable:false};
 }
 return {
  success:true,action:'verify-reference',
  checkedAt:new Date().toISOString(),
  repository:found.repository,
  url:data.html_url,
  existsOnGitHub:true,
  archived:data.archived===true,
  disabled:data.disabled===true,
  isFork:data.fork===true,
  private:data.private===true,
  defaultBranch:safeString(data.default_branch,80)||null,
  updatedAt:typeof data.updated_at==='string'?data.updated_at:null,
  pushedAt:typeof data.pushed_at==='string'?data.pushed_at:null,
  license:typeof data.license?.spdx_id==='string'?safeString(data.license.spdx_id,60):null,
  installed:false,executable:false,
  note:'This verifies only public GitHub repository metadata. It does not install, operate, security-audit or license the tool.',
  safety:SAFETY_CONTRACT
 };
}
