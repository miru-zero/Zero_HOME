'use strict';
const http = require('node:http');
const { sendJson, sendError, readJson, httpError, logError } = require('../../../packages/common/src');
const { createRegistry } = require('./registry');
const { createProtocol } = require('./protocol');
const zero = require('../../../packages/zero');
exports.createServer = ({ env = process.env } = {}) => {
  const registry = createRegistry(env);
  const protocol = createProtocol(registry, (error) => logError('mcp', error, env));
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'zero-mcp', contractVersion: zero.contract.version });
      if (req.method === 'GET' && url.pathname === '/tools') {
        const providerName = url.searchParams.has('pvd') ? url.searchParams.get('pvd').trim() : url.searchParams.get('provider')?.trim() ?? null;
        return sendJson(res, 200, await registry.collect({ providerName, includeSchemas: url.searchParams.get('schemas') === '1' }));
      }
      if (req.method === 'POST' && url.pathname === '/mcp') {
        const reply = await protocol.handle(await readJson(req));
        if (reply === null) { res.writeHead(202, { 'content-length': 0 }); return res.end(); }
        return sendJson(res, 200, reply);
      }
      const match = /^\/providers\/([^/]+)\/tools\/([^/]+)\/call$/.exec(url.pathname);
      if (req.method === 'POST' && match) {
        const provider = decodeURIComponent(match[1]), tool = decodeURIComponent(match[2]);
        const body = await readJson(req);
        const result = await registry.call(provider, tool, body?.arguments || {});
        return sendJson(res, 200, { ok: true, provider, tool, result });
      }
      throw httpError(404, 'NOT_FOUND', 'Route not found');
    } catch (error) { logError('mcp', error, env); sendError(res, error); }
  });
};
