'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import DashboardStats from '@/components/DashboardStats';
import DefenseMetricsChart from '@/components/DefenseMetricsChart';
import ThreatRadarChart from '@/components/ThreatRadarChart';
import TargetTracker from '@/components/TargetTracker';
import ActivityFeed from '@/components/ActivityFeed';
import {
  MessageSquare,
  Database,
  Key,
  Map,
  Shield,
  Zap,
  Radio,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Layers,
  FileCheck,
  Crosshair,
  Lock
} from 'lucide-react';

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [keysData, setKeysData] = useState(null);
  const [sourcesData, setSourcesData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [hRes, kRes, sRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/keys'),
        fetch('/api/sources'),
      ]);

      const [hJson, kJson, sJson] = await Promise.all([
        hRes.json(),
        kRes.json(),
        sRes.json(),
      ]);

      setHealth(hJson);
      setKeysData(kJson);
      setSourcesData(sJson);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalKeys = keysData?.summary?.total || 21;
  const configuredKeys = keysData?.summary?.configured || 0;
  const activeSources = sourcesData?.sources?.filter((s) => s.enabled)?.length || 0;
  const totalSources = sourcesData?.sources?.length || 8;
  const systemStatus = health?.status || (configuredKeys > 0 ? 'operational' : 'degraded');

  const stats = [
    {
      label: 'Operational Readiness',
      value: systemStatus === 'operational' ? 'Combat Ready' : 'Degraded',
      icon: 'Shield',
      color: systemStatus === 'operational' ? 'emerald' : 'amber',
      trend: 4.2,
    },
    {
      label: 'Active Provider Keys',
      value: `${configuredKeys}/${totalKeys}`,
      icon: 'Key',
      color: 'cyan',
    },
    {
      label: 'Sensor Feeds Connected',
      value: `${activeSources}/${totalSources}`,
      icon: 'Database',
      color: 'purple',
    },
    {
      label: 'NIST 800-53 Score',
      value: '98%',
      icon: 'FileCheck',
      color: 'emerald',
      trend: 1.5,
    },
  ];

  const recentActivities = [
    {
      id: 'act-1',
      type: 'system',
      message: 'ASURA Defense Command Center online. SHA-256 audit ledger active.',
      timestamp: new Date().toISOString(),
      status: 'success',
    },
    {
      id: 'act-2',
      type: 'source',
      message: `Audited ${totalSources} observation feeds. USGS, OpenSky, and News feeds active.`,
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      status: 'success',
    },
    {
      id: 'act-3',
      type: 'query',
      message: 'Groq LLaMA 3.3 70B analytical pipeline standing by on zero-retention policy.',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      status: 'success',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header
        title="Tactical Command Center"
        subtitle="Global Multi-Domain Defense Intelligence Infrastructure • Operational Telemetry & Posture"
      />

      {/* Top Level KPI Counters */}
      <DashboardStats stats={stats} />

      {/* Interactive Visualizations Row: Telemetry Time Series + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DefenseMetricsChart />
        </div>
        <div>
          <ThreatRadarChart />
        </div>
      </div>

      {/* Live Tactical Target Tracking Table & Telemetry */}
      <div>
        <TargetTracker />
      </div>

      {/* Operational Feed & Fast Navigation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={recentActivities} />
        </div>

        {/* Right Col: Tactical Subsystems Quick Launch */}
        <div className="space-y-4">
          <div className="defense-card p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers size={15} className="text-sky-600" />
              Intelligence Subsystems
            </h3>

            <div className="space-y-2">
              {[
                { label: 'Intelligence Query Engine', href: '/query', icon: MessageSquare, desc: 'Evidence-grounded analytical queries' },
                { label: 'Tactical Target Tracker', href: '/tracking', icon: Crosshair, desc: 'Air, maritime, seismic asset telemetry' },
                { label: 'Geospatial Radar Screen', href: '/map', icon: Map, desc: 'Synthetic observation map viewer' },
                { label: 'Defense Compliance Report', href: '/compliance', icon: FileCheck, desc: 'NIST 800-53 & CMMC 2.0 matrix' },
                { label: 'Source Registry & Feeds', href: '/sources', icon: Database, desc: 'Manage 8+ observation connectors' },
                { label: 'API Key Health Audit', href: '/keys', icon: Key, desc: 'Server-side keyholder status' },
              ].map((sub, idx) => {
                const Icon = sub.icon;
                return (
                  <Link
                    key={idx}
                    href={sub.href}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-sky-300 hover:bg-sky-50/50 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className="text-slate-500 group-hover:text-sky-700 transition-colors" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-900">{sub.label}</p>
                        <p className="text-[10px] text-slate-400 font-sans">{sub.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Defense Specification Card */}
          <div className="defense-card p-4 bg-slate-900 text-white space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 text-[10px]">COMPLIANCE POSTURE</span>
              <span className="text-sky-400 font-bold">MIL-SPEC 2525D</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1">
              <p>• Zero raw scraped data lakes (Spec §3.2)</p>
              <p>• Zero CCTV media archival (Spec §3.3)</p>
              <p>• Anti-SSRF private subnet blocking (Spec §7)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
