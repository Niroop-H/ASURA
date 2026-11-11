import Header from '@/components/Header';
import LiveGeoMap from '@/components/LiveGeoMap';
export const metadata={title:'Satellite & NASA Observation Imagery | ASURA'};
export default function SatellitePage(){
 return <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
   <Header title="2026 Satellite Observation Viewer" subtitle="Cesium 3D, detailed imagery mosaics and dated NASA VIIRS Earth observations"/>
   <LiveGeoMap initialDimension="3D" />
   <section className="defense-card p-5 space-y-3">
    <h2 className="font-semibold">Imagery sources and accuracy</h2>
    <p className="text-sm text-slate-700">Select <strong>NASA dated imagery</strong> in the Cesium toolbar and choose a 2026 acquisition-product day. The NOAA-20 VIIRS layer is a relatively coarse true-color satellite observation, not live video and not detailed enough to identify vehicles or individual aircraft.</p>
    <p className="text-sm text-slate-700">Select <strong>Satellite mosaic</strong> for finer detail. Its constituent pixels can be older than 2026. Do not infer imagery age from the website's current date.</p>
    <a className="text-sm text-sky-700 underline" href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noopener noreferrer">Open NASA Worldview for additional satellite datasets and acquisition dates</a>
   </section>
 </div>;
}
