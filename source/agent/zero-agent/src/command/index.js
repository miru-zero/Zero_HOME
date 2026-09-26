'use strict';

const zero = require('../zero-runtime');
const filesystem = require('./filesystem');

const descriptors = [
  filesystem.readFileDescriptor,
  filesystem.readFilesDescriptor,
  filesystem.listDirectoryDescriptor
];
const catalog = zero.catalog.create(descriptors);
const handlers = new Map([
  [filesystem.readFileDescriptor.name, filesystem.readFile],
  [filesystem.readFilesDescriptor.name, filesystem.readFiles],
  [filesystem.listDirectoryDescriptor.name, filesystem.listDirectory]
]);
const localAlias = (name) => {
  if (name === 'readFile' || name === 'command.readFile') return 'zero.command.readFile';
  if (name === 'readFiles' || name === 'command.readFiles') return 'zero.command.readFiles';
  if (name === 'listDirectory' || name === 'command.listDirectory') return 'zero.command.listDirectory';
  return name;
};
const command = {
  filesystem: {
    readFile: filesystem.readFile,
    readFiles: filesystem.readFiles,
    listDirectory: filesystem.listDirectory
  },
  listTools: (filter = {}) => catalog.list(filter),
  resolveTool: (name) => catalog.resolve(localAlias(name)),
  callTool: (name, args = {}, context = {}) => {
    const descriptor = catalog.resolve(localAlias(name));
    const handler = handlers.get(descriptor.name);
    return handler(args, context);
  }
};

Object.assign(exports, command);
