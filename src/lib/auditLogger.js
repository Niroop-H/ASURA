import crypto from 'crypto';

/**
 * ASURA v2 in-process SHA-256 Merkle audit window.
 * Tamper verification works only inside this process. It is NOT persistent:
 * Vercel instances do not share memory, cold starts reset the ledger and a
 * privileged process can rewrite it. External anchoring is still required.
 *
 * Raw prompts, secrets, credentials and model chain-of-thought must never be
 * written here; callers log bounded stage summaries and SHA-256 digests.
 */
const ZERO='0'.repeat(64);
let head=ZERO,anchor=ZERO,sequence=0;
const records=[];
const LIMIT=200;
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const canonical=value=>JSON.stringify(value);
const bounded=(value,limit=320)=>String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,limit);

export function merkleRoot(hashes){
 if(!hashes.length)return ZERO;
 let level=hashes.map(x=>sha('leaf:'+x));
 while(level.length>1){
  const next=[];
  for(let i=0;i<level.length;i+=2)
   next.push(sha('node:'+level[i]+':'+(level[i+1]||level[i])));
  level=next;
 }
 return level[0];
}
function digest(event){
 const {hash,merkleRootAtAppend,...payload}=event;
 return sha(canonical(payload));
}
export function logAuditEvent({
 category='GENERAL_OP',action='UNSPECIFIED',actor='SYSTEM',
 classification='UNSPECIFIED',status='SUCCESS',details='',
 ipAddress='unknown'
}={}){
 sequence+=1;
 const event={
  id:'AUD-'+String(sequence).padStart(6,'0'),
  timestamp:new Date().toISOString(),
  category:bounded(category,70),
  action:bounded(action,100),
  actor:bounded(actor,90),
  classification:bounded(classification,45),
  status:bounded(status,45),
  details:bounded(details,480),
  ipAddress:bounded(ipAddress,80),
  previousHash:head,
 };
 event.hash=digest(event);
 head=event.hash;
 records.push(event);
 if(records.length>LIMIT){const removed=records.shift();anchor=removed.hash;}
 event.merkleRootAtAppend=merkleRoot(records.map(e=>e.hash));
 return {...event};
}
export function getAuditLogs(limit=50){
 const count=Number.isFinite(Number(limit))?Math.max(0,Math.min(LIMIT,Math.trunc(Number(limit)))):50;
 return records.slice(-count).reverse().map(x=>({...x}));
}
export function verifyAuditChain(){
 let previous=anchor,valid=true;
 for(const event of records){
  if(event.previousHash!==previous||digest(event)!==event.hash)valid=false;
  previous=event.hash;
 }
 const observed=records.length?previous:anchor;
 if(observed!==head)valid=false;
 return {
  valid,
  status:valid?'verified_in_process':'integrity_mismatch',
  persistent:false,
  verifiedAcrossInstances:false,
  externallyAnchored:false,
  totalRecords:records.length,
  totalWritten:sequence,
  headHash:head,
  anchorHash:anchor,
  merkleRoot:merkleRoot(records.map(e=>e.hash)),
  algorithm:'FIPS 180-4 SHA-256 hash chain with Merkle root over retained in-process events',
  warning:'Ephemeral process memory; this is not immutable storage, independent evidence anchoring, or an operational compliance certification.',
 };
}
