'use client';

import Header from '@/components/Header';
import KeyStatusPanel from '@/components/KeyStatusPanel';
import { Key, ShieldAlert, Terminal, Lock, Cloud } from 'lucide-react';

export default function KeysPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-6xl mx-auto w-full">
      <Header
        title="Server-Side API Key Holders"
        subtitle="Cryptographic credential isolation & third-party provider health verification"
      />

      <KeyStatusPanel />

      {/* Deployment & Setup Guidance */}
      <div className="defense-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Terminal size={16} className="text-sky-600" />
          Secret Provisioning Protocol (Local & Vercel Environments)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Local setup */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-sky-800 font-bold flex items-center gap-1.5">
              <Lock size={13} /> Local Development (.env.local)
            </div>
            <p className="text-slate-600 font-sans text-[11px]">
              Copy <code className="text-slate-900 bg-white px-1 border rounded">.env.example</code> to <code className="text-slate-900 bg-white px-1 border rounded">.env.local</code> and populate credentials:
            </p>
            <pre className="bg-white p-2.5 rounded border border-slate-200 text-slate-800 overflow-x-auto text-[10px]">
{`GROQ_API_KEY=gsk_your_key_here
JWT_SECRET=your_32char_secret
NEWSAPI_KEY=your_key`}
            </pre>
          </div>

          {/* Vercel deployment */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-emerald-800 font-bold flex items-center gap-1.5">
              <Cloud size={13} /> Vercel Cloud Deployment
            </div>
            <p className="text-slate-600 font-sans text-[11px]">
              In your Vercel Project Dashboard:
            </p>
            <ol className="list-decimal list-inside text-slate-700 space-y-1 font-sans text-[11px]">
              <li>Navigate to <strong>Project Settings → Environment Variables</strong></li>
              <li>Input <code className="text-sky-700 font-mono">GROQ_API_KEY</code> and desired provider keys</li>
              <li>Deploy — serverless functions load keys into isolated execution memory</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
