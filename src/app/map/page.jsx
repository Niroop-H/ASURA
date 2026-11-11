import Header from '@/components/Header';
import LiveGeoMap from '@/components/LiveGeoMap';
import LiveDataViewer from '@/components/LiveDataViewer';

export default function Page() {
  return <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
    <Header title="Geospatial observations" subtitle="Source integration status" />
    <LiveGeoMap />
    <LiveDataViewer initialSource="flights" />
  </div>;
}
