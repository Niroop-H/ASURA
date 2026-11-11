import Link from 'next/link';
import Header from '@/components/Header';
import LiveDataViewer from '@/components/LiveDataViewer';
export default function DashboardPage() {
 return <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
  <Header title="ASURA Live Observations" subtitle="Public source data, freshness and attribution"/>
  <LiveDataViewer/>
  <section className="defense-card p-5 space-y-3">
    <h2 className="font-semibold">Viewers and tools</h2>
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href="/query" className="underline text-sky-700">Evidence AI chat</Link>
      <Link href="/satellite" className="underline text-sky-700">Satellite imagery viewer</Link>
      <Link href="/cameras" className="underline text-sky-700">Authorized camera viewer</Link>
      <Link href="/sources" className="underline text-sky-700">Source registry</Link>
    </div>
  </section>
 </div>;
}
