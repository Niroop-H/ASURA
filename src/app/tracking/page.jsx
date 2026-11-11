'use client';

import Header from '@/components/Header';
import TargetTracker from '@/components/TargetTracker';
import DefenseMetricsChart from '@/components/DefenseMetricsChart';
import { Crosshair, Shield, Compass, Radio, Layers, AlertCircle } from 'lucide-react';

export default function TrackingPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header
        title="Tactical Target Tracking & Telemetry"
        subtitle="Continuous multi-domain situational tracking across air, maritime, seismic, and municipal observation streams"
      />

      {/* Main Tracking Interface Component */}
      <TargetTracker />

      {/* Signal Telemetry Time-Series */}
      <div>
        <DefenseMetricsChart />
      </div>

      {/* Tracking Rules & Protocol Notice */}
      <div className="defense-card p-5 bg-sky-50/60 border-sky-200 flex items-start gap-3 text-xs text-sky-950 font-sans">
        <Shield size={18} className="text-sky-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sky-900">
            Rules of Engagement & Observation Governance (MIL-STD-2525D / MAH Quantum Spec §3)
          </p>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            Target coordinates are synthesized from authorized public and provider feeds (ADS-B, AIS, USGS GeoJSON). Ephemeral telemetry is held in-memory and discarded post-session in adherence with strict non-archival mandates. Continuous recording or automated targeting integration is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
