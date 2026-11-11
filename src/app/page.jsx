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
  <LiveGeoMap/>
  <LiveDataViewer initialSource="flights"/>
  <section className="defense-card p-5 space-y-3">
    <h2 className="font-semibold">Viewers and tools</h2>
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href="/flights" className="underline text-sky-700">Live Flight Explorer</Link>
      <Link href="/agent" className="underline text-sky-700">DEVASHRI AI</Link>
      <Link href="/globe" className="underline text-sky-700">Cesium 3D Globe</Link>
      <Link href="/satellite" className="underline text-sky-700">Satellite imagery viewer</Link>
      <Link href="/cameras" className="underline text-sky-700">Authorized camera viewer</Link>
      <Link href="/sources" className="underline text-sky-700">Source registry</Link>
    </div>
  </section>
 </div>;
}
