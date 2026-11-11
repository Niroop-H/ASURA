'use client';

import { useState } from 'react';
import {
  Activity,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpRight,
  Filter,
  RefreshCw
} from 'lucide-react';

// Time-series data points for real-time visualization (last 12 hours)
const TIME_SERIES_DATA = [
  { time: '00:00', signals: 1420, threats: 3, latency: 42, quota: 12 },
  { time: '01:00', signals: 1680, threats: 4, latency: 45, quota: 15 },
  { time: '02:00', signals: 1210, threats: 2, latency: 38, quota: 18 },
  { time: '03:00', signals: 1890, threats: 5, latency: 51, quota: 22 },
  { time: '04:00', signals: 2340, threats: 8, latency: 48, quota: 28 },
  { time: '05:00', signals: 2790, threats: 12, latency: 62, quota: 35 },
  { time: '06:00', signals: 3410, threats: 14, latency: 58, quota: 44 },
  { time: '07:00', signals: 4120, threats: 9, latency: 54, quota: 52 },
  { time: '08:00', signals: 4680, threats: 11, latency: 49, quota: 61 },
  { time: '09:00', signals: 5240, threats: 15, latency: 53, quota: 70 },
  { time: '10:00', signals: 4890, threats: 7, latency: 46, quota: 78 },
  { time: '11:00', signals: 5420, threats: 10, latency: 44, quota: 84 },
];

export default function DefenseMetricsChart() {
  const [metric, setMetric] = useState('signals'); // 'signals' | 'threats' | 'latency'
  const [hoverIndex, setHoverIndex] = useState(null);

  const metricConfigs = {
    signals: {
      label: 'Signals Ingestion Throughput',
      unit: 'events/min',
      color: '#0284c7', // Sky Blue
      fillColor: 'rgba(2, 132, 199, 0.12)',
      max: 6000,
      format: (val) => `${val.toLocaleString()} evt/m`,
    },
    threats: {
      label: 'Correlated Anomaly Index',
      unit: 'priority flags',
      color: '#dc2626', // Crimson
      fillColor: 'rgba(220, 38, 38, 0.12)',
      max: 20,
      format: (val) => `${val} alerts`,
    },
    latency: {
      label: 'Sensor Pipeline Latency',
      unit: 'milliseconds',
      color: '#059669', // Emerald
      fillColor: 'rgba(5, 150, 105, 0.12)',
      max: 80,
      format: (val) => `${val} ms`,
    },
  };

  const activeConfig = metricConfigs[metric];
  const hoveredPoint = hoverIndex !== null ? TIME_SERIES_DATA[hoverIndex] : null;

  // SVG Chart Geometry
  const width = 640;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Generate SVG Points
  const points = TIME_SERIES_DATA.map((d, i) => {
    const x = paddingX + (i / (TIME_SERIES_DATA.length - 1)) * chartW;
    const y = paddingY + chartH - (d[metric] / activeConfig.max) * chartH;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingY + chartH} L ${points[0].x} ${paddingY + chartH} Z`;

  return (
    <div className="defense-card p-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">
              Telemetry Telemetry & Signal Acquisition
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Continuous real-time multi-source data ingestion rate (12-hour window)
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-mono">
          {[
            { key: 'signals', label: 'Signals' },
            { key: 'threats', label: 'Threats' },
            { key: 'latency', label: 'Latency' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                metric === m.key
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Value + Hover Preview */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <div>
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
            {hoveredPoint ? `Recorded at ${hoveredPoint.time}` : 'Current Ingestion Rate'}
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {hoveredPoint
              ? activeConfig.format(hoveredPoint[metric])
              : activeConfig.format(TIME_SERIES_DATA[TIME_SERIES_DATA.length - 1][metric])}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-emerald-600 font-mono font-medium flex items-center justify-end gap-0.5">
            <ArrowUpRight size={14} /> +18.4% vs 24h
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Peak: {activeConfig.max} {activeConfig.unit}</span>
        </div>
      </div>

      {/* SVG Interactive Area Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          {/* Horizontal Grid Guidelines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + chartH * (1 - ratio);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {Math.round(ratio * activeConfig.max)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill={activeConfig.fillColor} />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={activeConfig.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Dots & Hover Hitboxes */}
          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g key={idx}>
                {/* Hit area for mouse hover */}
                <rect
                  x={p.x - 15}
                  y={0}
                  width={30}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />

                {/* Hover guideline */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={paddingY + chartH}
                    stroke={activeConfig.color}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Visual Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill="#ffffff"
                  stroke={activeConfig.color}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-100 pointer-events-none"
                />

                {/* X-axis time label */}
                <text
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[9px] font-mono ${isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}
                >
                  {p.data.time}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chart Footer Diagnostics */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Activity size={12} className="text-sky-600" />
          Ingestion Health: <strong className="text-slate-700">99.98% Normal</strong>
        </span>
        <span>Sensor Polling Interval: <strong className="text-slate-700">60s</strong></span>
      </div>
    </div>
  );
}
