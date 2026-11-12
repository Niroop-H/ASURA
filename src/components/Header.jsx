'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Clock, ShieldAlert, Radio } from 'lucide-react';

export default function Header({ title, subtitle }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'Z (UTC)'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
      <div>
        <p className="text-[10px] mb-1 font-mono font-semibold tracking-wide text-slate-600">ASURA Defense Intelligence System™</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-sky-600" />
          <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-sans">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 self-start sm:self-center">
        {/* UTC Zulu Timestamp */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs shadow-xs">
          <Clock size={13} className="text-slate-400" />
          <span>{currentTime || 'Loading local clock...'}</span>
        </div>

        {/* Defense Posture Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>DEVELOPMENT BUILD</span>
        </div>
      </div>
    </header>
  );
}
