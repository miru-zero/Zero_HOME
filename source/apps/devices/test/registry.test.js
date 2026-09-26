'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const registry = require('../src/registry');
const tools = require('../src/tools');
const reports = require('../src/report-store');

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-devices-owned-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { ZERO_DEVICE_REGISTRY_FILE: path.join(root, 'devices.json'), ZERO_REPORT_FILE: path.join(root, 'reports.jsonl'), ZERO_DEVICE_PAIRING_CODE: 'ZERO-TEST' };
};
const pair = (env, name = 'Test device') => registry.registerDevice({ name, host: name, pairing_code: 'ZERO-TEST' }, env);

test('registry and reports use service-owned defaults and explicit overrides', () => {
  const root = path.resolve(__dirname, '../../..');
  assert.equal(registry.resolveFile({}), path.join(root, '.zero/state/devices/devices.json'));
  assert.equal(registry.resolveFile({ ZERO_HOME: root }), path.join(root, 'state/devices/devices.json'));
  assert.equal(registry.resolveFile({ ZERO_DEVICE_REGISTRY_FILE: 'custom.json' }), path.resolve('custom.json'));
  assert.equal(reports.resolveFile({}), path.join(root, '.zero/logs/devices/reports.jsonl'));
});

test('pairing, heartbeat and capabilities preserve schemas and redact tokens', (t) => {
  const env = fixture(t);
  const registered = pair(env);
  assert.equal(registry.heartbeatDevice(registered.device_id, registered.device_token, { provider_count: 1, capability_hash: 'hash' }, env).device.status, 'online');
  registry.saveCapabilities(registered.device_id, registered.device_token, { providers: [{ name: 'command' }] }, env);
  const listed = registry.listDevices(env);
  assert.equal(listed.total, 1);
  assert.equal(listed.devices[0].capability.provider_count, 1);
  assert.equal(listed.devices[0].device_token, undefined);
  assert.equal(JSON.stringify(listed).includes(registered.device_token), false);
  assert.deepEqual(fs.readdirSync(path.dirname(env.ZERO_DEVICE_REGISTRY_FILE)), ['devices.json']);
});

test('re-pair keeps device identity and invalidates old token; pairing rotation persists', (t) => {
  const env = fixture(t);
  const first = pair(env);
  const second = pair(env);
  assert.equal(second.device_id, first.device_id);
  assert.notEqual(first.device_token, second.device_token);
  assert.throws(() => registry.heartbeatDevice(first.device_id, first.device_token, {}, env), { code: 'DEVICE_UNAUTHORIZED' });
  const rotated = registry.rotatePairingCode(env);
  assert.notEqual(rotated.pairing_code, 'ZERO-TEST');
  assert.equal(registry.pairingInfo(env).pairing_code, rotated.pairing_code);
  assert.throws(() => pair(env), { code: 'BAD_PAIRING_CODE' });
});

test('queued task becomes running once, survives reload and captures failed result internally', (t) => {
  const env = fixture(t);
  const device = pair(env);
  const created = registry.createTask({ device_id: device.device_id, tool: 'command.getFileInfo', arguments: { path: 'missing', password: 'never-log-this' } }, env);
  assert.equal(registry.takeNextTask(device.device_id, device.device_token, env).task.task_id, created.task.task_id);
  assert.equal(registry.loadState(env).tasks[created.task.task_id].status, 'running');
  assert.equal(registry.takeNextTask(device.device_id, device.device_token, env).task, null);
  const completed = registry.completeTask(device.device_id, device.device_token, created.task.task_id, { ok: false, error: { code: 'FILE_NOT_FOUND', message: 'missing path' } }, env);
  assert.equal(completed.task.status, 'failed');
  assert.match(completed.task.report_id, /^rpt_/);
  const report = reports.get(completed.task.report_id, env);
  assert.equal(report.arguments.password.redacted, true);
  assert.equal(fs.readFileSync(env.ZERO_REPORT_FILE, 'utf8').includes('never-log-this'), false);
});

test('cross-device completion and missing tokens fail without task mutation', (t) => {
  const env = fixture(t);
  const one = pair(env, 'one');
  const two = pair(env, 'two');
  const task = registry.createTask({ device_id: one.device_id, tool: 'command.getFileInfo' }, env).task;
  assert.throws(() => registry.takeNextTask(one.device_id, '', env), { code: 'DEVICE_UNAUTHORIZED' });
  assert.throws(() => registry.completeTask(two.device_id, two.device_token, task.task_id, {}, env), { code: 'TASK_NOT_FOUND' });
  assert.equal(registry.getTask(task.task_id, env).task.status, 'queued');
});

test('four tools preserve their schemas and timed wait leaves a queued task', async (t) => {
  const env = fixture(t);
  const device = pair(env);
  assert.deepEqual(tools.listTools().map((tool) => tool.name), ['list', 'status', 'heartbeat', 'exec']);
  assert.deepEqual(tools.listTools()[3].inputSchema.required, ['tool']);
  const result = await tools.callTool('exec', { device_id: device.device_id, tool: 'command.listDirectory', waitMs: 0 }, { env });
  assert.equal(result.timeout, true);
  assert.equal(result.task.status, 'queued');
  assert.equal((await tools.callTool('status', { device_id: device.device_id }, { env })).device.device_id, device.device_id);
  await assert.rejects(() => tools.callTool('constructor', {}, { env }), { code: 'UNKNOWN_TOOL' });
});

test('ambiguous names are rejected before creating a task', async (t) => {
  const env = fixture(t);
  const one = pair(env, 'one');
  const two = pair(env, 'two');
  const state = registry.loadState(env);
  state.devices[one.device_id].name = state.devices[two.device_id].name = 'duplicate';
  registry.saveState(state, env);
  await assert.rejects(() => tools.callTool('exec', { name: 'duplicate', tool: 'command.listDirectory', waitMs: 0 }, { env }), { code: 'DEVICE_AMBIGUOUS' });
  assert.equal(Object.keys(registry.loadState(env).tasks).length, 0);
});
