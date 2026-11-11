'use client';
import React from 'react';

// Safe Markdown subset: React nodes escape untrusted model output. No raw HTML.
const INLINE=/(\*\*[^*\n]+\*\*|__[^_\n]+__|\x60[^\x60\n]+\x60|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
const safeLink=value=>{
 try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}
 catch{return null;}
};
function renderInline(input,prefix='inline'){
 const s=String(input||''),tokens=[],re=new RegExp(INLINE.source,'g');
 let m,start=0,k=0;
 while((m=re.exec(s))){
  if(m.index>start)tokens.push(s.slice(start,m.index));
  const part=m[0],key=prefix+'-'+k++;
  if(part.startsWith('**')||part.startsWith('__'))
   tokens.push(<strong className="font-bold text-slate-900" key={key}>{part.slice(2,-2)}</strong>);
  else if(part.startsWith('\x60'))
   tokens.push(<code key={key} className="font-mono bg-slate-100 rounded px-1 text-[0.9em]">{part.slice(1,-1)}</code>);
  else if(part.startsWith('[')){
   const at=part.indexOf(']('),label=part.slice(1,at),url=safeLink(part.slice(at+2,-1));
   tokens.push(url?<a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline break-all">{label}</a>:part);
  }else tokens.push(<em className="italic" key={key}>{part.slice(1,-1)}</em>);
  start=re.lastIndex;
 }
 if(start<s.length)tokens.push(s.slice(start));
 return tokens;
}
const cells=line=>{
 let s=line.trim();
 if(s.startsWith('|'))s=s.slice(1);
 if(s.endsWith('|'))s=s.slice(0,-1);
 return s.split(/(?<!\\)\|/).map(v=>v.trim().replace(/\\\|/g,'|'));
};
const isDivider=line=>cells(line).length>=2&&cells(line).every(v=>/^:?-{3,}:?$/.test(v));
const list=line=>line.match(/^\s{0,3}([-*+]|\d+[.)])\s+(.+)$/);
const heading=line=>line.match(/^(#{1,5})\s+(.+?)\s*#*\s*$/);
const special=(lines,i)=>{
 const line=lines[i]||'';
 return /^(\s*\x60{3}|\s*~{3}|\s*>|\s*([-*_]\s*){3,}\s*$)/.test(line)||
  Boolean(heading(line))||Boolean(list(line))||
  Boolean(i+1<lines.length&&line.includes('|')&&isDivider(lines[i+1]));
};
export default function RichAgentAnswer({text}){
 const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n'),blocks=[];
 for(let i=0;i<lines.length;){
  const line=lines[i];
  if(!line.trim()){i++;continue;}
  const fence=line.match(/^\s*(\x60{3}|~{3})([\w-]*)\s*$/);
  if(fence){
   const lang=fence[2],content=[];i++;
   while(i<lines.length&&!new RegExp('^\\s*'+fence[1]+'\\s*$').test(lines[i]))content.push(lines[i++]);
   if(i<lines.length)i++;
   blocks.push(<div key={blocks.length} className="rounded-lg overflow-hidden border border-slate-200">
    {lang&&<div className="bg-slate-100 text-[11px] px-3 py-1 uppercase">{lang}</div>}
    <pre className="overflow-x-auto p-3 bg-slate-950 text-slate-100 text-xs"><code>{content.join('\n')}</code></pre>
   </div>);continue;
  }
  const h=heading(line);
  if(h){
   blocks.push(<div key={blocks.length} role="heading" aria-level={Math.min(6,h[1].length+1)}
    className={(h[1].length<=2?'text-base font-bold':'text-sm font-semibold')+' mt-3 mb-1'}>
    {renderInline(h[2],'h'+blocks.length)}</div>);
   i++;continue;
  }
  if(i+1<lines.length&&line.includes('|')&&isDivider(lines[i+1])){
   const headers=cells(line),rows=[];i+=2;
   while(i<lines.length&&lines[i].trim()&&lines[i].includes('|')){
    rows.push(cells(lines[i++]));if(rows.length>=80)break;
   }
   blocks.push(<div key={blocks.length} className="my-3 overflow-x-auto border border-slate-200 rounded-md">
    <table className="min-w-full table-auto text-left border-collapse text-xs">
     <thead className="bg-slate-100"><tr>{headers.map((v,j)=><th key={j} className="px-3 py-2 border-b font-semibold">{renderInline(v,'th'+j)}</th>)}</tr></thead>
     <tbody>{rows.map((row,j)=><tr key={j} className="even:bg-slate-50">
      {headers.map((_,k)=><td key={k} className="px-3 py-2 border-b border-slate-100 align-top">{renderInline(row[k]||'','td'+j+'-'+k)}</td>)}
     </tr>)}</tbody>
    </table>
   </div>);continue;
  }
  const item=list(line);
  if(item){
   const ordered=/^\d/.test(item[1]),items=[];
   while(i<lines.length){
    const current=list(lines[i]);
    if(!current||ordered!==/^\d/.test(current[1]))break;
    items.push(current[2]);i++;
    while(i<lines.length&&/^\s{2,}\S/.test(lines[i])&&!list(lines[i])){
     items[items.length-1]+=' '+lines[i++].trim();
    }
   }
   const children=items.map((v,j)=><li key={j} className="pl-1">{renderInline(v,'li'+j)}</li>);
   blocks.push(ordered?<ol key={blocks.length} className="list-decimal pl-5 space-y-1 my-2">{children}</ol>:
    <ul key={blocks.length} className="list-disc pl-5 space-y-1 my-2">{children}</ul>);
   continue;
  }
  if(/^\s*>\s?/.test(line)){
   const quoted=[];
   while(i<lines.length&&/^\s*>\s?/.test(lines[i]))quoted.push(lines[i++].replace(/^\s*>\s?/,''));
   blocks.push(<blockquote key={blocks.length} className="border-l-4 border-sky-300 bg-sky-50 py-2 px-3 text-slate-700">{renderInline(quoted.join(' '))}</blockquote>);
   continue;
  }
  if(/^\s*([-*_]\s*){3,}\s*$/.test(line)){
   blocks.push(<hr key={blocks.length} className="border-slate-200 my-3"/>);i++;continue;
  }
  const paragraph=[line.trim()];i++;
  while(i<lines.length&&lines[i].trim()&&!special(lines,i))paragraph.push(lines[i++].trim());
  blocks.push(<p key={blocks.length} className="leading-relaxed my-2 break-words">{renderInline(paragraph.join(' '),'p'+blocks.length)}</p>);
 }
 return <div className="text-sm text-slate-800 min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{blocks}</div>;
}
