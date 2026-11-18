import test from 'node:test';
import assert from 'node:assert/strict';
import { createDictation } from '../src/lib/dictation.mjs';
function setup() {
  let instance; const text = [], states = [], errors = [];
  class Recognition {
    constructor() { instance = this; }
    start() { this.onstart(); }
    stop() { this.stopped = true; }
    abort() { this.aborted = true; this.onend?.(); }
  }
  const controller = createDictation(Recognition, { onText: t => text.push(t), onState: s => states.push(s), onError: e => errors.push(e) });
  controller.start();
  return { controller, instance, text, states, errors };
}
const result = text => Object.assign([{ transcript: text }], { isFinal: true });
test('dictation accepts final text once; ignores interim text', () => {
  const s = setup();
  const event = { resultIndex: 0, results: [result('Hello'), Object.assign([{transcript:'partial'}],{isFinal:false})] };
  s.instance.onresult(event); s.instance.onresult(event);
  assert.deepEqual(s.text, ['Hello']);
  assert.equal(s.instance.lang, 'en-IN');
});
test('stop permits final transcript and end returns to idle', () => {
  const s = setup(); s.controller.stop(); assert.equal(s.instance.stopped, true);
  s.instance.onresult({resultIndex:0,results:[result('Final words')]});
  s.instance.onend(); assert.deepEqual(s.text,['Final words']); assert.equal(s.states.at(-1),'idle');
});
test('cancel ignores late results from an earlier chat', () => {
  const s=setup(); s.controller.cancel(); s.instance.onresult({resultIndex:0,results:[result('Late')]});
  assert.deepEqual(s.text,[]); assert.equal(s.instance.aborted,true);
});
test('disposal aborts recording and ignores callbacks', () => {
  const s=setup();const n=s.states.length;s.controller.dispose();s.instance.onresult({resultIndex:0,results:[result('Late')]});
  assert.equal(s.instance.aborted,true);assert.deepEqual(s.text,[]);assert.equal(s.states.length,n);
});
test('permission denial reports actionable error without automatic restart', () => {
  const s=setup(); s.instance.onerror({error:'not-allowed'});
  assert.match(s.errors.at(-1),/permission was denied/);assert.equal(s.states.at(-1),'idle');
});
