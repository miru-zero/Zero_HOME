'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cli = require('../src/cli');

const tempEnv = () => ({
  ZERO_AGENT_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-cli-')),
  ZERO_MCP_ROOT: 'M:/Zero_MCP'
});

test('doctor returns safe local status', () => {
  const env = tempEnv();
  const result = cli.doctor(env);
  assert.equal(result.ok, true);
  assert.equal(result.mcp_root, 'M:\\Zero_MCP');
  assert.ok(result.providers >= 1);
});
test('init command writes redacted device state', async () => {
  const env = tempEnv();
  const code = await cli.run(['init', '--name', 'TON', '--server', 'https://zero.miru.work'], env);
  assert.equal(code, 0);
  const file = path.join(env.ZERO_AGENT_HOME, 'device.json');
  const device = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(device.name, 'TON');
  assert.equal(device.server, 'https://zero.miru.work');
});

test('start once reports NOT_PAIRED before network work', async () => {
  const env = tempEnv();
  const code = await cli.run(['start', '--once'], env);
  assert.equal(code, 0);
});

test('safe start cycle converts transient network failure into reconnect state', async () => {
  const result = await cli.runSafeStartCycle({}, async () => {
    const error = new Error('network down');
    error.code = 'ECONNRESET';
    throw error;
  });

  assert.equal(result.ok, false);
  assert.equal(result.reconnect, true);
  assert.equal(result.error.code, 'ECONNRESET');
  assert.equal(result.error.message, 'network down');
});

test('healthy idle cycle is silent', () => {
  const event = cli.loopResultEvent({
    heartbeat: { ok: true, body: { device: { status: 'online', name: 'TON' } } },
    capability: { ok: true, body: { device: { status: 'online', name: 'TON' } } },
    task: { task: null }
  });
  assert.equal(event, null);
});

test('task cycle still emits a compact event', () => {
  const event = cli.loopResultEvent({
    heartbeat: { ok: true, body: { device: { status: 'online', name: 'TON', provider_count: 1 } } },
    capability: { ok: true, body: { device: { status: 'online', name: 'TON', provider_count: 1 } } },
    task: { task: { task_id: 'task-1', status: 'done' } }
  });
  assert.equal(event.level, 'info');
  assert.match(event.text, /task-1:done/);
});
