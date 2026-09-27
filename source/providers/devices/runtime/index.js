'use strict';

const definitions = require('../tools.json');
const registry = require('../../../core/zero-core/src/core/device-registry');
const zero = require('../../../packages/zero');

const err = (code, message) => Object.assign(new Error(message), { code });
const envOf = (context = {}) => context.env || process.env;

const findDevice = (args = {}, env = process.env) => {
  const devices = registry.listDevices(env).devices;
  if (args.device_id) return devices.find((item) => item.device_id === args.device_id);
  if (args.name) {
    const matches = devices.filter((item) => item.name === args.name || item.host === args.name);
    if (matches.length > 1) throw err('DEVICE_AMBIGUOUS', 'multiple devices match name: ' + args.name);
    return matches[0] || null;
  }
  return devices[0] || null;
};

const list = (args = {}, context = {}) => {
  const result = registry.listDevices(envOf(context));
  const devices = args.onlineOnly
    ? result.devices.filter((item) => item.status === 'online')
    : result.devices;
  return { ...result, total: devices.length, online: devices.filter((item) => item.status === 'online').length, devices };
};

const status = (args = {}, context = {}) => {
  const device = findDevice(args, envOf(context));
  if (!device) throw err('DEVICE_NOT_FOUND', 'device not found');
  return { ok: true, device };
};

const heartbeat = (args = {}, context = {}) => {
  const device = findDevice(args, envOf(context));
  if (!device) throw err('DEVICE_NOT_FOUND', 'device not found');
  const lastSeen = device.last_seen ? Date.parse(device.last_seen) : NaN;
  const ageMs = Number.isFinite(lastSeen) ? Date.now() - lastSeen : null;
  return {
    ok: true,
    device_id: device.device_id,
    name: device.name,
    host: device.host,
    status: device.status,
    online: device.status === 'online',
    last_seen: device.last_seen,
    age_ms: ageMs,
    provider_count: device.provider_count,
    capability_hash: device.capability_hash
  };
};

const exec = async (args = {}, context = {}) => {
  const env = envOf(context);
  if (context.assertAccepting) context.assertAccepting();
  const waitMs = Number.isInteger(args.waitMs) ? Math.max(0, Math.min(args.waitMs, 60000)) : 15000;
  const created = registry.createTask({
    device_id: args.device_id,
    name: args.name,
    tool: args.tool,
    arguments: args.arguments || {},
    contractVersion: zero.contract.version,
    deadline: new Date(Date.now() + Math.max(waitMs, 1000)).toISOString()
  }, env);
  const finished = await registry.waitTask(created.task.task_id, waitMs, env);
  return { ...finished, device: created.device };
};

const handlers = { list, status, heartbeat, exec };

const devicesProvider = {
  listTools: () => structuredClone(definitions),
  callTool: async (name, args = {}, context = {}) => {
    const handler = handlers[name];
    if (!handler) throw err('UNKNOWN_TOOL', 'unknown devices tool: ' + name);
    return handler(args, context);
  }
};

Object.assign(exports, devicesProvider);
