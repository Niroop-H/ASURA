import crypto from 'node:crypto';

/** Server-only Vercel <-> Render HMAC v1; never import in client components. */
export function serverSecret(){
 const secret=process.env.ASURA_ENGINE_SECRET||'';
 if(secret.length<32)throw new Error('ASURA_ENGINE_SECRET is not configured (minimum 32 characters)');
 return secret;
}
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const hmac=message=>crypto.createHmac('sha256',serverSecret()).update(message).digest('hex');
export function signDefenseRequest(method,path,body=''){
 const stamp=String(Math.floor(Date.now()/1000));
 const nonce=crypto.randomBytes(16).toString('hex');
 const data=method.toUpperCase()+'\n'+path+'\n'+stamp+'\n'+nonce+'\n'+sha256(body);
 return {
  'X-ASURA-Timestamp':stamp,
  'X-ASURA-Nonce':nonce,
  'X-ASURA-Signature':hmac(data),
 };
}
function equalsHex(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||
    !/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b))return false;
 return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
export function verifyDefenseRequest(method,path,body,headers,nonces,now=Date.now()){
 const timestamp=headers.get('x-asura-timestamp')||'';
 const nonce=headers.get('x-asura-nonce')||'';
 const signature=headers.get('x-asura-signature')||'';
 if(!/^\d{10,12}$/.test(timestamp)||!/^[a-f0-9]{32}$/.test(nonce))return false;
 if(Math.abs(Math.floor(now/1000)-Number(timestamp))>90)return false;
 const data=method.toUpperCase()+'\n'+path+'\n'+timestamp+'\n'+nonce+'\n'+sha256(body);
 if(!equalsHex(signature,hmac(data)))return false;
 // Bounded in-process replay check; not a distributed replay database.
 for(const [key,time] of nonces){
  if(now-time>90000)nonces.delete(key);
 }
 if(nonces.has(nonce))return false;
 if(nonces.size>4096)return false;
 nonces.set(nonce,now);
 return true;
}
export function verifyDefenseSseEnvelope(envelope){
 if(!envelope||typeof envelope.body!=='string'||typeof envelope.sig!=='string'||
    envelope.body.length>32000)return null;
 if(!equalsHex(envelope.sig,hmac('sse\n'+envelope.body)))return null;
 try{
  const data=JSON.parse(envelope.body);
  if(!data||typeof data!=='object'||typeof data.type!=='string')return null;
  return data;
 }catch{return null}
}
export function renderEndpoint(path){
 const raw=process.env.RENDER_BACKEND_URL||'';
 let url;
 try{url=new URL(raw);}catch{throw Error('RENDER_BACKEND_URL is not configured with an HTTPS origin')}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||
   !(url.protocol==='https:'&&url.hostname.endsWith('.onrender.com')||
     process.env.NODE_ENV==='test'&&url.protocol==='http:'&&url.hostname==='127.0.0.1'))
 )throw Error('RENDER_BACKEND_URL must be an origin on the approved Render host');
 return new URL(path,url).toString();
}
export function requireDefenseOperator(request){
 const expected=process.env.ASURA_DEFENSE_ACCESS_TOKEN||'';
 const supplied=request.headers.get('x-asura-operator-token')||'';
 if(Buffer.byteLength(expected)<32||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
    !crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))return null;
 return sha256(Buffer.from(supplied)).slice(0,48);
}
