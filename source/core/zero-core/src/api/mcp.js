'use strict';

const toolsHub = require('../hub');
const zero = require('../../../../packages/zero');

const inputSchema = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false
});

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

const callNamedTool = async (name, args, options = {}) => {
  if (name === 'listZeroTools') return collectTools(options, args);
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
      return fail(id, -32000, error.message || String(error), { code: error.code || 'TOOL_FAILED' });
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
