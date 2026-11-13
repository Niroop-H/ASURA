/**
 * Selects topical publisher search terms from an explicit news request.
 * Never fabricates an entity or falls back to unrelated world headlines.
 * This is keyword retrieval, not proof of article relevance.
 */
const STOP=new Set([
 'the','a','an','and','or','about','for','of','in','on','at','to','from','with','by','me','my','i','we',
 'you','your','can','could','would','should','do','does','did','is','are','was','were','be',
 'show','give','get','find','fetch','pass','tell','search','look','check','provide','retrieve','list',
 'data','information','any','all','some','everything','details','stories','story','article',
 'articles','news','headline','headlines','report','reports','updates','update',
 'latest','recent','current','today','now','this','week','month','yesterday','tomorrow',
 'please','what','which','who','when','where','why','how','new','most','as','well','summary',
 'related','regarding','published','verifiable','public','source','sources','covering'
]);
export function topicalNewsQuery(question=''){
 const q=String(question||'').slice(0,250);
 if(!/\b(?:news|headlines?|articles?|coverage|report(?:s|ing)?|updates?)\b/i.test(q))return null;
 const tokens=(q.toLowerCase().match(/[a-z][a-z0-9-]{1,39}/g)||[])
  .filter(x=>!STOP.has(x));
 const terms=[...new Set(tokens)].slice(0,5);
 return terms.length?terms.join(' AND '):null;
}
export function wantsPublisherListing(question=''){
 const q=String(question||'');
 return /\b(?:news|headlines?|articles?|coverage)\b/i.test(q)&&
  /\b(?:pass me|show me|give me|list|latest|find|fetch|send me|provide)\b/i.test(q)&&
  !/\b(?:analy[sz]e|compare|explain|interpret|summari[sz]e|why|predict|forecast|impact|opinion)\b/i.test(q);
}
