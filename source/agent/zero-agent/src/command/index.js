'use strict';

const zero = require('../zero-runtime');
const filesystem = require('./filesystem');
const pathTools = require('./path');

const fsToolNames = [
  'readFile', 'readFiles', 'writeFile', 'appendFile', 'createFile', 'touchFile', 'replaceFile',
  'createDirectory', 'deleteFile', 'copyDirectory', 'moveDirectory', 'deleteDirectory', 'truncateFile',
  'listDirectory', 'getFileInfo', 'globFiles', 'grepFiles', 'copyFile', 'moveFile', 'renameFile', 'exists', 'hashFile'
];
const pathToolNames = [
  'resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension'
];

const descriptors = [
  ...fsToolNames.map((name) => filesystem[`${name}Descriptor`]),
  ...pathToolNames.map((name) => pathTools[`${name}Descriptor`])
];
const catalog = zero.catalog.create(descriptors);
const handlers = new Map([
  ...fsToolNames.map((name) => [filesystem[`${name}Descriptor`].name, filesystem[name]]),
  ...pathToolNames.map((name) => [pathTools[`${name}Descriptor`].name, pathTools[name]])
]);

const localAliasMap = {};
for (const name of fsToolNames) {
  localAliasMap[name] = `zero.command.${name}`;
  localAliasMap[`command.${name}`] = `zero.command.${name}`;
}
for (const name of pathToolNames) {
  localAliasMap[name] = `zero.command.${name}`;
  localAliasMap[`command.${name}`] = `zero.command.${name}`;
}
const localAlias = (name) => localAliasMap[name] || name;

const command = {
  filesystem: Object.fromEntries(fsToolNames.map((name) => [name, filesystem[name]])),
  path: Object.fromEntries(pathToolNames.map((name) => [name, pathTools[name]])),
  listTools: (filter = {}) => catalog.list(filter),
  resolveTool: (name) => catalog.resolve(localAlias(name)),
  callTool: (name, args = {}, context = {}) => {
    const descriptor = catalog.resolve(localAlias(name));
    const handler = handlers.get(descriptor.name);
    return handler(args, context);
  }
};

Object.assign(exports, command);
