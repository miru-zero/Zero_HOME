'use strict';

const http = require('node:http');
const { config, readJson, sendJson, sendError, httpError, logError } = require('../../../packages/common/src');
const registry = require('./registry');
const tools = require('./tools');

const isLoopback = (address) => address === '::1'
  || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(address || '')
  || /^::ffff:127\.(?:\d{1,3}\.){2}\d{1,3}$/i.test(address || '');

exports.createServer = ({ env = process.env } = {}) => {
  config(env); // Validate the service's loopback-only configuration at startup.
  let draining = false;
  const assertAccepting = () => {
    if (draining) throw httpError(503, 'SERVICE_DRAINING', 'devices service is draining');
  };
  const status = () => {
    const state = registry.loadState(env);
    const tasks = Object.values(state.tasks);
    const devices = Object.values(state.devices);
    return {
      ok: true, service: 'devices', draining,
      queued: tasks.filter((task) => task.status === 'queued').length,
      running: tasks.filter((task) => task.status === 'running').length,
      devices: devices.length,
      online: devices.filter((device) => device.status === 'online').length
    };
  };
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      if (pathname.startsWith('/internal/') && !isLoopback(req.socket.remoteAddress)) {
        throw httpError(403, 'LOCAL_ONLY', 'internal endpoints require a loopback connection');
      }
      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(res, 200, { ok: true, service: 'devices', draining });
      }
      if (req.method === 'GET' && pathname === '/internal/status') {
        return sendJson(res, 200, status());
      }
      if (req.method === 'POST' && ['/internal/drain', '/internal/resume'].includes(pathname)) {
        draining = pathname === '/internal/drain';
        return sendJson(res, 200, status());
      }
      if (req.method === 'GET' && pathname === '/internal/pairing') {
        return sendJson(res, 200, registry.pairingInfo(env));
      }
      if (req.method === 'POST' && pathname === '/internal/pairing/rotate') {
        return sendJson(res, 200, registry.rotatePairingCode(env));
      }
      const internalTool = pathname.match(/^\/internal\/tools\/([^/]+)$/);
      if (req.method === 'POST' && internalTool) {
        const name = decodeURIComponent(internalTool[1]);
        if (!tools.listTools().some((tool) => tool.name === name)) {
          throw httpError(404, 'UNKNOWN_TOOL', 'unknown devices tool: ' + name);
        }
        const body = await readJson(req);
        return sendJson(res, 200, await tools.callTool(name, body.arguments || {}, { env, assertAccepting }));
      }
      if (req.method === 'GET' && pathname === '/devices') {
        return sendJson(res, 200, registry.listDevices(env));
      }
      if (req.method === 'POST' && pathname === '/devices/register') {
        const body = await readJson(req);
        assertAccepting();
        return sendJson(res, 200, registry.registerDevice(body, env));
      }
      const deviceAction = pathname.match(/^\/devices\/([^/]+)\/(heartbeat|capabilities)$/);
      if (req.method === 'POST' && deviceAction) {
        const id = decodeURIComponent(deviceAction[1]);
        const bearer = registry.tokenFromRequest(req);
        const body = await readJson(req);
        const result = deviceAction[2] === 'heartbeat'
          ? registry.heartbeatDevice(id, bearer, body, env)
          : registry.saveCapabilities(id, bearer, body, env);
        return sendJson(res, 200, result);
      }
      const next = pathname.match(/^\/devices\/([^/]+)\/tasks\/next$/);
      if (req.method === 'GET' && next) {
        return sendJson(res, 200, registry.takeNextTask(decodeURIComponent(next[1]), registry.tokenFromRequest(req), env));
      }
      const result = pathname.match(/^\/devices\/([^/]+)\/tasks\/([^/]+)\/result$/);
      if (req.method === 'POST' && result) {
        const body = await readJson(req);
        return sendJson(res, 200, registry.completeTask(
          decodeURIComponent(result[1]), registry.tokenFromRequest(req), decodeURIComponent(result[2]), body, env
        ));
      }
      throw httpError(404, 'NOT_FOUND', 'route not found');
    } catch (error) {
      try { logError('devices', error, env); } catch { /* Logging failure must not hide the original error. */ }
      sendError(res, error);
    }
  });
};

exports.isLoopback = isLoopback;
