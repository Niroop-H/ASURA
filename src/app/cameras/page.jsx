import Header from '@/components/Header';
export default function CamerasPage() {
 return <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5">
  <Header title="Public camera viewer" subtitle="Authorized streams only"/>
  <section className="defense-card p-6 space-y-3">
    <p className="text-sm text-slate-700">No authorized public camera feeds have been configured. Camera streams need an owner-approved embed URL or a provider API with playback rights; an arbitrary CCTV URL does not establish access.</p>
    <p className="text-sm text-slate-700">When authorized streams are provided, this viewer can display their actual availability, last updated time, and playback links without claiming the camera is live when unavailable.</p>
  </section>
 </div>;
}
