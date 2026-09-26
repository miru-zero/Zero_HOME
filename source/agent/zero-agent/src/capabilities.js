'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const localTools = require('./local-tools');
const command = require('./command');
const zero = require('./zero-runtime');

const defaultMcpRoot = () => path.resolve(__dirname, '../..');
const mcpRoot = (env = process.env) => path.resolve(env.ZERO_MCP_ROOT || defaultMcpRoot());
const providersDir = (env = process.env) => path.join(mcpRoot(env), 'providers');

const readManifest = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
};

const manifestProviders = (env = process.env) => {
  const dir = providersDir(env);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => {
      const root = path.join(dir, item.name);
      const manifestFile = path.join(root, 'provider.json');
      const manifest = fs.existsSync(manifestFile) ? readManifest(manifestFile) : {};
      return {
        name: item.name,
        type: manifest.type || 'unknown',
        description: manifest.description || '',
        providerRoot: root,
        manifestFile,
        manifestError: manifest.error || null,
        module: manifest.module || null,
        command: manifest.command || null,
        args: manifest.args || []
      };
    });
};

const safeInternalTools = (provider) => {
  if (!provider.module) return [];
  const modulePath = provider.module.replaceAll('{providerRoot}', provider.providerRoot.replace(/\\/g, '/'));
  const resolved = path.resolve(modulePath);
  try {
    const runtime = require(resolved);
    if (typeof runtime.listTools !== 'function') return [];
    return runtime.listTools({}).map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || null
    }));
  } catch (error) {
    return [{ name: '__scan_error__', description: error.message, inputSchema: null }];
  }
};
const builtInLocalProvider = () => ({
  name: 'zero-agent-local',
  type: 'internal',
  description: 'Built-in safe local filesystem tools exposed by zero-agent.',
  status: 'present',
  tools: localTools.listTools(),
  tool_count: localTools.listTools().length
});

const buildCapabilities = (env = process.env) => {
  const providers = [builtInLocalProvider(), ...manifestProviders(env).map((provider) => {
    const tools = provider.type === 'internal' ? safeInternalTools(provider) : [];
    return {
      name: provider.name,
      type: provider.type,
      description: provider.description,
      status: provider.manifestError ? 'invalid' : 'present',
      tools,
      tool_count: tools.length,
      mcp_stdio_live_scan: provider.type === 'mcp-stdio' ? false : undefined
    };
  })];
  const agentVersion = require('../package.json').version;
  const categories = Array.from(new Set(command.listTools().map((tool) => `${tool.provider}.${tool.category}`))).sort();
  const adapters = ['native'];
  const payload = {
    agentVersion,
    agent_version: agentVersion,
    contractVersion: zero.contract.version,
    platform: process.platform,
    architecture: process.arch,
    categories,
    adapters,
    mcp_root: mcpRoot(env),
    providers
  };
  const fingerprint = {
    contractVersion: payload.contractVersion,
    platform: payload.platform,
    architecture: payload.architecture,
    categories: payload.categories,
    adapters: payload.adapters,
    providers: payload.providers
  };
  payload.capability_hash = crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
  return payload;
};

const capabilities = { mcpRoot, providersDir, manifestProviders, buildCapabilities };
Object.assign(exports, capabilities);
