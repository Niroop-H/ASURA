'use client';

import Header from '@/components/Header';
import MapView from '@/components/MapView';

export default function MapPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header
        title="Geospatial Tactical Radar Screen"
        subtitle="Multi-domain positional tracking across aviation, maritime, and seismic telemetry feeds"
      />

      <MapView />
    </div>
  );
}
