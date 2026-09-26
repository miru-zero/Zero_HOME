'use strict';
const zero = require('../../../packages/zero');
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });
const content = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
const discovery = [
  { name: 'listZeroTools', description: 'List active Zero providers and tools.', inputSchema: { type: 'object', properties: { provider: { type: 'string' }, schemas: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'callZeroTool', description: 'Call an active Zero provider tool.', inputSchema: { type: 'object', properties: { provider: { type: 'string' }, tool: { type: 'string' }, arguments: { type: 'object', additionalProperties: true } }, required: ['provider', 'tool'], additionalProperties: false } }
];
exports.createProtocol = (registry, onError = () => {}) => {
  const tools = async () => {
    const catalog = await registry.collect({ includeSchemas: true });
    return [...discovery, ...catalog.providers.flatMap((provider) => provider.tools.map((tool) => ({ ...tool, name: tool.canonicalName || `zero.${provider.name}.${tool.name}` })))];
  };
  const handleOne = async (message) => {
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return fail(null, -32600, 'invalid request');
    if (!Object.hasOwn(message, 'id')) return null;
    const id = message.id, params = message.params || {};
    try {
      if (message.method === 'initialize') return ok(id, { protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'zero-mcp', version: '0.2.0' } });
      if (message.method === 'ping') return ok(id, {});
      if (message.method === 'tools/list') return ok(id, { tools: await tools() });
      if (message.method !== 'tools/call') return fail(id, -32601, 'method not found: ' + message.method);
      const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? params.arguments : {};
      if (params.name === 'listZeroTools') return ok(id, content(await registry.collect({ providerName: args.provider ?? null, includeSchemas: args.schemas === true })));
      if (params.name === 'callZeroTool') return ok(id, content(await registry.call(args.provider, args.tool, args.arguments || {})));
      try {
        const identity = zero.toolId.parse(params.name || '');
        return ok(id, content(await registry.call(identity.provider, identity.function, args)));
      } catch (error) {
        if (error.code !== 'INVALID_TOOL_ID') throw error;
      }
      const match = /^zero\.([^.]+)\.([^.]+)$/.exec(params.name || '');
      if (!match) return fail(id, -32000, 'unknown MCP tool: ' + params.name, { code: 'UNKNOWN_TOOL' });
      return ok(id, content(await registry.call(match[1], match[2], args)));
    } catch (error) { onError(error); return fail(id, -32000, error.message || 'Tool failed', { code: error.code || 'TOOL_FAILED' }); }
  };
  const handle = async (body) => {
    if (!Array.isArray(body)) return handleOne(body);
    if (!body.length) return fail(null, -32600, 'invalid request');
    const replies = [];
    for (const message of body) { const reply = await handleOne(message); if (reply !== null) replies.push(reply); }
    return replies.length ? replies : null;
  };
  return { tools, handle };
};
