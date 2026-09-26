'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, isLoopback } = require('../src/server');

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-devices-http-'));
  const env = { ZERO_HOME: root, ZERO_DEVICE_REGISTRY_FILE: path.join(root, 'devices.json'), ZERO_REPORT_FILE: path.join(root, 'reports.jsonl'), ZERO_DEVICE_PAIRING_CODE: 'ZERO-TEST' };
  const server = createServer({ env });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const call = async (pathname, body, token, method = body === undefined ? 'GET' : 'POST') => {
    const result = await fetch(`http://127.0.0.1:${server.address().port}${pathname}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: result.status, body: await result.json() };
  };
  const pair = () => call('/devices/register', { name: 'test-only', pairing_code: 'ZERO-TEST' });
  return { env, server, call, pair };
}

test('internal endpoints accept only loopback, including IPv4-mapped loopback', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback('192.168.1.20'), false);
  assert.equal(isLoopback(undefined), false);
});

test('internal HTTP handler rejects non-loopback peers before exposing pairing', async (t) => {
  const { server } = await fixture(t);
  const reply = { status: null, data: null, writeHead(status) { this.status = status; }, end(data) { this.data = JSON.parse(data); } };
  await server.listeners('request')[0]({ method: 'GET', url: '/internal/pairing', socket: { remoteAddress: '192.0.2.10' } }, reply);
  assert.equal(reply.status, 403);
  assert.equal(reply.data.error.code, 'LOCAL_ONLY');
  assert.equal(reply.data.pairing_code, undefined);
});

test('HTTP routes preserve pairing, device and capability contracts', async (t) => {
  const { env, call, pair } = await fixture(t);
  assert.equal((await call('/health')).body.service, 'devices');
  assert.equal((await call('/devices/register', { pairing_code: 'BAD' })).status, 403);
  const paired = await pair();
  assert.equal(paired.status, 200);
  const device = paired.body;
  const base = `/devices/${device.device_id}`;
  assert.equal((await call(`${base}/heartbeat`, {}, 'wrong')).status, 401);
  assert.equal((await call(`${base}/capabilities`, {}, 'wrong')).status, 401);
  assert.equal((await call(`${base}/tasks/next`, undefined, 'wrong')).status, 401);
  assert.equal((await call(`${base}/tasks/task_bad/result`, {}, 'wrong')).status, 401);
  assert.equal((await call(`${base}/heartbeat`, { status: 'online' }, device.device_token)).status, 200);
  assert.equal((await call(`${base}/capabilities`, { providers: [{ name: 'command' }] }, device.device_token)).status, 200);
  const listed = await call('/devices');
  assert.equal(listed.body.online, 1);
  assert.equal(listed.body.devices[0].capability.provider_count, 1);
  assert.equal(JSON.stringify(listed.body).includes(device.device_token), false);
  assert.equal((await call('/internal/tools/list', { arguments: {} })).body.total, 1);
  assert.equal((await call('/internal/tools/constructor', { arguments: {} })).status, 404);
  const errors = fs.readFileSync(path.join(env.ZERO_HOME, 'logs/devices/errors.jsonl'), 'utf8');
  assert.equal(errors.includes('DEVICE_UNAUTHORIZED'), true);
  assert.equal(errors.includes(device.device_token), false);
});

test('drain blocks new work while existing tasks and heartbeats finish; resume reopens', async (t) => {
  const { call, pair } = await fixture(t);
  const device = (await pair()).body;
  const base = `/devices/${device.device_id}`;
  const queued = await call('/internal/tools/exec', { arguments: { device_id: device.device_id, tool: 'command.getFileInfo', arguments: { path: 'test-only' }, waitMs: 0 } });
  assert.equal(queued.body.task.status, 'queued');
  const drained = await call('/internal/drain', {});
  assert.equal(drained.body.draining, true);
  assert.equal(drained.body.queued, 1);
  assert.equal((await pair()).status, 503);
  const rejected = await call('/internal/tools/exec', { arguments: { device_id: device.device_id, tool: 'command.getFileInfo', waitMs: 0 } });
  assert.equal(rejected.status, 503);
  assert.equal((await call(`${base}/heartbeat`, {}, device.device_token)).status, 200);
  const next = await call(`${base}/tasks/next`, undefined, device.device_token);
  assert.equal(next.body.task.task_id, queued.body.task.task_id);
  const running = (await call('/internal/status')).body;
  assert.equal(running.queued, 0);
  assert.equal(running.running, 1);
  assert.equal(JSON.stringify(running).includes(device.device_token), false);
  assert.equal(JSON.stringify(running).includes('ZERO-TEST'), false);
  const finished = await call(`${base}/tasks/${next.body.task.task_id}/result`, { ok: true, result: { found: true } }, device.device_token);
  assert.equal(finished.body.task.status, 'done');
  assert.equal((await call('/internal/status')).body.running, 0);
  assert.equal((await call('/internal/resume', {})).body.draining, false);
  assert.equal((await pair()).status, 200);
});

test('pairing stays on internal endpoints and rotate is persisted', async (t) => {
  const { call } = await fixture(t);
  assert.equal((await call('/internal/pairing')).body.pairing_code, 'ZERO-TEST');
  const rotated = (await call('/internal/pairing/rotate', {})).body.pairing_code;
  assert.notEqual(rotated, 'ZERO-TEST');
  assert.equal((await call('/internal/pairing')).body.pairing_code, rotated);
  assert.equal((await call('/pairing')).status, 404);
});
