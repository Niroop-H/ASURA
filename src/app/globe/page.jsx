import Header from '@/components/Header';
import LiveGeoMap from '@/components/LiveGeoMap';
export const metadata={
  title:'Cesium 3D Globe | ASURA',
  description:'Research-grade Cesium 3D globe, NASA VIIRS dated imagery, satellite mosaics and attributed live public observation layers',
};
export default function GlobePage(){
 return <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
   <Header title="Cesium 3D Earth & Observation Explorer" subtitle="Dated NASA VIIRS satellite imagery, public near-real-time aircraft observations and WGS84 terrain geometry" />
   <LiveGeoMap initialDimension="3D"/>
   <section className="defense-card p-5 text-sm space-y-2">
    <h2 className="font-semibold">Acquisition and telemetry integrity</h2>
    <p>NASA GIBS imagery is selected by observation-product date. Daily coverage may have clouds, low resolution or missing swaths. It is not live video. Esri imagery mosaics have mixed and often undisclosed capture dates; no blanket 2026 guarantee is made.</p>
    <p>Aircraft symbols use reported ADS-B positions from public receivers, updated by periodic polling. Timestamps show when the position was actually observed, which can differ from when it reached this website. The render is not a certified surveillance or air-traffic-control system.</p>
   </section>
 </div>;
}
