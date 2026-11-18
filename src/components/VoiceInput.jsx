'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { createDictation } from '@/lib/dictation.mjs';

export default function VoiceInput({ onTranscript, disabled = false, resetKey = 0 }) {
  const [supported, setSupported] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const session = useRef(null);
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(Recognition) && window.isSecureContext);
    if (!Recognition || !window.isSecureContext) return;
    const adapter = createDictation(Recognition, {
      onText: text => callback.current(text), onState: setStatus, onError: setError, language,
    });
    session.current = adapter;
    return () => { adapter.dispose(); session.current = null; };
  }, [language]);
  useEffect(() => { if (disabled) session.current?.cancel(); }, [disabled]);
  useEffect(() => { session.current?.cancel(); setError(''); }, [resetKey]);
  useEffect(() => {
    const hide = () => { if (document.hidden) session.current?.cancel(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const active = status !== 'idle';
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={disabled || !supported || status === 'stopping'}
        aria-pressed={active} onClick={() => active ? session.current?.stop() : session.current?.start()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        {active ? <Square size={14}/> : <Mic size={14}/>}
        {status === 'stopping' ? 'Finishing…' : active ? 'Stop dictation' : 'Dictate message'}
      </button>
      <label className="text-xs text-slate-600">Speech language
        <select aria-label="Speech language" value={language} disabled={active || disabled || !supported}
          onChange={event => setLanguage(event.target.value)} className="ml-2 rounded border bg-white p-1.5">
          <option value="en-IN">English (India)</option>
          <option value="en-US">English (US)</option>
          <option value="hi-IN">Hindi</option>
          <option value="kn-IN">Kannada</option>
        </select>
      </label>
      <span role="status" className="text-xs text-slate-600">
        {supported === false ? 'Voice input unavailable here. You can still type.' : status === 'listening' ? 'Listening — speak your message.' : status === 'starting' ? 'Waiting for microphone permission…' : status === 'stopping' ? 'Waiting for final transcription…' : 'Review the text, then press Send.'}
      </span>
    </div>
    <p className="text-[11px] text-slate-500">Optional browser dictation. Your browser may send audio to its speech provider. ASURA receives text only; dictation never sends a chat message automatically.</p>
    {error && <p role="alert" className="text-xs text-amber-900">{error}</p>}
  </div>;
}
