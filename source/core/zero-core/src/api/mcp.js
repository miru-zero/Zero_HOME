'use strict';

const toolsHub = require('../hub');
const zero = require('../../../../packages/zero');
const chatgptAuthSetup = require('./chatgpt-auth-setup');

const inputSchema = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false
});

const AUTH_QA_TOOL_NAME = 'zero.qa.auth.requireMachineAuth';
const CHATGPT_LOGIN_TOOL_NAME = 'zero.chatgpt.login';
const CHATGPT_AUTH_STATUS_TOOL_NAME = 'zero.chatgpt.auth.status';

const authRequired = (message = 'Machine auth is required for this QA flow.') => {
  const error = new Error(message);
  error.code = 'AUTH_REQUIRED';
  error.wwwAuthenticate = 'Bearer realm="zero-machine", error="AUTH_REQUIRED"';
  return error;
};

const authContext = (options = {}) => options.auth || options.context?.auth || null;
const hasMachineAuth = (options = {}) => {
  const auth = authContext(options);
  return Boolean(auth && auth.type === 'machine' && auth.status === 'valid');
};

const redactedAuthStatus = (options = {}) => {
  const auth = authContext(options);
  if (!auth) return { present: false, status: 'missing', redacted: true };
  return {
    present: true,
    type: auth.type || 'unknown',
    status: auth.status || 'unknown',
    device: auth.device || null,
    redacted: true
  };
};
const discoveryTools = [
  {
    name: 'listZeroTools',
    description: 'List Zero providers and tools available through zero.miru.work.',
    inputSchema: inputSchema({ provider: { type: 'string' }, schemas: { type: 'boolean' } })
  },
  {
    name: 'callZeroTool',
    description: 'Call a Zero provider tool. Use only when no fixed Zero MCP tool fits.',
    inputSchema: inputSchema({
      provider: { type: 'string' },
      tool: { type: 'string' },
      arguments: { type: 'object', additionalProperties: true }
    }, ['provider', 'tool'])
  },
  {
    name: AUTH_QA_TOOL_NAME,
    description: 'QA gate for machine auth. It must return AUTH_REQUIRED unless Core received a valid machine auth context. Never returns raw secrets.',
    inputSchema: inputSchema({
      device: { type: 'string' },
      reason: { type: 'string' }
    })
  },
  {
    name: CHATGPT_LOGIN_TOOL_NAME,
    description: 'Start the Zero ChatGPT auth setup UI test flow. Returns a setup URL; never accepts or returns raw session secrets.',
    inputSchema: inputSchema({})
  },
  {
    name: CHATGPT_AUTH_STATUS_TOOL_NAME,
    description: 'Return redacted ChatGPT auth import status from Zero Core.',
    inputSchema: inputSchema({})
  }
];

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message, data = undefined) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message, ...(data === undefined ? {} : { data }) }
});

const trace = (env, event, payload = {}) => {
  if (!env || env.ZERO_TRACE !== '1') return;
  console.error(JSON.stringify({ at: new Date().toISOString(), event, ...payload }));
};

const contentResult = (value) => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  structuredContent: value
});

const createHubInstance = (options = {}) => {
  const factory = options.createHub || toolsHub.createHub;
  return factory({ env: options.env || process.env });
};

const providerToolName = (provider, tool) => {
  if (tool.canonicalName) return tool.canonicalName;
  if (tool.category && tool.function) {
    return zero.toolId.format({
      provider: provider.name,
      category: tool.category,
      function: tool.function
    });
  }
  return `zero.${provider.name}.${tool.name}`;
};

const publicTool = (provider, tool, includeSchemas = true) => ({
  name: providerToolName(provider, tool),
  ...(tool.description ? { description: tool.description } : {}),
  ...(includeSchemas && tool.inputSchema ? { inputSchema: tool.inputSchema } : {})
});

const publicCatalogTool = (provider, tool, includeSchemas = false) => ({
  name: tool.name,
  ...(tool.description ? { description: tool.description } : {}),
  ...(tool.canonicalName ? { canonicalName: tool.canonicalName } : {}),
  ...(tool.category ? { category: tool.category } : {}),
  ...(tool.function ? { function: tool.function } : {}),
  ...(tool.aliases ? { aliases: tool.aliases } : {}),
  ...(includeSchemas && tool.inputSchema ? { inputSchema: tool.inputSchema } : {})
});

const collectTools = async (options = {}, args = {}) => {
  if (typeof options.collectTools === 'function') {
    return options.collectTools({
      createHub: options.createHub,
      env: options.env,
      providerName: args.provider || null,
      includeSchemas: args.schemas === true
    });
  }

  const hub = createHubInstance(options);
  try {
    const providerName = args.provider || null;
    const selected = hub.listProviders().filter((provider) => !providerName || provider.name === providerName);
    if (providerName && selected.length === 0) {
      const error = new Error('unknown provider: ' + providerName);
      error.code = 'UNKNOWN_PROVIDER';
      throw error;
    }

    const providers = [];
    let total = 0;
    for (const provider of selected) {
      const tools = (await hub.listTools(provider.name, {})).map((tool) => publicCatalogTool(provider, tool, args.schemas === true));
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

const mcpTools = async (options = {}) => {
  const hub = createHubInstance(options);
  try {
    const tools = [];
    for (const provider of hub.listProviders()) {
      const providerTools = await hub.listTools(provider.name, {});
      for (const tool of providerTools) tools.push(publicTool(provider, tool, true));
    }
    return [...discoveryTools, ...tools];
  } finally {
    if (hub && typeof hub.close === 'function') hub.close();
  }
};

const routeFromToolName = (name) => {
  try {
    const identity = zero.toolId.parse(name || '');
    return { provider: identity.provider, tool: identity.function };
  } catch (error) {
    if (error.code !== 'INVALID_TOOL_ID') throw error;
  }

  const match = /^zero\.([A-Za-z][A-Za-z0-9_-]*)\.([A-Za-z][A-Za-z0-9_-]*)$/.exec(String(name || ''));
  if (!match) return null;
  return { provider: match[1], tool: match[2] };
};

const callHubTool = async ({ options = {}, provider, tool, args = {} }) => {
  const hub = createHubInstance(options);
  try {
    const context = { ...(options.context || {}), env: options.context?.env || options.env || process.env };
    return await hub.callTool(provider, tool, args || {}, context);
  } finally {
    if (hub && typeof hub.close === 'function') hub.close();
  }
};

const requireMachineAuthQa = (args = {}, options = {}) => {
  if (!hasMachineAuth(options)) {
    const error = authRequired('Machine auth is required before protected Zero machine actions can run.');
    error.data = {
      code: 'AUTH_REQUIRED',
      auth: redactedAuthStatus(options),
      required: {
        type: 'machine',
        source: 'ChatGPT MCP connector or future OAuth/secret boundary',
        raw_secret_allowed_in_chat: false
      },
      requested: {
        device: args.device || null,
        reason: args.reason || 'qa'
      }
    };
    throw error;
  }
  return {
    ok: true,
    auth: redactedAuthStatus(options),
    message: 'Machine auth context is valid. Raw secret was not exposed.'
  };
};
const callNamedTool = async (name, args, options = {}) => {
  if (name === 'listZeroTools') return collectTools(options, args);
  if (name === AUTH_QA_TOOL_NAME) return requireMachineAuthQa(args, options);
  if (name === CHATGPT_LOGIN_TOOL_NAME) return chatgptAuthSetup.login({ publicConfig: options.publicConfig || {}, env: options.env || process.env });
  if (name === CHATGPT_AUTH_STATUS_TOOL_NAME) return chatgptAuthSetup.status({ env: options.env || process.env });
  if (name === 'callZeroTool') {
    return callHubTool({
      options,
      provider: args.provider,
      tool: args.tool,
      args: args.arguments || {}
    });
  }

  const route = routeFromToolName(name);
  if (!route) {
    const error = new Error('unknown MCP tool: ' + name);
    error.code = 'UNKNOWN_TOOL';
    throw error;
  }
  return callHubTool({ options, provider: route.provider, tool: route.tool, args });
};

const initializeResult = (params = {}) => ({
  protocolVersion: params.protocolVersion || '2025-06-18',
  capabilities: { tools: { listChanged: false } },
  serverInfo: { name: 'zero-mcp', version: '0.2.0' }
});

const handleMessage = async (message, options = {}) => {
  const id = Object.prototype.hasOwnProperty.call(message, 'id') ? message.id : null;
  const method = message.method;
  const params = message.params || {};

  if (!method && id === null) return null;
  if (method === 'initialize') return ok(id, initializeResult(params));
  if (method === 'notifications/initialized') return null;
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: await mcpTools(options) });

  if (method === 'tools/call') {
    const name = params.name;
    const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
    try {
      trace(options.env, 'mcp.tools.call', { tool: name, args });
      const result = await callNamedTool(name, args, options);
      return ok(id, contentResult(result));
    } catch (error) {
      return fail(id, -32000, error.message || String(error), { code: error.code || 'TOOL_FAILED', ...(error.data ? { data: error.data } : {}), ...(error.wwwAuthenticate ? { wwwAuthenticate: error.wwwAuthenticate } : {}) });
    }
  }

  return fail(id, -32601, 'method not found: ' + method);
};

const mcp = {
  tools: mcpTools,
  handle: async (body, options = {}) => {
    if (!body || typeof body !== 'object') return fail(null, -32600, 'invalid request');
    if (Array.isArray(body)) {
      const replies = [];
      for (const item of body) {
        const reply = await handleMessage(item, options);
        if (reply) replies.push(reply);
      }
      return replies.length ? replies : null;
    }
    return handleMessage(body, options);
  }
};

Object.assign(exports, mcp);
