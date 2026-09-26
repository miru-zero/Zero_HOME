'use strict';
const { config, requestJson, httpError } = require('../../../packages/common/src');
const definitions = require('../tools.json');
exports.listTools = () => structuredClone(definitions);
exports.callTool = async (name, args = {}, context = {}) => {
  if (!definitions.some((tool) => tool.name === name)) throw httpError(400, 'UNKNOWN_TOOL', 'Unknown devices tool: ' + name);
  const settings = config(context.env || process.env);
  return requestJson(`${settings.devices.baseUrl}/internal/tools/${encodeURIComponent(name)}`, {
    method: 'POST', body: { arguments: args }, timeoutMs: settings.requestTimeoutMs
  });
};
