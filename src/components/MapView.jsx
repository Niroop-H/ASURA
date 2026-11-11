'use client';

import { useState } from 'react';
import {
  Globe,
  Layers,
  Plane,
  Ship,
  Activity,
  CloudSun,
  Eye,
  Radio,
  Crosshair,
  Maximize2,
  Compass,
  AlertCircle
} from 'lucide-react';

const TRACKED_TARGETS = [
  { id: 'TGT-892', type: 'aviation', callsign: 'NATO-01 (E-3A Sentry)', lat: 52.1, lon: 21.0, alt: '31,500 ft', speed: '462 kts', heading: 85, color: '#f59e0b' },
  { id: 'TGT-401', type: 'aviation', callsign: 'USAF FORTE11 (RQ-4 Global Hawk)', lat: 43.8, lon: 34.2, alt: '54,200 ft', speed: '325 kts', heading: 110, color: '#f59e0b' },
  { id: 'TGT-114', type: 'maritime', callsign: 'USS DWIGHT D. EISENHOWER', lat: 24.5, lon: 58.2, speed: '24.5 kts', heading: 240, color: '#0ea5e9' },
  { id: 'TGT-559', type: 'maritime', callsign: 'EVER GIVEN (Commercial Container)', lat: 30.1, lon: 32.5, speed: '12.0 kts', heading: 180, color: '#0ea5e9' },
  { id: 'EVT-082', type: 'seismic', callsign: 'USGS M5.4 - Central Turkey', lat: 38.0, lon: 37.1, depth: '10.2 km', color: '#ef4444' },
  { id: 'CAM-012', type: 'camera', callsign: 'Bosphorus Strait North Cam Node', lat: 41.2, lon: 29.1, status: 'On-Demand Snapshot Verified', color: '#8b5cf6' },
];

export default function MapView() {
  const [activeLayers, setActiveLayers] = useState({
    aviation: true,
    maritime: true,
    seismic: true,
    weather: false,
    camera: true,
  });

  const [selectedTarget, setSelectedTarget] = useState(TRACKED_TARGETS[0]);
  const [mouseCoords, setMouseCoords] = useState({ lat: '36.14° N', lon: '44.20° E' });

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const lat = ((1 - y) * 140 - 70).toFixed(2);
    const lon = (x * 360 - 180).toFixed(2);
    setMouseCoords({
      lat: `${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}`,
      lon: `${Math.abs(lon)}° ${lon >= 0 ? 'E' : 'W'}`,
    });
  };

  const visibleTargets = TRACKED_TARGETS.filter((t) => activeLayers[t.type]);

  return (
    <div className="defense-card overflow-hidden shadow-tactical-lg flex flex-col h-[700px] relative">
      {/* Tactical Top Bar */}
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sky-400 font-semibold">
            <Crosshair size={15} className="animate-spin text-sky-400" />
            <span>ASURA GOD'S EYE VIEW — TACTICAL GEOSPATIAL RADAR</span>
          </div>
          <span className="hidden sm:inline bg-sky-950/60 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded text-[10px]">
            SYNTHETIC OBSERVATION GRID
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <span className="hidden md:inline">CURSOR: <strong className="text-white">{mouseCoords.lat}, {mouseCoords.lon}</strong></span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <Radio size={12} className="animate-pulse" /> LIVE TELEMETRY
          </span>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Interactive Viewport */}
        <div
          onMouseMove={handleMouseMove}
          className="flex-1 bg-[#09111e] relative overflow-hidden select-none cursor-crosshair flex items-center justify-center"
        >
          {/* Coordinate Grid Background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(#0284c7 1px, transparent 1px), linear-gradient(90deg, #0284c7 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Tactical Radar Sweep Rings */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="w-[800px] h-[800px] rounded-full border border-sky-400/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="w-[500px] h-[500px] rounded-full border border-sky-400/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="w-[200px] h-[200px] rounded-full border border-sky-400/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="w-full h-[1px] bg-sky-400/30 absolute top-1/2 left-0" />
            <div className="h-full w-[1px] bg-sky-400/30 absolute top-0 left-1/2" />
          </div>

          {/* Vector Continental Landmass Outlines */}
          <svg
            className="w-full h-full opacity-35 pointer-events-none"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
          >
            {/* Equator & Meridians */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="500" y1="0" x2="500" y2="500" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="4 4" />

            {/* Approximate landmass vector silhouettes */}
            <path d="M150,80 Q220,90 280,140 Q250,220 180,210 Q140,160 150,80 Z" fill="#132338" stroke="#334155" strokeWidth="1" />
            <path d="M250,250 Q310,270 300,380 Q240,430 230,340 Z" fill="#132338" stroke="#334155" strokeWidth="1" />
            <path d="M470,80 Q750,70 820,180 Q760,250 560,210 Q460,150 470,80 Z" fill="#132338" stroke="#334155" strokeWidth="1" />
            <path d="M480,220 Q560,230 550,370 Q480,390 460,290 Z" fill="#132338" stroke="#334155" strokeWidth="1" />
            <path d="M780,320 Q870,320 860,390 Q780,410 780,320 Z" fill="#132338" stroke="#334155" strokeWidth="1" />
          </svg>

          {/* Interactive Plot Targets */}
          {visibleTargets.map((tgt) => {
            const top = `${((90 - tgt.lat) / 180) * 100}%`;
            const left = `${((tgt.lon + 180) / 360) * 100}%`;
            const isSelected = selectedTarget?.id === tgt.id;

            return (
              <div
                key={tgt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTarget(tgt);
                }}
                style={{ top, left }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                {/* Ping animation ring */}
                <span
                  className="absolute -inset-2 rounded-full opacity-60 animate-ping pointer-events-none"
                  style={{ backgroundColor: tgt.color }}
                />

                {/* Target marker dot */}
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-transform duration-150 ${
                    isSelected ? 'ring-4 ring-sky-400 scale-125' : 'group-hover:scale-110'
                  }`}
                  style={{ backgroundColor: tgt.color, borderColor: '#ffffff' }}
                >
                  <div className="w-1 h-1 bg-black rounded-full" />
                </div>

                {/* Target label tooltip */}
                <div className="hidden group-hover:block absolute left-4 top-0 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-slate-100 whitespace-nowrap shadow-lg z-30 pointer-events-none">
                  <div className="font-bold text-sky-400">{tgt.callsign}</div>
                  <div className="text-slate-400">{tgt.lat}°, {tgt.lon}°</div>
                </div>
              </div>
            );
          })}

          {/* Cesium 3D Note Badge */}
          <div className="absolute bottom-4 left-4 max-w-sm bg-slate-900/90 border border-slate-700 backdrop-blur-xs p-3 rounded-lg text-xs space-y-1 shadow-lg text-white">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold font-mono">
              <Globe size={13} />
              <span>Full 3D Terrain Mode</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Connect <code className="text-sky-300 font-mono">CESIUM_ION_ACCESS_TOKEN</code> in API Keys to stream Cesium 3D photorealistic photogrammetry and satellite tracks.
            </p>
          </div>
        </div>

        {/* Right Side Layer & Target Inspector Panel (Crisp Light Theme) */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 text-xs space-y-5 overflow-y-auto z-10">
          {/* Layer Toggles */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Layers size={13} className="text-sky-600" /> Observation Layers
            </h4>
            <div className="space-y-2 font-mono">
              {[
                { key: 'aviation', label: 'Air Feeds (ADS-B)', icon: Plane, color: '#f59e0b', count: 2 },
                { key: 'maritime', label: 'AIS Maritime Feeds', icon: Ship, color: '#0ea5e9', count: 2 },
                { key: 'seismic', label: 'USGS Seismic Events', icon: Activity, color: '#ef4444', count: 1 },
                { key: 'camera', label: 'Public CCTV Snapshots', icon: Eye, color: '#8b5cf6', count: 1 },
                { key: 'weather', label: 'Severe Weather Radar', icon: CloudSun, color: '#f97316', count: 0 },
              ].map((layer) => {
                const Icon = layer.icon;
                const active = activeLayers[layer.key];
                return (
                  <button
                    key={layer.key}
                    onClick={() => toggleLayer(layer.key)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-50/70 border-sky-300 text-slate-900 font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: active ? layer.color : undefined }} />
                      <span className="text-[11px]">{layer.label}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200">
                      {layer.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Target Dossier */}
          {selectedTarget ? (
            <div className="border-t border-slate-200 pt-4 space-y-3 font-mono">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair size={13} className="text-sky-600" /> Selected Track Dossier
              </h4>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Callsign:</span>
                  <span className="text-slate-900 font-bold">{selectedTarget.callsign}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Track ID:</span>
                  <span className="text-sky-700 font-semibold">{selectedTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Domain:</span>
                  <span className="text-slate-700 uppercase font-semibold">{selectedTarget.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-800">{selectedTarget.lat}° N, {selectedTarget.lon}° E</span>
                </div>
                {selectedTarget.alt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Altitude:</span>
                    <span className="text-slate-800 font-semibold">{selectedTarget.alt}</span>
                  </div>
                )}
                {selectedTarget.speed && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ground Speed:</span>
                    <span className="text-slate-800">{selectedTarget.speed}</span>
                  </div>
                )}
                {selectedTarget.status && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-700 font-bold">{selectedTarget.status}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-4 text-center text-slate-400 text-xs font-mono">
              Click any blip on radar to inspect live telemetry
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
