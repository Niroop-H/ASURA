import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Execute the actual route with the NextResponse.json adapter replaced by Web Response.json.
async function route(path) {
  const source = (await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace("import { NextResponse } from 'next/server';", 'const NextResponse = Response;');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const query = await route('../src/app/api/query/route.js');
const compliance = await route('../src/app/api/compliance/route.js');
function request(body) {
  return new Request('http://localhost/api/query', {method: 'POST', body: JSON.stringify(body)});
}

test('ordinary and streaming queries cannot produce unsourced model answers', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected external request'); };
  try {
    for (const stream of [false, true]) {
      const response = await query.POST(request({query: 'Latest public event report', stream}));
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.answer, null);
      assert.deepEqual(body.sources_accessed, []);
      assert.deepEqual(body.records, []);
    }
  } finally { globalThis.fetch = original; }
});

test('malformed and empty requests are rejected', async () => {
  for (const body of [null, {}, {query: ''}, {query: '  '}, {query: 123}]) {
    assert.equal((await query.POST(request(body))).status, 400);
  }
  assert.equal((await query.POST(new Request('http://localhost', {method: 'POST', body: '{'}))).status, 400);
});

test('assessment API reports unknown instead of invented scores', async () => {
  const body = await (await compliance.GET()).json();
  assert.equal(body.status, 'not_assessed');
  assert.equal(body.overallScore, null);
  assert.deepEqual(body.securityDeclarations, []);
  assert.deepEqual(body.controls, []);
});

test('audit history starts empty and does not assert verification', async () => {
  const source = await readFile(new URL('../src/lib/auditLogger.js', import.meta.url), 'utf8');
  const audit = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  assert.deepEqual(audit.getAuditLogs(), []);
  assert.equal(audit.verifyAuditChain().valid, null);
  audit.logAuditEvent({action: 'TEST_EVENT'});
  assert.equal(audit.getAuditLogs().length, 1);
  assert.equal(audit.verifyAuditChain().valid, null);
});
