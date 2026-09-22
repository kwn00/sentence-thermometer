import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, questions } from '../server.mjs';
const answers = { emotion: { type: 'choice', choice: 'positive', confidence: .9, probabilities: { positive: .96, neutral: .01, negative: .01, mixed: .01, unclear: .01 } }, intent: { type: 'choice', choice: 'feedback', confidence: .9, probabilities: { question: .01, request: .01, feedback: .96, sharing: .01, other: .01 } }, urgent: { type: 'noul', noul: .02 } };
async function serve(t, options) { const server = createApp(options); await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(() => new Promise(r => server.close(r))); const base = `http://127.0.0.1:${server.address().port}`; return { get: path => fetch(base + path), post: (body, headers = {}) => fetch(base + '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) }; }
test('batches three judgments and keeps the key server-side', async t => {
  let sent;
  const app = await serve(t, { apiKey: 'test-secret', fetcher: async (url, options) => { assert.equal(url, 'https://api.typesafe.ai/v1/systemone'); assert.equal(options.headers.Authorization, 'Bearer test-secret'); sent = JSON.parse(options.body); return Response.json({ answers, model: 'jev-test' }); } });
  const response = await app.post({ message: '  정말 좋아요!  ' }); const data = await response.json();
  assert.equal(response.status, 200); assert.deepEqual(sent, { model: 'jev-latest', state: { message: '정말 좋아요!' }, questions }); assert.deepEqual(data.answers, answers); assert.equal(JSON.stringify(data).includes('test-secret'), false);
  assert.deepEqual(await (await app.get('/api/status')).json(), { configured: true });
});
test('invalid input, absent key and private file access', async t => {
  const app = await serve(t, { apiKey: '' });
  for (const message of ['', ' ', 42, '가'.repeat(2001)]) assert.equal((await app.post({ message })).status, 400);
  assert.equal((await app.post({ message: '안녕하세요' })).status, 503);
  assert.equal((await app.get('/.env')).status, 404);
  assert.equal((await app.get('/')).status, 200);
  assert.equal((await app.post({ message: 'hello' }, { Origin: 'https://foreign.example' })).status, 403);
});
test('upstream errors and malformed answers never become a result', async t => {
  for (const [response, expected] of [[new Response('', { status: 401 }), 502], [new Response('', { status: 429 }), 429], [Response.json({ answers: {} }), 502], [Response.json({ answers: { ...answers, urgent: { type: 'noul', noul: 4 } } }), 502]]) {
    const app = await serve(t, { apiKey: 'test-secret', fetcher: async () => response });
    const res = await app.post({ message: 'hello' }); assert.equal(res.status, expected); assert.ok((await res.json()).error);
  }
});

test('Vercel entrypoint exports a usable HTTP server without opening a port on import', async t => {
  const { default: app } = await import('../server.mjs');
  assert.equal(app.listening, false);
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  for (const path of ['/', '/style.css', '/app.js', '/api/status']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0);
  }
});

test('Vercel accepts its HTTPS origin and rejects foreign or downgraded origins', async t => {
  const app = await serve(t, { vercel: true, apiKey: 'test-secret', fetcher: async () => Response.json({ answers, model: 'jev-test' }) });
  const local = new URL((await app.get('/api/status')).url);
  assert.equal((await app.post({ message: '좋아요' }, { Origin: `https://${local.host}` })).status, 200);
  for (const origin of [`http://${local.host}`, 'https://foreign.example', 'null']) {
    assert.equal((await app.post({ message: '좋아요' }, { Origin: origin })).status, 403);
  }
});

test('local HTTP works without trusting a spoofed forwarded protocol', async t => {
  const app = await serve(t, { vercel: false, apiKey: 'test-secret', fetcher: async () => Response.json({ answers, model: 'jev-test' }) });
  const local = new URL((await app.get('/api/status')).url);
  assert.equal((await app.post({ message: '좋아요' }, { Origin: local.origin })).status, 200);
  assert.equal((await app.post({ message: '좋아요' }, { Origin: `https://${local.host}`, 'X-Forwarded-Proto': 'https' })).status, 403);
});
