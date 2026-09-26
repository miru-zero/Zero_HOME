'use strict';

const zero = require('../zero-runtime');
const filesystem = require('./filesystem');

const descriptors = [
  filesystem.readFileDescriptor,
  filesystem.readFilesDescriptor,
  filesystem.listDirectoryDescriptor,
  filesystem.getFileInfoDescriptor,
  filesystem.globFilesDescriptor,
  filesystem.grepFilesDescriptor
];
const catalog = zero.catalog.create(descriptors);
const handlers = new Map([
  [filesystem.readFileDescriptor.name, filesystem.readFile],
  [filesystem.readFilesDescriptor.name, filesystem.readFiles],
  [filesystem.listDirectoryDescriptor.name, filesystem.listDirectory],
  [filesystem.getFileInfoDescriptor.name, filesystem.getFileInfo],
  [filesystem.globFilesDescriptor.name, filesystem.globFiles],
  [filesystem.grepFilesDescriptor.name, filesystem.grepFiles]
]);
const localAlias = (name) => {
  const aliases = {
    readFile: 'zero.command.readFile',
    'command.readFile': 'zero.command.readFile',
    readFiles: 'zero.command.readFiles',
    'command.readFiles': 'zero.command.readFiles',
    listDirectory: 'zero.command.listDirectory',
    'command.listDirectory': 'zero.command.listDirectory',
    getFileInfo: 'zero.command.getFileInfo',
    'command.getFileInfo': 'zero.command.getFileInfo',
    globFiles: 'zero.command.globFiles',
    'command.globFiles': 'zero.command.globFiles',
    grepFiles: 'zero.command.grepFiles',
    'command.grepFiles': 'zero.command.grepFiles'
  };
  return aliases[name] || name;
};
const command = {
  filesystem: {
    readFile: filesystem.readFile,
    readFiles: filesystem.readFiles,
    listDirectory: filesystem.listDirectory,
    getFileInfo: filesystem.getFileInfo,
    globFiles: filesystem.globFiles,
    grepFiles: filesystem.grepFiles
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
