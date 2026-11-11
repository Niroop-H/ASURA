'use client';

import Header from '@/components/Header';
import {
  Settings,
  Cpu,
  Database,
  Shield,
  Eye,
  Layers,
  FileText,
  Clock,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-6xl mx-auto w-full">
      <Header
        title="System Governance & Compliance Policy"
        subtitle="Operational parameters, retention policies & security compliance controls"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Gateway Settings */}
        <div className="defense-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase font-mono tracking-wider">
            <Cpu size={16} className="text-sky-600" />
            <span>AI Analytical Inference Gateway</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Inference Engine:</span>
              <span className="text-slate-800 font-bold">Groq Cloud LPU</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Active Model:</span>
              <span className="text-sky-800 font-bold">llama-3.3-70b-versatile</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Analytical Temperature:</span>
              <span className="text-slate-800">0.3 (Deterministic Analytical)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Max Tokens:</span>
              <span className="text-slate-800">4,096 tokens</span>
            </div>
          </div>
        </div>

        {/* Data Retention & Storage Policy (MAH Quantum Spec §3) */}
        <div className="defense-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase font-mono tracking-wider">
            <Database size={16} className="text-purple-600" />
            <span>Retention & Storage Protocol (Spec §3)</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Historical Scrape Lake:</span>
              <span className="text-amber-800 font-bold">DISABLED (On-Demand Fresh Only)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">CCTV & Stream Storage:</span>
              <span className="text-emerald-800 font-bold">ZERO CONTINUOUS ARCHIVING</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Short-Lived Cache TTL:</span>
              <span className="text-slate-800">15 minutes (Configurable)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Storage Architecture:</span>
              <span className="text-sky-800 font-bold">EvidenceRepository Interface</span>
            </div>
          </div>
        </div>

        {/* Security & Access Controls (Spec §7 & NIST SP 800-53) */}
        <div className="defense-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase font-mono tracking-wider">
            <Shield size={16} className="text-emerald-600" />
            <span>Boundary Security & Isolation (Spec §7)</span>
          </div>

          <ul className="text-xs text-slate-600 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
              <span><strong>Anti-SSRF Protection:</strong> Internal IP subnets (127.0.0.1, 10.0.0.0/8, 169.254.169.254) strictly blocked from crawlers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
              <span><strong>Server-Side Secret Isolation:</strong> Zero client bundle exposure of credentials, database URIs, or tokens.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
              <span><strong>Responsible Operational Domain:</strong> Situational research and resilience only; no autonomous kinetic workflows.</span>
            </li>
          </ul>
        </div>

        {/* System Information */}
        <div className="defense-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase font-mono tracking-wider">
            <Server size={16} className="text-sky-600" />
            <span>System Information & Lineage</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">System Codename:</span>
              <span className="text-slate-900 font-bold">ASURA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Release Version:</span>
              <span className="text-slate-800">v0.1.0-industrial</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Deployment Target:</span>
              <span className="text-emerald-700 font-bold">Vercel Serverless Edge</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Handoff Protocol:</span>
              <span className="text-purple-800 font-semibold">ASURA_HANDOFF.md (Astra)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
