const http = require('node:http');
const serverConfig = require('../core/server-config');
const toolsHub = require('../hub');
const mcp = require('./mcp');
const deviceRegistry = require('../core/device-registry');
const zero = require('../../../../packages/zero');

const sendJson = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data)
  });
  res.end(data);
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
};

const apiError = (error) => ({
  error: {
    message: error.message || String(error),
    type: error.code || 'ZERO_ERROR',
    code: error.code || null
  }
});

const rootBody = (config, toolsSummary = null) => ({
  ok: true,
  service: 'zero-core',
  contractVersion: zero.contract.version,
  domain: config.domain,
  host: config.host,
  port: config.port,
  bind: config.bind,
  baseUrl: config.baseUrl,
  endpoints: {
    health: '/health',
    config: '/config',
    tools: '/tools',
    toolCall: '/providers/{provider}/tools/{tool}/call',
    mcp: '/mcp',
    devices: '/devices',
    deviceRegister: '/devices/register',
    deviceHeartbeat: '/devices/{device_id}/heartbeat',
    deviceCapabilities: '/devices/{device_id}/capabilities',
    deviceTaskNext: '/devices/{device_id}/tasks/next',
    deviceTaskResult: '/devices/{device_id}/tasks/{task_id}/result'
  },
  ...(toolsSummary ? { tools: toolsSummary } : {})
});

const publicTool = (tool, includeSchemas) => ({
  name: tool.name,
  ...(tool.description ? { description: tool.description } : {}),
  ...(tool.canonicalName ? { canonicalName: tool.canonicalName } : {}),
  ...(tool.category ? { category: tool.category } : {}),
  ...(tool.function ? { function: tool.function } : {}),
  ...(tool.aliases ? { aliases: tool.aliases } : {}),
  ...(includeSchemas && tool.inputSchema ? { inputSchema: tool.inputSchema } : {})
});

const collectTools = async ({ createHub, env, providerName = null, category = null, includeSchemas = false }) => {
  const hub = (createHub || toolsHub.createHub)({ env });
  try {
    const selected = hub.listProviders().filter((provider) => !providerName || provider.name === providerName);
    if (providerName && selected.length === 0) {
      const error = new Error('unknown provider: ' + providerName);
      error.code = 'UNKNOWN_PROVIDER';
      throw error;
    }
    const providers = [];
    let total = 0;
    for (const provider of selected) {
      const tools = (await hub.listTools(provider.name, {})).filter((tool) => !category || tool.category === category).map((tool) => publicTool(tool, includeSchemas));
      total += tools.length;
      providers.push({
        name: provider.name,
        type: provider.type,
        ...(provider.description ? { description: provider.description } : {}),
        count: tools.length,
        tools
      });
    }
    return { ok: true, providers, total };
  } finally {
    if (hub && typeof hub.close === 'function') hub.close();
  }
};


const buildToolContext = (env, execution = {}) => ({ env, ...execution });

const summarizeTools = async (options) => {
  const detail = await collectTools(options);
  return {
    endpoint: '/tools',
    providers: Object.fromEntries(detail.providers.map((provider) => [provider.name, provider.count])),
    total: detail.total
  };
};
exports.createServer = ({ publicConfig = serverConfig.withDefaults({}), createHub = null, env = process.env } = {}) => http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/') {
      let toolsSummary = null;
      try { toolsSummary = await summarizeTools({ createHub, env }); } catch { toolsSummary = null; }
      return sendJson(res, 200, rootBody(publicConfig, toolsSummary));
    }

    if (req.method === 'GET' && url.pathname === '/config') {
      return sendJson(res, 200, rootBody(publicConfig));
    }

    if (req.method === 'GET' && url.pathname === '/tools') {
      const pvd = url.searchParams.get('pvd');
      const legacyProvider = url.searchParams.get('provider');
      const providerName = pvd !== null
        ? String(pvd).trim()
        : (legacyProvider ? String(legacyProvider).trim() : null);
      if (pvd !== null && !providerName) {
        const error = new Error('unknown provider: ' + pvd);
        error.code = 'UNKNOWN_PROVIDER';
        throw error;
      }
      const category = String(url.searchParams.get('cat') || '').trim() || null;
      const includeSchemas = url.searchParams.get('schemas') === '1';
      const tools = await collectTools({ createHub, env, providerName, category, includeSchemas });
      return sendJson(res, 200, tools);
    }


    if (req.method === 'GET' && url.pathname === '/devices') {
      return sendJson(res, 200, deviceRegistry.listDevices(env));
    }

    if (req.method === 'POST' && url.pathname === '/devices/register') {
      const body = await readJson(req);
      const result = deviceRegistry.registerDevice(body, env);
      return sendJson(res, 200, result);
    }

    const deviceMatch = url.pathname.match(/^\/devices\/([^/]+)\/(heartbeat|capabilities)$/);
    if (req.method === 'POST' && deviceMatch) {
      const id = decodeURIComponent(deviceMatch[1]);
      const action = deviceMatch[2];
      const token = deviceRegistry.tokenFromRequest(req);
      const body = await readJson(req);
      const result = action === 'heartbeat'
        ? deviceRegistry.heartbeatDevice(id, token, body, env)
        : deviceRegistry.saveCapabilities(id, token, body, env);
      return sendJson(res, 200, result);
    }


    const deviceTaskNextMatch = url.pathname.match(/^\/devices\/([^/]+)\/tasks\/next$/);
    if (req.method === 'GET' && deviceTaskNextMatch) {
      const id = decodeURIComponent(deviceTaskNextMatch[1]);
      const bearer = deviceRegistry.tokenFromRequest(req);
      const result = deviceRegistry.takeNextTask(id, bearer, env);
      return sendJson(res, 200, result);
    }

    const deviceTaskResultMatch = url.pathname.match(/^\/devices\/([^/]+)\/tasks\/([^/]+)\/result$/);
    if (req.method === 'POST' && deviceTaskResultMatch) {
      const id = decodeURIComponent(deviceTaskResultMatch[1]);
      const taskId = decodeURIComponent(deviceTaskResultMatch[2]);
      const bearer = deviceRegistry.tokenFromRequest(req);
      const body = await readJson(req);
      const result = deviceRegistry.completeTask(id, bearer, taskId, body, env);
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && url.pathname === '/mcp') {
      const body = await readJson(req);
      const reply = await mcp.handle(body, {
        createHub,
        env,
        collectTools,
        context: buildToolContext(env)
      });
      if (reply === null) {
        res.writeHead(202, { 'content-length': 0 });
        res.end();
        return;
      }
      return sendJson(res, 200, reply);
    }

    const toolCallMatch = url.pathname.match(/^\/providers\/([^/]+)\/tools\/([^/]+)\/call$/);
    if (req.method === 'POST' && toolCallMatch) {
      const providerName = decodeURIComponent(toolCallMatch[1]);
      const toolName = decodeURIComponent(toolCallMatch[2]);
      const body = await readJson(req);
      const args = body && typeof body === 'object' && body.arguments && typeof body.arguments === 'object'
        ? body.arguments
        : {};
      const hub = (createHub || toolsHub.createHub)({ env });
      try {
        const result = await hub.callTool(providerName, toolName, args, buildToolContext(env, {
          target: body?.target, waitMs: body?.waitMs, deadline: body?.deadline
        }));
        return sendJson(res, 200, { ok: true, provider: providerName, tool: toolName, result });
      } finally {
        if (hub && typeof hub.close === 'function') hub.close();
      }
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, service: 'zero-core', contractVersion: zero.contract.version });
    }

    return sendJson(res, 404, apiError(Object.assign(
      new Error('Not found'),
      { code: 'NOT_FOUND' }
    )));
  } catch (error) {
    const status = error instanceof SyntaxError
      ? 400
      : error.code === 'UNKNOWN_PROVIDER'
        ? 404
        : 500;
    return sendJson(res, status, apiError(error));
  }
});
