'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const SOURCES = [
  { id: 'earthquakes', label: 'Earthquakes', refresh: 90000 },
  { id: 'events', label: 'Natural events', refresh: 300000 },
  { id: 'flights', label: 'Regional flights', refresh: 120000 },
  { id: 'weather', label: 'Weather (Bengaluru point)', refresh: 600000 },
  { id: 'news', label: 'News headlines', refresh: 600000 },
];
const DATE = value => { try { return value ? new Date(value).toLocaleString() : 'Not supplied'; } catch { return 'Not supplied'; } };
const latitudeToY = lat => Math.max(0, Math.min(360, (90 - lat) * 2));
const longitudeToX = lon => Math.max(0, Math.min(720, (lon + 180) * 2));

export default function LiveDataViewer({ initialSource = 'flights' }) {
  const [source, setSource] = useState(initialSource);
  const [state, setState] = useState({ loading: true, result: null, error: null });
  const [selected, setSelected] = useState(null);
  const [revision, setRevision] = useState(0);
  const [region, setRegion] = useState('bengaluru');
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/live/' + source + (source === 'flights' ? '?region=' + region : ''), { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setState({ loading: false, result: data.success ? data : null, error: data.success ? null : (data.error || 'Provider unavailable') });
      } catch (error) {
        if (!cancelled) setState({ loading: false, result: null, error: error.message || 'Network request failed' });
      }
    };
    setState({ loading: true, result: null, error: null });
    setSelected(null);
    load();
    const timer = setInterval(load, SOURCES.find(s => s.id === source)?.refresh || 120000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [source, revision, region]);
  const records = state.result?.records || [];
  const geographic = records.filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  return (
    <div className="defense-card p-5 space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div><h2 className="font-semibold text-slate-900">Live public-data viewer</h2><p className="text-xs text-slate-500">Provider observations, not simulated tracks. Refresh interval differs by feed.</p></div>
        <button type="button" onClick={() => setRevision(v => v + 1)} className="border rounded px-3 py-2 text-xs flex items-center gap-2" aria-label="Refresh live feed"><RefreshCw size={14}/> Refresh</button>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Live data sources">
        {SOURCES.map(s => <button role="tab" aria-selected={source === s.id} key={s.id}
          onClick={() => setSource(s.id)}
          className={'text-xs rounded px-3 py-2 border ' + (source === s.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200')}>{s.label}</button>)}
      </div>
      {source==='weather'&&<p className="text-xs rounded p-3 bg-sky-50 text-slate-700 border border-sky-100">
        The dashboard weather tab shows one clearly labelled Bengaluru point as an example.
        {' '}<a className="text-sky-700 underline font-semibold" href="/weather">Search weather worldwide by city, state, country or coordinates</a>.
      </p>}
      {state.loading && <p className="text-sm text-slate-600" role="status">Contacting provider…</p>}
      {state.error && <p className="rounded bg-amber-50 text-amber-950 p-4 text-sm" role="alert">Feed unavailable: {state.error}. No substitute data is displayed.</p>}
      {state.result && <>
        <div className="text-xs text-slate-600 flex flex-wrap gap-4">
          <span>Provider: <strong>{state.result.provider}</strong></span>
          <span>Retrieved: {DATE(state.result.retrievedAt)}</span>
          <span>Records: {records.length}</span>
          <span>Refresh: {SOURCES.find(s => s.id === source)?.refresh / 1000}s</span>
        </div>
        {false && geographic.length > 0 && <div className="overflow-hidden rounded border border-slate-300 bg-slate-900">
          <svg viewBox="0 0 720 360" className="block w-full" role="img" aria-label="Geographic observations on longitude-latitude grid; use the record list for accessible details">
            <rect width="720" height="360" fill="#0f172a"/>
            {Array.from({length: 13}, (_, i) => <line key={'x'+i} x1={i * 60} x2={i * 60} y1="0" y2="360" stroke="#334155" strokeWidth=".6"/>)}
            {Array.from({length: 7}, (_, i) => <line key={'y'+i} x1="0" x2="720" y1={i * 60} y2={i * 60} stroke="#334155" strokeWidth=".6"/>)}
            {geographic.slice(0,150).map(r => <circle key={r.id} cx={longitudeToX(r.lon)} cy={latitudeToY(r.lat)} r={selected === r.id ? 5 : 3.1} fill={source === 'flights' ? '#38bdf8' : source === 'weather' ? '#a3e635' : '#f59e0b'} stroke="#0f172a" strokeWidth="1"><title>{r.title} — {r.lat.toFixed(3)}, {r.lon.toFixed(3)}</title></circle>)}
            <text x="12" y="22" fontSize="12" fill="#cbd5e1">Latitude / longitude observation plot — not satellite imagery</text>
          </svg>
        </div>}
        {source === 'flights' && <label className="text-sm flex gap-2 items-center">Flight region <select className="border rounded px-2 py-1 text-sm" value={region} onChange={e=>setRegion(e.target.value)}><option value="bengaluru">Bengaluru</option><option value="london">London</option><option value="singapore">Singapore</option><option value="newyork">New York</option><option value="dubai">Dubai</option></select></label>}
        {!records.length && <p className="text-sm">The provider returned zero records for this feed.</p>}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
          {records.slice(0,100).map(r => <div key={r.id} className={'block w-full text-left p-3 hover:bg-slate-50 ' + (selected === r.id ? 'bg-sky-50' : '')}>
            <button type="button" onClick={() => setSelected(r.id)} className="block text-sm font-medium text-left w-full">{r.title}</button>
            <span className="block text-xs text-slate-600 mt-1">{r.description}</span>
            {source === 'flights' && <span className="block text-xs font-medium text-slate-800 mt-1">{r.altitudeFeet != null ? Math.round(r.altitudeFeet).toLocaleString() + ' ft altitude · ' : ''}{r.speedKnots != null ? Math.round(r.speedKnots) + ' knots · ' : ''}{r.heading != null ? Math.round(r.heading) + '° heading · ' : ''}{r.ageSeconds != null ? r.ageSeconds + 's position age' : ''}</span>}
            {source === 'weather' && r.temperatureC != null && <span className="block text-lg font-semibold text-slate-800 mt-1">{r.temperatureC}°C <span className="text-xs font-normal">{r.humidity}% humidity · {r.windKmh == null ? 'wind unreported' : Math.round(r.windKmh) + ' km/h wind'}</span></span>}
            {source === 'earthquakes' && r.magnitude != null && <span className="block text-xs font-medium text-slate-800 mt-1">Magnitude {r.magnitude}{r.depthKm != null ? ' · ' + r.depthKm + ' km depth' : ''}</span>}
            <span className="block text-xs text-slate-500 mt-1">Observed/published: {DATE(r.observedAt)} · {r.source} {Number.isFinite(r.lat) && Number.isFinite(r.lon) ? '· ' + r.lat.toFixed(3) + ', ' + r.lon.toFixed(3) : ''}</span>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-sky-700 inline-flex gap-1 items-center mt-1 underline">Original source <ExternalLink size={11}/></a>}
          </div>)}
        </div>
      </>}
      <p className="text-xs text-slate-500">These are periodically retrieved public reports, not continuous surveillance, guaranteed real-time positioning, or a safety-critical data service.</p>
    </div>
  );
}
