import Header from '@/components/Header';
export default function SatellitePage() {
 return <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5">
  <Header title="Satellite imagery" subtitle="Actual Earth observations, not simulated live video"/>
  <section className="defense-card p-6 space-y-4">
    <p className="text-sm text-slate-700">NASA Worldview provides a geospatial viewer for real satellite imagery with selectable layers, timestamps and acquisition history. Imagery is not continuous live footage; acquisition and publication delays vary by instrument and layer.</p>
    <a target="_blank" rel="noopener noreferrer" href="https://worldview.earthdata.nasa.gov/" className="inline-block rounded bg-slate-900 text-white px-4 py-2 text-sm">Open NASA Worldview imagery viewer ↗</a>
    <p className="text-xs text-slate-500">Cesium credentials alone do not grant commercial real-time satellite video. This link opens the public imagery provider rather than displaying fabricated satellite images in ASURA.</p>
  </section>
 </div>;
}
