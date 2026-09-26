'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { config, httpError } = require('../../../packages/common/src');
// This release enables only these providers; neither archive nor legacy config is scanned.
const modules = {
  devices: require('../../../providers/devices/runtime'),
  command: require('../../../providers/command/runtime')
};
exports.createRegistry = (env = process.env) => {
  const settings = config(env);
  const manifests = Object.fromEntries(Object.keys(modules).map((name) => [name,
    JSON.parse(fs.readFileSync(path.join(settings.root, 'providers', name, 'provider.json'), 'utf8'))
  ]));
  const requireProvider = (name) => {
    if (!Object.hasOwn(modules, name)) throw httpError(400, 'UNKNOWN_PROVIDER', 'Unknown provider: ' + name);
    return modules[name];
  };
  const collect = async ({ providerName = null, includeSchemas = false } = {}) => {
    if (providerName !== null) requireProvider(providerName);
    const names = providerName === null ? Object.keys(modules) : [providerName];
    const providers = names.map((name) => {
      const tools = modules[name].listTools().map((tool) => ({ name: tool.name,
        ...(tool.canonicalName ? { canonicalName: tool.canonicalName } : {}), ...(tool.category ? { category: tool.category } : {}),
        ...(tool.function ? { function: tool.function } : {}), ...(tool.aliases ? { aliases: tool.aliases } : {}),
        ...(tool.description ? { description: tool.description } : {}), ...(includeSchemas ? { inputSchema: tool.inputSchema } : {})
      }));
      return { name, type: manifests[name].type, description: manifests[name].description, count: tools.length, tools };
    });
    return { ok: true, providers, total: providers.reduce((total, provider) => total + provider.count, 0) };
  };
  const call = async (provider, tool, args = {}) => {
    const implementation = requireProvider(provider);
    if (!implementation.listTools().some((item) => item.name === tool)) throw httpError(400, 'UNKNOWN_TOOL', 'Unknown tool: ' + tool);
    const commandRoots = (env.ZERO_COMMAND_ROOTS || '').split(';').filter(Boolean);
    return implementation.callTool(tool, args, { env, commandRoots: commandRoots.length ? commandRoots : [settings.root] });
  };
  return { collect, call };
};
