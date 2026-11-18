// Browser-only adapter. No audio upload, message submission or storage by ASURA.
export function createDictation(Recognition, { onText, onState, onError, language = 'en-IN' }) {
  let current = null;
  let disposed = false;
  const errors = {
    'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser or type your message.',
    'service-not-allowed': 'Speech recognition is unavailable under your browser settings. You can still type.',
    'audio-capture': 'No microphone is available. Check your input device.',
    'no-speech': 'No speech was detected. Try again or type your message.',
    network: 'The browser speech service could not be reached. Check your connection or type instead.',
    'language-not-supported': 'The speech service does not support this language.',
  };
  function cancel() {
    const recognition = current;
    current = null;
    if (recognition) { try { recognition.abort(); } catch {} }
    if (!disposed) onState('idle');
  }
  return {
    start() {
      if (disposed || current) return;
      const recognition = new Recognition();
      current = recognition;
      const accepted = new Set();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (current === recognition) onState('listening'); };
      recognition.onresult = event => {
        if (disposed || current !== recognition) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result.isFinal || accepted.has(i)) continue;
          accepted.add(i);
          const transcript = result[0]?.transcript?.trim();
          if (transcript) onText(transcript);
        }
      };
      recognition.onerror = event => {
        if (disposed || current !== recognition) return;
        if (event.error !== 'aborted') onError(errors[event.error] || 'Speech recognition failed. Try again or type your message.');
        cancel();
      };
      recognition.onend = () => {
        if (disposed || current !== recognition) return;
        current = null;
        onState('idle');
      };
      onError('');
      onState('starting');
      try { recognition.start(); }
      catch { cancel(); onError('Could not start speech recognition. Try again or type your message.'); }
    },
    stop() {
      if (!current) return;
      onState('stopping');
      try { current.stop(); } catch { cancel(); }
    },
    cancel,
    dispose() { disposed = true; cancel(); },
  };
}
