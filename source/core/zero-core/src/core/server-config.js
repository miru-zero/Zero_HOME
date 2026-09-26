const fs = require('node:fs');
const path = require('node:path');
const zeroHome = require('./zero-home');

const defaults = {
  domain: 'zero.miru.work',
  host: '0.0.0.0',
  port: 8050
};

exports.resolveFile = (env = process.env) => env.ZERO_SERVER_CONFIG_FILE
  ? path.resolve(env.ZERO_SERVER_CONFIG_FILE)
  : env.ZERO_HOME
    ? path.join(zeroHome.paths(env).state, 'core', 'server-config.json')
    : path.resolve(__dirname, '../runtime/server-config.json');

const parseEndpoint = (endpoint) => {
  const raw = String(endpoint || '').trim();
  if (!raw) return {};
  if (/^\d+$/.test(raw)) return { port: Number(raw) };
  const match = /^(.+):(\d+)$/.exec(raw);
  if (match) return { host: match[1], port: Number(match[2]) };
  return { host: raw };
};

const normalizePort = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    const error = new Error(`invalid port: ${value}`);
    error.code = 'INVALID_PORT';
    throw error;
  }
  return port === 0 ? defaults.port : port;
};

exports.withDefaults = (input = {}) => {
  const endpoint = parseEndpoint(input.endpoint);
  const domain = String(input.domain || defaults.domain).trim();
  const host = String(input.host || endpoint.host || defaults.host).trim();
  const port = normalizePort(input.port ?? endpoint.port ?? defaults.port);
  const protocol = String(input.protocol || 'https').trim() || 'https';
  return {
    domain,
    host,
    port,
    protocol,
    bind: `${host}:${port}`,
    baseUrl: `${protocol}://${domain}`,
    updatedAt: input.updatedAt || new Date().toISOString()
  };
};
exports.load = ({ file } = {}) => {
  const target = file || exports.resolveFile();
  if (!fs.existsSync(target)) return exports.withDefaults({});
  const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
  return exports.withDefaults(parsed);
};

exports.save = ({ file, domain, host, port, endpoint, protocol } = {}) => {
  const target = file || exports.resolveFile();
  const config = exports.withDefaults({ domain, host, port, endpoint, protocol });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  return config;
};
