'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import QueryInterface from '@/components/QueryInterface';
import { Sparkles, HelpCircle, Compass, ShieldAlert, Cpu } from 'lucide-react';

function QueryContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [selectedPrompt, setSelectedPrompt] = useState(queryParam);

  useEffect(() => {
    if (queryParam) {
      setSelectedPrompt(queryParam);
    }
  }, [queryParam]);

  const examplePrompts = [
    'Track any anomalous military or ISR aircraft in the Mediterranean corridor and correlate with public notices.',
    'Retrieve current public reports and seismic readings regarding recent activity in the Pacific Rim.',
    'What is the current operational situation of commercial shipping in the Bab-el-Mandeb strait?',
    'Summarize recent public defense procurement statements regarding unmanned aerial systems.',
  ];

  return (
    <div className="space-y-6">
      <QueryInterface initialQuery={selectedPrompt} />

      {/* Suggested Intelligence Prompts */}
      <div className="defense-card p-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
          <Compass size={14} className="text-sky-600" />
          Example Analytical Inquiries (Click to Load)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {examplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPrompt(prompt)}
              className="text-left p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-xs text-slate-700 transition-colors font-sans cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Grounding and Verification Notice */}
      <div className="defense-card p-4 bg-slate-100/60 border-slate-200 flex items-start gap-3 text-xs text-slate-600 font-sans">
        <ShieldAlert size={16} className="text-sky-700 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-900 font-mono">ASURA Grounding Policy (Spec §4.6):</strong> Inference is strictly backed by newly acquired evidence. The model distinguishes verified observations from third-party claims and model deductions. No speculative live facts are fabricated.
        </p>
      </div>
    </div>
  );
}

export default function QueryPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-6xl mx-auto w-full">
      <Header
        title="Intelligence Inquiry Gateway"
        subtitle="Natural language multi-source retrieval & evidence-grounded analytical synthesis"
      />
      <Suspense fallback={<div className="text-slate-500 text-sm font-mono">Initializing query engine...</div>}>
        <QueryContent />
      </Suspense>
    </div>
  );
}
