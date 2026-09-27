'use strict';

const zeroAgent = require('../../../agent/zero-agent');

const TOOL_ORDER = [
  'readFile', 'readFiles', 'writeFile', 'appendFile', 'createFile', 'touchFile', 'replaceFile',
  'createDirectory', 'deleteFile', 'copyDirectory', 'moveDirectory', 'deleteDirectory', 'truncateFile',
  'listDirectory', 'getFileInfo', 'globFiles', 'grepFiles', 'copyFile', 'moveFile', 'renameFile', 'exists', 'hashFile',
  'resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension'
];

const PATH_TOOLS = new Set(['resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension']);
const categoryFor = (name) => PATH_TOOLS.has(name) ? 'path' : 'filesystem';
const canonicalId = (name) => `zero.command.${categoryFor(name)}.${name}`;
const commandAlias = (name) => `zero.command.${name}`;
const fail = (code, message) => Object.assign(new Error(message), { code });

const routeMap = new Map();
for (const name of TOOL_ORDER) {
  const canonical = canonicalId(name);
  routeMap.set(name, canonical);
  routeMap.set(`command.${name}`, canonical);
  routeMap.set(commandAlias(name), canonical);
  routeMap.set(canonical, canonical);
}

const descriptorFor = (name) => zeroAgent.command.resolveTool(canonicalId(name));
const publicTool = (name) => {
  const descriptor = descriptorFor(name);
  return {
    name,
    canonicalName: descriptor.name,
    provider: descriptor.provider,
    category: descriptor.category,
    function: descriptor.function,
    aliases: descriptor.aliases,
    description: descriptor.description,
    inputSchema: descriptor.inputSchema
  };
};

const commandProvider = {
  listTools: () => TOOL_ORDER.map(publicTool),
  callTool: async (name, args = {}, context = {}) => {
    const canonical = routeMap.get(name);
    if (!canonical) throw fail('UNKNOWN_TOOL', 'unknown command tool: ' + name);
    return zeroAgent.command.callTool(canonical, args, context);
  }
};

Object.assign(exports, commandProvider);
