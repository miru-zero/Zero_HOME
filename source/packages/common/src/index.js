'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const ROOT = path.resolve(__dirname, '../../..');
const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
const portNumber = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw httpError(500, 'CONFIG_INVALID', 'Invalid service port');
  return port;
};
const readConfig = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
const config = (env = process.env) => {
  const home = path.resolve(env.ZERO_HOME || path.join(ROOT, '.zero'));
  const stateRoot = path.join(home, 'state');
  const file = env.ZERO_SERVER_CONFIG_FILE || path.join(stateRoot, 'gateway', 'server-config.json');
  const saved = readConfig(file);
  const services = readConfig(env.ZERO_SERVICES_CONFIG_FILE || path.join(stateRoot, 'services.json'));
  const gateway = {
    host: env.ZERO_SERVER_HOST || env.ZERO_LLM_HOST || saved.host || '0.0.0.0',
    port: portNumber(env.ZERO_SERVER_PORT || env.ZERO_LLM_PORT || saved.port || 8050),
    domain: saved.domain || 'zero.miru.work', protocol: saved.protocol || 'https'
  };
  gateway.bind = `${gateway.host}:${gateway.port}`;
  gateway.baseUrl = `${gateway.protocol}://${gateway.domain}`;
  const service = (name, fallback) => {
    const prefix = `ZERO_${name.toUpperCase()}`;
    const host = env[`${prefix}_HOST`] || services[name]?.host || '127.0.0.1';
    if (!['127.0.0.1', '::1'].includes(host)) throw httpError(500, 'CONFIG_INVALID', `${name} must bind to loopback`);
    const port = portNumber(env[`${prefix}_PORT`] || services[name]?.port || fallback);
    return { host, port, baseUrl: `http://${host === '::1' ? '[::1]' : host}:${port}` };
  };
  const requestTimeoutMs = Number(env.ZERO_REQUEST_TIMEOUT_MS || 65000);
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw httpError(500, 'CONFIG_INVALID', 'Invalid request timeout');
  const mcp = service('mcp', 8051), devices = service('devices', 8052);
  if (new Set([gateway.port, mcp.port, devices.port]).size !== 3) throw httpError(500, 'CONFIG_INVALID', 'Service ports must be distinct');
  return { root: ROOT, home, stateRoot, logsRoot: path.join(home, 'logs'), gateway, mcp, devices, requestTimeoutMs, serverConfigFile: path.resolve(file) };
};
const sendJson = (res, status, body) => {
  if (res.destroyed || res.writableEnded) return;
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(data) });
  res.end(data);
};
const sendError = (res, error) => sendJson(res, error.status || 500, {
  error: { message: error.message || 'Request failed', type: error.code || 'ZERO_ERROR', code: error.code || 'ZERO_ERROR' }
});
const readJson = async (req) => {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16 * 1024 * 1024) throw httpError(413, 'BODY_TOO_LARGE', 'JSON body exceeds 16 MiB');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try { return text ? JSON.parse(text) : {}; }
  catch { throw httpError(400, 'INVALID_JSON', 'Invalid JSON body'); }
};
// One request only: transport failure never silently repeats a mutation.
const requestJson = (url, { method = 'GET', body, headers = {}, timeoutMs = 65000 } = {}) => new Promise((resolve, reject) => {
  const target = new URL(url);
  const data = body === undefined ? null : JSON.stringify(body);
  const req = (target.protocol === 'https:' ? https : http).request(target, {
    method, headers: { ...headers, ...(data === null ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) }) }
  }, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('error', reject);
    res.on('end', () => {
      clearTimeout(timer);
      let value;
      try { value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
      catch { reject(httpError(502, 'INVALID_UPSTREAM_RESPONSE', 'Service returned invalid JSON')); return; }
      if (res.statusCode >= 400) {
        reject(httpError(res.statusCode, value.error?.code || 'UPSTREAM_ERROR', value.error?.message || 'Service request failed'));
      } else resolve(value);
    });
  });
  const timer = setTimeout(() => req.destroy(httpError(504, 'UPSTREAM_TIMEOUT', 'Service request timed out; outcome may be unknown')), timeoutMs);
  req.on('error', (error) => {
    clearTimeout(timer);
    reject(error.status ? error : httpError(503, 'SERVICE_UNAVAILABLE', 'Service connection failed; request was not retried'));
  });
  req.end(data);
});
const listen = (server, { host, port }) => new Promise((resolve, reject) => {
  const onError = (error) => reject(error);
  server.once('error', onError);
  server.listen(port, host, () => { server.removeListener('error', onError); resolve(server); });
});
const logError = (service, error, env = process.env) => {
  const dir = path.join(config(env).logsRoot, service);
  fs.mkdirSync(dir, { recursive: true });
  // Do not log request bodies, arguments, tokens or arbitrary error messages.
  fs.appendFileSync(path.join(dir, 'errors.jsonl'), JSON.stringify({ at: new Date().toISOString(), code: error.code || 'ZERO_ERROR', status: error.status || 500 }) + '\n');
};
const runMain = async (createServer, service) => {
  try {
    const settings = config();
    const server = createServer({ env: process.env });
    await listen(server, settings[service]);
    console.log(JSON.stringify({ service, pid: process.pid, address: server.address() }));
    const stop = () => { server.close(() => process.exit(0)); server.closeIdleConnections?.(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return server;
  } catch (error) { console.error(`${service}: ${error.code || 'START_FAILED'}: ${error.message}`); process.exitCode = 1; }
};
module.exports = { config, readJson, sendJson, sendError, httpError, requestJson, listen, runMain, logError };
