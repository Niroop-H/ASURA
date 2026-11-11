'use client';

import { useState } from 'react';
import { ShieldCheck, Crosshair, Radar, RefreshCw } from 'lucide-react';

export default function ThreatRadarChart() {
  const [activeDomain, setActiveDomain] = useState(null);

  // Readiness scores out of 100
  const DOMAIN_SCORES = [
    { key: 'air', label: 'Airspace', score: 92, angle: 0, color: '#f59e0b', status: 'Continuous ADS-B Tracking' },
    { key: 'sea', label: 'Maritime', score: 88, angle: 72, color: '#0ea5e9', status: 'AIS Marine Corridors Active' },
    { key: 'land', label: 'Land/Seismic', score: 96, angle: 144, color: '#10b981', status: 'USGS Realtime Seismic Linked' },
    { key: 'cyber', label: 'Cyber/OSINT', score: 85, angle: 216, color: '#8b5cf6', status: 'Verified Public Feed Feeds' },
    { key: 'space', label: 'Orbital/Sat', score: 79, angle: 288, color: '#ec4899', status: 'TLE Ephemeris Catalog Ready' },
  ];

  const size = 260;
  const center = size / 2;
  const radius = 95;

  // Compute (x, y) given angle in degrees and normalized value (0..1)
  const getCoordinates = (angleDeg, valueNorm) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const r = radius * valueNorm;
    return {
      x: center + r * Math.cos(angleRad),
      y: center + r * Math.sin(angleRad),
    };
  };

  // Generate radar polygon points
  const polygonPoints = DOMAIN_SCORES.map((d) => {
    const coords = getCoordinates(d.angle, d.score / 100);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const hoveredInfo = activeDomain
    ? DOMAIN_SCORES.find((d) => d.key === activeDomain)
    : null;

  return (
    <div className="defense-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Radar size={16} className="text-sky-600 animate-spin" />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">
            Multi-Domain Readiness Radar
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
          DEFCON POSTURE 5
        </span>
      </div>

      {/* Spider Web Chart Canvas */}
      <div className="relative flex items-center justify-center py-2 select-none">
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric Reference Rings */}
          {[0.25, 0.5, 0.75, 1.0].map((ring, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius * ring}
              fill={idx === 3 ? 'rgba(248, 250, 252, 0.6)' : 'none'}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? '2 2' : 'none'}
            />
          ))}

          {/* Radial Axis Spokes */}
          {DOMAIN_SCORES.map((d, idx) => {
            const endCoords = getCoordinates(d.angle, 1.0);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={endCoords.x}
                y2={endCoords.y}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}

          {/* Dynamic Polygon Area */}
          <polygon
            points={polygonPoints}
            fill="rgba(2, 132, 199, 0.18)"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Axis Vertex Nodes */}
          {DOMAIN_SCORES.map((d) => {
            const nodeCoords = getCoordinates(d.angle, d.score / 100);
            const labelCoords = getCoordinates(d.angle, 1.25);
            const isSelected = activeDomain === d.key;

            return (
              <g
                key={d.key}
                className="cursor-pointer group"
                onMouseEnter={() => setActiveDomain(d.key)}
                onMouseLeave={() => setActiveDomain(null)}
              >
                <circle
                  cx={nodeCoords.x}
                  cy={nodeCoords.y}
                  r={isSelected ? 6 : 4}
                  fill={d.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                <text
                  x={labelCoords.x}
                  y={labelCoords.y + 4}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-semibold transition-colors ${
                    isSelected ? 'fill-sky-700 font-bold' : 'fill-slate-600'
                  }`}
                >
                  {d.label} ({d.score}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Domain Readiness Dossier */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono">
        {hoveredInfo ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-800 font-bold">
              <span>{hoveredInfo.label} Domain</span>
              <span style={{ color: hoveredInfo.color }}>Score: {hoveredInfo.score}/100</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">{hoveredInfo.status}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-500">
            <span>Hover any domain axis to inspect posture</span>
            <span className="text-sky-600 font-bold">Avg 88.8% Ready</span>
          </div>
        )}
      </div>
    </div>
  );
}
