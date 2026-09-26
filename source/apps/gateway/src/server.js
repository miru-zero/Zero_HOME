'use strict';
const http = require('node:http');
const { config, requestJson, sendJson, sendError, httpError, logError } = require('../../../packages/common/src');
const publicDevicePath = (p) => p === '/devices' || p === '/devices/register' || /^\/devices\/[^/]+\/(heartbeat|capabilities|tasks\/next|tasks\/[^/]+\/result)$/.test(p);
const publicMcpPath = (p) => ['/mcp', '/tools'].includes(p) || /^\/providers\/[^/]+\/tools\/[^/]+\/call$/.test(p);
const proxy = (req, res, destination, timeoutMs, onError) => {
  const incoming = new URL(req.url, 'http://localhost'), target = new URL(destination);
  const headers = { ...req.headers, host: target.host };
  for (const name of ['connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', ...(req.headers.connection || '').split(',').map((s) => s.trim().toLowerCase())]) delete headers[name];
  let timer;
  const outgoing = http.request(target, { method: req.method, path: incoming.pathname + incoming.search, headers }, (upstream) => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res);
    upstream.on('end', () => clearTimeout(timer));
    upstream.on('error', (error) => { clearTimeout(timer); res.destroy(error); });
  });
  timer = setTimeout(() => outgoing.destroy(httpError(504, 'UPSTREAM_TIMEOUT', 'Service request timed out; outcome may be unknown')), timeoutMs);
  outgoing.on('error', (error) => {
    clearTimeout(timer);
    const failure = error.status ? error : httpError(503, 'SERVICE_UNAVAILABLE', 'Service unavailable; request was not retried');
    onError(failure);
    if (!res.headersSent) sendError(res, failure); else res.destroy();
  });
  req.on('aborted', () => outgoing.destroy());
  res.on('close', () => { clearTimeout(timer); if (!res.writableFinished) outgoing.destroy(); });
  req.pipe(outgoing);
};
exports.createServer = ({ env = process.env } = {}) => {
  const settings = config(env);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/v1/')) throw httpError(503, 'SERVICE_DISABLED', 'LLM service is archived and disabled');
      if (req.method === 'GET' && url.pathname === '/health') {
        const pairs = await Promise.all(['mcp', 'devices'].map(async (service) => {
          try { return [service, await requestJson(settings[service].baseUrl + '/health', { timeoutMs: Math.min(settings.requestTimeoutMs, 1000) })]; }
          catch (error) { return [service, { ok: false, code: error.code }]; }
        }));
        const services = Object.fromEntries(pairs), ok = pairs.every(([, result]) => result.ok === true);
        return sendJson(res, ok ? 200 : 503, { ok, service: 'zero-gateway', services });
      }
      if (req.method === 'GET' && ['/', '/config'].includes(url.pathname)) {
        const body = { ok: true, service: 'zero-gateway', ...settings.gateway, endpoints: {
          health: '/health', config: '/config', tools: '/tools', toolCall: '/providers/{provider}/tools/{tool}/call', mcp: '/mcp',
          devices: '/devices', deviceRegister: '/devices/register', deviceHeartbeat: '/devices/{device_id}/heartbeat',
          deviceCapabilities: '/devices/{device_id}/capabilities', deviceTaskNext: '/devices/{device_id}/tasks/next', deviceTaskResult: '/devices/{device_id}/tasks/{task_id}/result'
        }, disabledServices: ['llm'] };
        if (url.pathname === '/') {
          try { const catalog = await requestJson(settings.mcp.baseUrl + '/tools', { timeoutMs: 1000 }); body.tools = { endpoint: '/tools', providers: Object.fromEntries(catalog.providers.map((p) => [p.name, p.count])), total: catalog.total }; }
          catch { body.tools = null; }
        }
        return sendJson(res, 200, body);
      }
      const service = publicMcpPath(url.pathname) ? 'mcp' : publicDevicePath(url.pathname) ? 'devices' : null;
      if (!service) throw httpError(404, 'NOT_FOUND', 'Route not found');
      proxy(req, res, settings[service].baseUrl, settings.requestTimeoutMs, (error) => logError('gateway', error, env));
    } catch (error) { logError('gateway', error, env); sendError(res, error); }
  });
};
