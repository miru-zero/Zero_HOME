'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const devices = require('../runtime');

const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-devices-provider-'));
  const file = path.join(root, 'devices.json');
  const env = { ZERO_DEVICE_REGISTRY_FILE: file };
  fs.writeFileSync(file, JSON.stringify({
    pairing_code: 'ZERO-TEST',
    devices: {
      dev_one: {
        device_id: 'dev_one', device_token: 'tok', name: 'MiruZero', host: 'MiruZero',
        status: 'online', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        paired_at: '2026-01-01T00:00:00.000Z', last_seen: '2026-01-01T00:00:00.000Z',
        provider_count: 1, capability_hash: 'abc'
      }
    },
    tasks: {}
  }, null, 2));
  return { root, env };
};

test('devices provider uses core registry directly', async (t) => {
  const { root, env } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const context = { env };

  const list = await devices.callTool('list', { onlineOnly: true }, context);
  assert.equal(list.total, 1);
  const status = await devices.callTool('status', { name: 'MiruZero' }, context);
  assert.equal(status.device.device_id, 'dev_one');
  const heartbeat = await devices.callTool('heartbeat', { device_id: 'dev_one' }, context);
  assert.equal(heartbeat.online, true);

  const exec = await devices.callTool('exec', {
    name: 'MiruZero', tool: 'zero.command.filesystem.readFile', arguments: { path: 'README.md' }, waitMs: 0
  }, context);
  assert.equal(exec.timeout, true);
  assert.equal(exec.task.tool, 'zero.command.filesystem.readFile');
  assert.equal(exec.device.device_id, 'dev_one');
});
