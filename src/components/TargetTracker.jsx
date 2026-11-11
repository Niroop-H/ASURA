'use client';

import { useState } from 'react';
import {
  Crosshair,
  Plane,
  Ship,
  Activity,
  Eye,
  Radio,
  Search,
  Filter,
  ArrowUpRight,
  Shield,
  Compass,
  ChevronRight,
  Maximize2
} from 'lucide-react';

const TRACKED_ASSETS = [
  {
    id: 'TRK-AIR-01',
    milStdId: 'SFAPMFQ--------',
    callsign: 'NATO-01 (Boeing E-3A Sentry)',
    domain: 'Air',
    type: 'AWACS / Airborne C2',
    lat: 52.1245,
    lon: 21.0112,
    alt: '31,500 ft',
    speed: '462 kts',
    heading: 85,
    iffStatus: 'MODE-5 CONFIRMED',
    threatLevel: 'FRIENDLY',
    source: 'ADS-B / OpenSky Feed',
    updatedAt: '12s ago',
  },
  {
    id: 'TRK-AIR-02',
    milStdId: 'SFAPMFR--------',
    callsign: 'FORTE11 (RQ-4 Global Hawk)',
    domain: 'Air',
    type: 'High-Altitude ISR Recon',
    lat: 43.8119,
    lon: 34.2045,
    alt: '54,200 ft',
    speed: '325 kts',
    heading: 110,
    iffStatus: 'MODE-4 VERIFIED',
    threatLevel: 'FRIENDLY',
    source: 'AviationStack / Defense Stream',
    updatedAt: '4s ago',
  },
  {
    id: 'TRK-SEA-01',
    milStdId: 'SFSPCA---------',
    callsign: 'USS DWIGHT D. EISENHOWER (CVN-69)',
    domain: 'Maritime',
    type: 'Aircraft Carrier Strike Group',
    lat: 24.5122,
    lon: 58.2118,
    speed: '24.5 kts',
    heading: 240,
    iffStatus: 'BLUE FORCE TRACKED',
    threatLevel: 'FRIENDLY',
    source: 'MarineTraffic / AIS Live',
    updatedAt: '28s ago',
  },
  {
    id: 'TRK-SEA-02',
    milStdId: 'SUSPCA---------',
    callsign: 'UNKNOWN VESSEL (AIS SPOOFED)',
    domain: 'Maritime',
    type: 'Commercial Bulk / Dark Fleet',
    lat: 13.1204,
    lon: 43.0891,
    speed: '11.8 kts',
    heading: 320,
    iffStatus: 'ANOMALY DETECTED',
    threatLevel: 'SUSPICIOUS',
    source: 'AIS Satellite Anomaly Monitor',
    updatedAt: '1m ago',
  },
  {
    id: 'TRK-GEO-01',
    milStdId: 'ENUG-----------',
    callsign: 'USGS M5.4 - Central Anatolia',
    domain: 'Seismic',
    type: 'Significant Natural Event',
    lat: 38.0124,
    lon: 37.1045,
    depth: '10.2 km',
    magnitude: '5.4 Mw',
    threatLevel: 'NATURAL HAZARD',
    source: 'USGS Real-time GeoJSON API',
    updatedAt: '3m ago',
  },
  {
    id: 'TRK-CAM-01',
    milStdId: 'EPUG-----------',
    callsign: 'Bosphorus North Maritime Strait Node',
    domain: 'CCTV/Snapshot',
    type: 'Public Maritime Chokepoint',
    lat: 41.2155,
    lon: 29.1124,
    resolution: '1080p HD (On-Demand Snapshot)',
    threatLevel: 'ROUTINE',
    source: 'Municipal Transit Camera API',
    updatedAt: '5s ago',
  },
];

export default function TargetTracker() {
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState(TRACKED_ASSETS[0]);

  const filteredAssets = TRACKED_ASSETS.filter((asset) => {
    const matchesDomain = selectedDomain === 'ALL' || asset.domain.toUpperCase().includes(selectedDomain);
    const matchesSearch = asset.callsign.toLowerCase().includes(search.toLowerCase()) ||
                          asset.id.toLowerCase().includes(search.toLowerCase()) ||
                          asset.type.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="defense-card p-5 space-y-4">
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair size={16} className="text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">
              Live Tactical Target Tracking & Telemetry
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Active situational tracks formatted to MIL-STD-2525 symbology standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-mono">
            {['ALL', 'AIR', 'MARITIME', 'SEISMIC'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDomain(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedDomain === d
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Callsign, MIL-STD ID, Platform Type, or Track Code..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
        />
      </div>

      {/* Tracking Table & Target Dossier Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table of Active Tracks (2 Cols) */}
        <div className="lg:col-span-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="defense-table-header">Track / Callsign</th>
                  <th className="defense-table-header">Domain / Type</th>
                  <th className="defense-table-header">Coordinates</th>
                  <th className="defense-table-header">Threat / IFF</th>
                  <th className="defense-table-header">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAsset.id === asset.id;
                  const isAir = asset.domain === 'Air';
                  const isSea = asset.domain === 'Maritime';

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/80 font-semibold' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="defense-table-cell font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {isAir && <Plane size={13} className="text-amber-600" />}
                          {isSea && <Ship size={13} className="text-sky-600" />}
                          {!isAir && !isSea && <Activity size={13} className="text-emerald-600" />}
                          <span>{asset.callsign}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">{asset.id}</span>
                      </td>

                      <td className="defense-table-cell text-slate-600">
                        <div>{asset.domain}</div>
                        <span className="text-[10px] text-slate-400">{asset.type}</span>
                      </td>

                      <td className="defense-table-cell text-slate-700">
                        <div>{asset.lat.toFixed(2)}° N, {asset.lon.toFixed(2)}° E</div>
                        <span className="text-[10px] text-slate-400">{asset.alt || asset.speed || 'Surface'}</span>
                      </td>

                      <td className="defense-table-cell">
                        <span className={`defense-badge ${
                          asset.threatLevel === 'SUSPICIOUS'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : asset.threatLevel === 'NATURAL HAZARD'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {asset.threatLevel}
                        </span>
                      </td>

                      <td className="defense-table-cell text-slate-400 text-[11px]">
                        {asset.updatedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Track Telemetry Dossier Card (1 Col) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Telemetry Dossier
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                {selectedAsset.id}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">{selectedAsset.callsign}</div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-sans">{selectedAsset.type}</p>
            </div>

            <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">MIL-STD-2525 Symbology:</span>
                <span className="text-slate-800 font-bold">{selectedAsset.milStdId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Position Coordinates:</span>
                <span className="text-slate-800">{selectedAsset.lat}° N, {selectedAsset.lon}° E</span>
              </div>
              {selectedAsset.alt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Barometric Altitude:</span>
                  <span className="text-sky-700 font-semibold">{selectedAsset.alt}</span>
                </div>
              )}
              {selectedAsset.speed && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ground Velocity:</span>
                  <span className="text-slate-800">{selectedAsset.speed}</span>
                </div>
              )}
              {selectedAsset.heading && (
                <div className="flex justify-between">
                  <span className="text-slate-400">True Bearing:</span>
                  <span className="text-slate-800">{selectedAsset.heading}° True</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">IFF Identification:</span>
                <span className="text-emerald-700 font-bold">{selectedAsset.iffStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Acquisition Feed:</span>
                <span className="text-slate-700 truncate max-w-[140px]">{selectedAsset.source}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600">
              <Radio size={12} className="animate-pulse" /> Live Telemetry
            </span>
            <span>Refreshed: {selectedAsset.updatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
