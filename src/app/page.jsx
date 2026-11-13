import Link from 'next/link';
import Header from '@/components/Header';
import LiveDataViewer from '@/components/LiveDataViewer';
import LiveGeoMap from '@/components/LiveGeoMap';
export default function DashboardPage() {
 return <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
  <Header title="ASURA Live Observations" subtitle="Public source data, freshness and attribution"/>
  <section className="defense-card px-5 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-sky-200 bg-gradient-to-r from-sky-50 to-white">
   <div className="space-y-1">
     <h2 className="text-xl font-bold text-slate-900">DEVASHRI AI</h2>
     <p className="text-sm text-slate-600">Ask anything. Bring current public news, flights, weather, airports and operator camera information into one conversation.</p>
   </div>
   <Link href="/agent" className="shrink-0 px-5 py-3 rounded bg-sky-700 text-white text-sm font-semibold hover:bg-sky-800">Open DEVASHRI</Link>
  </section>
  <section className="defense-card p-5 border-sky-200 bg-gradient-to-r from-slate-50 to-sky-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
   <div className="space-y-1">
    <h2 className="font-bold text-slate-900 text-lg">Autonomous Defense Operations</h2>
    <p className="text-sm text-slate-600">Signed Render/Groq defensive planning, 50 typed tool contracts, traceable observations and explicit human approval for containment proposals.</p>
    <p className="text-xs text-amber-800">Development integration: live external SOC tools require separately verified deployment and permissions.</p>
   </div>
   <Link href="/defense" className="px-5 py-3 bg-slate-900 text-white font-semibold text-sm rounded hover:bg-slate-800 shrink-0">Open Defense Console</Link>
  </section>
  <LiveGeoMap/>
  <LiveDataViewer initialSource="flights"/>
  <section className="defense-card p-5 space-y-3">
    <h2 className="font-semibold">Viewers and tools</h2>
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href="/flights" className="underline text-sky-700">Live Flight Explorer</Link>
      <Link href="/agent" className="underline text-sky-700">DEVASHRI AI</Link>
      <Link href="/defense" className="underline text-sky-700">Autonomous Defense</Link>
      <Link href="/globe" className="underline text-sky-700">Cesium 3D Globe</Link>
      <Link href="/weather" className="underline text-sky-700">Worldwide Weather Explorer</Link>
      <Link href="/satellite" className="underline text-sky-700">Satellite imagery viewer</Link>
      <Link href="/cameras" className="underline text-sky-700">Authorized camera viewer</Link>
      <Link href="/sources" className="underline text-sky-700">Source registry</Link>
    </div>
  </section>
 </div>;
}
