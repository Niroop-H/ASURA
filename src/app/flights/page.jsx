import Header from '@/components/Header';
import LiveGeoMap from '@/components/LiveGeoMap';

export const metadata = { title: 'Live Flights | ASURA', description: 'Public ADS-B and optional licensed FlightAware flight observations' };

export default function FlightExplorer() {
  return <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
    <Header title="Live Flight Explorer" subtitle="Aircraft silhouettes, flight telemetry, satellite/street mapping and provenance" />
    <LiveGeoMap />
    <p className="text-sm text-slate-600">Public ADS-B feeds are operational when their sources respond. FlightAware is an optional separate licensed integration: it is not enabled without AeroAPI credentials and explicit public-display rights. Data may be delayed or incomplete; not for aviation decisions.</p>
  </div>;
}
