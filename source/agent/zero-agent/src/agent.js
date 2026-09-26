'use strict';

const os = require('node:os');
const config = require('./config');
const caps = require('./capabilities');
const http = require('./http');
const localTools = require('./local-tools');
const command = require('./command');
const zero = require('./zero-runtime');

const nowIso = () => new Date().toISOString();

const serverBase = (server) => String(server || 'https://zero.miru.work').replace(/\/$/, '');
const trace = (env, event, payload = {}) => {
  if (env.ZERO_TRACE !== '1') return;
  console.log(JSON.stringify({ at: nowIso(), event, ...payload }));
};

const initDevice = ({ name, server }, env = process.env) => {
  const host = os.hostname();
  const device = {
    name: name || host,
    host,
    server: server || 'https://zero.miru.work',
    device_id: null,
    status: 'initialized',
    created_at: nowIso(),
    updated_at: nowIso()
  };
  const file = config.saveDevice(device, env);
  return { file, device: config.redactedDevice(device) };
};

const pairDevice = async ({ name, server, code }, env = process.env) => {
  if (!server) throw Object.assign(new Error('server is required'), { exitCode: 64 });
  if (!code) throw Object.assign(new Error('pairing code is required'), { exitCode: 64 });
  const host = os.hostname();
  const payload = { name: name || host, pairing_code: code, host };
  const result = await http.requestJson(`${serverBase(server)}/devices/register`, {
    method: 'POST',
    body: payload
  });
  if (!result.ok) {
    const error = new Error(`pair failed status=${result.status}`);
    error.response = result.json;
    throw error;
  }
  const device = {
    name: payload.name,
    host,
    server,
    device_id: result.json.device_id,
    device_token: result.json.device_token,
    status: 'paired',
    paired_at: nowIso(),
    updated_at: nowIso()
  };
  const file = config.saveDevice(device, env);
  return { file, device: config.redactedDevice(device) };
};

const getPairedDevice = (env = process.env) => {
  const device = config.loadDevice(env);
  if (!device || !device.device_id || !device.device_token || !device.server) {
    return null;
  }
  return device;
};

const heartbeatPayload = (device, env = process.env) => {
  const capability = caps.buildCapabilities(env);
  return {
    name: device.name,
    status: 'online',
    last_seen: nowIso(),
    capability_hash: capability.capability_hash,
    provider_count: capability.providers.length
  };
};

const heartbeatOnce = async (env = process.env) => {
  const device = getPairedDevice(env);
  if (!device) return { ok: false, code: 'NOT_PAIRED', message: 'run zero-agent pair first' };
  const url = `${serverBase(device.server)}/devices/${encodeURIComponent(device.device_id)}/heartbeat`;
  const result = await http.requestJson(url, {
    method: 'POST',
    token: device.device_token,
    body: heartbeatPayload(device, env)
  });
  return { ok: result.ok, status: result.status, body: result.json };
};

const syncCapabilitiesOnce = async (env = process.env) => {
  const device = getPairedDevice(env);
  if (!device) return { ok: false, code: 'NOT_PAIRED' };
  const url = `${serverBase(device.server)}/devices/${encodeURIComponent(device.device_id)}/capabilities`;
  const result = await http.requestJson(url, {
    method: 'POST',
    token: device.device_token,
    body: caps.buildCapabilities(env)
  });
  return { ok: result.ok, status: result.status, body: result.json };
};


const executeTask = (task = {}, env = process.env) => {
  if (task.contractVersion) zero.contract.assertCompatible(task.contractVersion);
  if (task.deadline && Date.parse(task.deadline) <= Date.now()) {
    throw Object.assign(new Error('task deadline exceeded'), { code: 'TASK_DEADLINE_EXCEEDED', retryable: false });
  }
  const tool = String(task.tool || '');
  if (tool.startsWith('zero.command.') || tool === 'readFile' || tool === 'command.readFile') {
    try { return command.callTool(tool, task.arguments || {}, { env }); }
    catch (error) {
      if (error.code !== 'UNKNOWN_TOOL') throw error;
    }
  }
  return localTools.execute(tool, task.arguments || {}, env);
};

const pollTaskOnce = async (env = process.env) => {
  const device = getPairedDevice(env);
  if (!device) return { ok: false, code: 'NOT_PAIRED' };
  const nextUrl = serverBase(device.server) + '/devices/' + encodeURIComponent(device.device_id) + '/tasks/next';
  const next = await http.requestJson(nextUrl, { method: 'GET', token: device.device_token });
  if (!next.ok) return { ok: false, status: next.status, body: next.json };
  const task = next.json?.task || null;
  if (!task) return { ok: true, task: null };
  const started = Date.now();
  trace(env, 'agent.task.received', { task_id: task.task_id, tool: task.tool, args: task.arguments || {} });
  const resultUrl = serverBase(device.server) + '/devices/' + encodeURIComponent(device.device_id)
    + '/tasks/' + encodeURIComponent(task.task_id) + '/result';
  try {
    const result = executeTask(task, env);
    trace(env, 'agent.task.done', { task_id: task.task_id, ok: true, duration_ms: Date.now() - started });
    const posted = await http.requestJson(resultUrl, { method: 'POST', token: device.device_token, body: { ok: true, result } });
    const finalTask = posted.json?.task || task;
    return { ok: posted.ok, task: finalTask, result, posted: { status: posted.status, body: posted.json } };
  } catch (error) {
    const payload = { ok: false, error: { code: error.code || 'AGENT_EXEC_ERROR', message: error.message || String(error) } };
    trace(env, 'agent.task.done', { task_id: task.task_id, ok: false, error: payload.error, duration_ms: Date.now() - started });
    const posted = await http.requestJson(resultUrl, { method: 'POST', token: device.device_token, body: payload });
    const finalTask = posted.json?.task || task;
    return { ok: false, task: finalTask, error: payload.error, posted: { status: posted.status, body: posted.json } };
  }
};

const listDevices = async (env = process.env) => {
  const device = config.loadDevice(env);
  const result = await http.requestJson(`${serverBase(device?.server)}/devices`);
  return { ok: result.ok, status: result.status, body: result.json };
};
const agent = {
  initDevice, pairDevice, heartbeatPayload, heartbeatOnce, syncCapabilitiesOnce,
  executeTask, pollTaskOnce, listDevices, getPairedDevice
};

Object.assign(exports, agent);
